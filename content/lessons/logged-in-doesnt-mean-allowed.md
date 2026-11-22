---
title: "Logged in doesn't mean allowed"
slug: logged-in-doesnt-mean-allowed
order: 21
level: 2
levelName: Builder
concepts: [Authentication, Authorization, IDOR, Mass assignment]
readTime: 13 min
quiz:
  - question: "Your app checks that a user is logged in. Then it finds an invoice using only the number in the web address. What can a logged-in user do?"
    options:
      - text: "See only their own invoices"
      - text: "See anyone's invoice by changing the number in the web address"
        correct: true
      - text: "Nothing, because the login check stops them"
      - text: "See other people's invoices only if they are an admin"
    explanation: "Checking login only answers \"who are you?\". The app never checks who owns the invoice, so any logged-in user can open any invoice. This bug is called an IDOR."

  - question: "You change your invoice IDs from simple numbers (1, 2, 3) to long random codes. What happens to the bug?"
    options:
      - text: "It is completely fixed"
      - text: "IDs are harder to guess, but anyone who gets one can still use it"
        correct: true
      - text: "The bug gets worse"
      - text: "Nothing changes at all"
    explanation: "Random IDs are harder to guess, but they still end up in shared links, screenshots and emails. Hiding the ID does not protect anything. The real fix is an ownership check on the server."

  - question: "How should your server know which user is making a request?"
    options:
      - text: "From the form the user filled in"
      - text: "From the web address"
      - text: "From the session the server created when the user logged in"
        correct: true
      - text: "From whatever user ID the browser sends"
    explanation: "The user can change anything their browser sends, including forms and web addresses. The session was created and checked by the server itself, so it is the only thing the server can trust."

  - question: "A user edits their profile and secretly adds \"role\": \"admin\" to the data their browser sends. The server saves every field it receives, and the user becomes an admin. What is this bug called?"
    options:
      - text: "Mass assignment"
        correct: true
      - text: "A forgotten password"
      - text: "A slow database"
      - text: "Authentication"
    explanation: "Mass assignment happens when the server saves every field it is sent, instead of only the fields it expects. The fix is to list exactly which fields users are allowed to change."

  - question: "In the fixed version, when someone asks for another person's invoice, the app replies \"not found\" instead of \"not allowed\". Why?"
    options:
      - text: "\"Not found\" is faster to send"
      - text: "Browsers can't show \"not allowed\" messages"
      - text: "\"Not allowed\" would tell a snoop that the invoice exists"
        correct: true
      - text: "It doesn't matter, both are equally safe"
    explanation: "\"Not allowed\" confirms there is something there to find. \"Not found\" gives away nothing."

  - question: "Your \"view invoice\" feature checks who owns the invoice. A week later, the AI adds a \"delete invoice\" feature. What should you check?"
    options:
      - text: "Nothing, the view feature already has a check"
      - text: "That the delete button is hidden from other users"
      - text: "That the user is logged in"
      - text: "That the delete feature has its own ownership check on the server"
        correct: true
    explanation: "Every feature that reads, changes or deletes data needs its own check on the server. Hiding a button doesn't help, because anyone can send the request without the button."
---

# Logged in doesn't mean allowed

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Request:** a message your browser sends to a server, like "show me this page". *([What actually happens when you open a website](/lessons/what-happens-when-you-open-a-website))*
> - **API route:** an address on your server that your app's pages talk to behind the scenes, like `/api/invoices`. *([How your app's pages talk to your server](/lessons/what-is-an-api))*
> - **Database:** where your app keeps its data permanently, organized into tables. *([Why not just save it to a JSON file?](/lessons/what-is-a-database))*
> - **Session:** the server's record that a browser belongs to a logged-in user. *([Why you must never store passwords](/lessons/how-login-works))*

## Friday launch, Sunday email

You built an invoicing app with AI over the weekend. Small businesses sign up, create bills for their customers and see a list of them. Sign-up works. Login works. You launch on Friday.

Each invoice has its own page, with a web address like this:

```
myapp.com/invoices/1042
```

The number at the end is the invoice's **ID**: a number the app uses to tell invoices apart, like a receipt number.

On Sunday, a user emails you:

> "I changed 1042 in the web address to 1041, and I could see someone else's invoice. Then 1040. Then all of them."

Nobody stole a password. Nobody used hacking tools. Your user changed one number in their browser. Your app did exactly what its code told it to do. The code just never asked one important question.

This lesson is about that question.

---

## Two questions every app must ask

Every time someone asks your server to do something, the server has to answer two different questions:

1. **Who are you?**
2. **Are you allowed to do this?**

The first question is called **authentication**. The second is called **authorization**. You'll often see them shortened to *authn* and *authz*.

They sound alike, but they are different jobs. Mixing them up is one of the most common security mistakes on the internet.

Think of a hotel. At the front desk, you show your ID card and get a room key. That's **authentication**: the hotel now knows who you are. Your key opens room 304 and no other room. That's **authorization**: who you are decides which doors you can open.

**Where this comparison stops working:** in a hotel, every door has a lock built in. In your app, **there is no lock unless you write one.** Each part of your app that shows or changes data needs its own lock. If one is missing, that door opens for every guest in the building.

### Why AI gets one right and misses the other

Authentication works much the same way in almost every app: sign up, log in, log out. Ready-made login services and code packages such as Clerk, Supabase Auth, Firebase Auth and Auth.js handle it for you. AI is very good at setting these up.

Authorization is different for every app, because it depends on **your** rules:

- An invoice belongs to the user who created it.
- A team member can view an invoice but not delete it.
- An admin can do everything.

No library knows these rules. The AI only knows them if you tell it. So the AI often writes code that checks *"is this person logged in?"* and stops there.

---

## What the server can trust

A quick reminder of how login works:

1. You log in once with your email and password.
2. The server checks them and creates a **session**: a record that says "this browser belongs to user 17".
3. Your browser stores a small piece of data that points to that session, usually in a **cookie**. The browser automatically sends it back with every request to that website.
4. The server reads it and knows it's you.

It's like a wristband at a concert. You show your ticket once at the entrance. After that, staff just look at the wristband.

Here is the key idea: **the server created the session itself, so it can trust it.**

It can't trust anything else the browser sends: the web address, the data in a form, the contents of a request. The user controls all of it. Every browser has built-in **developer tools** (press F12 on Windows, or Cmd+Option+I on Mac) that let anyone see and change what their browser sends. This isn't hacking. It's a normal browser feature.

> **Go deeper:** [Why you must never store passwords](/lessons/how-login-works) (Level 2) covers sessions, cookies and tokens in full.

So remember this rule:

> **Who** is asking → comes from the session.
> **What** they want → comes from the request.
> **Authorization** → checking that the two match.

---

## How it goes wrong

### Bug 1: Checking login, not ownership

Say you ask your AI: *"Add an API route to get an invoice by its ID. Only logged-in users should be able to use it."*

The AI gives you something like this:

```js
app.get("/api/invoices/:id", requireLogin, async (req, res) => {
  const invoice = await db.invoice.findUnique({
    where: { id: req.params.id },
  });
  if (!invoice) return res.status(404).json({ error: "Not found" });
  res.json(invoice);
});
```

You don't need to read every symbol. Here is what it does, in plain English:

1. **Line 1:** When a request arrives at `/api/invoices/` followed by an ID, first run `requireLogin`, which checks that the person is logged in.
2. **Lines 2–4:** Look in the database for the invoice with the ID from the web address.
3. **Line 5:** If there's no such invoice, reply "Not found".
4. **Line 6:** Otherwise, send the invoice back.

It looks fine. It even does exactly what you asked: only logged-in users can use it.

But look at step 2 again. It finds the invoice **using only the ID**. Nothing asks *"does this invoice belong to the person asking?"* So any logged-in user can open any invoice. And since anyone can sign up for free, "any logged-in user" really means "anyone with an email address".

This bug has a name: **IDOR**, short for **Insecure Direct Object Reference**. Broken down:

- **Object:** a piece of data, like one invoice.
- **Direct reference:** the ID in the web address points straight at it.
- **Insecure:** nothing checks whether you're allowed to see it.

#### "But my IDs are random"

Some apps use long random IDs, like `3f8a1c9e-72b4-4d1a-9c3e-5b6f8a2d1e7c`, instead of 1, 2, 3. These are called **UUIDs**. People often think this fixes the problem.

It makes IDs harder to guess, but it doesn't fix the bug. IDs end up in shared links, screenshots, browser history and support emails. Once someone has an ID, nothing stops them from using it.

**Hiding the ID is not the same as locking the door.**

### Bug 2: Letting the browser say who the user is

Here's a second version you'll see a lot. You ask the AI to let users create invoices:

```js
app.post("/api/invoices", requireLogin, async (req, res) => {
  const { userId, amount, customer } = req.body;
  const invoice = await db.invoice.create({
    data: { userId, amount, customer },
  });
  res.json(invoice);
});
```

In plain English:

1. **Line 1:** When a logged-in user sends a new invoice...
2. **Line 2:** ...take `userId`, `amount` and `customer` from the **request body** (the data the browser sends, like the contents of a form)...
3. **Lines 3–5:** ...and save a new invoice with those values.

Your app's page sends the logged-in user's own ID as `userId`. When you test it, everything works.

But `userId` comes from the browser, and the user controls the browser. With developer tools, anyone can change `userId` to someone else's ID and create invoices inside another person's account.

The same mistake can be much worse. Imagine an "edit my profile" feature that saves every field the browser sends. A user adds `"role": "admin"` to their request, and now they're an admin. This is called **mass assignment**: the server saves every field it receives instead of only the fields it expects.

---

## What good looks like

### Fix 1: Ask for the invoice *and* its owner

```js
app.get("/api/invoices/:id", requireLogin, async (req, res) => {
  const invoice = await db.invoice.findFirst({
    where: { id: req.params.id, userId: req.user.id }, // ← changed
  });
  if (!invoice) return res.status(404).json({ error: "Not found" });
  res.json(invoice);
});
```

Only one line changed. `req.user.id` is the logged-in user's ID, which comes from the session, so it can be trusted.

Before, the database search meant *"find invoice 1041."* Now it means *"find invoice 1041 **that belongs to me**."* If it belongs to someone else, the database finds nothing, and the app replies "Not found".

Notice it says "Not found", not "You're not allowed". That's on purpose. "Not allowed" would tell a snoop that invoice 1041 exists. "Not found" tells them nothing.

> **Go deeper:** [What GET, POST, 404 and 500 actually mean](/lessons/http-methods-and-status-codes) (Level 2) explains these replies, called status codes.

### Fix 2: Get the user from the session, never the browser

```js
const { amount, customer } = req.body;
const invoice = await db.invoice.create({
  data: { userId: req.user.id, amount, customer },
});
```

Two things changed:

- The owner is now `req.user.id` from the session. Whatever `userId` the browser sends is ignored.
- The code takes only `amount` and `customer` from the browser. Listing exactly which fields you accept is how you prevent mass assignment.

### Check every feature, not just one

In real apps, the check is rarely missing everywhere. It's usually there on "view" but missing on "edit" or "delete". You asked for viewing first, and the AI added a check. A week later, in a new chat, you asked for a delete button, and the AI didn't know about your rule.

Every API route that shows, changes or deletes data needs its own check. Hiding a button on the page doesn't count: anyone can send the request without the button.

As your app grows, keep your rules in **one place** instead of copying them into every route.

> **Go deeper:** [Never trust the browser](/lessons/never-trust-the-browser) (Level 2) shows how to put these rules inside the database itself.

---

## Test your own app in 5 minutes

You don't need any security tools. You need two accounts.

1. Open your app in a normal browser window and sign up as **User A**.
2. Open a private window (called "Incognito" in Chrome) and sign up as **User B**.
3. As User A, create something: an invoice, a note, a project. Copy its web address.
4. Paste that web address into User B's window.

If User B can see User A's data, you have an IDOR. Fix it before anyone else finds it.

**Optional: test edits and deletes too (in Chrome).**

5. In User A's window, open developer tools (F12 on Windows, Cmd+Option+I on Mac) and click the **Network** tab.
6. Edit or delete something as User A. A new line appears in the Network tab. Right-click it and choose **Copy → Copy as fetch**.
7. In User B's window, open developer tools, click the **Console** tab, paste, and press Enter.

If User A's data changed, User B was able to edit it. That's the same bug.

**One catch:** look at the text you copied. If it has a line starting with `"authorization"`, that line contains User A's login, so the request will run as User A and the test proves nothing. Ask your AI to help you run the test using User B's login instead.

---

## Takeaways

**Key terms**
- **Authentication:** proving who you are (logging in)
- **Authorization:** deciding what you're allowed to do
- **IDOR:** seeing or changing someone else's data by changing an ID in a request
- **Mass assignment:** the server saving fields it never meant to let users change

**Red flags in AI-written code**
- The route checks login, but the database search uses only an ID from the request
- `userId`, `ownerId` or `role` is taken from the request instead of the session. In code, look for `req.body`, `req.query` or `req.params`: these all hold data the browser sent.
- The "view" route checks ownership, but "edit" or "delete" doesn't
- "It's safe because the IDs are random"

**Ask your AI**
Can't read the code yet? Paste these into your AI tool:
- *"For every API route in my app, show me where it checks that the logged-in user is allowed to access that record."*
- *"Is any user ID, owner ID or role taken from the request instead of the session?"*
- *"List every route that reads, changes or deletes data, and the authorization check each one has."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**HTTP status codes for access problems.** Servers reply with a number that describes the result:
- **401 Unauthorized:** you're not logged in. Despite the name, this is about authentication.
- **403 Forbidden:** the server knows who you are, and you're not allowed.
- **404 Not Found:** it doesn't exist, or you're not allowed to know it exists.

Use 404 when revealing that a record exists would leak information, as in this lesson. Use 403 when the user already knows the thing exists, for example a team member trying to delete a shared project they can only view.

**Broken Access Control.** IDOR belongs to a wider category called Broken Access Control: any case where users can act outside their permissions. It was the #1 risk on the OWASP Top 10, the industry's standard list of web security risks, in both the 2021 and 2025 editions.

**Sessions vs tokens.** Some login systems don't keep a session record on the server. Instead, they put the user's ID inside a signed token (often a **JWT**) that the browser sends back. The rule in this lesson doesn't change: the server checked the signature on that token, so it can trust the user ID inside it, and nothing else in the request.

**Keeping rules in one place.** Copying checks into every route doesn't scale. Common patterns:
- A helper function such as `canAccessInvoice(user, invoice)` that every route calls.
- A policy library that describes rules separately from routes (for example CASL in JavaScript or Pundit in Ruby).
- Row Level Security in the database, covered in [Never trust the browser](/lessons/never-trust-the-browser).

**Fetching lists.** List pages need the same check. `findMany()` without a `userId` filter returns everyone's records, and it's easy to miss because it looks fine when you're the only user.

</details>
