---
title: "It only breaks in production. How do you find out why?"
slug: debugging-production
order: 39
level: 3
levelName: Shipping
concepts: [Debugging method, Reproducing bugs, Reading logs, Narrowing down, git bisect, Hypotheses, Regression tests, Rollbacks]
readTime: 14 min
quiz:
  - question: "Users report that checkout fails. You paste the error into your AI tool and deploy its first suggested fix. The error continues, so you deploy a second and a third fix. What is the biggest problem with this approach?"
    options:
      - text: "AI tools can't read error messages"
      - text: "Each guess changes more code without proving anything, and can hide the real cause or add new bugs"
        correct: true
      - text: "You should only deploy once per day"
      - text: "The fixes were deployed in the wrong order"
    explanation: "Guessing skips the steps that find the cause. Every unproven change makes the code harder to reason about, and one of the guesses can break something else."

  - question: "A bug only happens in production. Your test accounts on your laptop all work. Which is the most likely kind of explanation?"
    options:
      - text: "Production computers are slower, so code runs differently"
      - text: "The bug is random and can't be explained"
      - text: "Something is different in production: its settings, its data, how many users act at once, or saved copies of old files"
        correct: true
      - text: "The browser is broken on the users' computers"
    explanation: "The code is the same in both places. What changes is everything around it: environment variables, real data, many users at the same time, and caches. Look there first."

  - question: "Your app worked last week. Since then there are 120 new commits, and one of them broke search. Roughly how many commits do you need to test with git bisect to find it?"
    options:
      - text: "About 7"
        correct: true
      - text: "About 60"
      - text: "All 120"
      - text: "Only 1"
    explanation: "git bisect halves the list of suspect commits after each test: 120, 60, 30, 15, 8, 4, 2, 1. That is about 7 tests instead of up to 120."

  - question: "Which of these is a good hypothesis while debugging?"
    options:
      - text: "\"Something is wrong with the database\""
      - text: "\"Maybe the AI broke it\""
      - text: "\"It's probably a timing problem somewhere\""
      - text: "\"Checkout fails for accounts that have no saved address, because the code reads the address's country without checking it exists\""
        correct: true
    explanation: "A good hypothesis is specific enough to test. You can create an account with no address and predict that checkout will fail. Vague guesses can't be proven right or wrong."

  - question: "Half your users can't log in after a deploy, and you don't know why yet. What should you do first?"
    options:
      - text: "Start reading the code line by line"
      - text: "Roll back to the last working deploy, then investigate calmly"
        correct: true
      - text: "Ask the AI to rewrite the login feature"
      - text: "Wait to see if it fixes itself"
    explanation: "When real users are blocked, stop the damage first. Going back to the last working version takes seconds on most hosting platforms. Then you can debug without pressure."

  - question: "You found and fixed the bug. Why add an automated test for it?"
    options:
      - text: "Tests make the app run faster"
      - text: "Hosting platforms require a test for every fix"
      - text: "So the same bug can't quietly come back in a later change"
        correct: true
      - text: "So you don't need logs anymore"
    explanation: "A test that fails without the fix and passes with it guards that exact case forever. If an AI change later brings the bug back, the test catches it before users do."
---

# It only breaks in production. How do you find out why?

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Logs:** messages your app writes while it runs, including errors, that you read on your hosting platform. *([Your app was down for six hours and nobody noticed](/lessons/logging-and-monitoring))*
> - **Environment variables:** settings and secrets given to your app from outside the code, which can differ between your laptop and production. *([Your app's secrets don't belong in your code. Here's where they go](/lessons/environment-variables))*
> - **Commit:** a save point in Git, with a short ID called a hash. *([The AI broke your working app. Here's your undo button](/lessons/git-as-an-undo-button))*
> - **Automated test:** code that checks your app still does what it should, every time you run it. *([The AI fixed one bug and quietly broke three others](/lessons/tests-worth-writing))*

## Three fixes later, it's worse

Your shop app has been live for a month. On Tuesday morning, a customer writes: *"I can't check out. It says 'Something went wrong'."*

You try it on your laptop. Checkout works. You try it on the live site with your own account. It works there too. But two more customers send the same message.

You copy the error from your logs, paste it into your AI tool and ask for a fix. You deploy the fix. The emails keep coming. You ask again and deploy a second fix, then a third. Now checkout still fails for those customers, and the order confirmation email has stopped working for everyone.

"It works on my machine, but not in production" is one of the most common situations in software. The problem here is not the bug. The problem is the method: **guessing**. This lesson gives you a better one.

---

## Why production is different

Your code is the same on your laptop and in production. Everything around it is not. When a bug only appears in production, the cause is almost always in one of these differences:

| Difference | On your laptop | In production |
|---|---|---|
| **Settings** | Your `.env` file | The platform's environment variables, which may be missing, old or different |
| **Data** | A few test accounts you made yourself | Thousands of real records, including old, odd and incomplete ones |
| **Many users at once** | One person: you | Many requests at the same moment |
| **Saved copies** | Fresh files every time | Old pages and files kept by the CDN or the browser |

Let's look at each one.

**Settings.** A missing or wrong environment variable is the classic cause. Your laptop has `PAYMENT_MODE=test` and production has nothing, so the code takes a path you never tried.

**Data.** Your test accounts are perfect, because you created them yesterday with the newest version of the app. Real data is messier. Accounts created a year ago may lack a field you added later. Names contain emoji or apostrophes. Somebody has 4,000 items in their cart. Code that works on clean data breaks on real data.

**Many users at once.** On your laptop, requests arrive one at a time. In production, two requests can arrive at the same moment and both change the same record. Doing many things at the same time is called **concurrency**. Bugs caused by it are hard to see, because they depend on timing.

> **Go deeper:** [A customer got charged twice. How?](/lessons/charged-twice) (Level 4) covers bugs caused by two requests running at the same time.

**Saved copies.** A **cache** is a saved copy of something, kept so it loads faster next time. Your CDN and your visitors' browsers keep cached copies of pages and JavaScript files. After a deploy, some users may still run the old frontend against your new backend.

> **Go deeper:** [Fast, but showing yesterday's data](/lessons/caching) (Level 4) explains caches and how to clear them.

Other differences matter too: a different Node.js version, a server clock in another time zone, or a slow outside service. The rule is always the same: **find what is different.**

---

## The mental model: a doctor, not a lottery

A good doctor doesn't hand out random medicine until the patient feels better. They follow a method: listen to the symptoms, run tests, form a diagnosis, treat it, and check that the treatment worked.

Debugging is the same. Here is the method, step by step:

0. **Stop the damage.** If users are blocked, go back to the last working version first.
1. **Read the logs.** Find the exact error, the time, and the request that caused it.
2. **Reproduce it.** Make the bug happen again, on purpose, where you can study it.
3. **Narrow it down.** Find the smallest piece of code, data or change that causes it.
4. **Form a hypothesis.** Write one sentence that explains the cause, and test it.
5. **Fix the cause.** Make the smallest change that fixes it.
6. **Add a test.** Make sure this exact bug can never come back silently.

**Where the comparison stops working:** a doctor can't undo yesterday. You can. Git and your hosting platform let you go back to a working version in seconds, which is why step 0 exists.

---

## How it goes wrong

### Mistake 1: Guessing in production

Pasting an error into an AI tool and deploying whatever comes back skips steps 1 to 4. The AI sees one error message, not your data, settings or logs, so it guesses too. If the bug disappears, you don't know which change fixed it. If it doesn't, you've added code that may break something else, like the confirmation email in the story.

### Mistake 2: Debugging on your real users

Some people debug by adding `console.log` lines, deploying, waiting for a customer to hit the bug, and repeating. Every round is a deploy to real users. Worse, these quick log lines often print whole objects: user records, request bodies, tokens. That puts personal data and secrets into your logs, where many people and tools can read them.

### Mistake 3: "Fixed" without proof

You changed something and the errors stopped. But you never made the bug happen on purpose, so you can't prove your change fixed it. Maybe the one customer with the strange data simply stopped trying. The bug returns next month, and you've forgotten everything about it.

### Mistake 4: Hiding the symptom

The AI suggests wrapping the failing code in `try/catch` and ignoring the error. The red error disappears from the logs. The checkout still doesn't work, but now nothing tells you. You've turned a loud bug into a silent one.

---

## What good looks like

Let's solve the checkout bug with the method.

### Step 0: Stop the damage

Your three guessed fixes made things worse, so go back to the version from before them. Making an earlier, working version live again is called a **rollback**. On most hosting platforms it takes one click; Vercel calls it "Instant Rollback" (on its free Hobby plan, only back to the deployment just before the current one). You can also `git revert` the bad commits. Now only the original bug remains, and you can investigate without pressure.

### Step 1: Read the logs

Open your platform's logs and filter by the time of the first customer email. You find this:

```text
2025-03-04T09:12:44Z ERROR POST /api/checkout 500
  userId=8812 requestId=req_7f3a
  TypeError: Cannot read properties of null (reading 'country')
    at calculateShipping (src/checkout/shipping.js:14:31)
```

In plain English:

1. **Line 1:** at 09:12 (UTC time), a request to the checkout route failed with a 500 error.
2. **Line 2:** it came from user 8812. The **request ID** is a label your app gave this one request, so you can find every log line it produced.
3. **Line 3:** the error. The code tried to read `country` from something that was `null`, which means "empty, nothing here".
4. **Line 4:** the first line from your own code: `shipping.js`, line 14.

You already know more than any guess could tell you: the crash is in shipping, and something the code expected is empty.

### Step 2: Reproduce it

Look up user 8812 in your database. Their account was created last year, and their `address` column is empty. Your app only started asking for an address in January. Every one of your test accounts has one.

Now make the bug happen on purpose, away from real users. On your laptop or in your staging environment, create an account with no address and try to check out. It crashes with the same error. You have reproduced the bug.

**Never copy real customer data to your laptop to do this.** Copy the *shape* of the problem (an empty address), not the person.

> **Go deeper:** [Why you should never test on your real users](/lessons/dev-staging-production) (Level 3) explains staging environments.

### Step 3: Narrow it down

Here you already found the line. But often the logs don't point so clearly, and the question is: **which change broke it?** If the app worked last week and there are 80 new commits, Git can find the guilty one for you with `git bisect`:

```bash
git bisect start
git bisect bad              # the current version has the bug
git bisect good a1b2c3d     # this older commit did not
# Git switches to a commit in the middle. Test it, then type:
git bisect good             # or: git bisect bad
git bisect reset            # when done, return to where you started
```

In plain English:

1. **Lines 1–3:** start a search. Tell Git that the current version is broken and that commit `a1b2c3d` from last week worked.
2. **Line 4–5:** Git jumps to a commit halfway between them. You test the app there and answer "good" or "bad". Git then throws away the half that can't contain the bug and jumps to the middle of the other half.
3. **Line 6:** when Git prints "is the first bad commit", you're done. `reset` takes you back to your latest code.

This is a **binary search**: each answer cuts the suspects in half. 80 commits become 40, 20, 10, 5, 3, 2, 1. About seven tests instead of eighty. Then you can read exactly what that one commit changed with `git show` and its hash.

### Step 4: Form a hypothesis

Write the cause in one sentence that could be proven wrong:

> *"Checkout fails for accounts with no saved address, because `calculateShipping` reads `address.country` without checking that the address exists."*

A good hypothesis makes a **prediction**: a new account without an address will fail, and the same account will work once you add one. Try both. If either prediction is wrong, go back to the logs. That's still progress: you ruled something out.

### Step 5: Fix the cause

Now the fix is small and obvious:

```js
app.post("/api/checkout", requireLogin, async (req, res) => {
  const user = await db.user.findUnique({ where: { id: req.user.id } });
  if (!user.address) {
    return res.status(400).json({ error: "Please add a delivery address first." });
  }
  const shipping = calculateShipping(user.address);
  // ...continue with the order
});
```

In plain English:

1. **Line 2:** load the logged-in user from the database.
2. **Lines 3–5:** if they have no address, stop and tell them clearly what to do. A 400 status means "the request can't be handled as it is", which is true. It's not a server crash.
3. **Line 6:** only then calculate shipping, now that the address is known to exist.

Notice what the fix *doesn't* do. It doesn't hide the error with `try/catch`. It handles the real situation and gives the user a way forward.

### Step 6: Add a test

Write a test that does exactly what the customer did:

```js
test("checkout without an address asks for one instead of crashing", async () => {
  const user = await createTestUser({ address: null });
  const res = await checkoutAs(user);
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/address/);
});
```

In plain English: create a test user with no address, try to check out as that user, and expect a clear 400 reply that mentions the address. `createTestUser` and `checkoutAs` are small helper functions in your own test files, not part of a library.

Run it **before** your fix and watch it fail. Run it after and watch it pass. A test that fails first proves it really checks the bug. A test that guards against an old bug coming back is called a **regression test**. Now if an AI change brings the bug back in six months, your checks catch it before a customer does.

> **Go deeper:** [Stop broken code before it ever goes live](/lessons/ci-cd) (Level 3) shows how to run these tests on every push.

### Using AI the right way

AI is very useful inside this method. It's just bad at replacing it. Give it the evidence, and ask for thinking, not code:

- Paste the full log lines, not only the last error.
- Ask for possible causes and a way to test each one, before any fix.
- Once you have a confirmed cause, ask for the smallest fix and a test.

---

## Test your own app

Practice before the real emergency. Each drill takes about five minutes.

1. **Find your logs.** Open your hosting platform's logs page. Visit a page of your app, and find that request in the logs. Then trigger an error on purpose (for example, visit an API route with a bad ID) and find that too.
2. **Find your rollback button.** Open your list of deploys. Find where you would make an older deploy live again. Don't press it. Just know where it is.
3. **Compare your settings.** List every variable in your `.env` file. Check that each one exists in your platform's environment variables page for production.
4. **Try `git bisect` once.** In a practice project, make eight small commits. Put a deliberate mistake in commit five. Then use `git bisect` to find it, and count how many steps it took.

---

## Takeaways

**Key terms**
- **Reproduce:** make a bug happen again on purpose, where you can study it
- **Hypothesis:** a one-sentence explanation of the cause that makes a testable prediction
- **`git bisect`:** a Git command that finds the commit that introduced a bug by repeatedly halving the suspects
- **Rollback:** making an earlier, working version live again
- **Regression test:** a test that makes sure an old bug can't come back

**Which step did you skip?**
- You deployed a fix without reading the full logs → step 1
- You never made the bug happen on purpose → step 2
- You don't know which change broke it → step 3, try `git bisect`
- You can't say the cause in one sentence → step 4
- The fix hides the error instead of handling the situation → step 5
- Nothing would stop the bug coming back → step 6
- Users were blocked while you investigated → step 0, roll back first

**Ask your AI**
- *"Here are the full log lines for this error. Don't write a fix yet. List the three most likely causes, and for each one, tell me how I can test whether it's true."*
- *"This works on my laptop but fails in production. List every difference between the two environments that could cause this error: settings, data, many users at once, caching, versions."*
- *"Write a test that reproduces this bug. It should fail with the current code. Then suggest the smallest fix that makes it pass."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Let Git run the tests for you.** If you can check the bug with a command, `git bisect run` does the whole search on its own. For example, `git bisect run npm test` runs your tests at each step. The command's exit code tells Git the answer: 0 means good, 125 means "this commit can't be tested, skip it", and other codes from 1 to 127 mean bad.

**Stack traces from minified code.** Before your frontend JavaScript goes live, the build makes it smaller by removing spaces and shortening names. This is called **minifying**. A browser error from production may then point to `main.4f2a.js:1:48213`, which is useless. **Source maps** are files that map the minified code back to your original files and lines. Error-tracking tools such as Sentry use them to show readable stack traces. Many teams upload source maps to their error tracker but don't serve them publicly.

**Request IDs across services.** When one user action passes through several parts of your system (your API, a background job, a webhook), pass the same request ID along and include it in every log line. Then one search shows the whole story. This is often called a **correlation ID**.

**Bugs that disappear when you look.** Some bugs, usually concurrency bugs, vanish when you add logging or run a debugger, because those change the timing. Programmers jokingly call them "Heisenbugs". For these, logs that are always on are more useful than debugging tools you attach later.

**Feature flags.** A **feature flag** is a setting that turns a feature on or off without a deploy. If a new feature misbehaves, you can switch it off for everyone in seconds, which is faster than a rollback and leaves other changes in place.

**Write it down.** After a serious bug, write a few lines: what happened, how you found it, what fixed it, and what will stop it happening again. Teams call this a **postmortem**. Good ones focus on the system, not on blaming a person.


</details>

## References

- [git-bisect](https://git-scm.com/docs/git-bisect): Git documentation. How `git bisect` uses a binary search between a good and a bad commit, its commands, and the exit codes used by `git bisect run`.
- [Performing an Instant Rollback on a Deployment](https://vercel.com/docs/instant-rollback): Vercel documentation. Making an earlier production deployment live again from the dashboard, and Hobby plans rolling back only to the previous deployment.
- [TypeError: "x" is (not) "y"](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Unexpected_type): MDN. The form of the "Cannot read properties of ... (reading 'x')" error message in Node.js and Chrome.
