---
title: "Your error page showed your database details to everyone"
slug: handling-errors
order: 32
level: 2
levelName: Builder
concepts: [Error handling, try/catch, Async errors, Not leaking internal details, Error boundaries, Fail-safe defaults]
readTime: 13 min
quiz:
  - question: "When a booking fails, your server replies with the error's own message: \"duplicate key value violates unique constraint bookings_user_id_class_id_key\". What is wrong with this?"
    options:
      - text: "Nothing, because the message is accurate"
      - text: "It should use status code 200 instead"
      - text: "It shows internal details to anyone, and the user still doesn't know what to do"
        correct: true
      - text: "Error messages can only be shown in the terminal"
    explanation: "The raw message reveals your database type, table and column names. That helps attackers. It also means nothing to the user. Log the details on the server, and show the user a short message they can act on."

  - question: "An unexpected error happens on your server. Where should the full error, with its stack trace, go?"
    options:
      - text: "Into the server's logs, with an error ID that is also shown to the user"
        correct: true
      - text: "Into the response, so the user can send it to you"
      - text: "Nowhere, so nobody can see it"
      - text: "Into a pop-up in the user's browser"
    explanation: "The details belong in your logs, where only you can read them. The user gets a short, friendly message plus an error ID. If they contact you, the ID lets you find the exact log entry."

  - question: "Your app checks if a user has a paid plan before a download. The billing service is down, so the check throws an error. What should the code do?"
    options:
      - text: "Allow the download, because the user probably paid"
      - text: "Retry forever until the billing service answers"
      - text: "Crash the server so someone notices"
      - text: "Refuse the download for now, log the error, and tell the user to try again soon"
        correct: true
    explanation: "When a check fails, treat the answer as \"no\". This is a fail-safe default. Allowing access when you aren't sure means an outage, or an attacker who causes one, gives everyone free access."

  - question: "The code for \"show my bookings\" has `catch (err) { return []; }`. The database goes down. What happens?"
    options:
      - text: "The user sees a clear error message"
      - text: "The page says \"You have no bookings\", and nothing is written to your logs"
        correct: true
      - text: "The server restarts the database"
      - text: "The error appears in the browser's Console"
    explanation: "Returning an empty list hides the failure. The user thinks their bookings are gone, and you have no record that anything broke. A catch block should log the error and show an honest message."

  - question: "In a React app, the component that draws one chart crashes while drawing. There is an error boundary around that chart only. What does the user see?"
    options:
      - text: "A blank white page"
      - text: "The full error and stack trace"
      - text: "The rest of the page, with a fallback message where the chart was"
        correct: true
      - text: "Nothing changes, because React ignores errors"
    explanation: "An error boundary catches drawing errors in the components inside it and shows a fallback instead. Without any boundary, React removes the whole page's interface."

  - question: "A \"Cancel booking\" button's click code throws an error. The page has an error boundary. What happens?"
    options:
      - text: "The error boundary does not catch it, so the click code needs its own try/catch"
        correct: true
      - text: "The error boundary shows its fallback message"
      - text: "React removes the whole page"
      - text: "The booking is cancelled anyway"
    explanation: "Error boundaries only catch errors that happen while React draws components. Errors in click handlers and in code that runs later are not caught. Wrap that code in try/catch and show a message yourself."
---

# Your error page showed your database details to everyone

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Stack trace and logs:** a stack trace lists where the code was when it failed. Logs are the messages your server writes while it runs. *([The error message is telling you what's wrong. Read it first](/lessons/reading-error-messages))*
> - **Status code:** the number in a response that says how it went: 4xx means a problem with the request, 5xx a problem on the server. *([The app said "Saved!". The note was never saved](/lessons/http-methods-and-status-codes))*
> - **Constraint:** a rule the database enforces, like "no two rows may have the same value here". *([You changed your name. Half the app still shows the old one](/lessons/designing-tables))*
> - **API endpoint:** an address on your server that your app's pages send requests to, like `/api/bookings`. *([The hidden conversation behind every button you tap](/lessons/what-is-an-api))*

## A red box full of secrets

You built a booking app for a small gym with AI. Members log in and book a place in a yoga class.

One morning, a member clicks "Book" twice because the page felt slow. A red box appears on the page:

```text
Error: duplicate key value violates unique constraint "bookings_user_id_class_id_key"
    at createBooking (/srv/gym-app/src/bookings.js:14:5)
```

The member has no idea what this means. Are they booked or not? They call the gym.

Meanwhile, anyone who sees that box has learned a few things about your app: which database you use (each one words its errors in its own way), there's a table called `bookings`, it has columns called `user_id` and `class_id`, and your code lives in `/srv/gym-app/src/`. Each fact is small. Together, they are a map of your app for someone who wants to attack it.

Errors happen in every app: a slow database, a service that is down, a double click. You can't prevent them all. But you decide **what users see** when they happen, and **what you get to see**. This lesson is about those two decisions.

---

## One error, two readers

Every error has two readers, and they need completely different things.

| | The user | You, the developer |
|---|---|---|
| Needs to know | What happened, in plain words, and what to do now | Everything: the stack trace, the request, the database message |
| Should see | "This class is full. Join the waiting list?" | The full error, in the server's logs |
| Should never see | Table names, file paths, SQL, stack traces | (nothing is hidden from you) |

Think of a restaurant. A pan catches fire in the kitchen. The waiter comes to your table and says: *"I'm sorry, the fish isn't available tonight. Can I offer you the chicken?"* The waiter doesn't explain which burner failed. But the kitchen writes down exactly what happened, so the cook can fix the burner tomorrow.

**Where this comparison stops working:** a waiter decides what to say in the moment. Your code can't. Every message a user sees, you (or your AI) wrote in advance. If nobody wrote a friendly message, the user gets whatever the error contained, which is the red box above.

So the rule for this lesson:

> **Details go to the logs.** Only you can read them.
> **A short, useful message goes to the user.** No internals.

---

## How errors travel through your code

To control what users see, you need to know how an error moves.

When code hits a problem it can't handle, it **throws** an error. The code stops right there and hands the error to the function that called it. If that function doesn't handle it, it goes one step further back, and so on. This is the path the stack trace shows you, step by step.

To stop an error on its way, you **catch** it with `try` and `catch`:

```js
try {
  const booking = await createBooking(userId, classId);
  showMessage("You're booked!");
} catch (err) {
  console.error(err);
  showMessage("We couldn't book that class. Please try again.");
}
```

In plain English:

1. **Lines 1–3:** try to create the booking, then show "You're booked!".
2. **Line 4:** if anything inside `try` throws, jump straight here. `err` holds the error.
3. **Line 5:** write the full error to the logs, for you.
4. **Line 6:** show the user a short message, for them.

Note that "You're booked!" never shows if the booking failed. The code jumps to `catch` before it reaches that line.

If nothing catches an error, it reaches the top. On the server, the request fails with a 500, or the whole server program stops. In the browser, the action stops halfway, and the error appears only in the Console.

### Errors from slow work

Most errors in web apps come from slow work: asking the database, calling another service, sending a request. The keyword `await` means *"wait for this slow work to finish"*. If that work fails, `await` throws the error right there, so `try`/`catch` catches it.

Two traps catch many people, and many AIs:

- **A missing `await`.** Without `await`, the code doesn't wait. It moves on, leaves the `try` block, and the failure happens later, outside it. Nobody catches it. In Node.js, the program that runs your JavaScript server, an error like this crashes the whole server program by default. Every user's request fails, not only one.
- **Tools that don't throw.** Some tools report problems without throwing. You saw this with `fetch()`: a 500 from the server does not throw, so you must check `res.ok`. The Supabase JavaScript library works in a similar way. It returns `{ data, error }`, and if you never look at `error`, a failed save looks like a success.

So "my code has a try/catch" is not enough. The error must actually reach the catch.

---

## How it goes wrong

### Bug 1: Sending the raw error to the user

Here's the booking endpoint behind the red box, the way an AI often writes it:

```js
app.post("/api/bookings", requireLogin, async (req, res) => {
  try {
    const booking = await db.booking.create({ data: { userId: req.user.id, classId: req.body.classId } });
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});
```

In plain English:

1. **Lines 1–4:** for a logged-in user, save a booking and send it back with 201 Created.
2. **Lines 5–6:** if saving fails, send back a 500 with the error's own message **and its stack trace**.

The database did its job. A constraint says one member can book a class only once, so the second click was refused. The bug is line 6. It hands the database's message and the stack trace to whoever sent the request. The page then shows whatever it gets.

AIs write this because it's handy while you build: you see errors right in the page. In production, it leaks internals to every user and every attacker. Database messages are especially useful to attackers, because they help them plan attacks like SQL injection.

### Bug 2: Hiding the error completely

The opposite mistake looks calm and is just as bad:

```js
async function getMyBookings(userId) {
  try {
    return await db.booking.findMany({ where: { userId } });
  } catch (err) {
    return [];
  }
}
```

If the database is down, this returns an empty list. The page happily shows *"You have no bookings."* The member panics and books again, or thinks the gym cancelled their class. And because the catch block writes nothing to the logs, **you** never find out either.

A catch block that is empty, or returns `[]`, `null` or `false` without logging, is called **swallowing** an error. It turns a loud problem into a silent, confusing one.

### Bug 3: Failing open

The gym adds paid video classes. Before a member can watch, the app checks their subscription with a billing service:

```js
async function hasPaidPlan(userId) {
  try {
    const sub = await billing.getSubscription(userId);
    return sub.status === "active";
  } catch (err) {
    return true; // don't block paying members if billing is down
  }
}
```

The comment sounds kind. But when the check **fails**, the answer is **yes**. If billing is down for an hour, everyone watches for free. If an attacker finds a way to make the check throw, they get in every time.

Letting people through when a check fails is called **failing open**. For anything about access, money or safety, it's the wrong default.

### Bug 4: One broken piece blanks the whole page

Many AI-built apps draw their pages with **React**, a popular package for building frontends out of pieces called **components**: a header, a booking list, a chart. React's documentation says that by default, if an error happens while drawing the page, React removes its whole interface from the screen.

So one chart with a bug can turn the entire page white.

---

## What good looks like

### Fix 1: One central error handler

Instead of deciding in every endpoint what to send, send unexpected errors to one place. This lesson's server code uses **Express**, a popular package for building servers in Node.js. In Express, a function with **four** inputs, added after all your routes, is an error handler:

```js
app.use((err, req, res, next) => {
  const errorId = crypto.randomUUID();
  console.error(`[${errorId}]`, req.method, req.path, err);
  res.status(500).json({
    error: "Something went wrong on our side. Please try again.",
    errorId,
  });
});
```

In plain English:

1. **Line 1:** this runs whenever a route fails with an error nobody handled.
2. **Line 2:** make a random **error ID**, a code like `3f8a1c9e-...`.
3. **Line 3:** write the ID, the request and the full error to the logs, for you.
4. **Lines 4–7:** send the user a 500 with a short message and the same ID.

If a member reports *"I got error 3f8a1c9e"*, you search your logs for that ID and find the exact stack trace. The user gets something useful, you get everything, and an attacker gets nothing.

In Express 5, the current version, errors thrown inside `async` routes reach this handler automatically. Next.js does a similar thing for you. In production, when a part of a page that is drawn on the server fails, the browser only receives a generic message, with an ID called a `digest` that matches the server's logs.

> **Go deeper:** [Your app was down for six hours and nobody noticed](/lessons/logging-and-monitoring) (Level 3) covers reading logs and getting alerts when errors happen with real users.

### Fix 2: Handle the errors you expect

"Already booked" and "class full" aren't surprises. They're normal situations, so they deserve normal answers. Check for them first, and reply with a clear 4xx message:

```js
const existing = await db.booking.findFirst({
  where: { userId: req.user.id, classId: req.body.classId },
});
if (existing) {
  return res.status(409).json({ error: "You're already booked into this class." });
}
```

Now the double click gets **409 Conflict** and a sentence the member understands. The database constraint stays in place too. If two clicks arrive at exactly the same moment, the constraint still stops the second booking, and the central handler sends the safe, generic message.

A simple way to sort errors:

| Kind | Example | Status code | Message |
|---|---|---|---|
| The user can fix it | Empty form, class full, already booked | 4xx | Specific: say what and how to fix it |
| The user can't fix it | Database down, bug in your code | 5xx | Generic, with an error ID |

### Fix 3: Fail safe

When a check about access or money fails, treat the answer as **no**. This is called a **fail-safe default**, or **failing closed**:

```js
} catch (err) {
  console.error("Billing check failed", userId, err);
  return false;
}
```

Then tell the user the honest truth: *"We couldn't check your plan right now. Please try again in a few minutes."* A short wait for some members is much better than free access for everyone.

The same idea applies everywhere: if you can't confirm a payment, don't send the order.

### Fix 4: Error boundaries in React

An **error boundary** is a React component that wraps other components. If something inside it fails while drawing, the boundary shows a **fallback**, a replacement message, instead of a blank page. Only the broken part is replaced.

In Next.js, you create one by adding a file called `error.js` next to a page. For example, `app/bookings/error.js`:

```js
"use client";

export default function Error() {
  return <p>We couldn't load your bookings. Please refresh the page in a minute.</p>;
}
```

In plain English: if the bookings page fails while drawing, show this message instead. The first line is required, because error boundaries run in the browser. The rest of the app, like the menu and header, keeps working.

Error boundaries have limits. React's documentation says they **don't** catch errors in event handlers (code that runs when the user clicks or types) or in code that runs later, like timers. For a "Cancel booking" button, put `try`/`catch` inside the click code and show a message yourself.

---

## Test your own app

1. **Break the database on purpose.** On your laptop, change the database password in your `.env` file to a wrong value and restart the app. Use it. Do you see a friendly message, a blank page, or a raw error? Put the right password back afterwards.
2. **Read your error responses.** Open developer tools, click the **Network** tab, and cause an error (submit an empty form, or do the step above). Click the failed request and open its **Response**. Look for stack traces, SQL, table names or file paths.
3. **Search your code.** Search for `err.message`, `err.stack` and `error: err` near `res.json` or `res.send`. Then search for `catch` and read each block: does it log the error? Does it return `true`, `[]` or `null` without telling anyone?
4. **Crash one component.** Temporarily add `throw new Error("test")` to one React component. Does the whole page go white, or only that part? Remove the line afterwards.

---

## Takeaways

**Key terms**
- **Throw / catch:** code throws an error when it can't continue. `try`/`catch` stops the error and lets you decide what happens next.
- **Swallowing an error:** catching it and doing nothing, so nobody ever learns it happened
- **Error ID:** a random code shown to the user and written in your logs, so you can match the two
- **Failing open / fail-safe default:** allowing access when a check fails (bad) versus denying it (good)
- **Error boundary:** a React component that shows a fallback message when the components inside it fail

**Red flags in AI-written code**
- `err.message` or `err.stack` sent in a response
- A `catch` block that is empty, or returns `[]`, `null` or `true` without logging
- `return true` or "allow" inside a catch block for a permission, payment or login check
- `async` work without `await`, or a Supabase call where `error` is never checked
- No error boundary or `error.js` anywhere in a React or Next.js app

**Ask your AI**
- *"Find every place where my app sends an error's message or stack trace to the browser. Replace them with a central error handler that logs the details with an error ID and sends a generic message."*
- *"List every catch block in my app. For each one, tell me whether it logs the error and what the user sees."*
- *"Which checks in my app allow access if they fail? Change them so they deny access instead."*
- *"Add error boundaries so one broken component can't blank the whole page."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Express 4 vs Express 5.** Express 5 passes errors from `async` routes to your error handler automatically. Express 4 doesn't: a rejected promise in an `async` route goes unhandled, and on current Node.js versions an unhandled rejection crashes the process. On Express 4, wrap each `async` route in `try`/`catch` and call `next(err)`, or upgrade. Express's built-in error handler does leave out the stack trace when the environment variable `NODE_ENV` is set to `production`, but a custom handler that sends `err.stack` overrides that.

**Unhandled rejections.** The slow work behind `await` is a **promise**. A promise that fails is "rejected". If nothing handles the rejection, Node.js (since version 15) treats it as an uncaught exception by default: it prints the stack trace and exits. You can listen for `process.on("unhandledRejection", ...)` and `process.on("uncaughtException", ...)`, but Node's documentation warns that it's not safe to carry on normally after an uncaught exception. Use them to log the error, then end the program yourself (for example with `process.exit(1)`), because adding one of these listeners stops Node.js from exiting on its own. Let your host restart it.

**Next.js error files.** `error.js` covers one part of your app and must be a Client Component. To catch errors in the root layout, Next.js uses `global-error.js`, which must include its own `<html>` and `<body>` tags. In production, errors from Server Components show a generic message plus `error.digest`, an ID that matches the server-side log.

**React without Next.js.** React's documentation says error boundaries currently must be class components: there's no way to write one as a function component. You don't have to write it yourself: the `react-error-boundary` package provides a ready-made one.

**Error reporting services.** Instead of reading logs by hand, many teams send errors to a service that groups them, counts how many users are affected and sends alerts. Sentry is a well-known example. The Level 3 lesson on [logging and monitoring](/lessons/logging-and-monitoring) covers this.

**A standard error format for APIs.** RFC 9457, "Problem Details for HTTP APIs", defines a common JSON shape for error responses, with fields like `type`, `title`, `status` and `detail`. It's optional, but it helps when other developers use your API.

**OWASP Top 10.** The 2025 edition of the OWASP Top 10 added a new category, "A10:2025 Mishandling of Exceptional Conditions". It covers failing open, error messages that reveal system details, and errors that leave things half-done. One of its example scenarios is a database error shown to the user that helps an attacker plan SQL injection. It recommends catching errors where they happen and having a global handler for anything missed.

</details>

## References

- [Component: Catching rendering errors with an error boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary): React documentation. React removes its UI by default after a rendering error, what error boundaries don't catch (event handlers, async code), class components only, and `react-error-boundary`.
- [error.js](https://nextjs.org/docs/app/api-reference/file-conventions/error): Next.js documentation. `error.js` must be a Client Component, the generic production message with `error.digest` to match server logs, and `global-error.js` with its own `<html>` and `<body>` tags.
- [Error handling](https://expressjs.com/en/guide/error-handling.html) and [Migrating to Express 5](https://expressjs.com/en/guide/migrating-5.html): Express documentation. Four-argument error handlers, Express 5 passing rejected promises from `async` routes to the error handler, and the built-in handler leaving out the stack trace when `NODE_ENV` is `production`.
- [Command-line API: --unhandled-rejections](https://nodejs.org/api/cli.html#--unhandled-rejectionsmode) and [Process: Using 'uncaughtException' correctly](https://nodejs.org/api/process.html#warning-using-uncaughtexception-correctly): Node.js documentation. Unhandled rejections raised as uncaught exceptions by default since v15, and why it's not safe to carry on after one.
- [Window: fetch() method](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch): MDN. `fetch()` doesn't reject on error status codes, so you must check `Response.ok`.
- [Handling errors in supabase-js](https://supabase.com/docs/guides/api/handling-errors-in-supabase-js): Supabase documentation. Every call returns `{ data, error }` instead of throwing.
- [A10:2025 Mishandling of Exceptional Conditions](https://top10.owasp.org/2025/A10_2025-Mishandling_of_Exceptional_Conditions): OWASP Top 10:2025. The new 2025 category, failing open, error messages that reveal system details, the SQL injection scenario, and catching errors where they happen plus a global handler.
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html): IETF. The standard JSON error format with `type`, `title`, `status` and `detail`.
