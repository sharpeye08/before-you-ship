---
title: "Never store a password. Here's what to store instead"
slug: how-login-works
order: 20
level: 2
levelName: Builder
concepts: [Password hashing, Salts, Sessions, Cookies, Cookie flags, Tokens, JWT]
readTime: 14 min
quiz:
  - question: "Your app's database leaks, and your users' passwords were stored as plain text. Why is this a problem even for users who never log in to your app again?"
    options:
      - text: "It isn't. Only your app is affected."
      - text: "Many people use the same password elsewhere, so attackers try it on their email, shops and other apps"
        correct: true
      - text: "Their browsers will stop working"
      - text: "Their accounts on your app are deleted"
    explanation: "People reuse passwords. Attackers take leaked email and password pairs and try them on other sites. This is called credential stuffing. A leak from your app can open your users' accounts everywhere."

  - question: "If you store only a hash of each password, how does your server check a login?"
    options:
      - text: "It turns the stored hash back into the password and compares them"
      - text: "It asks the user's browser for the original hash"
      - text: "It sends the password to the user's email to confirm"
      - text: "It hashes the password the user just typed and checks it against the stored hash"
        correct: true
    explanation: "A hash can't be turned back into the password. The server doesn't need to: it hashes what the user typed, using the same method and salt, and checks that the result matches."

  - question: "The AI hashes passwords with SHA-256, a well-known hash. What's wrong with that?"
    options:
      - text: "SHA-256 is fast, so an attacker with the hashes can try huge numbers of guesses very quickly"
        correct: true
      - text: "SHA-256 can be reversed with the right key"
      - text: "SHA-256 makes passwords too long to store"
      - text: "Nothing, any hash is fine for passwords"
    explanation: "Fast hashes are made for checking files, not passwords. Password hashing algorithms like Argon2id are slow on purpose, which makes guessing far more expensive."

  - question: "Your session cookie is set without the HttpOnly flag. What can happen?"
    options:
      - text: "The cookie is sent over plain HTTP"
      - text: "The cookie expires when the browser closes"
      - text: "JavaScript running on your page can read it, so an attacker's script could steal it"
        correct: true
      - text: "Other websites can set it"
    explanation: "HttpOnly stops JavaScript from reading the cookie. Without it, any script that manages to run on your page can read the session ID and send it to an attacker, who can then act as that user."

  - question: "You decode a JWT and see {\"userId\":17}. What does this tell you?"
    options:
      - text: "The token is broken, because it should be encrypted"
      - text: "The contents of a JWT can be read by anyone who has it, so it must never hold secrets"
        correct: true
      - text: "You have found the user's password"
      - text: "Only the server could have decoded it"
    explanation: "A JWT is signed, not encrypted. The signature stops people from changing it, but anyone can read what's inside. Never put passwords or other secrets in a JWT."

  - question: "A user clicks Log out. The AI's code only deletes the session cookie in the browser. What's the problem?"
    options:
      - text: "There is no problem"
      - text: "The user can't log in again"
      - text: "The browser will show an error"
      - text: "The session is still valid on the server, so anyone who copied the session ID can keep using it"
        correct: true
    explanation: "Deleting the cookie only removes the browser's copy. If someone stole the session ID earlier, it still works until the server deletes its session record. Log out must end the session on the server."
---

# Never store a password. Here's what to store instead

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Backend:** the part of your app that runs on your server, where secrets are safe. *([A player scored 999,999 points by editing the page. How?](/lessons/frontend-and-backend))*
> - **Database:** where your app keeps its data, in tables of rows and columns. *([Your app forgot everyone's messages overnight. Why?](/lessons/what-is-a-database))*
> - **Headers:** `Name: value` lines of extra details on every request and response. *([Every website is a conversation. Here's how it goes](/lessons/http-requests-and-responses))*
> - **Secret:** a value that lets someone act as you, kept in an environment variable on the backend. *([Your app's secrets don't belong in your code. Here's where they go](/lessons/environment-variables))*

## The table you never want to see

You built a sign-up page with AI. It works. Out of curiosity, you open your database and look at the `users` table:

| id | email | password |
|---|---|---|
| 1 | mia@example.com | sunshine2024 |
| 2 | leo@example.com | Leo!Football9 |
| 3 | sam@example.com | sunshine2024 |

Every password, in plain text. Anyone who can see this table can log in as any of your users.

"But nobody else can see my database," you think. Databases do leak: a backup file shared by mistake, a bug in an endpoint, a stolen laptop, a database left open to the internet. You should plan for the day it happens.

And here's the worse part. **People reuse passwords.** Leo probably uses `Leo!Football9` for his email too. Attackers take leaked email and password pairs from one site and try them on others: email, shops, banks. This is called **credential stuffing**. A leak from your small app can open your users' accounts everywhere.

This lesson shows how to store passwords so a leak doesn't reveal them, then how login works: sessions, cookies and tokens.

---

## Keep a fingerprint, not the password

You don't actually need to store the password. You only need to **check** it. The tool for that is a **hash**.

A **hash function** takes any text and turns it into a fixed-length jumble of characters, called a **hash**. It has two important properties:

- **The same input always gives the same hash.**
- **It only works in one direction.** You can't turn a hash back into the password.

So at sign-up, your server hashes the password and stores only the hash. At login, it hashes what the user typed and checks whether the two hashes match. The real password is never stored.

Think of a fingerprint. Your fingerprint can prove it's you, but nobody can rebuild you from a fingerprint.

**Where the comparison stops working:** nobody can make a copy of you to test against your fingerprint. But an attacker with your hash table can take a list of common passwords, hash each one, and look for matches. That's why password hashing needs two extra tricks.

### Trick 1: Be slow on purpose

Most hash functions, like SHA-256, are built to be **fast**, for jobs like checking that a file downloaded correctly. For passwords, fast is bad: an attacker can try huge numbers of guesses per second.

**Password hashing algorithms** are slow on purpose, and some also need a lot of memory. You choose how slow, usually well under a second per hash. For your login page, that doesn't matter. For an attacker trying billions of guesses, it matters enormously.

### Trick 2: Add a salt

Look at the table again. Mia and Sam both use `sunshine2024`. Hash them the same way and their hashes are identical, so cracking one cracks both.

A **salt** is a random value created for each user and mixed in before hashing. Same password, different salt, completely different hash. Attackers have to attack each user separately. Good password hashing libraries create and store the salt for you, inside the hash string itself.

### Which algorithm?

**OWASP**, a non-profit community that publishes widely used security guides, recommends this in its Password Storage Cheat Sheet:

1. **Argon2id**: the first choice for new apps
2. **scrypt**: if Argon2id isn't available
3. **bcrypt**: only for older systems that already use it. Most versions also use only the first 72 bytes of a password.

Never use plain SHA-256 or MD5 for passwords. And never **encrypt** passwords: encryption is designed to be reversed with a key, and if the key leaks with the database, every password is readable.

---

## Staying logged in: sessions

You log in once, then click around for an hour. How does the server know every click is still you? HTTP doesn't remember anything between requests, so after a successful login, the server creates a **session**:

1. It makes a long random code, the **session ID**, like `9f3a7c...` (much longer in real life).
2. It saves a record: *"session `9f3a7c...` belongs to user 17, expires in 7 days."*
3. It gives the session ID to the browser.
4. The browser sends it back with every request. The server looks it up and knows it's user 17.

It's like a wristband at a concert. You show your ticket once at the entrance. After that, staff check the wristband.

**Where the comparison stops working:** a wristband is hard to copy. A session ID is only text. Anyone who gets a copy is "you" until the session ends. So the session ID must be long and random enough that nobody can guess it, and the browser must protect it.

---

## Cookies and their three flags

How does the browser send it back every time? With a **cookie**: a small piece of data that a server asks the browser to keep. The browser attaches it to every request to that website, automatically, using two headers. The server's response says:

```text
Set-Cookie: session_id=9f3a7c...; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
```

And every later request from the browser carries:

```text
Cookie: session_id=9f3a7c...
```

`Max-Age=604800` means "keep this for 604,800 seconds", which is 7 days. The other three words are **flags**, and they protect your users:

| Flag | What it does | What it protects against |
|---|---|---|
| **HttpOnly** | JavaScript on the page can't read the cookie | If an attacker manages to run their own script on your page, it can't steal the session ID |
| **Secure** | The cookie is only sent over HTTPS, the encrypted version of HTTP | Someone on the same café Wi-Fi reading it from an unencrypted request |
| **SameSite** | Controls whether the cookie is sent when another website triggers the request | Another website making your browser send a request to your app, with your cookie attached |

**SameSite** has three values. `Strict` sends the cookie only when the request comes from your own site. `Lax` also sends it when a user follows a normal link to your site from elsewhere, and is a good default for login cookies. `None` always sends it, requires `Secure`, and is rarely what you want.

> **Go deeper:** [A comment that runs code in every visitor's browser](/lessons/cross-site-scripting) (Level 2) shows how attackers run scripts on your page. [What the padlock icon really protects, and what it doesn't](/lessons/https-and-certificates) (Level 2) explains HTTPS.

---

## Tokens and JWTs

Sessions need the server to look up a record on every request. Some systems skip that by using a **token**: a piece of data the server gives the browser that proves who you are, which the browser sends back with each request.

The most common kind is a **JWT** (JSON Web Token, often said as "jot"). It has three parts separated by dots:

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE3fQ.<signature>
```

1. A header (not an HTTP header): which method was used to sign it.
2. A **payload**: the data. The middle part above decodes to `{"userId":17}`.
3. A **signature**: made with a secret key that only your server knows.

When a JWT comes back, the server checks the signature. If anyone changed even one character of the payload, the signature no longer matches and the token is rejected. So the server can trust `userId: 17` without looking anything up.

Three facts beginners often miss:

- **Anyone can read a JWT.** It's encoded (written in a format anyone can turn back), not encrypted. Paste one into any JWT decoder and the payload appears. Never put secrets in it.
- **A JWT is hard to cancel.** Nothing is stored on the server, so a stolen JWT keeps working until it expires, unless you build a list of cancelled tokens, which brings back the server-side lookup.
- **The signing key is a secret.** If it leaks, attackers can sign their own tokens, for any user.

| | Session | JWT |
|---|---|---|
| Where the truth lives | A record on the server | Inside the token, signed |
| Log out everywhere instantly | Delete the record | Hard: wait for expiry, or keep a cancel list |
| Common use | Websites | APIs, mobile apps, services talking to each other |

For a typical web app, a session in an `HttpOnly` cookie is the simpler, safer choice.

---

## How it goes wrong

### Bug 1: A fast hash, or none

```js
import crypto from "node:crypto";

const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
await db.user.create({ data: { email, passwordHash } });
```

In plain English: hash the password with SHA-256 and save it. It looks secure, because the column is full of jumbled characters. But SHA-256 is fast and there's no salt, so Mia and Sam get identical hashes, and common passwords can be cracked quickly.

### Bug 2: The token in localStorage

```js
const { token } = await res.json();
localStorage.setItem("token", token);
```

In plain English: after login, save the token in **localStorage**, a storage area in the browser. Any JavaScript on your page can read localStorage. One script injected by an attacker, and every user's token can be sent away. OWASP's guidance is to keep session IDs and tokens in `HttpOnly` cookies instead.

### Bug 3: Reading a token without checking it

The popular `jsonwebtoken` library has two functions that look alike. `jwt.verify()` checks the signature. `jwt.decode()` only reads the payload, and its own documentation warns that it does not check the signature. Code that uses `decode` to decide who the user is will believe any token anyone writes.

### Bug 4: Smaller leaks

- **Log out only deletes the cookie.** The session still works on the server.
- **Different messages for "no such email" and "wrong password".** This tells attackers which emails have accounts.
- **A JWT signing key like `"secret"` in the code.** It belongs in an environment variable, long and random.
- **No limit on login attempts.** Attackers can try thousands of passwords.

> **Go deeper:** [Bots signed up 10,000 times overnight. Now what?](/lessons/rate-limiting) (Level 2) shows how to limit attempts.

---

## What good looks like

### First choice: don't build it yourself

Login has many more parts than this lesson covers: password resets, email checks, "log in with Google", two-step codes, ending sessions on every device. Each has its own traps.

Ready-made login services and **libraries** (code packages that do one job) such as **Clerk**, **Supabase Auth**, **Firebase Auth** and **Auth.js** handle all of this, and are used by many apps. Ask your AI to use one. Your job is then to check how it's configured, not to write the security yourself.

### If you do write it: the right pieces

**Hash with Argon2id.** At sign-up, using the `argon2` package:

```js
const passwordHash = await argon2.hash(password);
await db.user.create({ data: { email, passwordHash } });
```

In plain English:

1. **Line 1:** `argon2.hash` creates a random salt, hashes the password slowly with Argon2id, and returns one string holding everything.
2. **Line 2:** save only that string. The password itself is never stored.

At login, check what they typed against the stored hash:

```js
const user = await db.user.findUnique({ where: { email } });
// DUMMY_HASH: made once at startup with argon2.hash("any text")
const hash = user ? user.passwordHash : DUMMY_HASH;
const ok = (await argon2.verify(hash, password)) && !!user;
if (!ok) return res.status(401).json({ error: "Wrong email or password" });
```

In plain English:

1. **Line 1:** find the user by email.
2. **Lines 2–4:** let `argon2.verify` hash what they typed with the stored salt and compare. If there's no such user, it checks against a dummy hash instead. Hashing is slow on purpose, so skipping it would make "no such user" answers noticeably faster, and an attacker could time your responses to find out which emails have accounts. Checking a dummy hash makes both cases take about the same time.
3. **Line 5:** if there's no such user, or the password is wrong, give the same answer either way.

**Set the session cookie with all three flags:**

```js
res.cookie("session_id", sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, in milliseconds
});
```

This is how Express, the backend framework in these examples, sends the `Set-Cookie` header you saw earlier. `sessionId` should come from a secure random generator (Node's `crypto.randomBytes`, for example), never from a counter or the user's ID.

**On log out,** delete the session record on the server, then clear the cookie.

---

## Test your own app

You need Chrome on a laptop or desktop, and your app open and logged in.

1. **Look at your users table.** The password column should hold long strings starting with something like `$argon2id$` or `$2b$` (bcrypt). If you can read a password, stop and fix that first.
2. **Inspect your cookies.** Open developer tools, click the **Application** tab, then **Cookies** on the left, and pick your site. Find your login cookie. Are **HttpOnly**, **Secure** and **SameSite** set?
3. **Try to read it with JavaScript.** In the **Console** tab, type `document.cookie` and press Enter. Your session cookie should **not** appear.
4. **Check localStorage.** In the Application tab, open **Local Storage**. Is there a token there?
5. **Test the error message.** Log out. Try an email that has no account, then a real email with a wrong password. The two messages should be identical.
6. **Test log out.** In the Application tab, copy your session cookie's name and value. Log out. Open a private window, go to your site, and add a cookie with the same name and value in its Application tab (double-click the empty row). Reload. If you're logged in, the old session wasn't ended on the server.

With a login service, step 1 happens inside the service. The other steps still apply.

---

## Takeaways

**Key terms**
- **Hash:** a one-way fingerprint of a value. Same input, same hash, and no way back.
- **Salt:** a random value mixed into each password before hashing
- **Password hashing algorithm:** a slow-on-purpose hash for passwords: Argon2id, scrypt, bcrypt
- **Credential stuffing:** trying leaked email and password pairs on other sites
- **Session:** the server's record that a browser belongs to a logged-in user
- **Cookie:** data the browser stores for a site and sends back with every request
- **HttpOnly, Secure, SameSite:** cookie flags that block scripts, plain HTTP and other sites
- **JWT:** a signed token with readable data inside

**Red flags in AI-written code**
- A `password` column with readable values, or passwords hashed with `sha256` or `md5`
- Passwords "encrypted" instead of hashed
- Tokens or session IDs saved in `localStorage`
- Cookies set without `httpOnly`, `secure` or `sameSite`
- `jwt.decode()` used where `jwt.verify()` is needed
- Log out that only deletes the cookie
- Different error messages for "no such user" and "wrong password"

**Ask your AI**
- *"How does my app store passwords? Show me the code, and the algorithm it uses."*
- *"List every cookie my app sets, with its HttpOnly, Secure and SameSite settings."*
- *"Where does my frontend keep the login token or session ID? Could JavaScript on the page read it?"*
- *"Could I replace my hand-written login code with a proven auth service or library? What would change?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**OWASP's numbers.** The Password Storage Cheat Sheet's minimum settings: Argon2id with 19 MiB of memory, 2 iterations and 1 degree of parallelism; scrypt with N=2^17, r=8, p=1; bcrypt (older systems only) with a work factor of 10 or more; PBKDF2-HMAC-SHA256 with 600,000 iterations when FIPS-140 compliance is required. As a general rule, one hash should take less than one second. The Node `argon2` package uses Argon2id by default, with settings above these minimums.

**Pepper.** Some apps also mix in a **pepper**: one secret value shared by all passwords, stored outside the database (for example, in a secret manager). If only the database leaks, the hashes are useless without it. OWASP calls it extra defense, not a replacement for proper hashing.

**Session rules from OWASP.** Session IDs need at least 64 bits of randomness (32 random bytes gives 256). Create a new session ID after login, so an ID planted before login becomes useless. Expire sessions after a period of inactivity and after a maximum total time, and enforce both on the server.

**SameSite defaults.** Some browsers treat a cookie without a SameSite setting as `Lax`. Not every browser does, so always set it yourself.

**Secure and localhost.** Browsers make an exception for `localhost`, so `Secure` cookies still work while you test on your laptop.

**The "none" algorithm.** Some old JWT libraries accepted tokens with `"alg":"none"`, meaning "no signature". OWASP says this is fixed in current libraries, but make sure your JWT library rejects it.

**Password rules.** OWASP's Authentication Cheat Sheet says passwords shorter than 8 characters are weak when two-step login is on, and shorter than 15 when it's off. Allow at least 64 characters so people can use long passphrases, allow every character, and don't force rules like "must include a symbol".

</details>

## References

- [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): OWASP. Hash passwords instead of encrypting them, the order Argon2id, scrypt, bcrypt, the minimum settings for each, bcrypt's 72-byte limit, salts, peppers, and the "less than one second" rule.
- [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): OWASP. At least 64 bits of randomness in session IDs, a new ID after login, server-side timeouts and log out, the HttpOnly, Secure and SameSite flags, and keeping session IDs out of localStorage.
- [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html): OWASP. Credential stuffing, the same error message for unknown emails and wrong passwords, and the password length and character rules.
- [JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html): OWASP. The three parts of a JWT, a payload anyone can read, why JWTs are hard to cancel, and the old `"alg":"none"` problem.
- [Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie): MDN Web Docs. What `HttpOnly`, `Secure`, `SameSite` and `Max-Age` do, `SameSite=None` needing `Secure`, the localhost exception, and browsers that default to `Lax`.
- [node-argon2: Options](https://github.com/ranisalt/node-argon2/wiki/Options): node-argon2 wiki. The package uses Argon2id by default, with 64 MiB of memory, 3 iterations and 4 threads.
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken): Auth0 on GitHub. `jwt.decode()` does not check whether the signature is valid, and `jwt.verify()` does.
- [res.cookie()](https://expressjs.com/en/5x/api/response.html): Express docs. The `httpOnly`, `secure`, `sameSite` and `maxAge` options, with `maxAge` in milliseconds.
