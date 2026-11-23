---
title: "Your app was down for six hours and nobody noticed"
slug: logging-and-monitoring
order: 38
level: 3
levelName: Shipping
concepts: [Logging, Structured logs, Metrics, Monitoring, Alerts, Error tracking, Uptime checks]
readTime: 14 min
quiz:
  - question: "Your app shows a 500 error to every visitor from 2 a.m. to 8 a.m. Your logs recorded every error. Why did nobody notice for six hours?"
    options:
      - text: "Logs only record things. Without an alert, nobody is told."
        correct: true
      - text: "Logs don't record errors at night"
      - text: "500 errors are not real errors"
      - text: "The hosting platform hides errors from the owner"
    explanation: "Logs answer \"what happened?\" when you go and look. An alert tells you to look. Without alerts, you find out when a user sends you an email."

  - question: "Later, you search for one failed payment. Which log line is the most useful?"
    options:
      - text: "console.log(\"error\")"
      - text: "console.log(\"here 2\")"
      - text: "console.log(req.body)"
      - text: "logger.error({ err, orderId, userId }, \"payment failed\")"
        correct: true
    explanation: "A structured log line has named fields. You can search for that order ID, count failures and see which user had the problem. \"error\" and \"here 2\" tell you almost nothing. A log of the whole request body can record passwords and card details."

  - question: "Your login route still has console.log(req.body) in it from an old debugging session. What is the problem?"
    options:
      - text: "It makes login slower"
      - text: "It writes every user's password into your logs in plain text"
        correct: true
      - text: "It shows the password in the user's browser"
      - text: "Nothing. Logs are private."
    explanation: "The request body of a login contains the password. Logs are copied to dashboards and log tools, and more people can read them than your database. A log full of passwords cancels the protection of your password hashing."

  - question: "You want to know if your error rate doubled after today's deploy. Which tool answers that best?"
    options:
      - text: "A single log line"
      - text: "A backup"
      - text: "A metric: a number tracked over time, like errors per minute"
        correct: true
      - text: "A migration"
    explanation: "Logs tell the story of single events. Metrics count events over time. So you can quickly compare the numbers before and after a deploy."

  - question: "An uptime check visits your home page every few minutes, and the page always loads. But users report that sign-up is broken. Why didn't the check find the problem?"
    options:
      - text: "Uptime checks only work at night"
      - text: "The check was too fast"
      - text: "No tool can find sign-up bugs"
      - text: "The check only knows if that one page answers, not if sign-up works"
        correct: true
    explanation: "An uptime check is a simple visitor from outside. It finds \"the site is down\", not \"one feature is broken\". Error tracking, a health check that tests the database, and a watch on sign-up numbers find more."

  - question: "You set up alerts for every warning in your app. A month later, you ignore most alert emails. What went wrong?"
    options:
      - text: "Too many alerts, so the important ones get lost among the unimportant ones"
        correct: true
      - text: "Email is too slow for alerts"
      - text: "You need even more alerts"
      - text: "Alerts should only be checked once a month"
    explanation: "This is called alert fatigue. Send alerts only for things that need a person to act soon, like a site that is down or payments that fail. Everything else can wait in a dashboard."
---

# Your app was down for six hours and nobody noticed

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Logs:** messages a program writes while it runs, including errors. *([The error message is telling you what's wrong. Read it first](/lessons/reading-error-messages))*
> - **Status codes:** numbers a server sends with each response, like `200` for OK and `500` for a server error. *([The app said "Saved!". The note was never saved](/lessons/http-methods-and-status-codes))*
> - **Serverless functions:** your backend code, run by the hosting platform each time a request arrives. *([From your laptop to a real website in one push](/lessons/hosting-platforms))*
> - **Error handling:** catching errors so users see a safe message instead of a crash. *([Your error page showed your database details to everyone](/lessons/handling-errors))*

## Six hours of silence

Saturday, 2 a.m. Your database stops accepting new connections from your app. Every page that needs data now shows "Something went wrong". Your error handling works perfectly: users see a polite message, not a crash.

You are asleep. Then you are at breakfast. Then you are out with friends.

At 8 a.m., a user sends an email: "Is the site down? It's been broken all night." You open your hosting dashboard. The logs are full of the same database error, again and again. Your app reported the problem the whole time.

Then you see something worse. Your plan keeps logs for only one hour. The lines from 2 a.m. would show what happened first. But they are already gone.

How many people tried your app during those six hours, saw an error and left without a word? You will never know.

The app wasn't silent. **But nothing told you.** This lesson shows you how to know that your app is broken before your users tell you. It also shows you how to get the information that you need to fix it.

---

## Three tools, three questions

**Monitoring** means that you watch your running app, so that you know if it is healthy. Monitoring uses three different tools. Each tool answers a different question.

| Tool | Question it answers | Example |
|---|---|---|
| **Logs** | What happened? | "Payment failed for order 1042: card declined" |
| **Metrics** | How much, how often, how fast? | "3% of requests failed in the last 5 minutes" |
| **Alerts** | Does a person need to act right now? | "Error rate above 5% for 10 minutes: phone notification" |

![Your app writes logs, which answer what happened. Metrics count events over time and answer how much and how often. An alert decides if a person must act now, and sends a notification to your phone.](/diagrams/logging-and-monitoring-1.svg)

Think of a small shop:

- **Logs** are the recording from the security camera. Every event is there, but nobody watches it live. You go back to it when something went wrong.
- **Metrics** are the totals on the cash register: sales per hour, refunds per day. You notice when today looks very different from a normal day.
- **Alerts** are the burglar alarm. It stays quiet until something specific happens. Then it wakes you up.

**Where the comparison stops working:** a camera records everything that it can see. Your logs contain only what your code chose to write. If your code never logs a failed payment, there is nothing to go back to.

In the story, the logs worked. But nobody looked at any metrics, and there were no alerts.

---

## Logs: write them so you can search them

### From "here 2" to structured logs

Most beginner logs look like this:

```js
console.log("here 2");
console.log("error");
console.log("payment failed for " + user.email + " " + err);
```

The first two lines mean something only to the person who wrote them, and only on that day. The third line is better, but it is one long sentence. To find "every failed payment for this order", you must search inside sentences. It also writes the user's email address into your logs. This is a problem that you will see later in this lesson.

**Structured logging** means that you write each log line as data with named fields, usually as **JSON** (a text format for data). A popular package for this in Node.js is **pino**:

```js
import pino from "pino";
const logger = pino();

logger.info({ userId: user.id, orderId: order.id }, "checkout started");
logger.error({ err, userId: user.id, orderId: order.id }, "payment failed");
```

In plain English:

- **Lines 1–2:** create a logger.
- **Line 4:** write an **info** line: something normal happened. The object holds the details, and the text says what happened.
- **Line 5:** write an **error** line. It includes the error itself (`err`). Pino turns the error into fields, like its message and its stack trace (the list of functions that ran before the error).

Each call prints one line of JSON, like this (shortened):

```json
{"level":50,"time":1767225600000,"userId":"u_81","orderId":"o_1042","msg":"payment failed"}
```

Now your log tool can answer questions such as "show every error for order `o_1042`". It can also answer "how many `payment failed` lines in the last hour?". `level` 50 is pino's number for "error", and 30 is "info".

### Log levels

**Log levels** show how serious a line is. Here are the common levels, from least serious to most serious:

- **debug:** details that are useful only while you build. Usually switched off in production.
- **info:** normal events: a user signed up, an order was placed.
- **warn:** something unusual, but the app handled it: a second try, a slow response.
- **error:** something failed: a payment, a database query.

With levels, you can filter. During an **outage** (a time when the app doesn't work), you look at errors first.

### What to log

Log the events that you need to tell the story of a problem:

- **Errors, with context:** which user ID, which record, which step
- **Important actions:** sign-ups, logins, payments, deletions
- **Security events:** failed logins, "not allowed" answers, and users who hit a rate limit (a limit on how many requests one user can send)

OWASP is a well-known organization for web security. Its logging guidance lists failed logins and "not allowed" answers among the events to always record.

### What never to log

AI-written code often gets this part wrong. Never write these into logs:

- **Passwords**, even wrong ones
- **Session IDs, cookies, tokens and API keys**
- **Full card or bank numbers**
- **Database connection strings** (they contain the database password)
- **Personal data that you don't need:** email addresses, home addresses, phone numbers, message contents. Log the user's ID instead.

Why is this so important? Logs usually have **less protection** than your database:

- Your hosting dashboard, log tools and error trackers all get copies of them.
- More people can read them: teammates, support staff, outside services.
- People paste them into chats, bug reports and AI tools.

The most common leak is one forgotten debugging line (a line that you added to find a problem):

```js
app.post("/api/login", async (req, res) => {
  console.log(req.body); // { email: "...", password: "..." }
  // ...
});
```

The request body of a login contains the password. This one line writes every user's password, in plain text, into your logs. It cancels all the protection of your careful password hashing.

> **Go deeper:** [Never store a password. Here's what to store instead](/lessons/how-login-works) (Level 2) explains why you must never store passwords in a readable form.

For extra protection, pino can hide fields automatically. With `pino({ redact: ["password", "token"] })`, pino prints any field with those names as `[Redacted]`. This is extra protection, not a fix. The real fix is to stop logging the whole request.

---

## Where your hosting platform shows logs

Everything that your backend prints goes to your hosting platform's dashboard:

- **Vercel:** open your project and choose **Logs**. These are **runtime logs**: everything that your functions printed, grouped by request. You can filter by errors, status codes and routes. Build logs are separate, on each deployment.
- **Netlify:** open your site, then **Cloud compute → Functions**. Choose a function to see its log.

**Check how long the platform keeps logs.** At the time of writing, Vercel's docs list one hour of runtime logs on the free Hobby plan and one day on Pro. Netlify's docs say that it keeps function logs for at least 24 hours, and up to 7 days on some plans.

That is enough to watch what happens right now. But it is too short for "what happened on Saturday night?". To keep logs longer, platforms let you send them to a separate log service. Vercel calls this a **drain**.

---

## Error tracking: errors that come to you

Logs wait for you to read them. An **error tracker** is a service that catches errors in your app automatically. It works in the browser and on the server. Then it sends a report to you.

**Sentry** is one widely used example. Other error trackers exist, and they work in similar ways. An error tracker:

- catches errors that your code didn't handle, plus errors that you report yourself
- **groups** identical errors into one **issue**, so 3,000 copies of the same crash appear as one problem with a count
- shows how many users have the problem and the stack trace of each error
- sends you an email or a message when a new issue appears

For a Next.js app, start Sentry's setup wizard with `npx @sentry/wizard@latest -i nextjs`. Sometimes you catch an error yourself but still want to know about it. Then you report it:

```js
try {
  await chargeCard(order);
} catch (err) {
  Sentry.captureException(err);
  return res.status(502).json({ error: "Payment failed. Please try again." });
}
```

The user gets a safe message, and you get a full report. Without line 4, the app would handle this error so politely that nobody would ever know about it. That is what happened on Saturday night.

**Check what it collects.** Error trackers can send extra details with each error: the user's IP address, user ID or email, request data and cookies. What they send by default depends on the tool, its version and your settings. Read the tool's "data collected" page, and switch off what you don't need. The rules from "What never to log" apply here too.

At the time of writing, Sentry has a free plan for one person. Check its pricing page for the current limits.

---

## Uptime checks: a visitor from outside

Error trackers run inside your app. If the whole app is down, or its domain stops working, maybe nothing runs that can report the error.

An **uptime check** is an outside service that visits your app every few minutes, like a robot visitor. If it gets no answer, or an error status code, it sends you an alert. Services such as UptimeRobot offer this on free plans, and some error trackers include it too.

A check of the home page only tells you that the page loads. To learn more, add a **health check** route that also tests the database:

```js
app.get("/api/health", async (req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});
```

`SELECT 1` is the smallest possible database question. If the database answers, the route replies "ok". If not, it replies with status `503` (Service Unavailable), and the uptime check sends you an alert. Note that the route doesn't send the error details, because anyone can open this address. On Saturday night, this check would have sent an alert to your phone a few minutes after 2 a.m.

![An uptime check outside your app visits /api/health every few minutes. The route sends SELECT 1 to the database. If the database answers, the route replies ok: true. If not, it replies 503, and the uptime check sends an alert to your phone.](/diagrams/logging-and-monitoring-2.svg)

---

## Metrics and alerts: problems that don't crash

Some problems never cause an error. The sign-up button stops working. A payment provider rejects every card with a "normal" decline. The app looks healthy, but nobody signs up.

**Metrics** find these problems. Your hosting platform's dashboard usually shows a few metrics:

- the number of requests
- the error rate (the share of requests with `5xx` status codes)
- the response time

Add the numbers that are important for your app, like sign-ups per hour or orders per hour. Maybe you usually get fifty sign-ups on a Tuesday, and today you get zero. Then something is broken, even without an error.

**Alerts** turn metrics into action. A good alert:

- starts for something that users feel: the site is down, the error rate is high, payments fail, sign-ups are at zero
- needs a person to do something soon
- goes to a place where you will see it, like a phone notification, not an inbox that you check once a week

The opposite is **alert fatigue**: there are so many alerts that you stop reading them, also the real ones. Start with two or three alerts. Add more only when you miss a real problem.

---

## How it goes wrong

- **No alerts.** Logs and dashboards exist, but nothing tells you to look. You hear about problems from users, or from nobody.
- **Logs that say nothing.** "error", "here", "done". No user ID, no record ID, no step.
- **Logs that say too much.** Passwords, tokens, emails and whole request bodies, stored in more places than your database.
- **Hidden errors.** A `catch` block shows a nice message but never logs or reports the error.
- **Logs that disappear.** One hour of history isn't enough to investigate the night before.
- **Only "is it up?".** The home page loads, but sign-up or checkout is broken.
- **Too many alerts.** Every warning sends an email, so you ignore all of them.

> **Go deeper:** [It only breaks in production. How do you find out why?](/lessons/debugging-production) (Level 3) shows how to use these logs and reports to find the cause.

---

## What good looks like

A small app doesn't need a big setup. For most apps, this is enough:

1. **Structured logs** with user IDs and record IDs, and no secrets or personal data.
2. **An error tracker** on both the frontend and the backend. It sends new issues to your email or phone.
3. **An uptime check** on your home page and on a health check route that tests the database.
4. **Two or three alerts** that reach your phone. For example: the site is down, errors go up fast, or sign-ups or payments drop to zero.
5. **A quick look at your dashboard** after every deploy. Check if errors went up.

---

## Test your own app

1. **Find your logs.** Open your hosting platform's log page. Visit your app. Then find the log lines for your own request.
2. **Check how long logs are kept.** Find out how long your plan keeps logs. Ask yourself if you could see what happened last night.
3. **Look for leaks.** Search your code for `console.log(req.body)`. Also search for `password`, `token` and `email` near log calls. Ask your AI to check every log call.
4. **Break something on purpose, safely.** In a preview deployment, add a route that throws an error. Check if your error tracker reports it and if a message reaches you.
5. **Set up one uptime check** for your live app, with alerts to your phone.

---

## Takeaways

**Key terms**
- **Monitoring:** you watch your running app, so you know if it is healthy
- **Logs:** a record of single events: what happened
- **Structured logging:** log lines as data with named fields, usually JSON
- **Log levels:** debug, info, warn, error: how serious a line is
- **Metrics:** numbers tracked over time, like error rate or sign-ups per hour
- **Alert:** a rule that tells a person when something needs action
- **Error tracker:** a service that collects, groups and reports errors, like Sentry
- **Uptime check:** a robot visitor from outside that alerts you when your app doesn't answer
- **Health check:** a route that tests if the app and its database work
- **Alert fatigue:** so many alerts that people stop paying attention

**Red flags**
- `console.log(req.body)`, or any log that includes passwords, tokens or cookies
- `catch` blocks that hide errors and don't log or report them
- You found out about the last outage from a user
- Nobody gets a notification when the site is down
- Logs are kept for less time than you need to notice a problem

**Ask your AI**
- *"Find every log statement in my app. Do any of them log passwords, tokens, cookies, emails or whole request bodies?"*
- *"Replace my console.log calls with structured logging that includes user IDs and record IDs."*
- *"Find every catch block that hides an error without logging or reporting it."*
- *"Add a health check route that tests the database connection without revealing any error details."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**OWASP and logging.** The OWASP Top 10 (2025) includes **A09: Security Logging and Alerting Failures**. This means security events that are not recorded, or that are recorded but nobody gets an alert. OWASP's *Logging Cheat Sheet* lists data to keep out of logs:

- passwords
- session identifiers and access tokens
- encryption keys
- payment card and bank data
- database connection strings
- sensitive personal data

**Request IDs.** One request can produce many log lines, from several functions. Give each request an ID, and add it to every line. Then you can find the whole story of one request. Vercel's runtime logs already group lines by request and show a request ID.

**pino's redaction options.** By default, pino replaces hidden values with `[Redacted]`. You can choose a different replacement text with `censor`. You can also remove the fields completely with `remove: true`. Paths can reach inside objects, like `"req.headers.authorization"`.

**Why logs cost money.** Log services usually charge for how much data you send and how long they keep it. If you log every request in full, the cost goes up fast. Keep debug logs off in production. Log what you would really search for.

**Percentiles.** Dashboards often show response time as a **percentile**. "p95 = 800 ms" means that 95% of requests were faster than 800 milliseconds. An average hides the slow requests that users complain about. A high percentile shows them.

**Traces.** A **trace** follows one request as it moves through several services: your function, the database, a payment API. It shows where the time went. **OpenTelemetry** is an open-source toolkit and standard for collecting traces, metrics and logs. It is vendor-neutral: it is not tied to one company. Many monitoring tools support it.

</details>

## References

- [A09:2025 Security Logging & Alerting Failures](https://top10.owasp.org/2025/A09_2025-Security_Logging_and_Alerting_Failures) and [Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html): OWASP. Security events that go unlogged or unalerted, authentication and authorization failures as events to always log, and the data to keep out of logs (passwords, session IDs, tokens, keys, card and bank data, connection strings, sensitive personal data).
- [API](https://github.com/pinojs/pino/blob/main/docs/api.md) and [Redaction](https://github.com/pinojs/pino/blob/main/docs/redaction.md): pino documentation. JSON log lines with `level`, `time` and `msg`, level numbers (info 30, error 50), the `err` serializer, and `redact` with `[Redacted]`, `censor` and `remove`.
- [Runtime Logs](https://vercel.com/docs/logs/runtime): Vercel documentation. Logs grouped by request with a request ID, filters, separate build logs, log drains, and retention of one hour on Hobby and one day on Pro.
- [Function logs](https://docs.netlify.com/build/functions/logs/): Netlify documentation. Finding logs under Cloud compute → Functions, kept for at least 24 hours and up to 7 days on some plans.
- [Next.js setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/), [Capturing errors](https://docs.sentry.io/platforms/javascript/guides/nextjs/capturing-errors/), [Issues](https://docs.sentry.io/product/issues/), [Data collected](https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/data-collected/) and [Pricing](https://sentry.io/pricing/): Sentry. The setup wizard command, `captureException` for errors you catch, grouping errors into issues with a count of affected users, what the SDK sends by default (IP address, request bodies, cookies), and the free one-person Developer plan.
- [What is a monitoring interval in UptimeRobot?](https://help.uptimerobot.com/en/articles/11360876-what-is-a-monitoring-interval-in-uptimerobot/): UptimeRobot. Free-plan uptime checks every 5 minutes.
- [RFC 9110, section 15.6.4: 503 Service Unavailable](https://www.rfc-editor.org/rfc/rfc9110.html#name-503-service-unavailable): IETF. The meaning of status code 503.
- [What is OpenTelemetry?](https://opentelemetry.io/docs/what-is-opentelemetry/): OpenTelemetry. An open-source, vendor-neutral way to collect traces, metrics and logs, supported by many vendors.
