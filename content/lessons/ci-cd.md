---
title: "Stop broken code before it ever goes live"
slug: ci-cd
order: 37
level: 3
levelName: Shipping
concepts: [Continuous integration, Continuous deployment, Pipelines, GitHub Actions, Linting, Type checking, Required status checks]
readTime: 13 min
quiz:
  - question: "Your tests pass on your laptop, but only when you remember to run them. What does CI change?"
    options:
      - text: "It makes your tests run faster on your laptop"
      - text: "It writes the tests for you"
      - text: "A fresh computer runs your checks automatically on every push, so nobody has to remember"
        correct: true
      - text: "It deploys your app without a build"
    explanation: "Continuous integration means every push is checked automatically, on a clean computer. Humans forget, especially in a hurry. CI doesn't."

  - question: "Your app works on your laptop, but CI fails with \"Cannot find module './utils/format'\". What is the most likely reason?"
    options:
      - text: "GitHub Actions doesn't support JavaScript"
      - text: "The file exists on your laptop but was never committed"
        correct: true
      - text: "Your laptop is too slow"
      - text: "The test tool is broken"
    explanation: "CI starts from a fresh computer with only what is in your repository. Files you forgot to commit, or packages missing from package.json, show up there first. That's one of the main reasons to use CI."

  - question: "CI shows a red X on your pull request because one test fails. Your repository has no rules about merging. What happens if you click Merge?"
    options:
      - text: "GitHub refuses to merge"
      - text: "The test is fixed automatically"
      - text: "The hosting platform refuses to deploy"
      - text: "The code merges, and your hosting platform deploys it to production"
        correct: true
    explanation: "A red X is only information until you make it a rule. Without a required status check, GitHub lets you merge, and your hosting platform deploys whatever reaches main."

  - question: "A step in your CI workflow keeps failing. The AI suggests adding continue-on-error: true to that step. What does that do?"
    options:
      - text: "It lets the job pass even when that check fails, so the check stops protecting you"
        correct: true
      - text: "It fixes the error automatically"
      - text: "It runs the step again until it passes"
      - text: "It sends you an email with the error"
    explanation: "continue-on-error makes GitHub Actions treat a failed step as acceptable. The red X turns green, but the problem is still there. Fix the cause, or remove the step on purpose, but don't hide it."

  - question: "Which check would catch a function receiving the text \"20\" when it expects the number 20, without running the code?"
    options:
      - text: "An uptime check"
      - text: "A type check with TypeScript"
        correct: true
      - text: "A preview deployment"
      - text: "npm ci"
    explanation: "TypeScript reads your code and checks that each value matches the type it was labeled with. It finds this mistake before the code ever runs."

  - question: "Your workflow needs an API key to run some tests. Where should the key go?"
    options:
      - text: "Directly in the .github/workflows/ci.yml file"
      - text: "In a comment in the pull request"
      - text: "In the repository's GitHub Actions secrets, read in the workflow with secrets.NAME"
        correct: true
      - text: "In the README so the team can find it"
    explanation: "Workflow files are part of your repository, so anyone who can read the repository can read them. GitHub Actions secrets are stored separately and handed to the workflow when it runs."
---

# Stop broken code before it ever goes live

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Pull request and merge:** a request to bring a branch's commits into `main`, and doing it. *([From your laptop to a real website in one push](/lessons/hosting-platforms))*
> - **Lockfile:** `package-lock.json`, which records the exact version of every package installed. *([It works on my machine, but not on yours. Blame the packages](/lessons/packages-and-dependencies))*
> - **Automated tests:** small programs that check your code still gives the right results. *([The AI fixed one bug and quietly broke three others](/lessons/tests-worth-writing))*
> - **Regression:** something that used to work and broke after a change. *([The AI fixed one bug and quietly broke three others](/lessons/tests-worth-writing))*

## The tests that never ran

After the last lesson, you wrote tests for checkout. They pass. You feel safe.

On Friday evening, a user reports a small typo on the pricing page. You ask the AI to fix it. It fixes the typo and "tidies up" a helper function nearby. You push straight to `main`, because it's only a typo. Your hosting platform builds and deploys it in about a minute.

You didn't run the tests. It was late, and it was only a typo.

The helper function was used by checkout. Checkout is broken until Monday. Your tests would have caught it in four seconds. They just never ran.

Tests only protect you if they run **every time**, including the times you're tired, in a hurry, or sure it's fine. People forget. So we hand the job to a machine, and then we make its answer count: by the end of this lesson, code that fails your checks can't reach your live site at all.

---

## CI: a fresh computer checks every push

**Continuous integration**, or **CI**, means that every time code is pushed, a computer automatically downloads it and runs your checks: tests, and a few other checks you'll meet below. The result appears next to your commit and on your pull request as a green check mark (all passed) or a red X (something failed).

The list of steps that runs on every push is called a **pipeline**.

Think of airport security. Every bag goes through the scanner. There is no "I'm in a hurry" lane. The scanner doesn't care whether the bag belongs to a pilot.

**Where the comparison stops working:** an airport scanner looks for many kinds of danger. CI only runs the checks you gave it. If you have no test for checkout, CI will happily show green while checkout is broken.

### Why a fresh computer matters

Each CI run starts on a clean computer with nothing installed. It gets only what is in your repository. That catches a whole family of "works on my laptop" problems:

- A file you created but never committed
- A package you installed but that isn't in `package.json`
- Code that depends on something only your laptop has, like a file in your Downloads folder
- Tests that only pass because of data left over on your laptop

If it passes on a fresh computer, it isn't only working by luck on yours.

---

## CD: shipping automatically

The **CD** in **CI/CD** stands for one of two related ideas:

- **Continuous delivery:** every change that passes the checks is ready to release, and a person presses the button.
- **Continuous deployment:** every change that passes the checks goes live automatically.

You already have continuous deployment. Your hosting platform deploys every push to `main`. But there's a catch: by default, **it doesn't wait for your checks.** It deploys whatever reaches `main`, whether your tests passed or not.

So the real goal of this lesson is: **only code that passed the checks can reach `main`.** Then automatic deployment becomes safe.

---

## The four checks worth running

### 1. Install exactly what the lockfile says

CI installs packages with `npm ci` instead of `npm install`. The npm docs list the differences: `npm ci` needs a lockfile, installs exactly the versions in it, and stops with an error if `package.json` and the lockfile disagree. It never changes either file. That's what you want in a check: the same packages every time, or a clear failure.

### 2. Lint: find risky code without running it

A **linter** reads your code and flags mistakes and risky patterns, without running it. The most common one for JavaScript is **ESLint**. For example, ESLint's recommended rules flag this:

```js
if (user.role = "admin") {
  showAdminPanel();
}
```

A single `=` **sets** a value. A comparison needs `===`. This code makes every user an admin, then shows them the admin panel. It's an easy slip for a person or an AI, and the linter catches it in milliseconds.

### 3. Type check: find values of the wrong kind

**TypeScript** is JavaScript with labels, called **types**, that say what kind of value each thing should hold: a number, some text, a list of users. The TypeScript checker reads the labels and finds values that don't match:

```ts
function addTax(priceInCents: number) {
  return Math.round(priceInCents * 1.2);
}

addTax("2000");
```

The label `number` says `addTax` needs a number. Line 5 passes the text `"2000"`. TypeScript reports an error like *"Argument of type 'string' is not assignable to parameter of type 'number'"*, before the code ever runs. Without the check, JavaScript would quietly turn it into a number in this case, and give a strange result in others.

The command `tsc --noEmit` runs the checker. `--noEmit` means "check only, don't produce any files".

### 4. Run the tests

Your Vitest tests from the last lesson, in a single run.

### Put them in package.json

Give each check a short name in `package.json`, so you can run the same commands on your laptop and in CI:

```json
"scripts": {
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```

Now `npm run lint`, `npm run typecheck` and `npm test` work everywhere. Many projects also check that the app builds (`npm run build`), so a broken build fails in CI before it reaches the hosting platform.

---

## GitHub Actions: CI that comes with GitHub

**GitHub Actions** is GitHub's built-in CI service. You describe your pipeline in a file in your repository, and GitHub runs it on its own computers.

The file goes in a folder called `.github/workflows/`, for example `.github/workflows/ci.yml`. It's written in **YAML**, a format for settings that uses indentation (spaces at the start of a line) to show what belongs to what. The spaces matter: one wrong indent and the file means something else.

```yaml
on: [push, pull_request]
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v7
        with: { node-version: "lts/*", cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

In plain English:

- **Line 1:** run this **workflow** (GitHub's name for a pipeline file) on every push and every pull request.
- **Lines 2–4:** it has one **job** called `checks`. A job runs on a fresh computer, called a **runner**. `ubuntu-latest` asks for a recent Linux computer.
- **Line 5:** the **steps** of the job, run in order from top to bottom.
- **Line 6:** download your repository's code onto the runner. `actions/checkout` is a ready-made step written by GitHub. The `@v6` picks its major version.
- **Lines 7–8:** install Node.js. `lts/*` means "the newest long-term support version". `cache: npm` saves downloaded packages between runs so later runs are faster. It uses your lockfile to tell when your packages have changed.
- **Lines 9–12:** install packages exactly as the lockfile says, then run the linter, the type checker and the tests.

If any step fails, the job stops there and the run gets a red X. Steps after it don't run.

Commit this file and push. On GitHub, open the **Actions** tab of your repository to watch it run. Each step's output is there, like a build log. On a pull request, the result appears near the Merge button.

**What it costs.** GitHub's docs say standard runners are free for public repositories. Private repositories get a monthly free allowance, and you pay after that. Check GitHub's billing page for current amounts.

---

## Block merges when checks fail

A red X is only a warning. GitHub still lets you click Merge. To make it a rule, use a **ruleset** (GitHub's newer way to protect a branch, which works alongside the older branch protection rules):

1. In your repository, open **Settings** and find **Rulesets** in the sidebar.
2. Create a new **branch ruleset** that targets your default branch (`main`).
3. Turn on **Require a pull request before merging**. Now nobody can push straight to `main`. Every change goes through a pull request.
4. Turn on **Require status checks to pass before merging**, and add the `checks` job from your workflow.
5. Save, and make sure the ruleset is active.

Now the Merge button stays blocked until the checks are green. The Friday-evening typo fix would have needed a pull request, the tests would have run, and the red X would have stopped the merge.

**One limit:** on a free GitHub account, rulesets work on public repositories. For private repositories, you need a paid plan such as GitHub Pro. Without one, your checks still run and still show red, but GitHub won't block the merge. Then the rule lives in your head: never merge red.

### The whole pipeline

Put the last few lessons together, and every change follows this path:

```text
push a branch ──▶ CI runs checks ──▶ preview deployment
                       │
                 open pull request
                       │
            green? ──▶ merge allowed ──▶ production deploy
            red?   ──▶ merge blocked, fix first
```

---

## How it goes wrong

**Checks that don't block.** CI runs, the result is red, someone merges anyway. If nothing stops the merge, sooner or later someone will.

**Green, but checking nothing.** CI is only as good as its checks. A workflow that runs zero tests passes every time. So does one where tests are skipped.

**The AI "fixes" CI by switching it off.** When CI fails, an AI may suggest adding `continue-on-error: true` to a step, putting `|| true` after a command, or deleting the step. `continue-on-error` tells GitHub Actions to let the job pass even when that step fails. `|| true` makes a failing command look successful. All of these turn red into green without fixing anything. Treat them as red flags.

**Secrets pasted into the workflow.** The workflow file is in your repository, so anyone who can read the code can read it. Put keys in **Settings → Secrets and variables → Actions**, and read them in the workflow as `${{ secrets.MY_KEY }}`.

> **Go deeper:** [Your API key leaked, and strangers are spending your money](/lessons/api-key-ended-up-public) (Level 2) explains why a key in your repository is never safe, even after you delete it.

**CI pointed at production.** Integration tests sign up users and delete rows. In CI, they must use a test database, never the production one.

**Flaky and slow checks.** If tests fail randomly, people learn to click "re-run" until green, and then to ignore red. If CI takes 30 minutes, people find ways around it. Fix or remove flaky tests, and keep the checks fast.

---

## What good looks like

- One workflow file that runs lint, type check and tests on every push and pull request
- The same `npm run` commands work on your laptop and in CI
- Nobody pushes straight to `main`; every change goes through a pull request
- Merging is blocked until checks pass (or, on a private free repository, you never merge red)
- Secrets live in GitHub's secrets settings, not in the workflow file
- A failed check is treated as information about your code, not an obstacle to remove

---

## Test your own app

1. Add the three scripts to your `package.json`. Run each one on your laptop first and fix what fails. (If your project doesn't use TypeScript, leave out `typecheck`.)
2. Create `.github/workflows/ci.yml` with the workflow above. Commit and push.
3. Open the **Actions** tab on GitHub and watch the run. Click a step to see its output.
4. Make a branch, break a test on purpose, push, and open a pull request. Watch the red X appear.
5. If your repository allows it, add the ruleset. Check that the Merge button is now blocked.
6. Fix the test, push again, and watch it turn green.

---

## Takeaways

**Key terms**
- **CI (continuous integration):** every push is checked automatically on a fresh computer
- **CD (continuous delivery / deployment):** changes that pass are ready to ship, or ship automatically
- **Pipeline:** the steps that run on every change
- **Linter:** a tool that flags risky code without running it, like ESLint
- **Type check:** checking that every value matches its declared type, with TypeScript
- **GitHub Actions:** GitHub's built-in CI; workflows live in `.github/workflows/`
- **Workflow, job, step, runner:** the pipeline file, a group of steps, one command, the computer that runs it
- **Ruleset:** GitHub rules for a branch, such as "require status checks to pass"

**Which check failed?**
- `npm ci` failed → `package.json` and the lockfile disagree. Run `npm install` on your laptop and commit the lockfile.
- Lint failed → the output names the file, line and rule.
- Type check failed → a value doesn't match its type. Read the first error first.
- Tests failed → something that used to work changed. Read which test, and what it expected.
- Works on your laptop, fails in CI → look for uncommitted files, missing packages or missing environment variables.

**Ask your AI**
- *"Add lint, typecheck and test scripts to my package.json, and a GitHub Actions workflow that runs them on every push and pull request."*
- *"CI failed. Here is the log: [paste]. What is the first error, and what is the fix? Don't skip or disable any check."*
- *"Does my workflow file contain any secrets, or any step that could make a failure look like a success?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Running only once per pull request.** With `on: [push, pull_request]`, a branch with an open pull request runs the workflow twice per push: once for the push and once for the pull request. A common fix is to run on pushes to `main` only, plus all pull requests:

```yaml
on:
  push:
    branches: [main]
  pull_request:
```

By default, `pull_request` workflows run when a pull request is opened, reopened, or gets new commits.

**The `CI` variable.** GitHub Actions always sets an environment variable `CI` to `true`. Many tools check it to tell whether they are running in CI.

**Making your hosting platform wait.** Vercel's **Deployment Checks** can hold a production deployment until the GitHub Actions checks you choose have passed. That protects you even if something reaches `main` without a pull request. Other platforms have their own options; look for "deploy only after checks pass" in their docs.

**Next.js and linting.** Next.js 16 removed the `next lint` command, and `next build` no longer runs the linter. Run ESLint directly, as in this lesson's `package.json`, or lint errors won't stop anything.

**Who can bypass the rules.** For classic branch protection rules, GitHub's docs say people with admin rights (including you, on your own repository) can bypass them by default, unless you turn on "Do not allow bypassing the above settings". Rulesets have a bypass list instead: only the roles, teams or apps you add to it can skip the rules.

**"Require branches to be up to date."** This option makes a pull request include the latest `main` before it can merge. It means more CI runs, but it catches cases where two pull requests each pass alone and break together.

**Pull requests from forks.** When someone without write access opens a pull request from their own copy (a fork) of your repository, GitHub doesn't pass your secrets to that workflow run. This protects your keys from strangers' code.

**Version numbers of actions.** `actions/checkout@v6` and `actions/setup-node@v7` are the versions in GitHub's Node.js guide at the time of writing. New major versions come out from time to time. For extra safety, GitHub's *Secure use* guide explains how to lock a third-party action to one exact version.

</details>

## References

- [Building and testing Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs) and the [actions/setup-node README](https://github.com/actions/setup-node): GitHub. The `actions/checkout@v6` and `actions/setup-node@v7` versions, using `npm ci`, `cache: npm` keyed on the lockfile, and the `lts/*` version alias.
- [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [Variables](https://docs.github.com/en/actions/reference/workflows-and-actions/variables), [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) and [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use): GitHub Docs. `continue-on-error`, the default `pull_request` activity types, secrets not passed to workflows from forks, `CI` always set to `true`, standard runners free for public repositories with a monthly allowance for private ones, and pinning third-party actions to an exact commit.
- [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets), [Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) and [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches): GitHub Docs. Which plans can use rulesets on private repositories, the "require a pull request" and "require status checks" rules, "up to date" branches, bypass lists, and admins bypassing classic branch protection by default.
- [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci): npm Docs. Requires a lockfile, fails if it doesn't match `package.json`, and never writes to either file.
- [no-cond-assign](https://eslint.org/docs/latest/rules/no-cond-assign): ESLint. The recommended rule that flags assignments inside `if` conditions.
- [noEmit](https://www.typescriptlang.org/tsconfig/noEmit.html) and [Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html): TypeScript documentation. Checking without producing files, and the "Argument of type ... is not assignable to parameter of type ..." error.
- [Deployment Checks](https://vercel.com/docs/deployment-checks): Vercel. Holding a production deployment until selected GitHub Actions checks pass.
- [How to upgrade to version 16](https://nextjs.org/docs/app/guides/upgrading/version-16): Next.js. `next lint` removed, and `next build` no longer running the linter.
