---
title: "Free stuff with one fake \"payment succeeded\" message"
slug: webhooks
order: 29
level: 2
levelName: Builder
concepts: [Webhooks, Signature verification, Signing secrets, Raw request body, Replay attacks, Duplicate deliveries, Idempotency]
readTime: 13 min
quiz:
  - question: "Your webhook endpoint reads the event type from the request body. When the type is \"checkout.session.completed\", it upgrades the user to Pro. It does not check a signature. What can an attacker do?"
    options:
      - text: "Nothing, because only Stripe knows the address of the endpoint"
      - text: "Nothing, because the request uses HTTPS"
      - text: "Send their own request with the same JSON and get Pro for free"
        correct: true
      - text: "Only read other users' payment details"
    explanation: "A webhook endpoint is a public address. Anyone can send it a request with any JSON. Without a signature check, your server cannot tell a Stripe message from a fake one. HTTPS protects the message on the way, but it does not prove who sent it."

  - question: "Your webhook code is correct, but every real Stripe event fails with \"No signatures found matching the expected signature\". Your app has app.use(express.json()) at the top, before all routes. What is the most likely cause?"
    options:
      - text: "The JSON parser changed the body before the signature check, so the body no longer matches"
        correct: true
      - text: "Stripe is down"
      - text: "The webhook secret must be in the frontend"
      - text: "Webhooks only work with GET requests"
    explanation: "Stripe calculates the signature from the exact bytes it sent. A JSON parser turns those bytes into an object. If the object becomes text again, spaces or order can change. The signature check needs the raw, unchanged body."

  - question: "An attacker copies a real, correctly signed webhook request. A week later, they send it to your server again. What stops this?"
    options:
      - text: "Nothing can stop it, because the signature is valid"
      - text: "The webhook secret changes every day"
      - text: "Stripe blocks the attacker's IP address"
      - text: "The signed timestamp: the Stripe library rejects messages older than its tolerance, 5 minutes by default"
        correct: true
    explanation: "Sending an old valid message again is a replay attack. Stripe signs a timestamp together with the body, so nobody can change the timestamp. The library compares it with the current time and rejects old messages."

  - question: "Stripe sends the same \"payment succeeded\" event to your server twice. Your code adds 100 credits each time it receives that event. What happens?"
    options:
      - text: "Stripe never sends an event twice, so nothing"
      - text: "The user gets 200 credits for one payment"
        correct: true
      - text: "The second request fails the signature check"
      - text: "The user pays twice"
    explanation: "Stripe can send the same event more than once, for example when it tries again after a timeout. Both copies have valid signatures. Your code must save the event ID and skip events it already handled."

  - question: "Your app upgrades users to Pro when they open the /payment-success page after checkout. Why is this a problem?"
    options:
      - text: "The page loads too slowly"
      - text: "Stripe cannot send users to pages on your domain"
      - text: "It is fine, the success page is safe"
      - text: "Anyone can open /payment-success without paying, and real payers who close the tab early never reach it"
        correct: true
    explanation: "The user controls the web address. Typing /payment-success proves nothing. The verified webhook is the reliable signal that a payment happened. It arrives even if the user closes the tab."

  - question: "Where should your Stripe webhook signing secret (whsec_...) be?"
    options:
      - text: "In an environment variable on your server"
        correct: true
      - text: "In your frontend code, so the browser can check events"
      - text: "In the webhook address, as a query parameter"
      - text: "In a public GitHub repository, so your team can find it"
    explanation: "The signing secret proves that a message came from Stripe. If another person learns it, they can sign fake events. Keep it on the server, in an environment variable, like any other secret."
---

# Free stuff with one fake "payment succeeded" message

> **Before you start**
> This lesson uses words from earlier lessons:
> - **Endpoint:** an address on your server that does one job, like `/api/checkout`. *([The hidden conversation behind every button you tap](/lessons/what-is-an-api))*
> - **POST and status codes:** POST is the request method that sends data. Status codes like 200 and 400 tell how the request went. *([The app said "Saved!". The note was never saved](/lessons/http-methods-and-status-codes))*
> - **Idempotent:** an action that has the same result when you do it once or many times. *([The app said "Saved!". The note was never saved](/lessons/http-methods-and-status-codes))*
> - **Secret:** a value like a password, such as an API key. It must stay on the server. *([Your API key leaked, and strangers are spending your money](/lessons/api-key-ended-up-public))*

## Pro, for free

You built a writing app with AI. Users can upgrade to a Pro plan for $10 a month. You use **Stripe**, a popular payment service, so you never touch card numbers yourself. The AI set it all up in an afternoon.

A month later, you count your Pro users: 140. Then you open your Stripe dashboard (the Stripe website for your account) and count the payments: 90.

Fifty people have Pro without paying. Stripe has no record of their payments, because there were none. Your server upgraded them anyway. It received a message that said "payment succeeded". The message did not come from Stripe. A user read your app's code, found the right address and sent the message.

This lesson explains how that message works. It also shows how to make your app believe only the real one.

---

## Webhooks: the other app calls you

Usually, your app asks other services for things. For example, your server sends a request to an AI service and waits for the answer.

A **webhook** works in the opposite direction. You give another service an address on your server. When something happens on their side, *they* send a request to *you*. For example: "a payment succeeded", "a subscription was cancelled" or "a refund was made".

Think of a pizza order. You can phone the shop every five minutes and ask "Is it ready?". Or the shop can phone you when the pizza leaves. A webhook is the shop that phones you.

Payment services use webhooks because payments do not always finish while the user is on your page. A bank can take a few seconds, or a few days, to confirm a payment. The user can close the tab right after paying. The webhook arrives anyway.

A webhook is a POST request to an endpoint on your server, like `/api/webhooks/stripe`. The body of the request contains **JSON**, a common text format for data. The JSON describes an **event**: what happened, and to which object.

**Where the pizza comparison stops working:** when the pizza shop phones you, you can recognize their number or their voice. A webhook endpoint is a public address on the internet. **Anyone** can send a request to it, with any JSON. A fake request looks the same as a real one. Nothing proves who sent it, unless you check.

![Stripe sends a signed event and an attacker sends a fake one. Your endpoint checks the signature: the real event upgrades the user, and the fake one gets a 400 reply.](/diagrams/webhooks-1.svg)

---

## How it goes wrong

### Bug 1: Believing whatever arrives

You ask an AI tool for "a Stripe webhook that upgrades the user after checkout". AI tools often write code like this. It uses **Express**, a popular tool for building servers in JavaScript. A **route** is the code that handles one endpoint.

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
3. **Lines 3–6:** If the event says that a checkout was completed, find the user ID in the event. Upgrade that user to Pro.
4. **Line 7:** Reply 200 OK.

Nothing here checks that the request came from Stripe. So anyone can send this command from the **terminal** (the text window where you type commands) on their own computer:

```bash
curl -X POST https://example.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"checkout.session.completed","data":{"object":{"client_reference_id":"42"}}}'
```

`curl` is a terminal program that sends web requests. This command sends a POST request with a fake event. The event says that user 42 finished checkout. Your server upgrades user 42. No payment happened.

"Nobody knows the address" is not protection. Webhook addresses appear in code, in logs (the records your server writes) and in screenshots. They often follow common patterns like `/api/webhooks/stripe`.

### Bug 2: Trusting the success page

Here is another common version. After checkout, Stripe sends the user back to `/payment-success`, and that page upgrades them.

Anyone can type `/payment-success` into their browser without paying. Also, a real customer can close the tab before Stripe sends them back. That customer never gets the upgrade. The success page is for saying "thank you". The verified webhook is for giving access.

### Bug 3: Doing the work twice

Stripe's docs say your endpoint "might occasionally receive the same event more than once". If your server does not reply with a success code in time, Stripe sends the event again. In live mode (real payments), it can try again for up to three days.

Your code can add 100 credits or send a welcome email every time it sees the event. Then one retry gives 200 credits or two emails.

---

## What good looks like

### Fix 1: Check the signature

Stripe solves Bug 1 with a **signature**. When you create a webhook endpoint in the Stripe dashboard, Stripe gives you a **signing secret**. It starts with `whsec_`. Only Stripe and your server know it.

Each time Stripe sends an event, it does these steps:

1. It takes the current time and the **exact text** of the request body.
2. It mixes them with the signing secret. It uses a standard method called **HMAC-SHA256**. The result is a long code: the signature.
3. It sends the time and the signature in a **header** called `Stripe-Signature`. A header is an extra line of information that travels with the request.

Your server does the same calculation with its own copy of the secret. If the results match, two things are true. First, the sender knew the secret. Second, nobody changed a single character of the body on the way.

A signature is like a wax seal on a letter, made with a stamp that only two people own. But the signature also depends on every letter of the message. If one character changes, the seal no longer fits.

You do not need to write this calculation yourself. Stripe's **library** (ready-made code from Stripe) does it:

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

1. **Line 1:** For this route only, keep the body as **raw** data. Raw data is the exact bytes that Stripe sent, not changed into a JSON object.
2. **Line 2:** Read the signature from the `Stripe-Signature` header.
3. **Lines 4–5:** Give Stripe's library three things: the raw body, the signature and your `whsec_` signing secret. The secret comes from an **environment variable**, a setting stored on the server outside your code. The library checks the signature and the time. If everything matches, it gives you the event.
4. **Lines 6–8:** If the check fails, the library throws an error. Your code replies 400 and stops. A fake event never reaches the code that upgrades users.
5. **Lines 9–10:** Only now, handle the event. Then reply 200, so Stripe knows that the event arrived.

With this code, the `curl` request from Bug 1 gets a 400 reply. The attacker does not know your secret, so they cannot make a valid signature.

### The raw body trap

Most people get stuck here. Any change to the body makes the check fail. Stripe's docs say it directly: "Stripe requires the raw body of the request to perform signature verification."

A **JSON parser** is code that reads JSON text and turns it into an object. If your code then turns the object back into text, the spaces and the order of fields can change. Stripe made the signature from the original text, so the signature no longer matches. You see an error like "No signatures found matching the expected signature for payload". This happens even for real events from Stripe.

In Express, the usual cause is `app.use(express.json())` at the top of your app. This line parses every request before your webhook route sees it. Stripe's fix is to put the webhook route **before** `app.use(express.json())`, as in the code above. If your app uses Next.js (another popular tool for web apps), read the body with `await request.text()`, not with `request.json()`.

**Do not "fix" a failing signature check by removing it.** If real events fail, then something changes the body, or you use the wrong secret. Find out which one.

### Fix 2: Reject old messages (replay protection)

An attacker can get a copy of one real, correctly signed event. For example, the event can appear in a log file. The attacker cannot change it, because a change breaks the signature. But they can send the same copy again a week later. This is a **replay attack**.

Stripe stops this with the time in the signature. The time is part of the signed data, so the attacker cannot change it. Stripe's libraries reject events whose time is more than **5 minutes** old, by your server's clock. You can change that tolerance. Do not set it to 0. Stripe's docs warn that 0 turns off the time check completely.

This check uses your server's clock, so the clock must be correct. Hosting platforms do this for you. On your own server, turn on automatic time sync (the setting that keeps the clock correct).

### Fix 3: Handle each event only once

Replay protection rejects *old* copies. It does not stop the retries from Stripe itself. A retry is a new, correctly signed delivery of the same event. For retries, your webhook handling must be **idempotent**: handling an event twice must have the same result as handling it once.

Every Stripe event has a unique ID, like `evt_1A2b3C...`. Stripe advises you to record the IDs that you processed. Then skip any ID that you saw before:

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

1. **Lines 2–3:** Look for this event's ID in a database table of handled events. If the ID is there, stop.
2. **Lines 4–6:** Do the real work: upgrade the user in the event, with the same two lines as in Bug 1. Now you can trust the user ID, because the whole event passed the signature check. (Your server put that ID there itself when it created the checkout.)
3. **Line 7:** Save the event ID, so your code skips the next copy.

![Copy 1 of event evt_123 is new, so the server does the work and saves the ID. Copy 2 finds the saved ID, so the server does nothing.](/diagrams/webhooks-2.svg)

Two copies can arrive at almost the same moment. Both copies can pass the check on line 2 before either one saves its ID. So make the `id` column **unique** in your database. Then the database refuses a second row with the same ID. Also, do the work and the save together in one database **transaction** (a group of changes that all succeed or all fail together). Then the save for the second copy fails, and the database undoes its work.

> **Go deeper:** [The payment timed out. Did it go through?](/lessons/timeouts-and-retries) (Level 3) covers retries and idempotency outside webhooks. [A customer got charged twice. How?](/lessons/charged-twice) (Level 4) covers what happens when two copies run at the same time.

### Reply fast, work later

Stripe expects a quick reply with a success code (a status code in the 200s, also called 2xx). Your handler can be too slow if it sends emails, creates PDFs or calls other services before it replies. Then Stripe treats the delivery as failed and sends it again. Save the event, reply 200 and do the slow work after that.

> **Go deeper:** [Sign-up takes 10 seconds because of one email](/lessons/background-jobs) (Level 3) shows how to move slow work out of the request.

### Other services work the same way

GitHub, Shopify, Twilio, Clerk and most other services that send webhooks also sign them. Each service has its own header and method. The rules are the same everywhere:

- Use the official library or the documented method.
- Verify the signature on the raw body.
- Check the time if the service signs one.
- Skip duplicates.

If a service does not sign its webhooks, do not trust the content. Use the event only as a hint. Then ask that service's API what really happened.

---

## Test your own app

You need the **Stripe CLI**. It is the Stripe program for testing in the terminal. Its install guide is in Stripe's docs. Use Stripe's test mode. Never use real payments.

1. **Send a fake event.** Run the `curl` command from Bug 1 against your own webhook endpoint. Use your laptop or a test copy of your app. The correct reply is **400**. If you get 200 and the test user gets Pro, you have Bug 1.
2. **Send a real test event.** Run `stripe listen --events checkout.session.completed --forward-to localhost:3000/api/webhooks/stripe`. Change the port and the path to match your app. (Newer versions of the Stripe CLI require you to name the events to forward.) The command prints a `whsec_` secret. Put it in your local environment variables and restart your server. In a second terminal, run `stripe trigger checkout.session.completed`. Your server must reply 200. If it replies 400 here, you probably have the raw body trap.
3. **Send a duplicate.** In the Stripe dashboard, open a test event that your endpoint received. Click **Resend**. Your app must not do the work a second time.
4. **Search your code** for your webhook route. Make sure that it does not run after `app.use(express.json())`. Make sure that the secret comes from an environment variable.

---

## Takeaways

**Key terms**
- **Webhook:** a request that another service sends to your server when something happens.
- **Event:** the message in a webhook. It has a type and a unique ID.
- **Signing secret:** a secret that only the service and your server know. The service uses it to sign events.
- **Signature verification:** your server calculates the signature again. This proves who sent the event and that nothing changed.
- **Replay attack:** someone sends an old, valid message again.
- **Idempotent handling:** handling the same event twice has the same result as handling it once.

**Red flags in AI-written code**
- The webhook route reads `req.body` and acts on it with no signature check.
- `app.use(express.json())` runs before the webhook route, or the code calls `JSON.stringify(req.body)` before the check.
- Someone commented out the signature check, or ignored its errors, "to make it work".
- The signing secret is written in the code, not in an environment variable.
- The success page gives access, not the webhook.
- The app keeps no record of processed event IDs.

**Ask your AI**
- *"Show me where my webhook endpoint verifies the signature. Does it use the raw request body and the official library?"*
- *"Does any JSON parsing happen on my webhook route before signature verification?"*
- *"What happens in my app if the same webhook event arrives twice, or two copies arrive at the same time?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**The signature by hand.** The `Stripe-Signature` header contains entries like `t=1798765432,v1=5257a8...`. `t` is the time in seconds. `v1` is the signature. You can check it without the library:

1. Join the time, a `.` and the raw body into one string.
2. Calculate an HMAC with SHA-256. Use your signing secret as the key.
3. Compare the result with every `v1` value. Use a **constant-time comparison** (in Node.js, `crypto.timingSafeEqual`). Then an attacker cannot learn the correct answer from how long the comparison takes.
4. Check the time against your tolerance.

Ignore other entries in the header. Stripe sends a fake `v0` signature for test events. It can also add unsigned entries for debugging.

**Rolling the secret.** You can replace the signing secret of an endpoint in the Stripe dashboard. The old secret can stay valid for up to 7 days. During that time, Stripe sends one `v1` signature for each active secret.

**IP allowlisting.** Stripe publishes the list of IP addresses that its webhooks come from. Stripe recommends that you accept webhook requests only from those addresses, in addition to the signature check.

**Order is not guaranteed.** Stripe does not promise to deliver events in the order they happened. An `invoice.paid` event can arrive before `invoice.created`. Do not write logic that depends on order. If you need the latest state of an object, ask Stripe's API for it.

**Thin events.** Newer Stripe integrations can use "thin" events. A thin event only says which object changed, and your code gets the details from the API. Stripe's libraries verify thin events with `parseEventNotification()`, not `constructEvent()`. The same rules apply: raw body, signature, duplicates.

**Retries in test mode.** In live mode, Stripe tries failed deliveries again for up to three days, with longer gaps each time. In a sandbox (a Stripe test area), it tries three times over a few hours. Each retry gets a new timestamp and signature, so retries pass the 5-minute check.

</details>

## References

- [Receive Stripe events in your webhook endpoint](https://docs.stripe.com/webhooks): Stripe docs. Signature verification with the raw body, the `Stripe-Signature` header and HMAC-SHA256, the 5-minute default tolerance and the warning about 0, duplicate events, retries for up to three days, quick 2xx replies, event order, rolling secrets and IP allowlisting.
- [Manage webhook endpoints](https://docs.stripe.com/events/manage-webhook-endpoints): Stripe docs. The "No signatures found matching the expected signature for payload" error, placing the webhook route before `express.json()`, and `parseEventNotification()` for thin events.
- [Next.js webhook signing example](https://github.com/stripe/stripe-node/blob/master/examples/webhook-signing/nextjs/app/api/webhooks/route.ts): stripe-node on GitHub. Reading the raw body with `req.text()` in a Next.js route handler.
- [stripe listen](https://docs.stripe.com/cli/listen): Stripe CLI reference. Forwarding test events to your local endpoint with `--forward-to`, which needs `--events` (or `--all-snapshot`) in current CLI versions.
- [stripe trigger](https://docs.stripe.com/cli/trigger): Stripe CLI reference. Sending a test event such as `checkout.session.completed`.
- [crypto.timingSafeEqual](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b): Node.js docs. The constant-time comparison used when checking a signature by hand.
