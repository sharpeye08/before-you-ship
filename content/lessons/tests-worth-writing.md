---
title: "The AI fixed one bug and quietly broke three others"
slug: tests-worth-writing
order: 36
level: 3
levelName: Shipping
concepts: [Automated tests, Regression, Unit tests, Integration tests, End-to-end tests, Critical paths]
readTime: 14 min
quiz:
  - question: "You ask the AI to fix the discount code feature. It works. Two days later, you learn that orders without a discount code now cost $0. What is this kind of bug called?"
    options:
      - text: "A syntax error"
      - text: "A build failure"
      - text: "A regression: something that used to work stopped working after a change"
        correct: true
      - text: "A slow query"
    explanation: "A regression is a feature that worked before and broke because of a later change. AI tools make regressions more likely because they change many files at once and don't remember what was working."

  - question: "You have time to write only a few tests this week. Which should come first?"
    options:
      - text: "Tests for the colors and text on the About page"
      - text: "Tests for sign-up, checkout, and \"users can't see other users' data\""
        correct: true
      - text: "One test for every function in the project, in alphabetical order"
      - text: "Tests for the admin page you open once a month"
    explanation: "Start with critical paths: the few things that cost money, lose data or leak data when they break. A wrong color is annoying. A broken checkout or a data leak is serious."

  - question: "A test calls your calculateTotal function directly, with no database, no server and no browser. What kind of test is it?"
    options:
      - text: "A unit test"
        correct: true
      - text: "An end-to-end test"
      - text: "An uptime check"
      - text: "A migration"
    explanation: "A unit test checks one small piece of code on its own. It runs in milliseconds, but it can't tell you whether the pieces work together."

  - question: "You ask the AI to change the checkout. Afterwards, two old tests fail. The AI then edits those tests so they pass. What should you do?"
    options:
      - text: "Accept it. Passing tests mean the code is correct."
      - text: "Delete all the tests so they stop getting in the way"
      - text: "Turn off the tests until next week"
      - text: "Check whether the behavior was supposed to change. If not, the code is wrong, not the tests."
        correct: true
    explanation: "Tests describe what must stay true. If a test fails after a change, either the change broke something, or you meant to change that behavior. Only you can decide which. An AI that rewrites tests to match broken code hides the regression."

  - question: "You write a new test and it passes the first time. How can you check that it really tests something?"
    options:
      - text: "Run it ten more times"
      - text: "Break the code on purpose and check that the test fails"
        correct: true
      - text: "Count how many lines the test has"
      - text: "Ask the AI if it is a good test"
    explanation: "A test that can't fail is useless. Breaking the code on purpose proves the test notices. Then undo the break."

  - question: "Your end-to-end test opens a real browser and signs up a new user. Which statement is true?"
    options:
      - text: "It runs as fast as a unit test"
      - text: "It should run against the production database, so the data is realistic"
      - text: "It checks the whole path a user takes, but it is slower and breaks more often for reasons unrelated to your change"
        correct: true
      - text: "It replaces the need for any other tests"
    explanation: "End-to-end tests give the most confidence per test, because they work like a real user. They are also the slowest and the most fragile. Keep a few for your critical paths, and always run them against a test environment."
---

# The AI fixed one bug and quietly broke three others

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Commit:** a saved snapshot of your code that you can go back to. *([The AI broke your working app. Here's your undo button](/lessons/git-as-an-undo-button))*
> - **API route:** an address on your server that your app's pages talk to, like `/api/checkout`. *([The hidden conversation behind every button you tap](/lessons/what-is-an-api))*
> - **npm and package.json:** npm installs packages; `package.json` lists them and the commands your project can run. *([It works on my machine, but not on yours. Blame the packages](/lessons/packages-and-dependencies))*
> - **Environments:** development, staging and production, each with its own database and keys. *([Why you should never test on your real users](/lessons/dev-staging-production))*

## The fix that cost you a weekend

Your shop app has a bug: the discount code `SAVE10` doesn't work. You ask your AI to fix it. It changes four files. You open the checkout, type `SAVE10`, and the price drops by 10%. Fixed. You deploy.

On Monday, three different problems are waiting for you:

1. Every order placed **without** a discount code since Friday cost $0.
2. The receipt emails show a total that doesn't match what customers paid.
3. Your weekly sales report says you made almost nothing.

All three come from one place. To fix the discount, the AI changed `calculateTotal`, the **function** that adds up an order. (A function is a named piece of code that takes some inputs and gives back a result.) With a code, it worked. Without a code, it returned zero. And checkout, the receipt emails and the sales report all use that same function.

You tested the thing you asked for. You didn't test the three things you didn't think about. Nothing crashed. No error appeared. The app went on running, quietly wrong, for a whole weekend.

This is the most common way apps built with AI break: not with a big crash, but with a quiet change to something that used to work.

---

## Regressions: when working things stop working

A bug where something **used to work** and stopped working after a change is called a **regression**. The app went backwards.

Regressions happen in every project, but building with AI makes them more likely:

- **The AI changes many files at once.** A small request can touch code that other features depend on.
- **The AI doesn't remember what was working.** Each chat starts fresh. It doesn't know that checkout without a code was fine yesterday.
- **You can't click through everything after every change.** After ten changes a day, nobody re-tests sign-up, login, checkout, password reset and every settings page by hand.

You need something that remembers what must stay true, and checks it for you every time. That is what tests do.

---

## What an automated test is

An **automated test** is a small program that uses your app's code and checks that the result is what you expect. You write it once, and then a tool runs it in seconds, as often as you like.

Think of a checklist that ticks itself. "Price without a code: correct. Price with SAVE10: correct. Other users' invoices: hidden." Every time you run the tests, each item is checked again.

Here's a real one, written with **Vitest**, a popular test tool for JavaScript projects:

```js
// cart.test.js ... imports test and expect from Vitest, and calculateTotal
const items = [{ priceInCents: 2000, quantity: 2 }];
test("no discount code: full price", () => {
  expect(calculateTotal(items, null)).toBe(4000);
});
test("SAVE10 takes 10% off", () => {
  expect(calculateTotal(items, "SAVE10")).toBe(3600);
});
```

In plain English:

- **Line 1:** the file's name, and a note that the import lines are skipped here. The real file starts by loading two tools from Vitest (`test` and `expect`) and the `calculateTotal` function from your app.
- **Line 2:** a pretend cart: two items at $20.00 each. Prices are in cents, so 2000 means $20.00. (Computers can make tiny rounding errors with decimals, so money is often stored in whole cents.)
- **Lines 3–5:** a test named "no discount code: full price". It calls `calculateTotal` with no code and **expects** the answer to be 4000 cents.
- **Lines 6–8:** a second test: with `SAVE10`, the answer must be 3600.

You install Vitest with `npm install -D vitest` and run the tests with `npx vitest run`. Vitest prints each test with a pass or fail mark. If a result is wrong, it shows what it expected and what it got.

If you had this file on Friday, the AI's fix would have made the first test fail. In seconds, Vitest would have told you it expected 4000 and received 0, before any customer paid nothing.

---

## Three kinds of tests

Tests differ in how much of your app they use at once.

### Unit tests: one piece on its own

The test above is a **unit test**. It checks one small piece of code (a "unit") with no database, no server and no browser.

- **Fast:** hundreds run in a second or two.
- **Precise:** when one fails, you know exactly which function broke.
- **Limited:** every piece can work alone while the connections between them are broken.

Best for: calculations, rules and anything with lots of cases, like prices, discounts, dates and permissions.

### Integration tests: several pieces together

An **integration test** checks that several parts work together, for example an API route plus the database. Remember the bug from [Change one number in the URL, see everyone's invoices](/lessons/logged-in-doesnt-mean-allowed), where any user could read any invoice? Here's a test that would catch it:

```js
// ... imports: request (Supertest), app, and the helpers loginAs and createInvoice
test("users can't read other people's invoices", async () => {
  const invoice = await createInvoice({ owner: "a@example.com" });
  const userB = await loginAs("b@example.com");
  const res = await request(app).get(`/api/invoices/${invoice.id}`).set("Cookie", userB);
  expect(res.status).toBe(404);
});
```

In plain English:

- **Line 1:** the skipped imports. `request` comes from **Supertest**, a package that sends requests to your server inside a test, without opening a browser. `app` is your server. `loginAs` and `createInvoice` are small **helper** functions that you (or your AI) write once for your tests. One logs a test user in and returns their session cookie. The other creates an invoice in the test database.
- **Lines 3–4:** create an invoice that belongs to user A, then log in as user B.
- **Lines 5–6:** as user B, ask for user A's invoice. The test expects "404 Not Found". If the ownership check ever disappears, this test fails.

Integration tests need a database, so they must use a **test database**, never production. That's the rule from [Why you should never test on your real users](/lessons/dev-staging-production). Many test setups empty the test database before each run, so every run starts the same way.

- **Slower** than unit tests, because they use a real database.
- **Catch more:** wrong queries, missing checks, routes that don't connect.

### End-to-end tests: a robot user in a real browser

An **end-to-end test** (often shortened to **E2E**) opens a real browser and uses your app the way a person does: it types, clicks and reads the screen. A popular tool for this is **Playwright**:

```js
import { expect, test } from "@playwright/test";
test("a new user can sign up", async ({ page }) => {
  await page.goto("http://localhost:3000/signup");
  await page.getByLabel("Email").fill(`user-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("a-long-test-password");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText("Welcome")).toBeVisible();
});
```

In plain English:

- **Line 2:** `page` is a browser tab that Playwright controls.
- **Line 3:** open the sign-up page of the app running on your laptop.
- **Lines 4–5:** find the field labeled "Email" and type an address, then the password. `Date.now()` adds the current time to the email, so every run signs up a new user. Otherwise the second run would fail with "email already taken".
- **Line 6:** find the button called "Sign up" and click it.
- **Line 7:** check that the word "Welcome" appears on screen.

Playwright is set up with `npm init playwright@latest` and run with `npx playwright test`. By default it can test in three browser engines: Chromium (Chrome's engine), Firefox and WebKit (Safari's engine).

- **Most realistic:** it tests the frontend, the backend and the database together.
- **Slowest:** seconds per test, not milliseconds.
- **Most fragile:** E2E tests can be **flaky**, meaning they pass sometimes and fail sometimes without any code change, for example when a page loads slowly. A flaky test teaches people to ignore red results, which is worse than having no test.

### Comparing them

| | Unit | Integration | End-to-end |
|---|---|---|---|
| What it uses | One function | Several parts, often with a database | The whole app in a real browser |
| Speed | Milliseconds | Tenths of a second to seconds | Seconds or more |
| When it fails, you know | Exactly which function | Which feature | Something on this path is broken |
| How many to have | Many | Some | A few, for critical paths |

---

## Which tests are worth writing first

You don't need hundreds of tests. You need the right ten.

Start with your **critical paths**: the few things in your app that cost money, lose data or leak data when they break. For most apps that means:

1. **Sign-up and login.** If they break, nobody can use anything.
2. **Payments.** Checkout, prices, discounts, subscriptions.
3. **Saving the user's main data.** Whatever your app is for: notes, bookings, invoices.
4. **Authorization.** "User B can't see or change user A's data." These bugs are invisible during normal use, so tests are the best way to keep them fixed.
5. **Any calculation involving money, dates or limits.**

A simple question helps: **"If this broke tonight, would I need to fix it before breakfast?"** If yes, it deserves a test. The color of a button doesn't.

One more rule: **every time you find a bug, first write a test that fails because of it, then fix it.** That test stops the same bug from coming back. Bugs that came back are some of the most frustrating regressions, and this rule ends them.

---

## Ask for tests before the change, not after

Here is a workflow that fits building with AI:

1. **Before changing anything:** ask the AI, *"Write tests for how checkout works right now. Don't change any app code."*
2. **Run the tests.** They should all pass. If one fails, either the test is wrong or you found an existing bug. Decide which.
3. **Commit.** Now you have a save point with tests that describe working behavior.
4. **Ask for the change** you actually wanted.
5. **Run the tests again.** If an old test fails, the change broke something that used to work. That is your regression, caught on your laptop.

Writing tests first works because at step 1 the AI describes the app **as it is**, while it still works. Tests written after a change often describe the app as the AI changed it, bugs included.

---

## How it goes wrong

**The AI "fixes" the test instead of the code.** A test fails, and the AI edits the expected value from 4000 to 0 so it passes. Now the test protects the bug. Tell your AI: *"Don't change existing tests unless I agree the behavior should change."*

**Tests that test nothing.** Look out for `expect(true).toBe(true)`, tests with no `expect` at all, or tests marked `test.skip`, which Vitest doesn't run. They make the results look green while checking nothing.

**Pretending everything.** Tests sometimes replace a real part, like the database or a payment service, with a fake stand-in called a **mock**. Mocks are useful, but if a test mocks the very thing it is supposed to check, it can only pass.

**Tests that touch production.** A test that signs up users or deletes rows must never be pointed at the real database or use live payment keys.

**Lots of tests, but not on the critical path.** Fifty tests for small text helpers and none for checkout gives a good feeling and little protection.

**Tests nobody runs.** Tests only help if they run after every change. Remembering to run them is the weak spot. The next lesson fixes that.

> **Go deeper:** [Stop broken code before it ever goes live](/lessons/ci-cd) (Level 3) shows how to run your tests automatically on every push.

---

## Test your own app

1. Install Vitest: `npm install -D vitest`.
2. Pick one function in your app that calculates something: a price, a total, a date. If you can't find one, ask your AI to point one out.
3. Ask your AI: *"Write two or three Vitest unit tests for this function, including one unusual case."* Read each test and check the expected values yourself.
4. Run `npx vitest run`. All tests should pass.
5. **Break the function on purpose.** For example, change a `+` to a `-`. Run the tests again. At least one must fail. If none fail, the tests don't check what you think.
6. Undo the break. Run the tests. Green again. Commit.

---

## Takeaways

**Key terms**
- **Automated test:** a small program that checks your code gives the expected result
- **Regression:** something that worked before and broke after a change
- **Unit test:** checks one piece of code on its own; fast and precise
- **Integration test:** checks several parts together, such as a route and a database
- **End-to-end (E2E) test:** a robot user clicks through your app in a real browser
- **Flaky test:** a test that sometimes passes and sometimes fails with no code change
- **Mock:** a fake stand-in for a real part, used inside tests
- **Critical path:** a feature that costs money, loses data or leaks data when it breaks

**Red flags**
- The AI edited a test's expected value to make it pass
- Tests with no `expect`, or marked `test.skip`
- A test file that imports your production database settings
- No tests for sign-up, payments or "users can't see each other's data"
- Tests that have never failed, not even once on purpose

**Ask your AI**
- *"Before you change anything, write tests for how this feature works now. Don't change app code."*
- *"List the critical paths in my app: anything that handles money, saves user data or checks who can see what. Which ones have no tests?"*
- *"Write a failing test that reproduces this bug. Then fix the bug, and show me the test passing."*
- *"Don't edit existing tests to make them pass. If a test fails, tell me which behavior changed."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Watch mode.** Running `vitest` without `run` keeps it open and re-runs tests whenever you save a file. Vitest's docs say it switches to a single run automatically in CI (automated checks on a server, covered in the next lesson) or in a terminal that isn't interactive. `vitest run` always does a single run, which is what you want in scripts. A common `package.json` setup is `"test": "vitest run"`.

**Test-driven development (TDD).** Some developers always write the test first, watch it fail, then write the code that makes it pass. The "write a failing test for each bug" rule in this lesson is a small piece of that idea.

**The test pyramid and the testing trophy.** The **test pyramid**, made popular by Mike Cohn's 2009 book *Succeeding with Agile* and described by Martin Fowler, says to have many unit tests, fewer integration tests and very few end-to-end tests. Kent C. Dodds' **testing trophy** puts integration tests in the largest slice, and adds "static" checks (like type checking and linting) at the base, arguing that tests resembling real use give more confidence. Both agree on the basics: E2E tests are expensive, so keep them for the paths that matter.

**Coverage.** Test tools can report **code coverage**: the percentage of your code lines that ran during tests. It shows what you never tested, which is useful. But a line that ran isn't a line that was checked. A test with no `expect` can still produce high coverage.

**Keeping tests independent.** Each test should set up the data it needs and not depend on another test running first. Tests that share data tend to pass alone and fail together, or the other way round. Using unique values (like the `Date.now()` email above) or resetting the test database between tests avoids this.

**Playwright and your app's address.** Playwright's config can start your development server before the tests run, and can point tests at a different address, such as a preview deployment. If your previews are protected by a login, your platform's docs explain how automated tools can get past it.

</details>

## References

- [Getting Started](https://vitest.dev/guide/), [Command Line Interface](https://vitest.dev/guide/cli) and [Test API reference](https://vitest.dev/api/test): Vitest documentation. Installing with `npm install -D vitest`, importing `test` and `expect`, watch mode versus `vitest run` (and the automatic single run in CI), and `test.skip` not running a test.
- [Installation](https://playwright.dev/docs/intro): Playwright documentation. `npm init playwright@latest`, `npx playwright test`, and tests running in Chromium, Firefox and WebKit by default.
- [Web server](https://playwright.dev/docs/test-webserver): Playwright documentation. Starting your development server before the tests and setting a `baseURL` to test another address.
- [Supertest README](https://github.com/forwardemail/supertest): Supertest. Sending HTTP requests to your app inside a test, without a browser.
- [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html): Martin Fowler (2012). Many more unit tests than end-to-end tests, and Mike Cohn's "test automation pyramid" from *Succeeding with Agile* (2009).
- [On the Diverse And Fantastical Shapes of Testing](https://martinfowler.com/articles/2021-test-shapes.html): Martin Fowler (2021). The pyramid compared with shapes like the trophy that favor integration tests.
- [The Testing Trophy and Testing Classifications](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications): Kent C. Dodds (2021). The trophy with static checks at the base, and "the more your tests resemble the way your software is used, the more confidence they can give you".
