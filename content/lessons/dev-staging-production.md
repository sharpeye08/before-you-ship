---
title: "Why you should never test on your real users"
slug: dev-staging-production
order: 35
level: 3
levelName: Shipping
concepts: [Environments, Development, Staging, Production, Test data, Preview deployments]
readTime: 13 min
quiz:
  - question: "Your laptop's .env file has the same DATABASE_URL as production, because you wanted \"real data\" while building. You test a new \"delete old accounts\" script on your laptop. What happens?"
    options:
      - text: "Nothing serious, because the script runs on your laptop"
      - text: "The script deletes accounts in the real production database"
        correct: true
      - text: "The hosting platform blocks the script because it isn't deployed"
      - text: "The database makes a copy for your laptop automatically"
    explanation: "Code doesn't know where it is running. It does what its settings say. If your laptop's settings point at the production database, your laptop is changing production."

  - question: "Which setup keeps your staging environment from hurting real users?"
    options:
      - text: "Staging uses the same database as production, but only you open it"
      - text: "Staging uses production's keys, but on a different web address"
      - text: "Staging has its own database, test API keys and fake data"
        correct: true
      - text: "Staging has no database at all"
    explanation: "An environment is code plus settings plus data plus outside services. Staging only protects production if every one of those is separate. A different web address alone changes nothing."

  - question: "You open a pull request. The hosting platform builds a preview deployment. Which database does the preview use?"
    options:
      - text: "Always a fresh, empty database created by the platform"
      - text: "Always the production database"
      - text: "No database, because previews can't connect to databases"
      - text: "Whatever DATABASE_URL you set for the Preview environment on the platform"
        correct: true
    explanation: "Previews read the environment variables you set for Preview. If you copied the production values there, your unfinished code runs against real users' data."

  - question: "To get realistic test data, a teammate suggests copying the production database to everyone's laptop. What's the main problem?"
    options:
      - text: "Real people's personal data ends up in many less protected places"
        correct: true
      - text: "Copying a database is not possible"
      - text: "The app will run faster than in production"
      - text: "Laptops can't run databases"
    explanation: "Your users gave you their data to use your app, not to be test material. Every copy is one more place it can leak from: a lost laptop, a public preview link, a chat with an AI tool. Use fake seed data instead."

  - question: "Your staging site works. After you deploy the same code to production, a page crashes because a database column is missing. What is the most likely cause?"
    options:
      - text: "Production computers are slower than staging computers"
      - text: "The code was changed during the deploy"
      - text: "A migration ran on staging's database but not on production's"
        correct: true
      - text: "Staging always hides errors"
    explanation: "Each environment has its own database, so each one needs every migration. When the environments drift apart, \"works in staging\" stops meaning \"works in production\"."

  - question: "Your app should send real emails only in production. How should the code decide which environment it is in?"
    options:
      - text: "By checking whether NODE_ENV is \"production\""
      - text: "By reading an environment variable you set to a different value in each environment"
        correct: true
      - text: "By checking the time of day"
      - text: "By asking the user"
    explanation: "Frameworks such as Next.js set NODE_ENV to \"production\" for any built app, including previews and staging. Use your own variable, such as APP_ENV, or the one your platform provides, and set it separately for each environment."
---

# Why you should never test on your real users

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Production:** the live version of your app that real users visit. *([It works on my laptop. Why can't my friend open it?](/lessons/localhost-vs-production))*
> - **Environment variables:** settings and secrets kept outside your code, like `DATABASE_URL` in a `.env` file. *([Your app's secrets don't belong in your code. Here's where they go](/lessons/environment-variables))*
> - **Preview deployment:** a separate copy of your app, with its own web address, built from a branch or pull request. *([From your laptop to a real website in one push](/lessons/hosting-platforms))*
> - **Migration:** a file that changes your database's structure, like adding a column. *([You renamed one column and the live app crashed](/lessons/database-migrations))*

## "Test test asdf"

You run a small app for language tutors. You ask your AI to add a feature: every Monday, email each inactive student a reminder.

To try it, you run the email script on your laptop. Months ago, you copied the production `DATABASE_URL` into your `.env` file, because an empty app was boring to build. Your email service key in `.env` is the same one production uses.

You press Enter. The script finds 3,400 real students and sends each one an email that says "test test asdf".

A minute later, you try the checkout page on your laptop with your own card. The payment key in `.env` is also the live one. That charge was real too.

Nothing in your code was wrong. Your laptop was **connected to the real world**. This lesson is about keeping practice and real life apart.

---

## An environment is a whole world, not a web address

When people say "environment", they often mean "where the code runs": your laptop, or the hosting platform. That's only one part.

An **environment** is everything your running code touches:

1. **The code:** which version is running
2. **The settings:** its environment variables
3. **The data:** which database it reads and writes
4. **The outside services:** which payment, email and storage accounts its keys belong to

Change the web address but keep the same database and keys, and you are still in production. The students in the story above were reached from a laptop on `localhost`.

Most apps use three environments:

| | Development | Staging | Production |
|---|---|---|---|
| **Where** | Your laptop (`localhost`) | A deployed copy, like a preview link | Your real domain |
| **Who uses it** | You | You, your team, testers | Real users |
| **Data** | Fake data you made | Fake data, shaped like real data | Real users' data |
| **Payment keys** | Test keys | Test keys | Live keys |
| **Emails** | Not sent, or sent to a test inbox | Sent only to your team | Sent to real people |
| **If it breaks** | Nobody notices | Your team notices | Users notice |

**Development** is where you build. It breaks all the time, and that's fine.

**Staging** is a dress rehearsal. It should be as close to production as possible: same code, same kind of hosting, same database structure. The only difference is that nobody real depends on it.

**Production** is the show.

Think of a theater. You rehearse lines at home. Then you do a dress rehearsal on the real stage, with costumes and lights, but with empty seats. Then the audience comes in.

**Where the comparison stops working:** in a theater, a rehearsal can't accidentally perform for the audience. In software, it can. One copied line in a `.env` file connects your "rehearsal" to every real user you have.

---

## Same code, different settings

Your code should be the same in every environment. What changes is the settings. You met this idea in [Your app's secrets don't belong in your code. Here's where they go](/lessons/environment-variables). Now it matters much more:

```text
                 development          staging                 production
DATABASE_URL     local test database  staging database        production database
STRIPE_KEY       sk_test_...          sk_test_...             sk_live_...
EMAIL_MODE       log only             team inbox only         send
APP_ENV          development          staging                 production
```

Here is what each line means:

- **`DATABASE_URL`:** every environment has **its own database**. This is the most important line.
- **`STRIPE_KEY`:** payment services such as Stripe give you two kinds of keys. Stripe's test keys start with `sk_test_`, and payments made with them never move real money. Live keys start with `sk_live_` and charge real cards. Only production gets the live key.
- **`EMAIL_MODE`:** a setting you add yourself, so non-production environments can't email real people.
- **`APP_ENV`:** a variable you create to tell your code which environment it's in. You'll see why you need your own below.

Most outside services work like Stripe here. Email, storage and login providers usually let you create a separate test account, project or key. Use one for each environment, so a leak or a mistake in one can't touch the others.

---

## Preview deployments are your staging

You already have a staging environment and may not know it. When you open a pull request, your hosting platform builds a **preview deployment** with its own address. That preview is a short-lived staging environment: real hosting, real build, not your real domain.

But a preview is only safe if its **settings** are separate. Both Vercel and Netlify let you give each environment variable a different value for production and for previews:

- **Vercel** has three built-in environments: Development, Preview and Production. Each variable can be set for one, two or all three.
- **Netlify** calls them **deploy contexts**, such as `production`, `deploy-preview`, `branch-deploy` and `dev`.

So the question to ask is: **what did you put in the Preview column?** If you chose "all environments" when you added `DATABASE_URL`, every preview of every unfinished branch writes to your real database.

### A permanent staging site

Previews come and go with each pull request. Some teams also want one staging site that always exists, at an address like `staging.example.com`. A common way is a long-lived `staging` branch: you merge work into `staging` first, test there, then merge `staging` into `main`. Vercel supports this on every plan by giving a branch its own domain and its own variables. Its paid plans also let you create a named custom environment.

For a small app with one or two builders, preview deployments with a separate database are usually enough. A permanent staging site starts to pay off when several people need to test together, or when you need to try a migration on a copy before production.

---

## How it goes wrong

### Mistake 1: One database for everything

This is the story from the start. It usually begins with good intentions: "I need real-looking data to build the dashboard." Then a test script, a migration you're trying out, or an AI agent that "cleans up old rows" runs against production.

The danger grows with AI tools. An AI agent that can run commands on your laptop can also run them against whatever database your `.env` points to.

> **Go deeper:** [The AI deleted your production database. Now what?](/lessons/backups) (Level 2) covers what to do when this has already happened.

### Mistake 2: Live keys outside production

Live payment keys on your laptop mean every test checkout is a real charge. A live email key means every test sends real emails. A live webhook setup can send real payment events to your laptop's code, or test events to production.

### Mistake 3: Previews using production settings

This one is hard to see, because the preview looks fine. You click "Sign up" on a preview, and a fake account appears in your real users table. Worse, a half-finished migration or a buggy "delete" button on a branch can change real data before anyone reviews the code.

Previews are also easy to share. A link in a pull request comment, a chat or a bug report is a way into whatever data that preview can reach.

### Mistake 4: Copying real users' data into testing

"Let's copy production into staging so the data is realistic." It sounds sensible, but now your real users' names, emails and messages live in more places: staging, every laptop, maybe a preview link, maybe a chat with an AI tool when you paste an error. Each copy is usually less protected than production.

Your users gave you their data so they could use your app. They didn't agree to be test material. Many privacy laws also limit how personal data can be used and copied, so treat a copy of production as a decision to think about, not a default.

### Mistake 5: Environments that drift apart

Staging only predicts production if they match. They drift when:

- a migration ran on staging's database but not on production's (or the other way round)
- staging has a variable that production is missing
- staging runs an older version of a package

Then "it worked in staging" stops meaning anything. Each database needs the same migrations, applied in the same order.

> **Go deeper:** [It only breaks in production. How do you find out why?](/lessons/debugging-production) (Level 3) covers how to find the difference when this happens.

---

## What good looks like

### Separate everything that touches the real world

- **A separate database per environment.** At minimum: production has its own, and development and previews use another one.
- **Test keys everywhere except production.** Live keys exist only in the production column of your hosting platform's settings. They are never in your `.env` file.
- **Separate accounts or projects at outside services**, where they offer them.

### Fill test databases with fake data

A **seed script** is a small program that fills an empty database with made-up data: users, posts, orders. Ask your AI to write one. Use addresses at `example.com`, which is reserved for examples and never belongs to a real person.

Because the data is fake, you can delete and rebuild it whenever you want. That is something you can never do with production.

### Make the app refuse dangerous mixes

People make mistakes when they copy settings. So let the app check itself when it starts:

```js
const appEnv = process.env.APP_ENV; // "development", "staging" or "production"
const stripeKey = process.env.STRIPE_KEY ?? "";
if (appEnv !== "production" && stripeKey.startsWith("sk_live_")) {
  throw new Error("Live payment key outside production. Refusing to start.");
}
if (appEnv === "production" && stripeKey.startsWith("sk_test_")) {
  throw new Error("Test payment key in production. Refusing to start.");
}
```

In plain English:

- **Lines 1–2:** read which environment this is, and the payment key. `?? ""` means "if the key is missing, use empty text instead".
- **Lines 3–5:** if this isn't production but the key is a live one, stop the app with a clear error.
- **Lines 6–8:** if this is production but the key is a test one, also stop. Otherwise real customers would "pay" with fake money and get their orders for free.

The app crashing at start-up sounds bad, but it is the best moment to fail: before any user or any real money is involved.

**Why not use `NODE_ENV`?** Many frameworks set a variable called `NODE_ENV` to `"production"` whenever the app is built for deployment. A preview is built the same way, so `NODE_ENV` is usually `"production"` on previews and staging too. It tells you how the code was built, not which environment it serves. Use your own variable, or the one your platform gives you (see Going deeper).

### Make it obvious where you are

Show a colored banner, like "STAGING", on every page outside production. It sounds small, but it stops you from testing "delete account" in the wrong browser tab.

### Move changes in one direction

Changes go development → staging (or a preview) → production. Never the other way. Migrations follow the same path: run them on a test database first, then on production.

---

## Test your own app

Ten minutes, no new tools.

1. **Compare databases.** Open your `.env` file and your hosting platform's environment variables page. Is your laptop's `DATABASE_URL` the same as production's? If yes, fix that first.
2. **Look for live keys.** Search your `.env` for `live` (for example `sk_live_`). Live keys should not be on your laptop.
3. **Check the Preview column.** On your hosting platform, open each variable and see which environments it applies to. Which database does a preview use?
4. **Prove it with a fake account.** Open a preview link and sign up as `preview-test@example.com`. Then check your production database or admin page. If that account appears there, your previews are using production data.
5. **Check emails.** Find where your app sends emails. Is there anything stopping it from emailing real people from your laptop?

---

## Takeaways

**Key terms**
- **Environment:** the code plus its settings, data and outside services
- **Development:** your laptop, with fake data and test keys
- **Staging:** a production-like copy that real users don't depend on
- **Production:** the live app with real users, real data and real money
- **Test keys and live keys:** separate keys from services like Stripe; only live keys touch real money
- **Seed script:** a program that fills a test database with fake data

**Red flags**
- Your `.env` has the same `DATABASE_URL` as production
- A live payment or email key on your laptop
- Environment variables set to "all environments" without thinking about it
- "Let's copy the production database so we have realistic data"
- Code that uses `NODE_ENV` to decide whether to send real emails or charge real cards
- "It worked in staging" when staging's database is several migrations behind

**Ask your AI**
- *"List every environment variable my app reads. For each one, tell me whether it must be different in development, preview and production."*
- *"Write a seed script that fills my development database with fake users and data, using example.com email addresses."*
- *"Add a start-up check that stops the app if a live payment key is used outside production, or a test key inside production."*
- *"Find every place my app sends emails or charges money. How do I make sure none of them can reach real people from development or previews?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Variables your platform sets for you.** Vercel sets `VERCEL_ENV` to `production`, `preview` or `development`, and `VERCEL_TARGET_ENV` to the name of a custom environment when you use one. Netlify sets `CONTEXT` to `production`, `deploy-preview`, `branch-deploy` or `dev`. You can use these instead of your own `APP_ENV`, but your own variable keeps the code portable between platforms.

**`NODE_ENV` in Next.js.** The Next.js docs list three allowed values: `production`, `development` and `test`. If you don't set it, `next dev` uses `development` and every other command uses `production`. That's why `NODE_ENV` can't tell staging from production.

**Staging options on Vercel.** Vercel's docs describe three ways: a custom environment named `staging` (Pro and Enterprise plans), a preview branch with its own domain and branch-specific variables (all plans), and a "staged" production deployment you check before promoting it. The last one uses production variables, so it touches production data. Vercel also notes that the very first deployment of a new project is always a production deployment, built with production variables.

**Who can open your previews.** Vercel's docs say new projects start with Standard Protection, which asks preview visitors to log in with a Vercel account that has access. Teams can change that default, and settings differ between platforms. Check yours before assuming a preview is private.

**Database branches.** Some database services can create a separate database per preview. Neon creates "branches" that are copy-on-write clones: the branch starts with the parent's data, and changes stay on the branch. This is fast and realistic, but if the parent is production, the branch contains real users' data. Supabase Branching does the opposite by default: new branches start with no data from the main project, and you fill them with a seed file.

**Stripe sandboxes.** Stripe now calls its test areas "sandboxes". Each sandbox has its own test keys (`pk_test_`, `sk_test_`), and objects in a sandbox can't be used in live mode. In a sandbox, card networks don't process payments.

**When you really need production-like data.** Some bugs only appear with real data shapes, like very long names or unusual characters. Teams handle this by **anonymizing**: copying data while replacing names, emails and other personal details with fake ones. It is harder than it sounds, because personal details hide in free-text fields, file uploads and logs.

</details>

## References

- [Environments](https://vercel.com/docs/deployments/environments): Vercel documentation. The Local, Preview and Production environments, custom environments on Pro and Enterprise, the three staging options, staged production deployments using production variables, the first deployment always being a production one, and Standard Protection for previews.
- [System environment variables](https://vercel.com/docs/environment-variables/system-environment-variables): Vercel documentation. `VERCEL_ENV` and `VERCEL_TARGET_ENV` and their values.
- [Deploy overview: deploy contexts](https://docs.netlify.com/deploy/deploy-overview/) and [Environment variables](https://docs.netlify.com/build/configure-builds/environment-variables/): Netlify documentation. The `production`, `deploy-preview`, `branch-deploy` and `dev` contexts, and the `CONTEXT` build variable.
- [How to use environment variables in Next.js](https://nextjs.org/docs/app/guides/environment-variables): Next.js documentation. The allowed `NODE_ENV` values, and `production` being used for every command except `next dev`.
- [API keys](https://docs.stripe.com/keys): Stripe documentation. `sk_test_` and `sk_live_` keys, sandboxes versus live mode, objects that can't cross between them, and card networks not processing sandbox payments.
- [Branching](https://neon.com/docs/introduction/branching) (Neon) and [Branching](https://supabase.com/docs/guides/deployment/branching) (Supabase): database branches as copy-on-write clones that start with the parent's data, versus Supabase branches that start empty and are filled from a seed file.
- [RFC 2606: Reserved Top Level DNS Names](https://www.rfc-editor.org/rfc/rfc2606.html): IETF. `example.com` is reserved for use in examples.
