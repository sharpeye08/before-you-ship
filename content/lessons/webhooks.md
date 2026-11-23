---
title: "Free stuff with one fake \"payment succeeded\" message"
slug: webhooks
order: 29
level: 2
levelName: Builder
concepts: [Webhooks, Signature verification, Signing secrets, Raw request body, Replay attacks, Duplicate deliveries, Idempotency]
readTime: 13 min
quiz:
  - question: "Your webhook endpoint reads the event type from the request body and upgrades the user to Pro when it says \"checkout.session.completed\". It doesn't check a signature. What can an attacker do?"
    options:
      - text: "Nothing, because only Stripe knows the address of the endpoint"
      - text: "Nothing, because the request uses HTTPS"
      - text: "Send their own request with the same JSON and get Pro for free"
        correct: true
      - text: "Only read other users' payment details"
    explanation: "A webhook endpoint is a public address. Anyone can send it a request with any JSON they like. Without a signature check, your server can't tell Stripe's message from a fake one. HTTPS protects the message on the way, but it doesn't prove who sent it."

  - question: "Your webhook code is correct, but every real Stripe event fails with \"No signatures found matching the expected signature\". Your app uses app.use(express.json()) at the top, before all routes. What is the most likely cause?"
    options:
      - text: "The JSON parser changed the body before the signature was checked, so it no longer matches"
        correct: true
      - text: "Stripe is down"
      - text: "The webhook secret must be in the frontend"
      - text: "Webhooks only work with GET requests"
    explanation: "The signature is calculated from the exact bytes Stripe sent. A JSON parser turns those bytes into an object, and turning it back into text can change spaces or order. The signature check needs the raw, unchanged body."

  - question: "An attacker copies a real, correctly signed webhook request and sends it to your server again a week later. What stops this?"
    options:
      - text: "Nothing can stop it, because the signature is valid"
      - text: "The webhook secret changes every day"
      - text: "Stripe blocks the attacker's IP address"
      - text: "The signed timestamp: the Stripe library rejects messages that are older than its tolerance, 5 minutes by default"
        correct: true
    explanation: "Sending an old valid message again is called a replay attack. Stripe signs a timestamp together with the body, so it can't be changed. The library compares it with the current time and rejects old messages."

  - question: "Stripe sends the same \"payment succeeded\" event to your server twice. Your code adds 100 credits each time it receives that event. What happens?"
    options:
      - text: "Stripe never sends an event twice, so nothing"
      - text: "The user gets 200 credits for one payment"
        correct: true
      - text: "The second request fails the signature check"
      - text: "The user is charged twice"
    explanation: "Stripe can deliver the same event more than once, for example when it retries after a timeout. Both copies have valid signatures. Your code must save the event ID and skip events it has already handled."

  - question: "Your app upgrades users to Pro when they land on the /payment-success page after checkout. Why is this a problem?"
    options:
      - text: "The page loads too slowly"
      - text: "Stripe can't redirect to pages on your domain"
      - text: "It's fine, the success page is safe"
      - text: "Anyone can open /payment-success without paying, and real payers who close the tab early never land on it"
        correct: true
    explanation: "A web address is something the user controls. Typing /payment-success proves nothing. The verified webhook is the reliable signal that a payment happened, and it arrives even if the user closes the tab."

  - question: "Where should your Stripe webhook signing secret (whsec_...) live?"
    options:
      - text: "In an environment variable on your server"
        correct: true
      - text: "In your frontend code, so the browser can check events"
      - text: "In the webhook URL, as a query parameter"
      - text: "In a public GitHub repository, so your team can find it"
    explanation: "The signing secret is what proves a message came from Stripe. If anyone else learns it, they can sign fake events. Keep it on the server, in an environment variable, like any other secret."
---

# Free stuff with one fake "payment succeeded" message

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Endpoint:** an address on your server that does one job, like `/api/checkout`. *([The hidden conversation behind every button you tap](/lessons/what-is-an-api))*
> - **POST and status codes:** POST is the request method for sending data; status codes like 200 and 400 say how it went. *([The app said "Saved!". The note was never saved](/lessons/http-methods-and-status-codes))*
> - **Idempotent:** an action that has the same result whether you do it once or many times. *([The app said "Saved!". The note was never saved](/lessons/http-methods-and-status-codes))*
> - **Secret:** a password-like value, such as an API key, that must stay on the server. *([Your API key leaked, and strangers are spending your money](/lessons/api-key-ended-up-public))*

## Pro, for free

You built a writing app with AI. Users can upgrade to a Pro plan for $10 a month. You use **Stripe**, a popular payment service, so you never touch card numbers yourself. The AI set it all up in an afternoon.

A month later, you count your Pro users: 140. Then you open your Stripe dashboard and count the payments: 90.

Fifty people have Pro without paying. Stripe has no record of their payments, because there were none. Your server upgraded them anyway, because it received a message that said "payment succeeded". The message didn't come from Stripe. It came from a user who read your app's code, found the right address, and sent the message themselves.

This lesson explains how that message works, and how to make sure your app only believes the real one.

---

## Webhooks: the other app calls you

Usually, your app asks other services for things. Your server calls an AI API and waits for the answer. That's your app making a request.

A **webhook** works the other way around. You give another service an address on your server. When something happens on their side, *they* send a request to *you*. For example: "a payment succeeded", "a subscription was cancelled", "a refund was made".

Think of a pizza order. You could phone the shop every five minutes and ask "is it ready?". Or the shop could phone you when the pizza leaves. A webhook is the shop phoning you.

Payment services use webhooks because payments don't always finish while the user is on your page. A bank might take a few seconds, or a few days, to confirm. The user might close the tab right after paying. The webhook arrives anyway.

In practice, a webhook is a POST request to an endpoint on your server, like `/api/webhooks/stripe`, with JSON in the body. The JSON describes an **event**: what happened, and to which object.

**Where the phone comparison stops working:** when the pizza shop phones you, you can recognize their number or their voice. A webhook endpoint is a public address on the internet. **Anyone** can send a request to it, with any JSON they want, and it looks the same as a real one. Nothing proves who sent it, unless you check.

---

## How it goes wrong

### Bug 1: Believing whatever arrives

Here's the kind of webhook code AI tools often write when you ask for "a Stripe webhook that upgrades the user after checkout":

```js
app.post("/api/webhooks/stripe", express.json(), async (req, res) => {
  const event = req.body;
  if (event.type === "checkout.session.completed") {
    const userId = event.data.object.client_reference_id;
    await db.user.update({ where: { id: userId }, data: { plan: "pro" } });
  }
  res.sendStatus(200);
});
```

In plain English:

1. **Line 1:** When a POST request arrives at `/api/webhooks/stripe`, read its body as JSON.
2. **Line 2:** Treat the body as a Stripe event.
3. **Lines 3–6:** If the event says a checkout was completed, find the user ID inside it and upgrade that user to Pro.
4. **Line 7:** Reply 200 OK.

Nothing here checks that the request came from Stripe. So anyone can do this from their own computer:

```bash
curl -X POST https://example.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"checkout.session.completed","data":{"object":{"client_reference_id":"42"}}}'
```

`curl` is a terminal program that sends web requests. This one sends a POST request with a fake event that says user 42 finished checkout. Your server upgrades user 42. No payment happened.

"But nobody knows the address" is not protection. Webhook addresses appear in code, in logs, in screenshots, and they often follow common patterns like `/api/webhooks/stripe`.

### Bug 2: Trusting the success page

Another common version: after checkout, Stripe sends the user back to `/payment-success`, and that page upgrades them.

Anyone can type `/payment-success` into their browser without paying. And a real customer who closes the tab before the redirect finishes never gets upgraded. The success page is for saying "thank you". The verified webhook is for giving access.

### Bug 3: Doing the work twice

Stripe's docs say your endpoint "might occasionally receive the same event more than once". If your server doesn't reply with a success code in time, Stripe tries again, and in live mode it keeps retrying for up to three days. If your code adds 100 credits or sends a welcome email every time it sees the event, a retry means 200 credits or two emails.

---

## What good looks like

### Fix 1: Check the signature

Stripe solves Bug 1 with a **signature**. When you create a webhook endpoint in the Stripe dashboard, Stripe gives you a **signing secret** that starts with `whsec_`. Only Stripe and your server know it.

Every time Stripe sends an event, it does this:

1. It takes the current time and the **exact text** of the request body.
2. It mixes them with the signing secret, using a standard method called **HMAC-SHA256**. The result is a long code: the signature.
3. It sends the time and the signature in a header called `Stripe-Signature`.

Your server repeats the same calculation with its own copy of the secret. If the results match, two things are true: the sender knew the secret, and nobody changed a single character of the body on the way.

It's like a wax seal on a letter, made with a stamp that only two people own. Unlike a wax seal, the signature also depends on every letter of the message. Change one character, and the seal no longer fits.

You don't need to write this calculation yourself. Stripe's library does it:

```js
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).send("Invalid signature");
  }
  await handleEvent(event);
  res.sendStatus(200);
});
```

In plain English:

1. **Line 1:** For this route only, keep the body as **raw** data: the exact bytes Stripe sent, not turned into JSON.
2. **Line 2:** Read the signature Stripe sent in the `Stripe-Signature` header.
3. **Lines 4–5:** Give Stripe's library three things: the raw body, the signature, and your `whsec_` signing secret from an environment variable. The library checks the signature and the time. If everything matches, it gives you the event.
4. **Lines 6–8:** If the check fails, the library throws an error, so reply 400 and stop. A fake event never reaches your business code.
5. **Lines 9–10:** Only now, handle the event, then reply 200 so Stripe knows it arrived.

With this code, the `curl` request from Bug 1 gets a 400 reply. The attacker doesn't know your secret, so they can't make a valid signature.

### The raw body trap

This is where most people get stuck. Stripe's docs are direct about it: "Stripe requires the raw body of the request to perform signature verification." Any change to the body makes the check fail.

A JSON parser reads the text and turns it into an object. If your code then turns the object back into text, spaces and the order of fields can change. The signature was made from the original text, so it no longer matches. You see an error like "No signatures found matching the expected signature for payload", even for real events from Stripe.

The usual cause in Express is `app.use(express.json())` at the top of your app, which parses every request before your webhook route sees it. Stripe's fix: register the webhook route **before** `app.use(express.json())`, as in the code above. In a Next.js route handler, read the body with `await request.text()` instead of `request.json()`.

**Never "fix" a failing signature check by removing it.** If real events fail, the body is being changed somewhere, or you're using the wrong secret. Find out which.

### Fix 2: Reject old messages (replay protection)

Imagine an attacker gets a copy of one real, correctly signed event. Maybe it appeared in a log file. They can't change it, because that breaks the signature. But they could send the same copy again a week later. This is called a **replay attack**.

Stripe prevents this with the time in the signature. The time is part of what gets signed, so the attacker can't change it. Stripe's libraries reject events whose time is more than **5 minutes** old, measured by your server's clock. You can change that tolerance, but don't set it to 0: Stripe's docs warn that 0 turns the time check off completely.

This check uses your server's clock, so the clock must be correct. Hosting platforms handle this for you. On your own server, make sure automatic time sync is on.

### Fix 3: Handle each event only once

Replay protection rejects *old* copies. It doesn't stop Stripe's own retries, which are new, correctly signed deliveries of the same event. For those, you need to make your webhook handling **idempotent**: handling an event twice must have the same result as handling it once.

Every Stripe event has a unique ID, like `evt_1A2b3C...`. Stripe's advice is to record the IDs you've processed and skip any you've seen before:

```js
async function handleEvent(event) {
  const seen = await db.processedEvent.findUnique({ where: { id: event.id } });
  if (seen) return; // already handled: do nothing
  if (event.type === "checkout.session.completed") {
    // ... upgrade the user, as in Bug 1
  }
  await db.processedEvent.create({ data: { id: event.id } });
}
```

In plain English:

1. **Lines 2–3:** Look up this event's ID in a database table of handled events. If it's there, stop.
2. **Lines 4–6:** Do the real work: upgrade the user named in the event, with the same two lines as in Bug 1. Now the user ID can be trusted, because the whole event passed the signature check. (Your server put that ID there itself when it created the checkout.)
3. **Line 7:** Save the event ID, so the next copy is skipped.

Two copies can arrive at almost the same moment, and both can pass the check on line 2 before either saves. So make the `id` column **unique** in your database, and do the work and the save together in one database **transaction** (a group of changes that all succeed or all fail together). Then the second copy's save fails, and its work is undone, instead of both copies getting through.

> **Go deeper:** [The payment timed out. Did it go through?](/lessons/timeouts-and-retries) (Level 3) covers retries and idempotency beyond webhooks, and [A customer got charged twice. How?](/lessons/charged-twice) (Level 4) covers what happens when two copies run at the same time.

### Reply fast, work later

Stripe expects a quick 2xx reply. If your handler sends emails, creates PDFs or calls other APIs before replying, it may be too slow, and Stripe will treat the delivery as failed and send it again. Save the event, reply 200, and do slow work afterwards.

> **Go deeper:** [Sign-up takes 10 seconds because of one email](/lessons/background-jobs) (Level 3) shows how to move slow work out of the request.

### Other services work the same way

GitHub, Shopify, Twilio, Clerk and most other services that send webhooks also sign them, each with its own header and method. The rules are the same everywhere: use their official library or documented method, verify the signature on the raw body, check the time if the service signs one, and skip duplicates. If a service doesn't sign its webhooks, don't trust the content: use the event only as a hint, and ask that service's API what really happened.

---

## Test your own app

You need the **Stripe CLI**: Stripe's terminal program for testing. Its install guide is in Stripe's docs. Use Stripe's test mode, never real payments.

1. **Send a fake event.** Run the `curl` command from Bug 1 against your own webhook endpoint (on your laptop, or a test copy of your app). The right answer is **400**. If you get 200, and the test user got upgraded, you have Bug 1.
2. **Send a real test event.** Run `stripe listen --events checkout.session.completed --forward-to localhost:3000/api/webhooks/stripe` (change the port and path to match your app; newer versions of the Stripe CLI require you to name the events to forward). It prints a `whsec_` secret: put it in your local environment variables and restart your server. In a second terminal, run `stripe trigger checkout.session.completed`. Your server should reply 200. If it replies 400 here, you probably have the raw body trap.
3. **Send a duplicate.** In the Stripe dashboard, open a test event your endpoint received and click **Resend**. Your app should not do the work a second time.
4. **Search your code** for your webhook route. Check that it doesn't run after `app.use(express.json())`, and that the secret comes from an environment variable.

---

## Takeaways

**Key terms**
- **Webhook:** a request another service sends to your server when something happens
- **Event:** the message inside a webhook, with a type and a unique ID
- **Signing secret:** a secret shared only by the service and your server, used to sign events
- **Signature verification:** recalculating the signature on your server to prove who sent the event and that nothing changed
- **Replay attack:** sending an old, valid message again
- **Idempotent handling:** handling the same event twice has the same result as once

**Red flags in AI-written code**
- The webhook route reads `req.body` and acts on it with no signature check
- `app.use(express.json())` runs before the webhook route, or the code calls `JSON.stringify(req.body)` before verifying
- The signature check is commented out, or wrapped so errors are ignored, "to make it work"
- The signing secret is written in the code instead of an environment variable
- Access is given on the success page instead of in the webhook
- No record of processed event IDs

**Ask your AI**
- *"Show me where my webhook endpoint verifies the signature. Does it use the raw request body and the official library?"*
- *"Is any JSON parsing applied to my webhook route before signature verification?"*
- *"What happens in my app if the same webhook event arrives twice, or two copies arrive at the same time?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**The signature by hand.** The `Stripe-Signature` header contains entries like `t=1798765432,v1=5257a8...`. `t` is the time in seconds. `v1` is the signature. To check it without the library, join the time, a `.` and the raw body into one string, calculate an HMAC with SHA-256 using your signing secret as the key, and compare the result with every `v1` value. Use a **constant-time comparison** (in Node.js, `crypto.timingSafeEqual`), so an attacker can't learn the right answer from how long the comparison takes. Then check the time against your tolerance. Ignore other entries in the header: Stripe sends a fake `v0` signature for test events, and may add unsigned debugging entries.

**Rolling the secret.** You can replace an endpoint's signing secret in the Stripe dashboard and keep the old one working for up to 7 days. During that time Stripe sends one `v1` signature per active secret.

**IP allowlisting.** Stripe publishes the list of IP addresses its webhooks come from, and recommends accepting webhook requests only from those addresses, in addition to checking signatures.

**Order is not guaranteed.** Stripe doesn't promise to deliver events in the order they happened. An `invoice.paid` event can arrive before `invoice.created`. Don't build logic that depends on order. If you need the latest state of an object, ask Stripe's API for it.

**Thin events.** Newer Stripe integrations can use "thin" events, which only say which object changed, and your code fetches the details from the API. Stripe's libraries verify these with `parseEventNotification()` instead of `constructEvent()`. The same rules apply: raw body, signature, duplicates.

**Retries in test mode.** In live mode, Stripe retries failed deliveries for up to three days with growing gaps. In a sandbox it retries three times over a few hours. Each retry gets a new timestamp and signature, so retries pass the 5-minute check.

</details>

## References

- [Receive Stripe events in your webhook endpoint](https://docs.stripe.com/webhooks): Stripe docs. Signature verification with the raw body, the `Stripe-Signature` header and HMAC-SHA256, the 5-minute default tolerance and the warning about 0, duplicate events, retries for up to three days, quick 2xx replies, event order, rolling secrets and IP allowlisting.
- [Manage webhook endpoints](https://docs.stripe.com/events/manage-webhook-endpoints): Stripe docs. The "No signatures found matching the expected signature for payload" error, placing the webhook route before `express.json()`, and `parseEventNotification()` for thin events.
- [Next.js webhook signing example](https://github.com/stripe/stripe-node/blob/master/examples/webhook-signing/nextjs/app/api/webhooks/route.ts): stripe-node on GitHub. Reading the raw body with `req.text()` in a Next.js route handler.
- [stripe listen](https://docs.stripe.com/cli/listen): Stripe CLI reference. Forwarding test events to your local endpoint with `--forward-to`, which needs `--events` (or `--all-snapshot`) in current CLI versions.
- [stripe trigger](https://docs.stripe.com/cli/trigger): Stripe CLI reference. Sending a test event such as `checkout.session.completed`.
- [crypto.timingSafeEqual](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b): Node.js docs. The constant-time comparison used when checking a signature by hand.
