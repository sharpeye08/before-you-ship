---
title: "Sign-up takes 10 seconds because of one email"
slug: background-jobs
order: 40
level: 3
levelName: Shipping
concepts: [Background jobs, Queues, Workers, Function time limits, Retries, At-least-once delivery, Job status]
readTime: 14 min
quiz:
  - question: "Your sign-up route saves the user, then waits for an email service to send a welcome email, then replies. The email service is down for an hour. What happens?"
    options:
      - text: "Sign-up works, and the emails are sent later automatically"
      - text: "Sign-up fails or hangs for everyone, even though saving the account is the only part that matters"
        correct: true
      - text: "Nothing, because email services are never down"
      - text: "The browser sends the email instead"
    explanation: "When slow or unreliable work happens inside the request, its problems become the user's problems. The welcome email is not needed to finish signing up, so it belongs in a background job."

  - question: "To make sign-up faster, the AI removes the await before sendWelcomeEmail(user), so the reply goes out immediately. The app runs on serverless functions. What is the risk?"
    options:
      - text: "There is no risk, the email always gets sent"
      - text: "The email is sent twice"
      - text: "After the reply is sent, the platform may stop the function, so the email can be cut off, and any error is lost"
        correct: true
      - text: "The user's password is exposed"
    explanation: "A serverless function only lives to handle a request. Work you start without waiting for it may never finish. Use a tool built for this, such as a queue or your platform's after-the-response feature."

  - question: "What is the job of a worker?"
    options:
      - text: "It takes jobs from the queue and does the slow work, outside of any user's request"
        correct: true
      - text: "It answers users' requests faster"
      - text: "It stores passwords safely"
      - text: "It checks that users are logged in"
    explanation: "The route adds a job to the queue and replies. A separate worker picks up jobs one by one and does the work, like a cook taking order tickets from a rail."

  - question: "Your queue documentation says each job is delivered \"at least once\". What must your job code be able to handle?"
    options:
      - text: "Jobs that never arrive"
      - text: "Jobs that arrive in alphabetical order"
      - text: "Jobs that contain passwords"
      - text: "The same job running twice, without sending two emails or charging twice"
        correct: true
    explanation: "\"At least once\" means a job can occasionally run more than once, for example after a retry. Jobs must check whether their work was already done."

  - question: "A user uploads a 2 GB video. Converting it takes 20 minutes. What is the best design?"
    options:
      - text: "Convert it inside the upload request so the user gets the result straight away"
      - text: "Ask the user to keep the page open for 20 minutes"
      - text: "Save the upload, add a conversion job, reply right away, and show the video's status until it's ready"
        correct: true
      - text: "Raise the function time limit to 20 minutes on every route"
    explanation: "Twenty minutes is far longer than a user should wait, and longer than many function time limits. A background job with a visible status (\"processing\", \"ready\", \"failed\") is the normal design."

  - question: "Which of these should usually stay inside the request, not in a background job?"
    options:
      - text: "Sending a welcome email"
      - text: "Checking the user's password when they log in"
        correct: true
      - text: "Creating a PDF invoice to email later"
      - text: "Resizing an uploaded profile picture into smaller versions"
    explanation: "The user needs the result of the password check before the next screen: are they logged in or not? Work whose result can arrive later belongs in the background."
---

# Sign-up takes 10 seconds because of one email

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Request and response:** the browser asks your server for something, and the server answers. The user waits until the answer arrives. *([Every website is a conversation. Here's how it goes](/lessons/http-requests-and-responses))*
> - **Serverless function:** backend code that your hosting platform starts when a request arrives and stops afterwards. *([From your laptop to a real website in one push](/lessons/hosting-platforms))*
> - **Webhook:** a message another service sends to your server when something happens. *([Free stuff with one fake "payment succeeded" message](/lessons/webhooks))*
> - **Idempotent:** doing something twice has the same effect as doing it once. *([The app said "Saved!". The note was never saved](/lessons/http-methods-and-status-codes))*

## The spinner that never stops

You ask your AI to finish the sign-up feature. When someone creates an account, the app should:

1. Save the new user in the database
2. Send a welcome email
3. Make a profile picture from the user's initials
4. Ask an AI model to write a personal "getting started" tip

The AI writes it, it works, and you launch. Then people start complaining. After clicking **Create account**, they stare at a spinning circle for 10 seconds. Some give up and click again, and get an error: "This email is already registered." The first click *did* work. They just never saw it.

One morning the email service has a problem. Now sign-up fails completely, for everyone, with a timeout error. The accounts are saved, but users see an error and leave.

Saving the user takes a few milliseconds. Everything else is slow work that the user doesn't need to wait for. This lesson shows how to move it out of the way.

---

## The mental model: a ticket rail in a kitchen

Think of a busy restaurant. A waiter takes your order, writes it on a ticket, and clips the ticket to a rail in the kitchen. Then the waiter comes back and says: "Your food is on its way." Cooks take tickets from the rail one by one and cook.

The waiter never stands at the stove for 20 minutes while other tables wait. Taking orders and cooking are separate jobs.

Your app can work the same way:

- A **background job** is a piece of work that happens outside the user's request. *"Send the welcome email to user 42"* is a job.
- A **queue** is the ticket rail: a list of jobs waiting to be done, usually stored in a database or a queue service, so it survives restarts.
- A **worker** is the cook: separate code that takes jobs from the queue and does them.

So the sign-up route now does only this: save the user, add a job to the queue, reply "Welcome!". Your user waits milliseconds instead of seconds. The email still goes out, a moment later.

**Where the comparison stops working:** a restaurant ticket is either cooked or not. In software, a worker can crash halfway through a job, or the same job can run twice. Good background jobs are built for both, as you'll see below.

### What belongs in the background?

Ask one question: **does the user need the result before the next screen?**

| Work | Needs the result right away? | Where it belongs |
|---|---|---|
| Checking a password at login | Yes: are they logged in or not? | In the request |
| Saving a new order | Yes: the order must exist | In the request |
| Sending a welcome or receipt email | No | Background job |
| Resizing an uploaded image | Usually no | Background job |
| A long AI task, like summarizing a document | No, if you show "working on it" | Background job |
| Creating a PDF report | No | Background job |
| Handling a webhook's slow work | No: the sender wants a fast reply | Background job |

---

## How it goes wrong

### Bug 1: Everything inside the request

Here's the sign-up route the AI first wrote:

```js
app.post("/api/signup", async (req, res) => {
  const user = await createUser(req.body);
  await sendWelcomeEmail(user);          // 1–3 seconds
  await generateAvatar(user);            // 2 seconds
  await writeGettingStartedTip(user);    // 3–5 seconds with an AI model
  res.json({ ok: true });
});
```

In plain English:

1. **Line 2:** save the new user. This is fast.
2. **Lines 3–5:** wait for an email service, then an image step, then an AI model. Each `await` means "stop here until this finishes".
3. **Line 6:** only now, reply to the user.

The user waits for the total of everything. And every slow step can fail. If the email service is down, `sendWelcomeEmail` throws an error, line 6 never runs, and the user sees a failure for an account that was in fact created.

### Bug 2: Hitting the function time limit

On a hosting platform, this route runs as a serverless function, and every function has a **maximum duration**. If it runs longer, the platform stops it and the user gets an error. Vercel shows this as a `504` status with the code `FUNCTION_INVOCATION_TIMEOUT`.

The limits depend on the platform and plan, and they change. At the time of writing:

- **Vercel:** functions can run for 5 minutes by default. Paid plans can raise this.
- **Netlify:** normal functions stop after 60 seconds. Netlify's special **background functions** can run for up to 15 minutes.

Five minutes sounds like a lot, until a user uploads a long video, or an AI model is slow on a busy day. And no user should wait even one of those minutes looking at a spinner.

### Bug 3: "Fire and forget"

You ask the AI to make sign-up faster. A common answer is to remove the `await`:

```js
sendWelcomeEmail(user); // no await: don't wait for it
res.json({ ok: true });
```

The reply now goes out at once. On your laptop, the email still arrives, because your server keeps running. On a serverless platform, it may not. Once the response is sent, the platform may stop or pause the function, and the unfinished email can be cut off. If it fails, nobody is told: there's no retry and often no log. Emails go missing a few at a time, and you never find out why.

### Bug 4: Jobs that run twice

Most queues promise to deliver each job **at least once**. That sounds good, but read it carefully: *at least*. If a worker crashes after sending the email but before telling the queue "done", the queue gives the job to another worker. The email goes out twice. For an email, that's annoying. For "charge the customer" or "add 100 credits", it's a real bug.

You saw the same problem with webhooks: the sender retries, and your code must not do the work twice.

---

## What good looks like

### Fix 1: Reply first, then do small work after

For small, unimportant tasks, frameworks now let you run code **after** the response is sent, and keep the function alive until it finishes. In Next.js, this is the `after()` function:

```js
import { after } from "next/server";

export async function POST(request) {
  const user = await createUser(await request.json());
  after(() => recordSignupAnalytics(user.id));
  return Response.json({ ok: true });
}
```

In plain English:

1. **Line 4:** save the user. The user needs this, so we wait.
2. **Line 5:** schedule a task to run *after* the response is sent. On Vercel, this uses a feature called `waitUntil`, which keeps the function alive until the task ends.
3. **Line 6:** reply right away.

This is fine for analytics or a log line. But the task still counts toward the function's time limit, and if it fails, it's gone: there's no queue and no retry. For an email the user is waiting for, use Fix 2.

### Fix 2: A real queue and a worker

For work that must happen, use a queue. The exact code depends on the tool, but the shape is always the same. First, the route:

```js
app.post("/api/signup", async (req, res) => {
  const user = await createUser(req.body);
  await jobs.enqueue("send-welcome-email", { userId: user.id });
  res.json({ ok: true });
});
```

The route saves the user, adds a job called `send-welcome-email` to the queue, and replies. Adding a job takes milliseconds.

Then, in a separate place, the worker:

```js
jobs.handle("send-welcome-email", async ({ userId }) => {
  const user = await db.user.findUnique({ where: { id: userId } });
  await sendWelcomeEmail(user);
});
```

The worker receives the job, loads the user fresh from the database, and sends the email. If it fails, the queue tries again later.

`jobs.enqueue` and `jobs.handle` are placeholder names. Each tool has its own, but they all have "add a job" and "handle a job".

Notice that the job contains only the **user ID**, not the whole user. The worker might run seconds or hours later. By then, the user may have changed their email address or deleted their account. Loading fresh data in the worker avoids sending to an old address.

### Fix 3: Make every job safe to run twice

Because jobs can run more than once, each job should check whether its work is already done:

```js
jobs.handle("send-welcome-email", async ({ userId }) => {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.welcomeEmailSentAt) return; // gone, or already done
  await sendWelcomeEmail(user);
  await db.user.update({ where: { id: userId }, data: { welcomeEmailSentAt: new Date() } });
});
```

In plain English:

1. **Line 3:** if the user no longer exists, or the email was already sent, stop.
2. **Lines 4–5:** send the email, then record the time it was sent.

There's still a small gap: a crash exactly between lines 4 and 5 would send the email again on retry. For an email, that's an acceptable risk. For payments, you need stronger tools.

> **Go deeper:** [The payment timed out. Did it go through?](/lessons/timeouts-and-retries) (Level 3) shows how idempotency keys close this gap with payment services.

### Fix 4: Tell the user what's happening

When the result *is* something the user wants, like a converted video or an AI-written report, don't make them guess. Save a **status** with the work: `pending`, `processing`, `done` or `failed`. The page shows "We're working on it. We'll email you when it's ready." and updates when the status changes.

> **Go deeper:** [How chat apps update without you refreshing](/lessons/realtime-updates) (Level 4) shows how the page can find out the job has finished.

### Choosing a tool

You don't need to build a queue yourself. Common options, from simplest to most powerful:

| Option | Good for | Watch out for |
|---|---|---|
| `after()` in Next.js, `waitUntil` on Vercel | Small tasks after the response | No retries. Counts toward the time limit |
| Netlify Background Functions | Work up to 15 minutes on Netlify | The caller only gets a "started" reply (status `202`), not the result |
| Managed job services, such as Inngest, Trigger.dev, Upstash QStash, or Vercel's Queues and Workflows | Retries, schedules and long, multi-step jobs without running a server | Another service to learn and pay for |
| Your own worker process with a queue library, such as BullMQ with Redis | Full control on an always-on server | You run and watch the worker yourself |

Features and limits change often, so check the current docs before you choose.

---

## Test your own app

1. **Time your slowest routes.** Open developer tools, click the **Network** tab, and sign up, upload a file or use an AI feature. Look at the **Time** column. Anything over a second deserves a look.
2. **List what each slow route waits for.** Ask your AI: *"For this route, list every call to another service and how long each might take."* Mark each one: does the user need the result before the next screen?
3. **Break a service on purpose.** In your staging environment, set the email service's API key to a wrong value and sign up. Does sign-up still work? It should. Only the email should fail, and it should show up in your logs or job dashboard.
4. **Check your function durations.** Your hosting platform shows how long each function ran. Compare your slowest ones with your plan's time limit.

---

## Takeaways

**Key terms**
- **Background job:** work done outside the user's request, such as sending an email
- **Queue:** a stored list of jobs waiting to be done
- **Worker:** code that takes jobs from the queue and does them
- **At least once:** a promise that a job will run, possibly more than once
- **Maximum duration:** the longest time a serverless function may run before the platform stops it

**Red flags in AI-written code**
- A route `await`s an email service, an AI model or image processing before replying
- A call to slow work with the `await` removed "to make it faster", on a serverless platform
- A job that contains a whole user object instead of an ID
- A job that sends money, credits or messages with no check for "already done"
- A long task with no status the user can see

**Ask your AI**
- *"For every API route in my app, list the slow work it waits for before replying, and say which parts could move to a background job."*
- *"My app runs on [Vercel / Netlify / my own server]. What's the simplest reliable way to run background jobs with retries here?"*
- *"Make this job safe to run twice. Show me what happens if the worker crashes halfway through."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Retries and backoff.** Most job tools retry failed jobs automatically, and wait longer between each attempt. Netlify's background functions, for example, retry a failed run after one minute, and again two minutes later. After the last attempt, many tools move the job to a **dead-letter queue**: a list of failed jobs for a person to inspect and replay. Check that list regularly, or set an alert on it.

**Saving and enqueuing are two separate writes.** If your route saves the user and then the queue is down, the user exists but the welcome job was never added. If you enqueue first and the save fails, a job exists for a user who doesn't. This "two writes that can half-succeed" problem has a standard solution: write the job into your own database in the same transaction as the user, and have a separate process forward it to the queue.

> **Go deeper:** [The order was saved, but the email never went out](/lessons/outbox-pattern) (Level 5) explains this pattern.

**Limit how many jobs run at once.** If 5,000 users sign up in a minute, a worker that runs every job at once will hit your email provider's rate limit. Most tools let you set a **concurrency** limit: for example, at most 10 jobs of this kind at the same time.

**Scheduled jobs.** Work that should run on a timetable, such as a nightly cleanup or a weekly summary email, uses **cron jobs**. Vercel's docs warn that cron runs can be missed or duplicated, and that a failed run is not retried. The same "safe to run twice" rule applies.

**Durable workflows.** Some tools let a job pause for hours or days and continue where it stopped, even after a deploy. For example, "send a reminder three days after sign-up, unless the user already finished setup." Vercel Workflows and Inngest are built around this idea.


</details>

## References

- [Configuring Maximum Duration for Vercel Functions](https://vercel.com/docs/functions/configuring-functions/duration): Vercel documentation. The default 5-minute (300-second) function limit and higher limits on paid plans.
- [FUNCTION_INVOCATION_TIMEOUT](https://vercel.com/docs/errors/FUNCTION_INVOCATION_TIMEOUT): Vercel documentation. The `504` error shown when a function runs past its limit.
- [Running background workers on Vercel](https://vercel.com/kb/guide/background-workers-on-vercel): Vercel guide. `waitUntil` having no retries, Vercel Queues delivering each message at least once, Workflows, and cron runs that can be missed or duplicated.
- [Configuration for functions](https://docs.netlify.com/build/functions/configuration/): Netlify documentation. The 60-second limit for normal functions and the 15-minute limit for background functions.
- [Background Functions overview](https://docs.netlify.com/build/functions/background-functions/): Netlify documentation. The immediate `202` reply and the retries after one and two minutes.
- [after](https://nextjs.org/docs/app/api-reference/functions/after): Next.js documentation. Running work after the response, its link to `waitUntil`, and that it became stable in version 15.1.
