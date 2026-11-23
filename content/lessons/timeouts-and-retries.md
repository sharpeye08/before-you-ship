---
title: "The payment timed out. Did it go through?"
slug: timeouts-and-retries
order: 41
level: 3
levelName: Shipping
concepts: [Timeouts, Retries, Exponential backoff, Jitter, Idempotency keys, Unknown outcomes]
readTime: 14 min
quiz:
  - question: "Your server asks a payment service to charge a customer. After 30 seconds, your code gives up waiting. What do you know about the payment?"
    options:
      - text: "It failed, so it's safe to charge again"
      - text: "It succeeded"
      - text: "Nothing for certain: it may have failed, succeeded, or still be running"
        correct: true
      - text: "The payment service will always cancel it"
    explanation: "A timeout only means you stopped waiting. The request may never have arrived, may have succeeded with the answer lost on the way back, or may still be in progress. All three look the same from your side."

  - question: "Which of these errors is worth retrying automatically?"
    options:
      - text: "400 Bad Request"
      - text: "401 Unauthorized"
      - text: "404 Not Found"
      - text: "503 Service Unavailable"
        correct: true
    explanation: "503 means the other service is temporarily unable to answer, so trying again later may work. A 400, 401 or 404 will give the same answer every time until you change the request."

  - question: "An AI-written retry loop tries again immediately and forever until the call succeeds. The service you call is overloaded. What happens?"
    options:
      - text: "The service recovers faster because it gets more requests"
      - text: "Your app adds even more load to a struggling service, which can keep it down longer"
        correct: true
      - text: "Nothing, because retries are always safe"
      - text: "The loop stops after one try"
    explanation: "Retries add load. Without waiting longer between attempts and a maximum number of tries, many copies of your app hammer the service exactly when it is weakest."

  - question: "Why add a little randomness (jitter) to the wait between retries?"
    options:
      - text: "So thousands of clients that failed at the same moment don't all retry at the same moment"
        correct: true
      - text: "To make the code harder to read"
      - text: "Because servers prefer random numbers"
      - text: "To make each retry faster"
    explanation: "If every client waits exactly 2 seconds, they all come back together and overload the service again. Random waits spread the retries out."

  - question: "You send a payment request with an idempotency key. The connection drops, and you retry with the same key and the same details. What does Stripe do?"
    options:
      - text: "It charges the customer a second time"
      - text: "It returns an error because the key was already used"
      - text: "It returns the saved result of the first request instead of charging again"
        correct: true
      - text: "It ignores the key"
    explanation: "Stripe remembers the result of the first request made with that key, for at least 24 hours. A retry with the same key gets that saved result back, so the customer is charged once."

  - question: "When should your app create a new idempotency key?"
    options:
      - text: "For every retry attempt"
      - text: "Once per operation, such as one checkout, and reuse it for every retry of that operation"
        correct: true
      - text: "Once per day for all requests"
      - text: "Only after a request succeeds"
    explanation: "The key says \"this is the same operation as before\". A new key on each retry would look like a brand-new payment, which is exactly the double charge you're trying to prevent."
---

# The payment timed out. Did it go through?

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Status code:** the number a server sends back with its answer, such as 200 (worked), 429 (too many requests) or 503 (temporarily unavailable). *([The app said "Saved!". The note was never saved](/lessons/http-methods-and-status-codes))*
> - **Idempotent:** doing something twice has the same effect as doing it once, like pressing a lift button twice. *([The app said "Saved!". The note was never saved](/lessons/http-methods-and-status-codes))*
> - **Webhook:** a message a service like Stripe sends to your server when something happens, such as a payment succeeding. *([Free stuff with one fake "payment succeeded" message](/lessons/webhooks))*
> - **Background job:** work your app does outside the user's request, often with automatic retries. *([Sign-up takes 10 seconds because of one email](/lessons/background-jobs))*

## Two charges for one pair of shoes

A customer clicks **Pay $49** in your shop. Your server sends the payment to your payment service and waits.

And waits. The payment service is having a slow moment. After 30 seconds, your code gives up and shows: *"Payment failed. Please try again."*

The customer clicks **Pay** again. This time it works in two seconds. They see "Thank you for your order!"

The next day, they email you a screenshot of their bank app. Two charges of $49.

What happened? The first payment **did not fail**. It went through. Only the *answer* was slow. Your code stopped waiting, assumed the worst, and asked the customer to pay again.

This lesson is about the most confusing moment in any app that talks to another service: you asked, and you got no answer. Did it work?

---

## The mental model: the phone call that cuts off

Imagine you phone a pizza shop. You give your order and your address. Right after you say "That's all", the line goes silent. The call dropped.

Did they get your order? There are three possibilities:

1. **The order never arrived.** The line dropped before they heard it.
2. **The order arrived, and they're making it.** Only their "Thank you, 30 minutes!" got lost.
3. **They're still writing it down.** The answer just hasn't come yet.

From your side, all three sound exactly the same: silence. If you call again and order again, in case 2 you get two pizzas.

Requests between computers work the same way. Your server sends a request to another service and waits. A **timeout** is the longest time you're willing to wait. When the time is up, you stop waiting.

Here's the key idea of this lesson:

> **A timeout tells you that you stopped waiting. It does not tell you what happened.**

**Where the comparison stops working:** a pizza shop can recognize your voice on the second call and say "We already have your order." A computer can't, unless you give it a way to recognize the repeat. That way is called an **idempotency key**, and it's the big fix later in this lesson.

### Why you need timeouts anyway

If timeouts cause this confusion, why not wait forever?

Because waiting is never free. While your server waits, the user stares at a spinner. Your serverless function keeps running until the platform stops it, and you may pay for that time. If many requests are stuck waiting, your app slows down for everyone.

Many tools wait a surprisingly long time by default. The `fetch` function built into Node.js can wait for minutes before giving up. The official OpenAI and Anthropic libraries for JavaScript wait 10 minutes per attempt by default, and then retry a timed-out request twice more. That's sensible for long AI answers, and far too long for a payment button.

So you set a timeout that fits the job, and then you deal with the uncertainty properly.

### Retries: trying again

When a request fails or times out, the obvious thing is to send it again. This is a **retry**. Many failures are short: a network hiccup, a service restarting, a brief overload. A retry a moment later often works.

But a retry is only safe if one of these is true:

- The request is **idempotent**, like reading data (GET) or deleting one specific record. Doing it twice changes nothing.
- Or you've given the request a way to be recognized as a repeat. That's what idempotency keys do.

---

## How it goes wrong

### Bug 1: No timeout at all

```js
const res = await fetch("https://api.example.com/rates");
```

This line waits as long as `fetch` allows: minutes. If that service hangs, your function runs until the platform stops it, and the user gets a `504` error after a long wait. Meanwhile, users click again, and every click starts another stuck request.

### Bug 2: Treating a timeout as a failure

```js
try {
  await chargeCustomer(order);
} catch (err) {
  return res.status(500).json({ error: "Payment failed. Please try again." });
}
```

In plain English: if anything goes wrong while charging, including a timeout, tell the user the payment failed and invite them to pay again.

This is exactly the bug from the story. "I didn't get an answer" became "it failed". For reading data, that's harmless. For anything that creates, sends or charges, it leads to doubles.

### Bug 3: The retry loop that never stops

```js
while (true) {
  try {
    return await callAiModel(prompt);
  } catch {
    // try again immediately
  }
}
```

In plain English: call the AI model; if it fails for any reason, call it again at once, forever.

Imagine the AI service is overloaded and returning errors. Your app, and every other app written like this, immediately sends more requests. The service gets *more* traffic exactly when it can handle *less*, so it stays down longer. And an error that will never go away, like an invalid API key, turns into an endless loop.

### Bug 4: Retrying the wrong errors

Not every error is temporary. A `400 Bad Request` means your request is wrong. A `401` means your key is wrong. A `404` means the thing doesn't exist. Sending the same request again gets the same answer every time. Retrying these only wastes time, and hides the real problem from your logs.

---

## What good looks like

### Fix 1: Always set a timeout

```js
const res = await fetch("https://api.example.com/rates", {
  signal: AbortSignal.timeout(5000), // give up after 5 seconds
});
```

`AbortSignal.timeout(5000)` creates a signal that cancels the request after 5,000 milliseconds (5 seconds). If that happens, `fetch` throws an error named `TimeoutError`, which your code can catch and handle.

Pick the number for the job. A quick lookup might get 5 seconds. A long AI answer might get 60, preferably streamed so the user sees progress. Most service libraries also have a `timeout` setting. Ask your AI to set it explicitly for every service you call.

### Fix 2: Retry the right errors, with growing waits

```js
async function withRetries(fn, attempts = 3) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (err) {
      if (!isTemporary(err) || i === attempts) throw err; // give up
      await sleep(2 ** i * 500 * (0.5 + Math.random())); // about 1s, 2s, 4s...
    }
  }
}
```

In plain English:

1. **Lines 2–3:** try the call, up to 3 times. If it works, return the result.
2. **Line 4:** if the error isn't **temporary**, or this was the last attempt, give up and pass the error on. `isTemporary` is a small helper that returns true only for a timeout, "too many requests" (429), or a server-side error (500, 502, 503, 504). Permanent errors fail fast.
3. **Line 5:** otherwise, wait before trying again (`sleep` is a helper that waits that many milliseconds). The wait roughly doubles each time.

Two ideas here have names:

- **Exponential backoff:** wait longer after each failure (1 second, then 2, then 4). This gives a struggling service time to recover.
- **Jitter:** add a little randomness to each wait. If a thousand users all failed at the same moment, they shouldn't all come back at the same moment. The random part spreads them out.

Some services tell you exactly how long to wait, in a `Retry-After` header on a `429` or `503` reply. If it's there, use it.

Also check before adding your own retries: the official OpenAI, Anthropic and Stripe libraries already retry some errors with backoff. Two layers of retries multiply: 3 retries in your code around 3 retries in the library is up to 16 attempts.

> **Go deeper:** [One slow service took your whole app down](/lessons/circuit-breakers) (Level 5) shows how to stop calling a service that keeps failing.

### Fix 3: Idempotency keys for anything that charges or creates

Now the real fix for the double charge. An **idempotency key** is a unique label you attach to one operation. It tells the service: *"If you've seen this label before, this is a repeat, not a new request."*

Stripe's documentation describes how it works:

- You send the key in a header called `Idempotency-Key`. Stripe suggests a random value such as a UUID, or a value tied to your own record, like the ID of a shopping cart.
- Stripe saves the result of the first request with that key, and returns that same saved result to any retry with the same key. No second charge.
- Keys are kept for at least 24 hours.
- If you reuse a key with *different* details, Stripe returns an error instead of guessing.

With Stripe's Node.js library, it's one extra option:

```js
const payment = await stripe.paymentIntents.create(
  { amount: 4900, currency: "usd", customer: order.stripeCustomerId },
  { idempotencyKey: `order-${order.id}-payment` }
);
```

In plain English:

1. **Line 2:** the payment details: $49.00 (Stripe counts in cents), in US dollars, for this customer.
2. **Line 3:** the idempotency key, built from your own order's ID. Every attempt to pay for *this order* uses the same key.

Now replay the story. The first request times out. Your code retries with the same key. Stripe recognizes it and returns the result of the first payment. One charge.

The most important rule: **one key per operation, not per attempt.** If you create a fresh random key on every retry, each retry looks like a brand-new payment, and the key protects nothing. If your app might retry later, from a background job or after a restart, save the key with the order so every attempt uses the same one.

### Fix 4: When you don't know, check instead of guessing

Sometimes retries run out and you still have no answer. Don't tell the user "failed", and don't start a new payment with a new key. Instead:

- Show an honest message: *"We're confirming your payment. This can take a minute."*
- Mark the order as `pending`.
- Find out what really happened. Stripe sends a webhook when the payment succeeds, and you can look the payment up through its API. Then update the order.

Stripe's own advice is the same: if the outcome is still unknown after the 24-hour window, stop retrying and check what happened before you try again.

### Fix 5: Protect your own API too

Your own users have the same problem with *your* server. They double-click, or their phone loses signal and the browser sends the form again. Your "Place order" route can accept an idempotency key too:

```js
app.post("/api/orders", requireLogin, async (req, res) => {
  const key = req.headers["idempotency-key"];
  if (!key) return res.status(400).json({ error: "Missing Idempotency-Key" });
  const existing = await db.order.findUnique({ where: { userId_key: { userId: req.user.id, key } } });
  if (existing) return res.json(existing); // a repeat: return the first result
  const order = await db.order.create({ data: { userId: req.user.id, key, ...cleanOrderData(req.body) } });
  res.status(201).json(order);
});
```

In plain English:

1. **Lines 2–3:** read the key from the request header. Refuse requests without one.
2. **Lines 4–5:** look for an order this user already created with this key. If there is one, this request is a repeat, so send back the same order.
3. **Lines 6–7:** otherwise, create the order and save the key with it.

The page creates the key once, when the checkout form opens, with `crypto.randomUUID()`, and sends the same key with every submit of that form. Make the user and key pair **unique** in your database, so two copies arriving at the same instant can't both create an order. Disabling the button after the first click helps too, but only as a convenience: the server check is what protects you.

> **Go deeper:** [A customer got charged twice. How?](/lessons/charged-twice) (Level 4) covers what happens when two copies of a request run at exactly the same time.

---

## Test your own app

Use your payment service's **test mode** for all of these.

1. **Search for missing timeouts.** Ask your AI: *"List every call to an outside service in my code, and the timeout each one uses. Mark the ones that use the default."*
2. **Double-click the pay button.** In test mode, click **Pay** twice quickly, or submit the form and press refresh. Then check the payment service's dashboard. Is there one payment or two?
3. **Lose the network mid-request.** In Chrome, open developer tools and click the **Network** tab. Find the throttling menu (it usually says "No throttling") and choose **Offline** right after you click **Pay**. Then switch back. What does your app tell the user? Does it invite them to pay again?
4. **Read your retry settings.** For each service library you use, find its default timeout and number of retries in its docs. Write them down.

---

## Takeaways

**Key terms**
- **Timeout:** the longest you'll wait for an answer. It tells you that you stopped waiting, not what happened.
- **Retry:** sending a failed request again
- **Exponential backoff:** waiting longer after each failed attempt
- **Jitter:** randomness added to the wait, so clients don't all retry together
- **Idempotency key:** a unique label for one operation, so the receiver can recognize repeats

**Red flags in AI-written code**
- `fetch` or a service library used with no timeout set
- A timeout or network error shown to the user as "Payment failed, try again"
- A retry loop with no maximum attempts or no wait between attempts
- Retries on `400`, `401`, `403` or `404` errors
- A payment, order or email request with no idempotency key
- A new random idempotency key generated inside the retry loop

**Ask your AI**
- *"Find every place where my app charges money, creates an order or sends a message. Does each one use an idempotency key that stays the same across retries?"*
- *"What does my checkout show the user if the payment request times out? Change it so a timeout is treated as 'unknown', not 'failed'."*
- *"Check my retry code: does it only retry temporary errors, use exponential backoff with jitter, and stop after a few attempts? Does the library underneath already retry?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Why retries can make outages worse.** An AWS article by Marc Brooker calls retries "selfish": each one asks the server for more of its capacity. When many layers of a system each retry, the numbers multiply. If your browser retries 3 times, your API retries 3 times, and your database library retries 3 times, one click can become dozens of database requests during an outage. A common rule is to retry at one layer only, usually the one closest to the failure.

**Retry budgets.** Some systems limit retries as a share of normal traffic, for example "retries may be at most 10% of requests". When the service is healthy, almost nothing needs retrying, so the budget is never used. When it's failing badly, the budget runs out and the app stops piling on.

**Nested timeouts.** If your page waits 10 seconds for your API, and your API waits 30 seconds for a payment service, the page gives up long before your server does. The server then finishes the payment for a user who has already seen an error. Inner timeouts should be shorter than outer ones.

**Stripe's saved errors.** Stripe saves the result of the first request with a key once the work has started, including `500` server errors. A retry with the same key returns the same saved `500`. Stripe treats a `500` as "outcome unknown": check what happened before trying again with a new key. Requests that fail before the work starts, such as invalid parameters or rate limiting, are not saved and can be retried.

**A standard header.** Stripe uses the `Idempotency-Key` header, and an IETF draft (still a draft as of writing) describes it as a general standard for HTTP APIs. Many payment and messaging APIs accept a header with this name, but check each service's docs: some use a different name or keep keys for a different time.


</details>

## References

- [Idempotent requests](https://docs.stripe.com/api/idempotent_requests): Stripe API reference. The `Idempotency-Key` header, keys up to 255 characters, keys kept for at least 24 hours, saved results including `500` errors, and errors when parameters change.
- [Advanced error handling](https://docs.stripe.com/error-low-level): Stripe documentation. Network errors with unknown outcomes, automatic retries in Stripe's libraries, and checking what happened instead of retrying after 24 hours.
- [AbortSignal: timeout() static method](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static): MDN. Cancelling a request after a set time, and the `TimeoutError` it produces.
- [Dispatcher](https://undici.nodejs.org/api/Dispatcher): undici documentation (the library behind `fetch` in Node.js). Default waits of 300 seconds for headers and body.
- [openai-node README](https://github.com/openai/openai-node): OpenAI. Two automatic retries by default and a 10-minute default timeout.
- [TypeScript SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript): Anthropic documentation. Two automatic retries by default (timeouts included), which errors are retried, and the 10-minute default timeout.
- [The Idempotency-Key HTTP Header Field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/): IETF Internet-Draft. The proposed general standard for the `Idempotency-Key` header, still a draft.
- [Timeouts, retries, and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter): Marc Brooker, AWS. Why retries are "selfish", how retries multiply across layers, exponential backoff and jitter.
