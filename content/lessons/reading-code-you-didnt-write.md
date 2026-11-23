---
title: "The AI wrote 500 lines. How do you know they're safe?"
slug: reading-code-you-didnt-write
order: 43
level: 3
levelName: Shipping
concepts: [Code review, Reading a diff, Pull request review, Review checklist, Asking the AI to explain its changes, Small changes]
readTime: 15 min
quiz:
  - question: "The AI finished a new feature. It works on the preview link and all tests pass. What does that tell you about its safety?"
    options:
      - text: "It is safe, because the tests pass"
      - text: "Very little: most security holes don't show up when you're the only user clicking through the happy path"
        correct: true
      - text: "It is safe, because the preview link works"
      - text: "It is unsafe, because AI code is always unsafe"
    explanation: "A missing ownership check or a leaked secret doesn't break anything for you. The feature works perfectly, for everyone, including people who shouldn't have access. You find these by reviewing, not by clicking."

  - question: "You open a pull request with 14 changed files. What should you look at first?"
    options:
      - text: "The list of changed files, looking for surprises like package.json, .env, login code or a deleted test"
        correct: true
      - text: "The longest file, line by line"
      - text: "Only the files with the most added lines"
      - text: "The commit messages, then merge"
    explanation: "The file list is a two-minute map of the change. Files you didn't expect to change are where problems hide: a new package, a loosened setting, a removed test."

  - question: "In a diff, you see a line starting with - that contained userId: req.user.id inside a database query. Nothing replaces it. Why is this a red flag?"
    options:
      - text: "Removed lines are always bugs"
      - text: "It changes the formatting"
      - text: "The query no longer limits results to the logged-in user's records, so users may see other people's data"
        correct: true
      - text: "It makes the query slower"
    explanation: "Lines starting with - were removed. Removing an ownership filter turns a safe query into an IDOR. AI tools sometimes remove checks like this to make an error go away."

  - question: "You ask the AI to explain its change, and it says: \"All routes now have proper authorization checks.\" What should you do?"
    options:
      - text: "Trust it and merge"
      - text: "Ask it to say it again more confidently"
      - text: "Delete the feature"
      - text: "Use the explanation as a map, then check in the code that each route really has the check"
        correct: true
    explanation: "An explanation tells you where to look. It isn't proof. The AI can describe what it meant to write rather than what it wrote, so confirm each claim in the diff."

  - question: "A new invite feature creates its secret invite token with Math.random(). What is the problem?"
    options:
      - text: "Math.random() is too slow"
      - text: "Math.random() is not designed for secrets; use a cryptographically secure source such as crypto.randomUUID()"
        correct: true
      - text: "Tokens should be numbers only"
      - text: "There is no problem"
    explanation: "MDN states that Math.random() does not give cryptographically secure random numbers. Secret tokens should come from the crypto module, which is built for values that must not be guessed."

  - question: "The AI wants to make one change of 1,200 lines across 30 files. What's the best response?"
    options:
      - text: "Approve it quickly, since reviewing it would take too long"
      - text: "Ask for the work as several smaller steps, each one reviewed and tested before the next"
        correct: true
      - text: "Review only the first file"
      - text: "Ask for the same change in one file"
    explanation: "Nobody reviews 1,200 lines carefully. Small steps, each with one purpose, can actually be read, tested and undone."
---

# The AI wrote 500 lines. How do you know they're safe?

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Diff:** the list of changes between two versions of code. Removed lines start with `-`, added lines with `+`. *([The AI broke your working app. Here's your undo button](/lessons/git-as-an-undo-button))*
> - **Pull request:** a request on GitHub to merge a branch into `main`, where you can see and discuss its changes first. *([From your laptop to a real website in one push](/lessons/hosting-platforms))*
> - **Authorization:** checking that a logged-in user is allowed to do this specific thing. *([Change one number in the URL, see everyone's invoices](/lessons/logged-in-doesnt-mean-allowed))*
> - **CI:** checks such as tests that run automatically on every push before code can go live. *([Stop broken code before it ever goes live](/lessons/ci-cd))*

## Merge?

You asked your AI for one feature: *"Let team admins invite people to their team by email."*

Twenty minutes later it's done. It touched 9 files and added about 500 lines: new API routes, a database table, an email template, a page, some tests. The tests pass. You open the preview link, invite a friend, and it works.

There's a green **Merge** button in front of you.

You didn't write these 500 lines. Maybe you couldn't write them yourself yet. So how do you know they're safe?

You've spent three levels learning how apps break: missing ownership checks, leaked keys, injected SQL, double charges, runaway bills. This lesson turns all of it into one habit: **reviewing a change before it goes live.**

---

## The mental model: an inspector with a checklist

When a new house is built, an inspector checks it before people move in. The inspector doesn't rebuild the house, and doesn't look at every brick. They know where houses usually fail: wiring, fire exits, smoke alarms, the gas pipe. They walk through with a **checklist** and look hard at those places.

Reviewing AI code works the same way:

- You review the **change** (the diff), not the whole app.
- You look hardest at the places where apps usually fail, which you now know.
- You follow a checklist, so you don't depend on remembering everything.

You don't need to understand every line. You need to find the lines that matter, and understand those.

**Where the comparison stops working:** a house inspector is independent from the builder. Your AI can help you inspect, and it should. But it wrote the code, so it can share the same blind spots. If it misunderstood your rules when writing, it will often misunderstand them when reviewing. You are the one who knows the rules of your app.

### "It works" is not "it's safe"

Clicking through the preview tells you the **happy path** works: the normal case, done by the right person, with normal input. Most security holes are invisible there. A missing ownership check doesn't break anything for you. It works perfectly, for everyone, including people who shouldn't have access.

That's why tests passing and the preview working are necessary, but not enough.

---

## How to read a diff

On GitHub, open the pull request and click the **Files changed** tab. Each file shows removed lines in red (starting with `-`) and added lines in green (starting with `+`). You can tick **Viewed** on each file as you finish it, and leave a comment on any line by hovering over it and clicking the blue comment icon.

On your own computer, `git diff --stat main` lists each changed file and how many lines changed, compared with `main`.

Don't read from top to bottom. Read in this order:

**1. The file list (2 minutes).** What changed that you didn't expect? Look hard at:
- `package.json` and the lockfile: new packages
- `.env` files, config files, anything with "auth", "middleware" or "security" in its name
- Database migrations
- Test files and CI workflow files, especially deletions

**2. The removed lines.** Additions get attention. Removals don't, and that's where AI changes hide damage. When the AI is stuck on an error, it sometimes "fixes" it by deleting the check that caused it:

```text
   const invoice = await db.invoice.findFirst({
-    where: { id: req.params.id, userId: req.user.id },
+    where: { id: req.params.id },
   });
```

The `-` line limited the search to the logged-in user's invoices. The `+` line doesn't. One small change, and every user can read every invoice. Also look for removed tests, and tests changed to expect something weaker.

**3. The doors into your app.** Find every new or changed API route, page that loads data, webhook handler and background job. These are where outside input enters. Run the checklist on each one.

**4. Everything else**, more quickly.

### Ask the AI to explain its own change

Before you read, ask for a map. Paste this into your AI tool:

> *"Explain this change file by file. For each new or changed route: who can call it, what it checks, and what data it reads or changes. List everything you removed or weakened. List any assumptions you made about my rules, and anything I asked for that you didn't do."*

This is very useful. It tells you where to look and often reveals misunderstandings: "I assumed any team member can invite others." But **an explanation is a map, not proof.** The AI can describe what it meant to write rather than what it wrote. When it says "every route checks authorization", open each route and see the check.

For a second opinion, start a **new chat** that didn't write the code, paste the diff, and ask it to review against the checklist below. A fresh session isn't influenced by the reasons it had while writing.

---

## The checklist

Each item links back to the lesson that explains it. For each door into your app, ask:

**1. Who is allowed to do this?**
- Does the route check login **and** that this user may touch *this* record?
- Does the user's ID come from the session, never from the request?
- Does it accept only the fields users may change, not everything in `req.body`?
> [Change one number in the URL, see everyone's invoices](/lessons/logged-in-doesnt-mean-allowed)

**2. Is the input checked on the server?**
- Is every input validated with a schema, including sizes and types? Are file uploads limited?
> [Can strangers read your whole database? Check in 5 minutes](/lessons/never-trust-the-browser) · [The profile picture that ran code on your site](/lessons/file-uploads)

**3. Can input become code?**
- Is any SQL built by gluing strings, or passed to a "raw" or "unsafe" query function?
- Is user content put into the page with `dangerouslySetInnerHTML` or `innerHTML`?
> [How one line of text can dump your whole database](/lessons/sql-injection) · [A comment that runs code in every visitor's browser](/lessons/cross-site-scripting)

**4. Are secrets safe?**
- Any key, password or token written in the code? Any secret with a `NEXT_PUBLIC_` or `VITE_` name?
- Do logs print passwords, tokens or whole user records?
> [Your API key leaked, and strangers are spending your money](/lessons/api-key-ended-up-public) · [Your app was down for six hours and nobody noticed](/lessons/logging-and-monitoring)

**5. Is login handled properly?**
- Is the app using a login service or a well-known library, not home-made code?
- If it stores passwords: Argon2id first (scrypt if not available; bcrypt only in older systems that already use it), never plain SHA-256 or MD5.
- Are secret tokens made with the `crypto` module, never `Math.random()`?
> [Never store a password. Here's what to store instead](/lessons/how-login-works)

**6. What happens when it fails?**
- Are raw error details sent to the user? Are errors swallowed by an empty `catch`?
- When a check fails, does the code refuse (fail safe), or carry on?
> [Your error page showed your database details to everyone](/lessons/handling-errors)

**7. Does it talk to other services safely?**
- Timeouts set? Retries limited? Idempotency keys on payments and orders?
- Slow work in a background job, not in the request? Webhook signatures verified?
> [The payment timed out. Did it go through?](/lessons/timeouts-and-retries) · [Sign-up takes 10 seconds because of one email](/lessons/background-jobs) · [Free stuff with one fake "payment succeeded" message](/lessons/webhooks)

**8. Can it cost money without limit?**
- Does every route that calls a paid service have login, per-user limits and size limits?
> [You woke up to a $10,000 cloud bill. What happened?](/lessons/surprise-cloud-bill) · [Bots signed up 10,000 times overnight. Now what?](/lessons/rate-limiting)

**9. Is the database change safe?**
- Are schema changes in a migration file? Does anything rename or delete a column in one step?
- Are there database queries inside a loop, or lists with no limit on how many rows they load? These work with 10 rows and crawl with 10,000.
> [You renamed one column and the live app crashed](/lessons/database-migrations) · [One page, 500 database queries](/lessons/n-plus-one-queries) (Level 4)

**10. Are new packages real and needed?**
- Does each new package exist, have real usage, and do something you couldn't do in a few lines?
> [The AI suggested a package that didn't exist. Then someone made it](/lessons/dangerous-packages)

**11. Is it tested, and was anything switched off?**
- Are there tests for the new behavior, including "the wrong user gets refused"?
- Were tests deleted, skipped (`.skip`) or weakened? Were checks silenced with `@ts-ignore`, `eslint-disable`, `--no-verify`, or a CORS setting of `origin: "*"`?
> [The AI fixed one bug and quietly broke three others](/lessons/tests-worth-writing) · ["Blocked by CORS policy": why the browser said no](/lessons/cors)

### Quick searches

You can run part of the checklist with your editor's search box, over the changed files:

| Search for | Why |
|---|---|
| `req.body`, `req.query`, `req.params` | Data the user controls. Is it validated? Is an ID from here used without an ownership check? |
| `NEXT_PUBLIC_`, `VITE_`, `sk_`, `secret`, `password` | Possible secrets in the wrong place |
| `queryRaw`, `Unsafe`, `` `SELECT ``, `dangerouslySetInnerHTML` | Possible injection |
| `catch {` , `catch (e) {}`, `console.log(` | Swallowed errors, leaky logs |
| `Math.random` | Weak tokens, if used for anything secret |
| `while (true)`, `.skip(`, `@ts-ignore`, `eslint-disable` | Endless loops, switched-off checks |

A match isn't automatically a bug. It's a place to look.

---

## Practice: review this

Here's part of what the AI wrote for team invites. Before reading on, try the checklist on it. How many problems can you find?

```js
app.post("/api/teams/:teamId/invites", requireLogin, async (req, res) => {
  const { email, role } = req.body;
  const token = Math.random().toString(36).slice(2);
  const invite = await db.invite.create({ data: { teamId: req.params.teamId, email, role, token } });
  await sendInviteEmail(email, token);
  console.log("Invite created", invite);
  res.json(invite);
});
```

In plain English: a logged-in user sends an email address and a role; the code makes a random token, saves the invite, emails the token, logs the invite, and sends the invite back.

A good review finds at least six problems:

1. **Authorization (item 1).** Any logged-in user can invite people into *any* team by changing `teamId` in the web address. The route must check that the user is an admin of that team.
2. **Unchecked fields (items 1 and 2).** `role` comes straight from the request. An admin, or anyone who gets past item 1, could invite someone as `"owner"`. Allow only a fixed list of roles, and check that `email` really is an email address.
3. **Weak secret (item 5).** `Math.random()` is not built for secrets: MDN says it does not provide cryptographically secure random numbers. Use the `crypto` module instead, for example `crypto.randomUUID()`.
4. **Secret in the logs (item 4).** `console.log` prints the whole invite, token included.
5. **Slow work in the request (item 7).** The email is sent before replying. If the email service is down, creating the invite fails. Use a background job.
6. **No limits (item 8).** Nothing stops one account from sending 10,000 invite emails, which costs you money and can get your email domain marked as spam.

Eight lines, six problems, and the feature still "works" in the preview. That's why you review.

---

## How it goes wrong

**Reviewing by feeling.** "It looks professional" and "it worked when I clicked it" are not reviews. AI code almost always *looks* tidy. Tidy isn't safe.

**Merging what you can't read.** A 500-line change gets skimmed; a 1,200-line change gets approved unread. If a change is too big to review, it's too big to merge.

**Letting the AI grade itself.** "I've added proper security checks" is a claim. Treat it like one.

**Re-reviewing nothing after "fixes".** You ask for a fix to one problem. The AI rewrites three files. Review the new diff too, not only the one line you asked about.

---

## What good looks like

A review workflow that fits a beginner's week:

1. **Ask for small steps.** Before any code, ask the AI for a plan, then build it step by step: the table first, then one route, then the page. Each step is a small diff you can read in ten minutes.
2. **Work on a branch and open a pull request**, even if you work alone. Your CI checks run, and you get the **Files changed** view.
3. **Ask the AI to explain the change** with the prompt above.
4. **Read in order:** file list, removals, doors in, then the checklist.
5. **Try the unhappy paths yourself** on the preview link: a second account trying to reach the first account's data, wrong input, a double-click, a very long text.
6. **Request changes**, then review the new diff. Merge only when the checks pass and you can explain, in your own words, what the change does.

The last point is the real test. You don't need to be able to write every line. You need to be able to say what the change does, who can use it, and what stops the wrong person.

---

## Test your own app

1. **Review your last big AI change.** Run `git log --oneline` and find a change from the past week. Run `git diff --stat <hash>~1 <hash>` to see its files, then `git diff <hash>~1 <hash>` to read it. Go through the checklist. Write down what you find.
2. **Run the quick searches** over your whole project, not just the latest change.
3. **Ask for the explanation** of that change with the prompt from this lesson. Then check two of its claims in the code. Were they true?
4. **Make it a habit.** Turn on required checks and pull requests for `main`, so nothing reaches production without passing through review.

---

## Takeaways

**Key terms**
- **Code review:** reading a change before it goes live, looking for bugs and security holes
- **Diff:** the removed (`-`) and added (`+`) lines of a change
- **Happy path:** the normal case, done by the right person with normal input
- **Review checklist:** a fixed list of questions you ask about every change

**Red flags in a diff**
- Removed lines with checks, filters like `userId: req.user.id`, or tests
- New routes with a login check but no ownership check
- Fields taken from `req.body` and saved without a list of allowed fields
- New packages you didn't ask for
- Checks switched off: `.skip`, `@ts-ignore`, `eslint-disable`, `origin: "*"`
- A change too large to read in one sitting

**Ask your AI**
- *"Explain this change file by file. For each new or changed route: who can call it, what it checks, and what data it reads or changes. List everything you removed or weakened, and every assumption you made."*
- *"Review this diff against this checklist: authorization, input validation, injection, secrets, login, error handling, outside services, cost, database changes, new packages, tests. Quote the exact lines for each problem."*
- *"Split this feature into small steps that I can review one at a time. Don't write code yet."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Automated reviewers.** Tools can catch part of the checklist on every pull request. Code scanners look for common security bugs such as injection, dependency checkers warn about packages with known security problems, and linters flag risky patterns. They're useful, but they don't know your app's rules, so they rarely catch a missing ownership check. Human review is still needed.

**Review comments that work.** Good comments point at a line, say what could go wrong, and suggest a fix: "Any user can change `teamId` here. Check that `req.user` is an admin of this team." When you paste comments back to the AI, include the line and the reason, not only "fix this".

**What you can skip.** Formatting, naming and code style matter less than safety. If a formatter and linter run in CI, let them handle style, and spend your attention on the checklist.

**Read the tests as a specification.** The tests tell you what the AI *thinks* the feature should do. If no test says "a user from another team gets refused", the AI may not have thought about that case. Missing tests show you missing thinking.

**Password storage note.** The OWASP Password Storage Cheat Sheet recommends Argon2id first, scrypt when Argon2id isn't available, and bcrypt only for older systems. If AI code chooses bcrypt for a new app, it's not a disaster, but ask why. If it uses a fast hash like SHA-256 or MD5, or encrypts passwords, stop and fix it.


</details>

## References

- [Reviewing proposed changes in a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/reviewing-proposed-changes-in-a-pull-request): GitHub Docs. The Files changed tab, the Viewed checkbox and commenting on a line.
- [Math.random()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random): MDN. `Math.random()` does not provide cryptographically secure random numbers and must not be used for security.
- [Crypto: randomUUID() method](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID): MDN. `crypto.randomUUID()` makes a random ID with a cryptographically secure random number generator.
- [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): OWASP. Argon2id first, scrypt when Argon2id isn't available, bcrypt only for legacy systems.
