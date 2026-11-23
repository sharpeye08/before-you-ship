---
title: "The app said \"Saved!\". The note was never saved"
slug: http-methods-and-status-codes
order: 17
level: 2
levelName: Builder
concepts: [HTTP methods, Safe and idempotent methods, Status codes, Headers]
readTime: 13 min
quiz:
  - question: "Your server fails to save a note. It catches the error and replies with res.json({ error: \"Could not save\" }), without setting a status code. What does the browser see?"
    options:
      - text: "A 500 status code, because there was an error"
      - text: "A 200 status code, so the request looks like it worked"
        correct: true
      - text: "A 404 status code, because the note wasn't found"
      - text: "No response at all"
    explanation: "If you don't set a status code, the server sends 200 OK. The word \"error\" inside the body doesn't change the status code. Any code that only checks the status will think the save worked."

  - question: "Your page calls fetch() to save something, and the server replies with 500. What does fetch() do?"
    options:
      - text: "It throws an error, so your catch block runs"
      - text: "It retries the request until it gets a 200"
      - text: "It shows an error message to the user automatically"
      - text: "It returns the response normally. Your code must check response.ok or response.status."
        correct: true
    explanation: "fetch() only fails when the request can't be sent or no response comes back, for example when the network is down. A 404 or 500 is still a response, so your code has to check it."

  - question: "The AI made a delete link: clicking it sends GET /notes/42/delete. Why is this a problem?"
    options:
      - text: "GET requests are slower than DELETE requests"
      - text: "GET is supposed to be safe, so browsers and other programs may send it without a click, and data can be deleted by accident"
        correct: true
      - text: "Links can't send requests to a server"
      - text: "The server can't read the ID from a GET request"
    explanation: "The HTTP rules say GET must not change anything. Programs such as search engine crawlers and tools that load pages early rely on that. If a GET request deletes data, one of them can delete it without anyone clicking."

  - question: "A user tries to sign up with an email address that already has an account. Which status code fits best?"
    options:
      - text: "409 Conflict"
        correct: true
      - text: "200 OK"
      - text: "500 Internal Server Error"
      - text: "404 Not Found"
    explanation: "409 means the request conflicts with the data that already exists. It is not a crash (500), and it did not work (200). The user can fix it by using a different email or logging in instead."

  - question: "A request to your app returns 401. A different request returns 403. What is the difference?"
    options:
      - text: "They mean the same thing"
      - text: "401 means the page doesn't exist. 403 means the server crashed."
      - text: "401 means the server doesn't know who you are. 403 means it knows who you are, and you're not allowed."
        correct: true
      - text: "401 is a server problem. 403 is a browser problem."
    explanation: "Despite its name, 401 Unauthorized is about not being logged in. 403 Forbidden means you are logged in, but this action is not allowed for you."

  - question: "Your app shows \"Saved!\" but sometimes nothing was saved. In the Network tab, the save request shows status 500. Where should you look first?"
    options:
      - text: "Your domain's DNS settings"
      - text: "The server's logs, to find the error in your backend code"
        correct: true
      - text: "The browser's cookies"
      - text: "The CSS file for the page"
    explanation: "Codes that start with 5 mean the server failed. The server's logs usually show the exact error. The page also needs fixing: it should check the status and only say \"Saved!\" when the request really worked."
---

# The app said "Saved!". The note was never saved

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Method and path:** the first line of a request, like `GET /games`. The method says what to do, the path says where. *([Every website is a conversation. Here's how it goes](/lessons/http-requests-and-responses))*
> - **Headers and body:** headers are `Name: value` lines of extra details on a request or response. The body is the main content. *([Every website is a conversation. Here's how it goes](/lessons/http-requests-and-responses))*
> - **Status code:** the three-digit number in a response that says how it went. 2xx worked, 3xx look elsewhere (a **redirect**), 4xx problem with the request, 5xx problem on the server. *([Every website is a conversation. Here's how it goes](/lessons/http-requests-and-responses))*
> - **API endpoint and JSON:** an address on your server that your app's pages send requests to, like `/api/notes`, usually sending data in a text format called JSON. *([The hidden conversation behind every button you tap](/lessons/what-is-an-api))*

## "Saved!" (but it wasn't)

You built a notes app with AI. You type a note, press **Save**, and a green message appears: **"Saved!"**

A week later, a user writes to you: *"I wrote ten notes yesterday. Today, three of them are gone."*

You test it. Everything works. After days of searching, you find it: sometimes the database is busy and the save fails. Your server knows it failed. The page still says "Saved!".

How can the page be wrong? Because the server answered with the status code **200**, which means "it worked", and put the word "error" somewhere the page never looked.

If you don't know exactly what 200 means, or why the page believed it, that's normal. By the end of this lesson, you will, and you'll be able to spot the AI-written code that gets it wrong.

---

## Five methods, two promises

You've met `GET` and `POST`. Real apps use five methods. Put together with a path, each one reads like a short sentence: `DELETE /api/notes/42` means *"Delete note 42."*

| Method | Meaning | Example |
|---|---|---|
| **GET** | Read something. Don't change anything. | `GET /api/notes` → list my notes |
| **POST** | Create something new, or start an action. | `POST /api/notes` → add a new note |
| **PUT** | Replace something completely. | `PUT /api/notes/42` → replace note 42 with this new version |
| **PATCH** | Change part of something. | `PATCH /api/notes/42` → change only the title of note 42 |
| **DELETE** | Remove something. | `DELETE /api/notes/42` → delete note 42 |

The same path can do different things with different methods. One more fact: an HTML form can only send GET or POST. Your app's JavaScript can send any method, using a built-in function called `fetch()`. If you don't tell `fetch()` which method to use, it sends GET.

### Two promises: "safe" and "idempotent"

The official HTTP rules (a document called RFC 9110) give some methods two important properties.

A method is **safe** if it only reads. It must not change anything on the server. **GET** is safe. POST, PUT, PATCH and DELETE are not.

A method is **idempotent** if sending the same request twice has the same effect as sending it once. Think of a lift (elevator) button. Press "floor 3" once or five times, and the lift still goes to floor 3 once. That's idempotent.

Now think of ordering a pizza. Order twice, and two pizzas arrive. That's **not** idempotent.

- **GET, PUT and DELETE are idempotent.** Deleting note 42 twice still leaves you with note 42 deleted.
- **POST is not.** Sending "add this note" twice usually creates two notes.
- **PATCH is not always idempotent.** It depends on what the change is.

Why does this matter? Requests sometimes fail halfway, for example when a phone loses signal, and then get sent again. Repeating a GET or a DELETE is harmless. Repeating a POST can create a double order or a double payment.

> **Go deeper:** [The payment timed out. Did it go through?](/lessons/timeouts-and-retries) (Level 3) shows how to make retries safe.

**Where the lift comparison stops working:** a lift's button is built to work that way. HTTP methods are only labels. **Nothing forces your server to follow them.** If your code deletes data on a GET request, the server will do it. You'll see why that's dangerous in a moment.

---

## The status codes that matter

You know the four groups: 2xx, 3xx, 4xx and 5xx. Inside each group, the exact number tells you much more.

| Code | Name | Meaning, and when your app sends it |
|---|---|---|
| **200** | OK | It worked. A successful GET, or any success with a result. |
| **201** | Created | It worked, and something new exists. After a POST creates a note. |
| **204** | No Content | It worked, nothing to send back. After a successful DELETE. |
| **301** | Moved Permanently | This has a new address, forever. |
| **302** | Found | This is at another address, for now. Like sending a user to the login page. |
| **400** | Bad Request | The request is broken or missing data. |
| **401** | Unauthorized | I don't know who you are. Log in first. |
| **403** | Forbidden | I know who you are, and you're not allowed. |
| **404** | Not Found | Nothing here: no note with that ID, or a wrong path. |
| **409** | Conflict | This clashes with existing data, like signing up with an email that's taken. |
| **422** | Unprocessable Content | I can read the request, but the data isn't valid, like an email field that says "hello". |
| **429** | Too Many Requests | Slow down, like 500 login attempts in a minute. |
| **500** | Internal Server Error | Something broke in the server's code. |
| **502** | Bad Gateway | A server in the middle got a bad answer from the server behind it, for example because your app crashed. |
| **503** | Service Unavailable | I can't handle this right now. Try later. |

For a redirect, the new address travels in a header, which you'll see in a moment.

The name **401 Unauthorized** confuses everyone. It really means "not logged in". The code for "logged in, but not allowed" is **403**.

> **Go deeper:** [Change one number in the URL, see everyone's invoices](/lessons/logged-in-doesnt-mean-allowed) (Level 2) explains the difference between "who are you?" and "are you allowed?".

**400 or 422?** Some apps use 400 for every bad input. Others keep 422 for readable requests with invalid values. Both are fine if you stay consistent.

> **Go deeper:** [Bots signed up 10,000 times overnight. Now what?](/lessons/rate-limiting) (Level 2) covers when and how to send 429.

---

## Headers you'll meet in your own app

Headers are the writing on the envelope: details that tell the other side how to handle the message. These are the ones your app's code will use most:

| Header | Found in | What it says |
|---|---|---|
| `Content-Type` | Both | What kind of data the body is. `application/json` means JSON. |
| `Authorization` | Request | Proof of who is asking, such as a secret key |
| `Cookie` | Request | Small pieces of data the browser saved for this website and sends back automatically |
| `Set-Cookie` | Response | The server asking the browser to save a cookie |
| `Location` | Response | Where to go next: the new address after a redirect, or the address of something a 201 has created |
| `Retry-After` | Response | How long to wait before trying again, often sent with 429 or 503 |

> **Go deeper:** [Never store a password. Here's what to store instead](/lessons/how-login-works) (Level 2) shows how cookies keep you logged in.

---

## How it goes wrong

### Bug 1: Every answer is "200 OK"

Here is the code behind our notes app. You asked the AI for "an API endpoint to save a note":

```js
app.post("/api/notes", async (req, res) => {
  try {
    const note = await db.note.create({ data: { text: req.body.text } });
    res.json(note);
  } catch (err) {
    res.json({ error: "Could not save" });
  }
});
```

In plain English:

1. **Line 1:** When a POST request arrives at `/api/notes`...
2. **Lines 2–4:** ...try to save the note in the database, and send it back as JSON.
3. **Lines 5–7:** If saving fails, send back `{ "error": "Could not save" }`.

Look at line 6. It sends an error message, but it never sets a status code. When you don't set one, the server sends **200 OK**. So a failed save and a successful save look the same from the outside. Only the words inside the body are different.

Now the page's code:

```js
await fetch("/api/notes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text }),
});
showMessage("Saved!");
```

In plain English: send the note to the server as JSON, then show "Saved!".

The page never looks at the response at all. And here's a surprise many people don't expect: **`fetch()` does not fail when the server answers with 404 or 500.** It only fails when no answer comes back at all, for example when the network is down. A 500 is still an answer, so `fetch()` returns normally and the page shows "Saved!".

Two small mistakes, one on each side, and users lose notes without knowing it.

### Bug 2: Deleting with a GET request

You ask the AI for a delete link next to each note. It writes this:

```js
app.get("/notes/:id/delete", async (req, res) => {
  await db.note.delete({ where: { id: req.params.id } });
  res.redirect("/notes");
});
```

In plain English: when someone opens the address `/notes/42/delete`, delete note 42, then send them back to the list of notes.

It works when you click it. But it breaks the promise that **GET is safe**, and other programs rely on that promise. Search engines follow the links they find. Some browsers and tools load links before you click them, to make pages feel faster. Any of them can open your "delete" address, and your data is gone. Nobody clicked anything.

### Bug 3: Codes that lie

An empty form crashes the code and returns 500, when it should be a 400 with a clear message. A missing note returns 200 with nothing in it, when it should be a 404. Wrong codes make problems much harder to find, for you and for your AI.

---

## What good looks like

### Fix 1: Send honest status codes

Here is the inside of the same `app.post("/api/notes", ...)` route, fixed:

```js
if (!req.body.text) return res.status(400).json({ error: "Note text is required" });
try {
  const note = await db.note.create({ data: { text: req.body.text } });
  res.status(201).json(note);
} catch (err) {
  console.error(err);
  res.status(500).json({ error: "Could not save the note. Please try again." });
}
```

What changed:

- **Line 1:** if the note is empty, reply **400** with a message the user can act on. This is the user's mistake, not a crash.
- **Line 4:** on success, reply **201**, because something new was created.
- **Lines 6–7:** on failure, write the real error to the server's logs, and reply **500** with a short, friendly message. Don't send the raw error to the browser. It can reveal details about your system.

> **Go deeper:** [Your error page showed your database details to everyone](/lessons/handling-errors) (Level 2) covers error messages that help users without leaking details.

### Fix 2: Check the response on the page

```js
const res = await fetch("/api/notes", {
  // ... same method, headers and body as before
});
if (!res.ok) {
  const data = await res.json();
  return showMessage(data.error);
}
showMessage("Saved!");
```

`res.ok` is `true` only when the status code is in the 200s. Now the page shows "Saved!" only when the server said it worked, and the server's message otherwise.

### Fix 3: Match the method to the action

A clean set of endpoints for notes looks like this:

| Request | What it does | Success code |
|---|---|---|
| `GET /api/notes` | List my notes | 200 |
| `GET /api/notes/42` | Read note 42 | 200 (or 404) |
| `POST /api/notes` | Create a note | 201 |
| `PATCH /api/notes/42` | Change part of note 42 | 200 |
| `DELETE /api/notes/42` | Delete note 42 | 204 |

The delete button now sends a DELETE request using `fetch()`, instead of opening a link. Programs that open links on their own send only safe requests like GET.

Methods are labels, not locks. Every endpoint that changes data still needs to check that the person is logged in and allowed to do it.

---

## Test your own app

You need Chrome on a laptop or desktop.

1. Open your app, then developer tools (**F12** on Windows, **Cmd+Option+I** on Mac).
2. Click the **Network** tab, then click **Fetch/XHR** to show only requests your page's JavaScript sends.
3. If you don't see a **Method** column, right-click any column title and tick **Method**.
4. Use your app: create something, edit it, delete it. Watch each new row.

Now check:

- **Does each action use the right method?** A delete that shows `GET` is Bug 2.
- **Do the status codes match what happened?** Create something and look for 201 or 200.
- **Break it on purpose.** Submit an empty form. You should see a 400 or 422, not a 200 or a 500.
- **Ask for something that doesn't exist,** like `/api/notes/999999`. You should see a 404.
- **Click a row, then the Headers tab.** Find `Content-Type` in the response headers.

---

## Takeaways

**Key terms**
- **Method:** the verb of a request: GET, POST, PUT, PATCH, DELETE
- **Safe method:** only reads, never changes anything (GET)
- **Idempotent method:** sending it twice has the same effect as once (GET, PUT, DELETE)
- **Status code:** the number that says how it went: 2xx worked, 3xx look elsewhere, 4xx the request has a problem, 5xx the server failed
- **Headers:** `Name: value` labels on requests and responses, like `Content-Type`

**Red flags in AI-written code**
- An error is sent with `res.json(...)` or `res.send(...)` and no `res.status(...)`, so it goes out as 200
- `fetch()` is called and the code never checks `res.ok` or `res.status`
- A GET endpoint, or a plain link, that creates, changes or deletes data
- Every error becomes a 500, even when the user sent bad data
- Raw error messages from the database are sent to the browser

**Ask your AI**
- *"List every API endpoint in my app with its method and the status codes it can return. Flag any that send errors with a 200."*
- *"Find every place my frontend calls fetch() without checking response.ok."*
- *"Does any GET endpoint in my app change or delete data?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**PUT vs PATCH.** PUT sends the complete new version and replaces whatever was there, so sending it twice gives the same result. PATCH sends a set of changes. If the change is "set the title to X", repeating it is harmless. If it is "add 1 to the counter", repeating it adds 2. That's why PATCH is not guaranteed to be idempotent. PATCH is defined in RFC 5789, not RFC 9110.

**HEAD and OPTIONS.** Two more methods you may see in the Network tab. HEAD is a GET without the body, used to check headers. OPTIONS asks what the server allows. Browsers send it on their own before some requests to other websites, as part of CORS, covered in ["Blocked by CORS policy": why the browser said no](/lessons/cors).

**The redirect family.** 301 and 302 are old. For historical reasons, browsers may change a POST into a GET when following them. 307 (temporary) and 308 (permanent) were added later, and they keep the original method. Use 308 or 307 when that matters, for example when redirecting an API endpoint that receives POST requests.

**401 needs a header.** By the rules, a 401 response must include a `WWW-Authenticate` header saying how to log in. Many web apps skip it, and browsers don't complain, but strict API tools may.

**404 instead of 403.** RFC 9110 allows a server to answer 404 instead of 403 when it doesn't want to reveal that something exists. [Change one number in the URL, see everyone's invoices](/lessons/logged-in-doesnt-mean-allowed) uses this trick.

**422's old name.** 422 first appeared in a standard for editing files over the web (WebDAV), named "Unprocessable Entity". RFC 9110 renamed it "Unprocessable Content". You'll see both names.

**502, 503 and 504.** All three usually involve a server in the middle, such as a hosting platform or a reverse proxy, that passes requests on to your app. 502: your app sent back something invalid, or crashed. 503: the service is overloaded or paused, and a `Retry-After` header may say when to come back. 504 Gateway Timeout: your app took too long to answer. [One company went down, and a big chunk of the internet went with it](/lessons/cloudflare) explains these servers in the middle.

**Caching.** GET responses can be saved and reused by browsers and other servers, which is why a GET must not change data. The `Cache-Control` header controls this. [Fast, but showing yesterday's data](/lessons/caching) covers it.

</details>

## References

- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html): IETF. Which methods are safe and idempotent, the meaning of each status code, the POST-to-GET change on 301 and 302, 307 and 308, the `WWW-Authenticate` rule for 401, 404 instead of 403, and 422 coming from WebDAV.
- [RFC 5789: PATCH Method for HTTP](https://www.rfc-editor.org/rfc/rfc5789.html): IETF. Defines PATCH, says it is neither safe nor idempotent, and notes that a PATCH request can be written so that it is idempotent.
- [RFC 6585: Additional HTTP Status Codes](https://www.rfc-editor.org/rfc/rfc6585.html): IETF. Defines 429 Too Many Requests and its optional `Retry-After` header.
- [Using the Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch): MDN Web Docs. `fetch()` sends GET by default, does not fail when the server answers with an error like 404, and `res.ok` is true only for codes in the 200s.
- [HTTP: response.statusCode](https://nodejs.org/api/http.html): Node.js docs. A response is sent with status 200 unless the code sets another one. Express is built on this.
- [`<form>`: The Form element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/form): MDN Web Docs. An HTML form can send only GET or POST.
- [Speculative loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Speculative_loading): MDN Web Docs. Browsers can load pages before the user clicks a link.
