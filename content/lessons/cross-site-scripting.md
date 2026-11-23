---
title: "A comment that runs code in every visitor's browser"
slug: cross-site-scripting
order: 24
level: 2
levelName: Builder
concepts: [Cross-site scripting (XSS), Stored and reflected XSS, Escaping output, HTML sanitization, Content Security Policy]
readTime: 14 min
quiz:
  - question: "Your server builds a page by gluing each comment's text straight into the HTML. A user posts a comment containing an HTML image tag with an `onerror` attribute. What happens when other people open the page?"
    options:
      - text: "They see the comment's text with the tag in it, as typed"
      - text: "The server refuses to save the comment"
      - text: "Their browser reads the tag as real HTML and runs the code in `onerror`"
        correct: true
      - text: "Only the person who posted it is affected"
    explanation: "The browser can't tell which parts of the HTML you wrote and which parts a user wrote. It reads the comment as HTML and runs the code. This is stored XSS, and it hits everyone who views the page."

  - question: "What does escaping do to a comment like `<b>hi</b>` before it goes into a page?"
    options:
      - text: "Turns `<` and `>` into codes like `&lt;` and `&gt;`, so the browser shows them as text"
        correct: true
      - text: "Deletes the whole comment"
      - text: "Makes the text bold"
      - text: "Encrypts the comment so nobody can read it"
    explanation: "Escaping swaps the characters that HTML treats as special for codes that the browser displays as plain characters. The user sees `<b>hi</b>` on the screen, and nothing runs."

  - question: "In a React app, the AI shows comments with `<p>{comment.text}</p>`. A user's comment contains HTML with code in it. What happens?"
    options:
      - text: "The code runs for everyone"
      - text: "The page crashes"
      - text: "The comment is deleted automatically"
      - text: "React escapes the text, so the HTML appears as plain characters"
        correct: true
    explanation: "React escapes values placed inside JSX with curly braces by default. The comment shows up as text. The danger starts when code skips this, for example with `dangerouslySetInnerHTML`."

  - question: "You want users to write comments in Markdown, with bold text and links. The AI turns the Markdown into HTML and shows it with `dangerouslySetInnerHTML`. What else is needed?"
    options:
      - text: "Nothing, Markdown is always safe"
      - text: "Clean the HTML with a sanitizer like DOMPurify, or use a renderer that's safe by default"
        correct: true
      - text: "Only allow logged-in users to comment"
      - text: "Make the comment box smaller"
    explanation: "Many Markdown tools let raw HTML through and don't clean their output. A sanitizer removes dangerous parts like event handlers. Renderers such as react-markdown escape HTML by default."

  - question: "A search page shows \"Results for: \" followed by whatever is in the web address, glued into the HTML. An attacker sends people a link with code in the search part. What kind of XSS is this?"
    options:
      - text: "Stored XSS, because the code is saved in the database"
      - text: "SQL injection, because it's a search"
      - text: "Reflected XSS, because the server sends the code straight back in its response"
        correct: true
      - text: "Not XSS, because the attacker's code is in the link, not on your site"
    explanation: "In reflected XSS, the code travels in the request (often a link) and the server echoes it back in the page. Nothing is saved, but anyone who clicks the link runs the attacker's code on your site."

  - question: "You add a Content Security Policy that allows scripts only from your own site. What's the right way to think about it?"
    options:
      - text: "It replaces the need to escape output"
      - text: "It only matters for sites without login"
      - text: "It makes your HTML load faster"
      - text: "It's a safety net that can block injected code if escaping fails somewhere"
        correct: true
    explanation: "A Content Security Policy tells the browser which scripts it may run, so it can block injected code. But it's a backup layer. Escaping and sanitizing are still the main defense."
---

# A comment that runs code in every visitor's browser

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **HTML and JavaScript:** HTML describes what's on a page. JavaScript is code the browser runs to make the page do things. *([Take a web page apart and see what's inside](/lessons/what-a-web-page-is-made-of))*
> - **Cookie and session:** after you log in, your browser keeps a small cookie that proves who you are on each request. *([Never store a password. Here's what to store instead](/lessons/how-login-works))*
> - **Server-side validation:** checking data on your server before you use it. *([Can strangers read your whole database? Check in 5 minutes](/lessons/never-trust-the-browser))*
> - **SQL injection:** user input that ends up being read as part of a database command. *([How one line of text can dump your whole database](/lessons/sql-injection))*

## The pop-up nobody wrote

You built a book club website with AI. Members write reviews, and anyone can leave a comment under a review. The comment box is plain: type some text, press "Post", and your comment appears for everyone.

One morning, every member who opens a popular review sees a small pop-up box:

> **hi from Leo :)**

You never wrote that pop-up. It's not in your code. You look at the comments, and Leo's latest comment looks almost empty. But it isn't. It contains a few characters of HTML, and every visitor's browser is running them.

This time it was a joke. But Leo's comment could have contained any code at all, running inside your site, for every person who opened that page, including you.

This lesson explains how a comment becomes code, and how to make sure user text always stays text.

---

## The browser reads HTML as instructions

When your server sends a page, it sends HTML. The browser reads every bit of it as instructions: "draw a heading here", "show this image", "run this code".

Now imagine your server builds the comment section by gluing each comment's text into the HTML:

```text
<p>Great review, I loved this book!</p>
```

That's fine: it's a paragraph with friendly text. But here is what Leo posted as his comment:

```text
<img src="x" onerror="alert('hi from Leo :)')">
```

Gluing it in gives the browser this:

```text
<p><img src="x" onerror="alert('hi from Leo :)')"></p>
```

The browser doesn't know which parts you wrote and which parts Leo wrote. It sees an `<img>` tag, an instruction to show an image. The image's address, `x`, doesn't exist, so loading fails. `onerror` means "if this fails, run this JavaScript". So the browser runs `alert(...)`, which shows a pop-up.

This bug is called **cross-site scripting**, usually shortened to **XSS**. It happens when a site includes someone else's text in its pages in a way that lets the browser run it as code.

It's the same idea as SQL injection. There, user text broke out of its place and became a database command. Here, user text breaks out of its place and becomes HTML and JavaScript. Different language, same mistake: **data was mixed into instructions.**

### Why it's dangerous

Leo's code ran **as part of your site**. The browser can't tell it apart from your own code. MDN, the main reference for web developers, says injected code can do anything the site's own code can do. That includes:

- Reading everything on the page, like private messages, email addresses or account details
- Sending requests to your server **as the logged-in visitor**, because the browser attaches their cookie to those requests automatically. Posting, deleting, changing settings: all as them.
- Changing what the page shows, like replacing your login form with a fake one

OWASP, a nonprofit security organization, lists pretending to be the visitor (account impersonation) and stealing sensitive data among the possible results.

If you, the admin, open the page, the code runs with your powers.

---

## Two common kinds of XSS

**Stored XSS.** The attacker's code is saved on your server, usually in the database, and sent to everyone who views it. Leo's comment is stored XSS. It's especially bad because one comment hits every visitor, with no further effort from the attacker.

**Reflected XSS.** The attacker's code arrives in a request, usually inside a link, and the server puts it straight back into the page it sends. Nothing is saved. Say your search page shows "Results for: ..." using the text from the web address:

```js
app.get("/search", (req, res) => {
  res.send(`<h1>Results for: ${req.query.q}</h1>`);
});
```

In plain English: when someone opens `/search?q=dragons`, reply with a heading that says "Results for: dragons". `req.query.q` is the `q` part of the web address, glued into the HTML.

An attacker makes a link to your site where `q` is HTML with code in it, and sends the link to your users. Anyone who clicks it gets a page **from your site** that runs the attacker's code. The link points to your real website, so it looks trustworthy.

---

## How it goes wrong

### Mistake 1: Building HTML by gluing strings

Both examples above make the same mistake: they put user text into HTML without changing it. In AI-written code, look for:

- Server code that builds HTML with `${...}` or `+` and includes anything from the request or the database
- Frontend code that sets `innerHTML` to user text, like `commentBox.innerHTML = comment.text`

`innerHTML` tells the browser "read this text as HTML". MDN calls it probably the most common way XSS gets in. Browsers don't run `<script>` tags added this way, but an `<img>` with `onerror`, like Leo's, still runs.

### Mistake 2: Switching off React's protection

Many AI-built apps use **React**, a popular package for building frontends. React has a big safety feature: it **escapes** text by default.

**Escaping** means swapping the characters that HTML treats as special for codes that the browser shows as plain characters:

| Character | Escaped as |
|---|---|
| `<` | `&lt;` |
| `>` | `&gt;` |
| `&` | `&amp;` |
| `"` | `&quot;` |

After escaping, Leo's comment reaches the browser as `&lt;img src=...&gt;`. The browser shows the characters `<img src=...>` on the screen, as text. Nothing runs.

So this React code is safe, even with Leo's comment:

```js
function Comment({ comment }) {
  return <p>{comment.text}</p>;
}
```

In plain English: show the comment's text inside a paragraph. The curly braces `{...}` mean "put this value here", and React escapes it first. MDN confirms that React automatically encodes values embedded this way.

But React also has a way to switch this off, with a deliberately scary name:

```js
function Comment({ comment }) {
  return <p dangerouslySetInnerHTML={{ __html: comment.text }} />;
}
```

In plain English: take the comment's text and insert it **as raw HTML**, with no escaping. This is React's version of `innerHTML`. With Leo's comment, the pop-up runs again.

React's documentation warns that if the HTML isn't trusted, for example if it's based on user data, this can introduce an XSS bug. It says to use it only with trusted and sanitized data.

When does the AI reach for this? Usually when you ask for **rich text**: comments with bold, italics or links. Or when you ask it to show **Markdown**, the simple formatting language where `**bold**` becomes **bold**. The AI turns the Markdown into HTML, and then needs a way to show that HTML. `dangerouslySetInnerHTML` is the quick answer. Unless the Markdown tool sanitizes its output, any HTML a user writes inside the Markdown can pass straight through.

### Mistake 3: User-supplied links

A profile has a "My website" field, and the AI shows it as a link. A link's address can start with `javascript:` instead of `https:`, and clicking it runs code. React 19 blocks `javascript:` addresses in links. But OWASP warns this doesn't replace checking addresses yourself, and not every tool does it. Allow only addresses that start with `https://` or `http://`.

---

## What good looks like

### 1. Let your tools escape for you

The best defense is the default. Show user text with `{...}` in React, or the normal way your framework shows text. A **framework** is a set of ready-made tools for building apps, like React, Vue or Next.js. Most modern frameworks escape text by default.

In plain JavaScript without a framework, use `textContent` instead of `innerHTML`. `textContent` always treats the value as plain text.

### 2. If you must show user HTML, sanitize it

Sometimes you really need user-written formatting. Then you need a **sanitizer**: a package that takes HTML and removes everything dangerous, like scripts and `onerror`, while keeping safe parts, like bold text. OWASP and MDN both point to **DOMPurify**.

```js
import DOMPurify from "dompurify";

function Comment({ comment }) {
  const clean = DOMPurify.sanitize(comment.html);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

In plain English:

1. **Line 4:** clean the comment's HTML. DOMPurify keeps harmless tags and removes anything that can run code. Leo's tag would come out as `<img src="x">`, with `onerror` gone.
2. **Line 5:** show the cleaned HTML.

Sanitize right before you show it, and don't change the HTML after cleaning it. Keep DOMPurify updated: new tricks are found over time.

**For Markdown in React,** a renderer such as **react-markdown** is a simpler choice. Its documentation says it's secure by default: it doesn't use `dangerouslySetInnerHTML`, and it escapes raw HTML inside the Markdown. Be careful with add-ons that turn HTML back on. The library's own docs say to use those only with Markdown you trust.

### 3. Add a safety net: Content Security Policy

Even careful apps miss one spot. A **Content Security Policy (CSP)** is a header your server sends with each page, telling the browser which scripts it's allowed to run. For example:

```text
Content-Security-Policy: script-src 'self'
```

In plain English: "only run JavaScript from files on my own site". MDN explains that with a policy like this, the browser blocks code written directly inside the HTML, including `<script>` blocks and attributes like `onerror`. Leo's pop-up would be blocked even if escaping failed.

Two warnings:

- **It's a backup, not the main fix.** OWASP and MDN both say CSP should not be your main defense. Escaping and sanitizing come first.
- **It can break your own app.** Some frameworks and tools add small scripts of their own to the page. Ask your AI to set up CSP for your specific framework. Start with `Content-Security-Policy-Report-Only`, which reports problems without blocking anything, then switch to the real header when nothing breaks.

> **Go deeper:** [The app said "Saved!". The note was never saved](/lessons/http-methods-and-status-codes) (Level 2) explains headers and where to see them.

---

## Test your own app in 10 minutes

Only test apps you own.

**Test 1: Does your app show user HTML?** Find any place where users write text that others see: comments, profile names, bios, post titles. Post this:

```text
<b>bold test</b>
```

- If you see the characters `<b>bold test</b>` on the page, your app escapes HTML there. Good.
- If you see **bold test** in bold, your app is showing user HTML. Go to Test 2.

**Test 2: Does it run code?** In the same place, post:

```text
<img src="x" onerror="alert('XSS')">
```

If a pop-up appears, you have XSS. Ask your AI to fix it with escaping, or with DOMPurify if you need formatting. Then delete the test comment.

**Test 3: Search your code.** Look for `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `document.write` and `v-html` (Vue's version). For each, ask: where does this text come from, and is it sanitized?

**Test 4: Check for a CSP.** Open developer tools, click the **Network** tab and reload. Click the first line (your page) and look under **Response Headers** for `content-security-policy`.

---

## Takeaways

**Key terms**
- **XSS (cross-site scripting):** user text that a site's pages run as code in visitors' browsers
- **Stored XSS:** the code is saved on your server, for example in a comment, and hits everyone who views it
- **Reflected XSS:** the code arrives in a request, often a link, and the server puts it straight into the page
- **Escaping:** turning special HTML characters into codes the browser shows as plain text
- **Sanitizer:** a package, like DOMPurify, that removes dangerous parts from HTML
- **Content Security Policy (CSP):** a header that tells the browser which scripts it may run

**Red flags in AI-written code**
- `dangerouslySetInnerHTML`, `innerHTML` or `v-html` with text that users wrote, and no sanitizer
- Server code that builds HTML with `${...}` from request or database values
- Markdown turned into HTML and shown without sanitizing
- User-supplied links shown without checking that they start with `https://` or `http://`
- "It's fine, users can only type text"

**Ask your AI**
- *"Find every place where my app shows text that users wrote. Is it escaped by default, or shown as raw HTML?"*
- *"List every use of dangerouslySetInnerHTML or innerHTML. Where does the content come from, and is it sanitized with DOMPurify?"*
- *"Set up a Content Security Policy for my app. Start in report-only mode and tell me what it would block."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**DOM-based XSS.** A third kind happens entirely in the browser: your own JavaScript reads something an attacker controls, like part of the web address, and puts it into the page with `innerHTML`. The server never sees the attack. The fix is the same: use `textContent` or your framework's normal escaping.

**Escaping depends on where the text goes.** Escaping for the middle of an HTML page is different from escaping for an HTML attribute, inside a `<script>` block, in a CSS value or in a web address. OWASP's XSS Prevention Cheat Sheet lists the rules for each place. Frameworks handle the common places for you. Putting user text inside a `<script>` block or a `style` attribute is risky even with escaping, so avoid it.

**HttpOnly cookies.** A cookie set with the `HttpOnly` attribute can't be read by JavaScript through `document.cookie`. MDN says this helps against XSS, because injected code can't steal the cookie. But it isn't a full fix: the browser still attaches the cookie to requests the injected code sends, so the code can still act as the user while the page is open.

**Sanitizing on the server.** Whether you clean HTML before saving it or before showing it, make sure it's cleaned before it reaches a page. If you sanitize on the server, ask your AI how to run your sanitizer there, because some sanitizers are built for the browser.

**Stronger CSP.** MDN recommends a "strict" CSP using a **nonce**: a new random value in each response. Only `<script>` tags that carry that value can run. Injected code doesn't know the value, so it's blocked. Many frameworks have a guide for setting this up.

**Trusted Types.** A newer browser feature, enforced through CSP with `require-trusted-types-for`, makes the browser refuse plain text in dangerous places like `innerHTML`. Only values that went through your own cleaning function are accepted.

**Where it ranks.** In the OWASP Top 10:2025, XSS is part of the "Injection" category (A05), together with SQL injection. OWASP lists more than 30,000 published vulnerabilities (CVEs) for cross-site scripting.

</details>

## References

- [Cross-site scripting (XSS)](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/XSS): MDN. What injected code can do, stored XSS, React's automatic encoding, DOMPurify, CSP as a backup, strict CSP and Trusted Types.
- [Element: innerHTML property](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML): MDN. `innerHTML` is probably the most common way XSS gets in; injected `<script>` tags don't run, but `onerror` does.
- [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP): MDN. Blocking inline scripts and event handlers, nonces, report-only mode, and why CSP doesn't replace sanitizing.
- [Set-Cookie header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie): MDN. `HttpOnly` stops JavaScript reading a cookie, but the cookie is still sent with requests.
- [Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html): OWASP. Possible results of XSS (account impersonation, stealing data), framework escaping and escape hatches, DOMPurify, React 19 and `javascript:` links, escaping rules for each place, and CSP as an extra layer.
- [A05:2025 Injection](https://top10.owasp.org/2025/A05_2025-Injection): OWASP Top 10:2025. XSS sits in the Injection category with SQL injection, with more than 30,000 CVEs.
- [Common components](https://react.dev/reference/react-dom/components/common): React docs. The `dangerouslySetInnerHTML` warning: use it only with trusted and sanitized data.
- [react-markdown](https://github.com/remarkjs/react-markdown): remarkjs on GitHub. Secure by default, escapes raw HTML, and add-ons like `rehype-raw` only for trusted Markdown.
