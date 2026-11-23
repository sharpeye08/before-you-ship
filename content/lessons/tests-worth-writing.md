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
    explanation: "A regression is a feature that worked before and broke because of a later change. AI tools make regressions more likely. They change many files at once, and they don't remember what was working."

  - question: "This week, you have time to write only a few tests. Which tests should come first?"
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
    explanation: "A unit test checks one small piece of code on its own. It runs in milliseconds. But it can't tell you if the pieces work together."

  - question: "You ask the AI to change the checkout. After the change, two old tests fail. The AI then edits those tests so that they pass. What should you do?"
    options:
      - text: "Accept it. Passing tests mean the code is correct."
      - text: "Delete all the tests so they stop getting in the way"
      - text: "Turn off the tests until next week"
      - text: "Check if the behavior was supposed to change. If not, the code is wrong, not the tests."
        correct: true
    explanation: "Tests describe what must stay true. If a test fails after a change, there are two possible reasons. The change broke something, or you wanted to change that behavior. Only you can decide which. An AI that rewrites tests to match broken code hides the regression."

  - question: "You write a new test, and it passes the first time. How can you check that it really tests something?"
    options:
      - text: "Run it ten more times"
      - text: "Break the code on purpose and check that the test fails"
        correct: true
      - text: "Count how many lines the test has"
      - text: "Ask the AI if it is a good test"
    explanation: "A test that can't fail is useless. When you break the code on purpose, you prove that the test notices. Then undo the break."

  - question: "Your end-to-end test opens a real browser and signs up a new user. Which statement is true?"
    options:
      - text: "It runs as fast as a unit test"
      - text: "It should run against the production database, so the data is realistic"
      - text: "It checks the whole path a user takes, but it is slower and breaks more often for reasons unrelated to your change"
        correct: true
      - text: "It replaces the need for any other tests"
    explanation: "End-to-end tests give the most confidence per test, because they work like a real user. They are also the slowest and the most fragile. Keep a few for your critical paths. Always run them against a test environment."
---

# The AI fixed one bug and quietly broke three others

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Commit:** a saved snapshot of your code that you can go back to. *([The AI broke your working app. Here's your undo button](/lessons/git-as-an-undo-button))*
> - **API route:** an address on your server that your app's pages talk to, like `/api/checkout`. *([The hidden conversation behind every button you tap](/lessons/what-is-an-api))*
> - **npm and package.json:** npm installs packages; `package.json` lists them and the commands your project can run. *([It works on my machine, but not on yours. Blame the packages](/lessons/packages-and-dependencies))*
> - **Environments:** development, staging and production, each with its own database and keys. *([Why you should never test on your real users](/lessons/dev-staging-production))*

## The fix that cost you a weekend

Your shop app has a bug: the discount code `SAVE10` doesn't work. You ask your AI to fix it. It changes four files. You open the checkout and type `SAVE10`, and the price drops by 10%. Fixed. You deploy.

On Monday, three different problems wait for you:

1. Every order **without** a discount code since Friday cost $0.
2. The receipt emails show a total that is different from what customers paid.
3. Your weekly sales report says that you sold almost nothing.

All three problems come from one place. A **function** is a named piece of code that takes some inputs and gives back a result. To fix the discount, the AI changed `calculateTotal`, the function that adds up an order. With a code, it worked. Without a code, it returned zero. And checkout, the receipt emails and the sales report all use that same function.

![The AI changes calculateTotal to fix SAVE10. Without a code, the function now returns 0. Checkout, the receipt emails and the sales report all use this function, so all three become wrong.](/diagrams/tests-worth-writing-1.svg)

You tested the thing that you asked for. You didn't test the three things that you didn't think about. Nothing crashed. No error appeared. The app continued to run, silently wrong, for a whole weekend.

This is the most common way that apps built with AI break. There is no big crash. Instead, something that used to work changes without a sound.

---

## Regressions: when working things stop working

Sometimes something **used to work**, and then it stopped working after a change. This kind of bug is a **regression**. The app went backwards.

Regressions happen in every project. But when you build with AI, they become more likely:

- **The AI changes many files at once.** A small request can change code that other features need.
- **The AI doesn't remember what was working.** Each chat starts from nothing. It doesn't know that checkout without a code was fine yesterday.
- **You can't click through everything after every change.** You make ten changes a day. Nobody tests sign-up, login, checkout, password reset and every settings page by hand after each one.

You need something that remembers what must stay true and checks it for you every time. Tests do that.

---

## What an automated test is

An **automated test** is a small program. It uses your app's code and checks that the result is what you expect. You write it once. Then a tool runs it in seconds, as often as you like.

Think of a checklist that ticks itself. "Price without a code: correct. Price with SAVE10: correct. Other users' invoices: hidden." Every time you run the tests, the tool checks each item again.

Here is a real test. It uses **Vitest**, a popular test tool for JavaScript projects:

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

- **Line 1:** the file's name, and a note that the import lines are not shown here. Import lines load code from other files. The real file starts with two tools from Vitest (`test` and `expect`) and the `calculateTotal` function from your app.
- **Line 2:** a pretend cart with two items at $20.00 each. Prices are in cents, so 2000 means $20.00. Computers can make very small rounding errors with decimals. So apps often store money in whole cents.
- **Lines 3–5:** a test named "no discount code: full price". It calls `calculateTotal` with no code. It **expects** the answer to be 4000 cents.
- **Lines 6–8:** a second test. With `SAVE10`, the answer must be 3600.

To install Vitest, run `npm install -D vitest`. To run the tests, use `npx vitest run`. Vitest prints each test with a pass or fail mark. If a result is wrong, it shows what it expected and what it got.

Imagine that you had this file on Friday. The AI's fix would have made the first test fail. In seconds, Vitest would have told you that it expected 4000 and got 0. You would have known before any customer paid nothing.

---

## Three kinds of tests

Tests are different in how much of your app they use at the same time.

![Four parts of an app in a row: the browser, an API route, a function and the test database. A unit test uses only the function. An integration test uses the API route, the function and the database. An end-to-end test uses the whole app.](/diagrams/tests-worth-writing-2.svg)

### Unit tests: one piece on its own

The test above is a **unit test**. It checks one small piece of code (a "unit") with no database, no server and no browser.

- **Fast:** hundreds run in a second or two.
- **Precise:** when one fails, you know exactly which function broke.
- **Limited:** every piece can work alone while the connections between the pieces are broken.

Best for: calculations, rules and anything with many cases, like prices, discounts, dates and permissions.

### Integration tests: several pieces together

An **integration test** checks that several parts work together, for example an API route and the database. Remember the bug from [Change one number in the URL, see everyone's invoices](/lessons/logged-in-doesnt-mean-allowed)? Any user could read any invoice. Here is a test that finds that bug:

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

- **Line 1:** the import lines that are not shown. `request` comes from **Supertest**, a package that sends requests to your server inside a test. It doesn't open a browser. `app` is your server.
- **Line 1, continued:** `loginAs` and `createInvoice` are small **helper** functions. You (or your AI) write them once for your tests. `loginAs` logs a test user in and returns the user's session cookie. `createInvoice` creates an invoice in the test database.
- **Lines 3–4:** create an invoice that belongs to user A. Then log in as user B.
- **Lines 5–6:** as user B, ask for user A's invoice. The test expects "404 Not Found". If the ownership check ever disappears, this test fails.

Integration tests need a database. So they must use a **test database**, never production. That is the rule from [Why you should never test on your real users](/lessons/dev-staging-production). Many test setups empty the test database before each run. Then every run starts in the same way.

- **Slower** than unit tests, because they use a real database.
- **Find more problems:** wrong database queries, missing checks, routes that don't connect.

### End-to-end tests: a robot user in a real browser

An **end-to-end test** (often shortened to **E2E**) opens a real browser. It uses your app the way a person does: it types, clicks and reads the screen. A popular tool for this is **Playwright**:

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
- **Line 3:** open the sign-up page of the app that runs on your laptop.
- **Lines 4–5:** find the field labeled "Email" and type an address. Then type the password. `Date.now()` adds the current time to the email, so every run signs up a new user. If not, the second run would fail with "email already taken".
- **Line 6:** find the button called "Sign up" and click it.
- **Line 7:** check that the word "Welcome" appears on the screen.

To set up Playwright, run `npm init playwright@latest`. To run the tests, use `npx playwright test`. A **browser engine** is the part of a browser that shows pages. By default, Playwright can test in three browser engines: Chromium (Chrome's engine), Firefox and WebKit (Safari's engine).

- **Most realistic:** it tests the frontend, the backend and the database together.
- **Slowest:** seconds per test, not milliseconds.
- **Most fragile:** E2E tests can be **flaky**. A flaky test passes sometimes and fails sometimes, with no code change. For example, it fails when a page loads slowly.
- **Dangerous when flaky:** a flaky test teaches people to ignore red results. That is worse than no test.

### A comparison

| | Unit | Integration | End-to-end |
|---|---|---|---|
| What it uses | One function | Several parts, often with a database | The whole app in a real browser |
| Speed | Milliseconds | Tenths of a second to seconds | Seconds or more |
| When it fails, you know | Exactly which function | Which feature | Something on this path is broken |
| How many to have | Many | Some | A few, for critical paths |

---

## Which tests are worth writing first

You don't need hundreds of tests. You need the right ten.

Start with your **critical paths**: the few things in your app that cost money, lose data or leak data when they break. For most apps, these are:

1. **Sign-up and login.** If they break, nobody can use anything.
2. **Payments.** Checkout, prices, discounts, subscriptions.
3. **Saving the user's main data.** Whatever your app is for: notes, bookings, invoices.
4. **Authorization.** "User B can't see or change user A's data." You can't see these bugs during normal use. So tests are the best way to keep them fixed.
5. **Any calculation with money, dates or limits.**

A simple question helps: **If this broke tonight, would I need to fix it before breakfast?** If the answer is yes, write a test for it. The color of a button doesn't need a test.

One more rule: **every time you find a bug, first write a test that fails because of it. Then fix the bug.** That test stops the same bug from coming back. Bugs that come back are some of the most frustrating regressions, and this rule ends them.

---

## Ask for tests before the change, not after

Here is a workflow for building with AI:

1. **Before you change anything,** ask the AI: *"Write tests for how checkout works right now. Don't change any app code."*
2. **Run the tests.** They should all pass. If one fails, the test is wrong or you found an existing bug. Decide which.
3. **Commit.** Now you have a save point with tests that describe working behavior.
4. **Ask for the change** that you wanted.
5. **Run the tests again.** If an old test fails, the change broke something that used to work. You found your regression on your laptop.

Why does this order work? At step 1, the AI describes the app **as it is**, while it still works. Tests written after a change often describe the app as the AI changed it, with the bugs.

---

## How it goes wrong

**The AI "fixes" the test instead of the code.** A test fails, and the AI changes the expected value from 4000 to 0, so the test passes. Now the test protects the bug. Tell your AI: *"Don't change existing tests unless I agree the behavior should change."*

**Tests that test nothing.** Look for these:

- `expect(true).toBe(true)`
- tests with no `expect` at all
- tests marked `test.skip`, which Vitest doesn't run

They make the results look green, but they check nothing.

**Fake parts everywhere.** Sometimes a test replaces a real part, like the database or a payment service, with a fake part called a **mock**. Mocks are useful. But if a test replaces the thing that it must check with a mock, the test can only pass.

**Tests that touch production.** A test that signs up users or deletes rows must never use the real database or live payment keys.

**Many tests, but not on the critical path.** Maybe you have fifty tests for small text helpers and none for checkout. That gives a good feeling but little protection.

**Tests that nobody runs.** Tests help only if they run after every change. People forget to run them. The next lesson fixes that.

> **Go deeper:** [Stop broken code before it ever goes live](/lessons/ci-cd) (Level 3) shows how to run your tests automatically on every push.

---

## Test your own app

1. Install Vitest: `npm install -D vitest`.
2. Choose one function in your app that calculates something: a price, a total, a date. If you can't find one, ask your AI to show you one.
3. Ask your AI: *"Write two or three Vitest unit tests for this function, including one unusual case."* Read each test. Check the expected values yourself.
4. Run `npx vitest run`. All tests should pass.
5. **Break the function on purpose.** For example, change a `+` to a `-`. Run the tests again. At least one test must fail. If none fail, the tests don't check what you think.
6. Undo the break. Run the tests, and check that they are green again. Commit.

---

## Takeaways

**Key terms**
- **Automated test:** a small program that checks that your code gives the expected result
- **Regression:** something that worked before and broke after a change
- **Unit test:** checks one piece of code on its own; fast and precise
- **Integration test:** checks several parts together, such as a route and a database
- **End-to-end (E2E) test:** a robot user clicks through your app in a real browser
- **Flaky test:** a test that sometimes passes and sometimes fails with no code change
- **Mock:** a fake part that replaces a real part inside tests
- **Critical path:** a feature that costs money, loses data or leaks data when it breaks

**Red flags**
- The AI edited a test's expected value to make it pass
- Tests with no `expect`, or marked `test.skip`
- A test file that imports your production database settings
- No tests for sign-up, payments or "users can't see each other's data"
- Tests that never failed, not even once on purpose

**Ask your AI**
- *"Before you change anything, write tests for how this feature works now. Don't change app code."*
- *"List the critical paths in my app: anything that handles money, saves user data or checks who can see what. Which ones have no tests?"*
- *"Write a failing test that reproduces this bug. Then fix the bug, and show me the test passing."*
- *"Don't edit existing tests to make them pass. If a test fails, tell me which behavior changed."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Watch mode.** If you run `vitest` without `run`, it stays open. It runs the tests again every time you save a file. Vitest's docs say that it changes to a single run automatically in two cases:

- in CI (automatic checks on a server, covered in the next lesson)
- in a terminal that isn't interactive

`vitest run` always does a single run, which is what you want in scripts. A common `package.json` setup is `"test": "vitest run"`.

**Test-driven development (TDD).** Some developers always write the test first and watch it fail. Then they write the code that makes it pass. The rule in this lesson, "write a failing test for each bug", is a small part of that idea.

**The test pyramid and the testing trophy.** Mike Cohn's 2009 book *Succeeding with Agile* made the **test pyramid** popular, and Martin Fowler describes it. It says to have many unit tests, fewer integration tests and very few end-to-end tests. Kent C. Dodds' **testing trophy** gives integration tests the largest part. It also adds "static" checks (like type checking and linting) at the base. Dodds argues that tests that are more like real use give more confidence. Both ideas agree on the basics: E2E tests are expensive, so keep them for the paths that are important.

**Coverage.** Test tools can report **code coverage**: the percentage of your code lines that ran during tests. It shows what you never tested, which is useful. But a line that ran isn't always a line that a test checked. A test with no `expect` can still give high coverage.

**Keep tests independent.** Each test should set up the data that it needs. It should not need another test to run first. Tests that share data often pass alone and fail together, or the other way round. To prevent this, use unique values (like the `Date.now()` email above) or reset the test database between tests.

**Playwright and your app's address.** Playwright's settings file can start your development server before the tests run. It can also point tests at a different address, such as a preview deployment. If your previews are protected by a login, your platform's docs explain how automated tools can get through it.

</details>

## References

- [Getting Started](https://vitest.dev/guide/), [Command Line Interface](https://vitest.dev/guide/cli) and [Test API reference](https://vitest.dev/api/test): Vitest documentation. Installing with `npm install -D vitest`, importing `test` and `expect`, watch mode versus `vitest run` (and the automatic single run in CI), and `test.skip` not running a test.
- [Installation](https://playwright.dev/docs/intro): Playwright documentation. `npm init playwright@latest`, `npx playwright test`, and tests running in Chromium, Firefox and WebKit by default.
- [Web server](https://playwright.dev/docs/test-webserver): Playwright documentation. Starting your development server before the tests and setting a `baseURL` to test another address.
- [Supertest README](https://github.com/forwardemail/supertest): Supertest. Sending HTTP requests to your app inside a test, without a browser.
- [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html): Martin Fowler (2012). Many more unit tests than end-to-end tests, and Mike Cohn's "test automation pyramid" from *Succeeding with Agile* (2009).
- [On the Diverse And Fantastical Shapes of Testing](https://martinfowler.com/articles/2021-test-shapes.html): Martin Fowler (2021). The pyramid compared with shapes like the trophy that favor integration tests.
- [The Testing Trophy and Testing Classifications](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications): Kent C. Dodds (2021). The trophy with static checks at the base, and "the more your tests resemble the way your software is used, the more confidence they can give you".
