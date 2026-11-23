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
    explanation: "Logs answer \"what happened?\" when you go and look. An alert is what tells you to look. Without alerts, you find out when a user emails you."

  - question: "Which log line is the most useful when you are searching for one failed payment later?"
    options:
      - text: "console.log(\"error\")"
      - text: "console.log(\"here 2\")"
      - text: "console.log(req.body)"
      - text: "logger.error({ err, orderId, userId }, \"payment failed\")"
        correct: true
    explanation: "A structured log line has named fields. You can search for that order ID, count failures, and see which user was affected. \"error\" and \"here 2\" tell you almost nothing, and logging the whole request body can record passwords and card details."

  - question: "Your login route has console.log(req.body) in it, left over from debugging. What is the problem?"
    options:
      - text: "It makes login slower"
      - text: "It writes every user's password into your logs in plain text"
        correct: true
      - text: "It shows the password in the user's browser"
      - text: "Nothing. Logs are private."
    explanation: "The request body of a login contains the password. Logs are copied to dashboards and log tools, and more people can read them than your database. A log full of passwords undoes your password hashing."

  - question: "You want to know if your error rate doubled after today's deploy. Which tool answers that best?"
    options:
      - text: "A single log line"
      - text: "A backup"
      - text: "A metric: a number tracked over time, like errors per minute"
        correct: true
      - text: "A migration"
    explanation: "Logs tell the story of single events. Metrics count events over time, so you can compare before and after a deploy at a glance."

  - question: "An uptime check visits your home page every few minutes and it always loads. Users still report that sign-up is broken. Why didn't the check catch it?"
    options:
      - text: "Uptime checks only work at night"
      - text: "The check was too fast"
      - text: "Sign-up bugs can't be detected by any tool"
      - text: "The check only knows whether that one page answers, not whether sign-up works"
        correct: true
    explanation: "An uptime check is a simple outside visitor. It catches \"the site is down\", not \"one feature is broken\". Error tracking, a health check that touches the database, and watching sign-up numbers catch more."

  - question: "You set up alerts for every warning in your app. A month later, you ignore most alert emails. What went wrong?"
    options:
      - text: "Too many alerts, so the important ones get lost among the unimportant ones"
        correct: true
      - text: "Email is too slow for alerts"
      - text: "You need even more alerts"
      - text: "Alerts should only be checked once a month"
    explanation: "This is called alert fatigue. Alert only on things that need a person to act soon, like the site being down or payments failing. Everything else can wait in a dashboard."
---

# Your app was down for six hours and nobody noticed

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Logs:** messages a program writes while it runs, including errors. *([The error message is telling you what's wrong. Read it first](/lessons/reading-error-messages))*
> - **Status codes:** numbers a server sends with each response, like `200` for OK and `500` for a server error. *([The app said "Saved!". The note was never saved](/lessons/http-methods-and-status-codes))*
> - **Serverless functions:** your backend code, run by the hosting platform each time a request arrives. *([From your laptop to a real website in one push](/lessons/hosting-platforms))*
> - **Error handling:** catching errors so users see a safe message instead of a crash. *([Your error page showed your database details to everyone](/lessons/handling-errors))*

## Six hours of silence

Saturday, 2 a.m. Your database stops accepting new connections. Every page that needs data now shows "Something went wrong". Your error handling works perfectly: users see a polite message, not a crash.

You are asleep. Then you're at breakfast. Then you're out with friends.

At 8 a.m., a user emails: "Is the site down? It's been broken all night." You open your hosting dashboard. The logs are full of the same database error, over and over. Your app had been reporting the problem the whole time.

Then you notice something worse. Your plan only keeps logs for one hour. The lines from 2 a.m., which would show what happened first, are already gone.

How many people tried your app during those six hours, saw an error, and left without saying anything? You'll never know.

The app wasn't silent. **Nobody was listening.** This lesson is about listening: knowing your app is broken before your users tell you, and having the information to fix it.

---

## Three tools, three questions

**Monitoring** means watching your running app so you know whether it is healthy. It is built from three different tools. Each one answers a different question.

| Tool | Question it answers | Example |
|---|---|---|
| **Logs** | What happened? | "Payment failed for order 1042: card declined" |
| **Metrics** | How much, how often, how fast? | "3% of requests failed in the last 5 minutes" |
| **Alerts** | Does a person need to act right now? | "Error rate above 5% for 10 minutes: phone notification" |

Think of a small shop:

- **Logs** are the security camera recording. Every event is there, but nobody watches it live. You rewind it when something went wrong.
- **Metrics** are the totals on the till: sales per hour, refunds per day. You notice when today looks very different from usual.
- **Alerts** are the burglar alarm. It stays quiet until something specific happens, and then it wakes you up.

**Where the comparison stops working:** a camera records everything it can see. Your logs only contain what your code chose to write. If your code never logs a failed payment, there is nothing to rewind.

In the story, the logs worked. There were no metrics anyone looked at, and no alerts at all.

---

## Logs: write them so you can search them

### From "here 2" to structured logs

Most beginner logs look like this:

```js
console.log("here 2");
console.log("error");
console.log("payment failed for " + user.email + " " + err);
```

The first two mean something only to the person who wrote them, and only that day. The third is better, but it is one long sentence. To find "every failed payment for this order", you must search inside sentences. It also writes the user's email address into your logs, which we'll come back to.

**Structured logging** means writing each log line as data with named fields, usually as JSON. A popular package for this in Node.js is **pino**:

```js
import pino from "pino";
const logger = pino();

logger.info({ userId: user.id, orderId: order.id }, "checkout started");
logger.error({ err, userId: user.id, orderId: order.id }, "payment failed");
```

In plain English:

- **Lines 1–2:** create a logger.
- **Line 4:** write an **info** line: something normal happened. The object holds the details, and the text says what happened.
- **Line 5:** write an **error** line, including the error itself (`err`), which pino turns into fields like its message and stack trace.

Each call prints one line of JSON, like this (shortened):

```json
{"level":50,"time":1767225600000,"userId":"u_81","orderId":"o_1042","msg":"payment failed"}
```

Now your log tool can answer questions such as "show every error for order `o_1042`", or "how many `payment failed` lines in the last hour?". `level` 50 is pino's number for "error"; 30 is "info".

### Log levels

**Log levels** mark how serious a line is. The common ones, from least to most serious:

- **debug:** details only useful while building. Usually switched off in production.
- **info:** normal events: user signed up, order placed.
- **warn:** something odd but handled: a retry, a slow response.
- **error:** something failed: a payment, a database query.

Levels let you filter. During an outage, you look at errors first.

### What to log

Log the events you would need to rebuild the story of a problem:

- **Errors, with context:** which user ID, which record, which step
- **Important actions:** sign-ups, logins, payments, deletions
- **Security events:** failed logins, "not allowed" answers, rate limits being hit. OWASP's logging guidance lists authentication and authorization failures among the events to always record.

### What never to log

This is the part AI-written code often gets wrong. Never write these into logs:

- **Passwords**, even wrong ones
- **Session IDs, cookies, tokens and API keys**
- **Full card or bank numbers**
- **Database connection strings** (they contain the database password)
- **Personal data you don't need:** email addresses, home addresses, phone numbers, message contents. Log the user's ID instead.

Why does it matter so much? Logs are usually **less protected** than your database:

- They are copied to your hosting dashboard, log tools and error trackers.
- More people can read them: teammates, support staff, outside services.
- They get pasted into chats, bug reports and AI tools.

The most common leak is one forgotten debugging line:

```js
app.post("/api/login", async (req, res) => {
  console.log(req.body); // { email: "...", password: "..." }
  // ...
});
```

The request body of a login contains the password. This one line writes every user's password, in plain text, into your logs. All your careful password hashing is undone.

> **Go deeper:** [Never store a password. Here's what to store instead](/lessons/how-login-works) (Level 2) explains why passwords must never be stored readable.

As a safety net, pino can hide fields automatically. With `pino({ redact: ["password", "token"] })`, any field with those names is printed as `[Redacted]`. It's a safety net, not a fix: the real fix is not logging the whole request.

---

## Where your hosting platform shows logs

Anything your backend prints ends up in your hosting platform's dashboard:

- **Vercel:** open your project and choose **Logs**. These are called **runtime logs**: everything your functions printed, grouped by request, with filters for errors, status codes and routes. Build logs are separate, on each deployment.
- **Netlify:** open your site, then **Cloud compute → Functions**, and pick a function to see its log.

**Check how long logs are kept.** As of writing, Vercel's docs list one hour of runtime logs on the free Hobby plan and one day on Pro. Netlify's docs say function logs are kept for at least 24 hours, and up to 7 days on some plans. That's fine for watching what happens right now, but too short for "what happened on Saturday night?". To keep logs longer, platforms let you send them to a separate log service (Vercel calls this a **drain**).

---

## Error tracking: errors that come to you

Logs wait for you to read them. An **error tracker** is a service that catches errors in your app automatically, in the browser and on the server, and comes to you with a report.

**Sentry** is one widely used example. Others exist, and they work in similar ways. An error tracker:

- catches errors your code didn't handle, plus ones you report yourself
- **groups** identical errors into one **issue**, so 3,000 copies of the same crash show up as one problem with a count
- shows how many users are affected and the stack trace of each error
- emails or messages you when a new issue appears

For a Next.js app, Sentry's setup wizard is started with `npx @sentry/wizard@latest -i nextjs`. When you catch an error yourself and still want to know about it, you report it:

```js
try {
  await chargeCard(order);
} catch (err) {
  Sentry.captureException(err);
  return res.status(502).json({ error: "Payment failed. Please try again." });
}
```

The user gets a safe message, and you get a full report. Without line 4, this error would be handled so politely that nobody would ever know it happened. That's what happened on Saturday night.

**Check what it collects.** Error trackers can send extra details with each error: the user's IP address, user ID or email, request data, cookies. What is sent by default depends on the tool, its version and your settings. Read its "data collected" page and switch off what you don't need. The rules from "What never to log" apply here too.

Sentry has a free plan for one person, as of writing. Check its pricing page for current limits.

---

## Uptime checks: a visitor from outside

Error trackers live inside your app. If the whole app is down, or its domain stops working, there may be nothing running to report the error.

An **uptime check** is an outside service that visits your app every few minutes, like a robot visitor. If it gets no answer, or an error status code, it alerts you. Services such as UptimeRobot offer this on free plans, and some error trackers include it too.

To make the check smarter than "does the home page load?", add a **health check** route that also tests the database:

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

`SELECT 1` is the smallest possible database question. If the database answers, the route replies "ok". If not, it replies with status `503` (Service Unavailable), and the uptime check alerts you. Notice it doesn't send the error details: anyone can open this address. On Saturday night, this check would have woken your phone a few minutes after 2 a.m.

---

## Metrics and alerts: noticing what doesn't crash

Some problems never throw an error. The sign-up button stops doing anything. A payment provider rejects every card with a "normal" decline. The app looks healthy, and nobody signs up.

**Metrics** catch these. Your hosting platform's dashboard usually shows a few: number of requests, error rate (the share of requests with `5xx` status codes) and response time. Add the numbers that matter for your app: sign-ups per hour, orders per hour. If Tuesday's sign-ups are zero when they're usually fifty, something is broken, error or not.

**Alerts** turn metrics into action. A good alert:

- fires on something users feel: site down, error rate high, payments failing, sign-ups at zero
- needs a person to do something soon
- goes somewhere you will see it, like a phone notification, not an inbox you check weekly

The opposite is **alert fatigue**: so many alerts that you stop reading them, including the real ones. Start with two or three alerts. Add more only when a real problem slipped through.

---

## How it goes wrong

- **No alerts.** Logs and dashboards exist, but nothing tells you to look. You hear about problems from users, or from nobody.
- **Logs that say nothing.** "error", "here", "done". No user ID, no record ID, no step.
- **Logs that say too much.** Passwords, tokens, emails and whole request bodies, kept in more places than your database.
- **Errors swallowed.** A `catch` block that shows a nice message but never logs or reports the error.
- **Logs that disappear.** One hour of history isn't enough to investigate the night before.
- **Only watching "is it up?".** The home page loads, while sign-up or checkout is broken.
- **Too many alerts.** Every warning sends an email, so all of them get ignored.

> **Go deeper:** [It only breaks in production. How do you find out why?](/lessons/debugging-production) (Level 3) shows how to use these logs and reports to find the cause.

---

## What good looks like

A small app doesn't need a big setup. This is enough for most:

1. **Structured logs** with user IDs and record IDs, and no secrets or personal data.
2. **An error tracker** on both the frontend and the backend, sending new issues to your email or phone.
3. **An uptime check** on your home page and on a health check route that tests the database.
4. **Two or three alerts** that reach your phone: site down, error spike, a key action (sign-ups or payments) dropping to zero.
5. **A quick look at your dashboard** after every deploy. Did errors go up?

---

## Test your own app

1. **Find your logs.** Open your hosting platform's log page. Visit your app, then find the log lines for your own request.
2. **Check retention.** Find out how long your plan keeps logs. Could you see what happened last night?
3. **Hunt for leaks.** Search your code for `console.log(req.body)`, `password`, `token` and `email` near log calls. Ask your AI to check every log call.
4. **Break something on purpose, safely.** In a preview deployment, add a route that throws an error. Does your error tracker report it? Did a message reach you?
5. **Set up one uptime check** for your live app, with alerts to your phone.

---

## Takeaways

**Key terms**
- **Monitoring:** watching your running app so you know whether it's healthy
- **Logs:** a record of individual events: what happened
- **Structured logging:** log lines as data with named fields, usually JSON
- **Log levels:** debug, info, warn, error: how serious a line is
- **Metrics:** numbers tracked over time, like error rate or sign-ups per hour
- **Alert:** a rule that notifies a person when something needs action
- **Error tracker:** a service that collects, groups and reports errors, like Sentry
- **Uptime check:** an outside robot visitor that alerts you when your app doesn't answer
- **Health check:** a route that tests whether the app and its database are working
- **Alert fatigue:** so many alerts that people stop paying attention

**Red flags**
- `console.log(req.body)`, or any log that includes passwords, tokens or cookies
- `catch` blocks that hide errors without logging or reporting them
- You found out about the last outage from a user
- Nobody gets a notification when the site is down
- Logs are kept for less time than it takes you to notice a problem

**Ask your AI**
- *"Find every log statement in my app. Do any of them log passwords, tokens, cookies, emails or whole request bodies?"*
- *"Replace my console.log calls with structured logging that includes user IDs and record IDs."*
- *"Find every catch block that hides an error without logging or reporting it."*
- *"Add a health check route that tests the database connection without revealing any error details."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**OWASP and logging.** The OWASP Top 10 (2025) includes **A09: Security Logging and Alerting Failures**: not recording security events, or recording them with nobody alerted. OWASP's *Logging Cheat Sheet* lists data to keep out of logs, including passwords, session identifiers, access tokens, encryption keys, payment card and bank data, database connection strings and sensitive personal data.

**Request IDs.** One request can produce many log lines, from several functions. Giving each request an ID, and adding it to every line, lets you pull out the whole story of one request. Vercel's runtime logs already group lines by request and show a request ID.

**pino's redaction options.** Redacted values are replaced with `[Redacted]` by default. You can choose another replacement text with `censor`, or remove the fields completely with `remove: true`. Paths can reach inside objects, like `"req.headers.authorization"`.

**Why logs cost money.** Log services usually charge by how much data you send and how long they keep it. Logging every request in full gets expensive quickly. Keep debug logs off in production and log what you'd actually search for.

**Percentiles.** Response time is often shown as a **percentile**: "p95 = 800 ms" means 95% of requests were faster than 800 milliseconds. An average hides the slow requests that users complain about; a high percentile shows them.

**Traces.** A **trace** follows one request as it moves through several services: your function, the database, a payment API. It shows where the time went. **OpenTelemetry** is an open-source, vendor-neutral toolkit and standard for collecting traces, metrics and logs, supported by many monitoring tools.

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
