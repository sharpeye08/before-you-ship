---
title: "Never store a password. Here's what to store instead"
slug: how-login-works
order: 20
level: 2
levelName: Builder
concepts: [Password hashing, Salts, Sessions, Cookies, Cookie flags, Tokens, JWT]
readTime: 14 min
quiz:
  - question: "Your app's database leaks. Your users' passwords were stored as plain text. Why is this a problem, even for users who never log in to your app again?"
    options:
      - text: "It isn't. Only your app is affected."
      - text: "Many people use the same password on other sites, so attackers try it on their email, shops and other apps"
        correct: true
      - text: "Their browsers will stop working"
      - text: "Their accounts on your app are deleted"
    explanation: "People reuse passwords. Attackers take leaked email and password pairs and try them on other sites. This is called credential stuffing. A leak from your app can open your users' accounts everywhere."

  - question: "Your server stores only a hash of each password. How does it check a login?"
    options:
      - text: "It turns the stored hash back into the password and compares them"
      - text: "It asks the user's browser for the original hash"
      - text: "It sends the password to the user's email to confirm"
      - text: "It hashes the password that the user typed and checks it against the stored hash"
        correct: true
    explanation: "You cannot turn a hash back into the password. The server does not need to. It hashes what the user typed, with the same method and salt, and checks that the result matches."

  - question: "The AI hashes passwords with SHA-256, a well-known hash. What is wrong with that?"
    options:
      - text: "SHA-256 is fast, so an attacker with the hashes can try huge numbers of guesses very quickly"
        correct: true
      - text: "SHA-256 can be reversed with the right key"
      - text: "SHA-256 makes passwords too long to store"
      - text: "Nothing, because any hash is fine for passwords"
    explanation: "Fast hashes are made to check files, not passwords. Password hashing algorithms like Argon2id are slow on purpose. This makes guesses far more expensive."

  - question: "Your session cookie does not have the HttpOnly flag. What can happen?"
    options:
      - text: "The browser sends the cookie over plain HTTP"
      - text: "The cookie expires when the browser closes"
      - text: "JavaScript on your page can read it, so an attacker's script can steal it"
        correct: true
      - text: "Other websites can set it"
    explanation: "HttpOnly stops JavaScript from reading the cookie. Without it, any script that runs on your page can read the session ID. The script can send the ID to an attacker, who can then act as that user."

  - question: "You decode a JWT and see {\"userId\":17}. What does this tell you?"
    options:
      - text: "The token is broken, because it must be encrypted"
      - text: "Anyone who has a JWT can read its contents, so a JWT must never hold secrets"
        correct: true
      - text: "You found the user's password"
      - text: "Only the server could decode it"
    explanation: "A JWT is signed, not encrypted. The signature stops people from changing it, but anyone can read what is inside. Never put passwords or other secrets in a JWT."

  - question: "A user clicks Log out. The AI's code only deletes the session cookie in the browser. What is the problem?"
    options:
      - text: "There is no problem"
      - text: "The user can't log in again"
      - text: "The browser will show an error"
      - text: "The session is still valid on the server, so anyone who copied the session ID can still use it"
        correct: true
    explanation: "When you delete the cookie, you only remove the browser's copy. If someone stole the session ID earlier, it still works until the server deletes its session record. Log out must end the session on the server."
---

# Never store a password. Here's what to store instead

> **Before you start**
> Words from earlier lessons:
> - **Backend:** the part of your app that runs on your server, where secrets are safe. *([A player scored 999,999 points by editing the page. How?](/lessons/frontend-and-backend))*
> - **Database:** the place where your app keeps its data, in tables. *([Your app forgot everyone's messages overnight. Why?](/lessons/what-is-a-database))*
> - **Headers:** `Name: value` lines of extra details on requests and responses. *([Every website is a conversation. Here's how it goes](/lessons/http-requests-and-responses))*
> - **Secret:** a value that lets someone act as you. *([Your app's secrets don't belong in your code. Here's where they go](/lessons/environment-variables))*

## The table you never want to see

You built a sign-up page with AI. It works. You open your database and look at the `users` table:

| id | email | password |
|---|---|---|
| 1 | mia@example.com | sunshine2024 |
| 2 | leo@example.com | Leo!Football9 |
| 3 | sam@example.com | sunshine2024 |

Every password is in plain text. Anyone who can see this table can log in as any of your users.

"But nobody else can see my database," you think. But databases do leak.

For example, someone shares a backup file by mistake. A bug in your code shows the data. A laptop gets stolen. A database is left open to the internet. Plan for the day it happens.

And here is the worse part. **People reuse passwords.** Leo probably uses `Leo!Football9` for his email too.

Attackers take leaked email and password pairs from one site. Then they try them on other sites: email, shops, banks. This attack is called **credential stuffing**. A leak from your small app can open your users' accounts everywhere.

This lesson shows how to store passwords so that a leak does not show them. Then it shows how login works: sessions, cookies and tokens.

---

## Keep a fingerprint, not the password

You do not need to store the password. You only need to **check** it. The tool for that is a **hash**.

A **hash function** takes any text and turns it into a jumble of characters with a fixed length. This jumble is called a **hash**. A hash function has two important properties:

- **The same input always gives the same hash.**
- **It works in only one direction.** You cannot turn a hash back into the password.

So at sign-up, your server hashes the password and stores only the hash. At login, it hashes what the user typed. Then it checks if the two hashes match. The server never stores the real password.

![At sign-up, the server hashes the password and stores only the hash. At login, the server hashes what the user typed and checks if the two hashes match.](/diagrams/how-login-works-1.svg)

Think of a fingerprint. Your fingerprint can prove that it is you. But nobody can make a copy of you from a fingerprint.

**Where the comparison stops working:** nobody can make a copy of you to test against your fingerprint. But an attacker with your table of hashes can take a list of common passwords and hash each one. Then they look for matches. For this reason, password hashing needs two more tricks.

### Trick 1: Be slow on purpose

Most hash functions, like SHA-256, are made to be **fast**. They do jobs like a check that a file downloaded correctly. For passwords, fast is bad: an attacker can try huge numbers of guesses per second.

**Password hashing algorithms** (methods made only for passwords) are slow on purpose. Some also need a lot of memory. You choose how slow they are, usually well under a second per hash. For your login page, that time does not matter. For an attacker who tries billions of guesses, it matters very much.

### Trick 2: Add a salt

Look at the table again. Mia and Sam both use `sunshine2024`. If you hash both passwords in the same way, their hashes are the same. So if an attacker cracks one, they crack both.

A **salt** is a random value. The server creates a new salt for each user and mixes it in before it hashes the password. Same password plus different salt gives a completely different hash. So attackers must attack each user separately. Good password hashing **libraries** (code packages that do one job) create and store the salt for you, inside the hash text itself.

### Which algorithm?

**OWASP** is a non-profit community that publishes widely used security guides. Its Password Storage Cheat Sheet recommends this order:

1. **Argon2id:** the first choice for new apps.
2. **scrypt:** use it if Argon2id is not available.
3. **bcrypt:** only for older systems that already use it. Most versions also use only the first 72 bytes (small units of data) of a password.

Do not use plain SHA-256 or MD5 for passwords. And do not **encrypt** passwords. Encryption is made to be reversed with a key. If the key leaks with the database, every password is readable.

---

## Staying logged in: sessions

You log in one time, then you click around for an hour. How does the server know that every click is still you? **HTTP** is the set of rules that browsers and servers use to talk. HTTP does not remember anything between requests. So after a successful login, the server creates a **session**:

1. It makes a long random code, the **session ID**, like `9f3a7c...` (much longer in real life).
2. It saves a record: *"session `9f3a7c...` belongs to user 17, expires in 7 days."*
3. It gives the session ID to the browser.
4. The browser sends the session ID back with every request. The server looks it up and knows that it is user 17.

![After login, the server saves a session record and gives the browser a session ID. The browser sends the session ID with every request, and the server looks it up to find user 17.](/diagrams/how-login-works-2.svg)

It is like a wristband at a concert. You show your ticket one time at the entrance. After that, the staff check the wristband.

**Where the comparison stops working:** a wristband is hard to copy. A session ID is only text. Anyone who gets a copy is "you" until the session ends. So the session ID must be long and random, so that nobody can guess it. And the browser must protect it.

---

## Cookies and their three flags

How does the browser send the session ID back every time? With a **cookie**. A cookie is a small piece of data that a server asks the browser to keep. The browser automatically attaches it to every request to that website. Two headers do this work. The server's response says:

```text
Set-Cookie: session_id=9f3a7c...; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
```

And every later request from the browser carries:

```text
Cookie: session_id=9f3a7c...
```

`Max-Age=604800` means "keep this for 604,800 seconds", which is 7 days. The other three words are **flags**, and they protect your users. **JavaScript** is the programming language that runs on web pages, and the first flag is about it:

| Flag | What it does | What it protects against |
|---|---|---|
| **HttpOnly** | JavaScript on the page can't read the cookie | An attacker runs their own script on your page and steals the session ID |
| **Secure** | The browser sends the cookie only over HTTPS, the encrypted version of HTTP | Someone on the same café Wi-Fi reads it from an unencrypted request |
| **SameSite** | Controls if the browser sends the cookie when another website starts the request | Another website makes your browser send a request to your app, with your cookie attached |

**SameSite** has three values:

- `Strict` sends the cookie only when the request comes from your own site.
- `Lax` also sends it when a user follows a normal link to your site from a different site. It is a good default for login cookies.
- `None` always sends it. It requires `Secure`, and it is rarely what you want.

> **Go deeper:** [A comment that runs code in every visitor's browser](/lessons/cross-site-scripting) (Level 2) shows how attackers run scripts on your page. [What the padlock icon really protects, and what it doesn't](/lessons/https-and-certificates) (Level 2) explains HTTPS.

---

## Tokens and JWTs

With sessions, the server must look up a record on every request. Some systems do not do that. They use a **token**. A token is a piece of data that the server gives the browser to prove who you are. The browser sends it back with each request.

The most common kind is a **JWT** (JSON Web Token, often said as "jot"). It has three parts, with dots between them:

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE3fQ.<signature>
```

1. A header (not an HTTP header): the method that was used to sign it.
2. A **payload**: the data. The middle part above decodes to `{"userId":17}`.
3. A **signature**: made with a secret key that only your server knows.

![A JWT has three parts with dots between them: a header that names the signing method, a payload with the data that anyone can read, and a signature made with the server's secret key.](/diagrams/how-login-works-3.svg)

When a JWT comes back, the server checks the signature. If anyone changed even one character of the payload, the signature does not match. Then the server rejects the token. So the server can trust `userId: 17` without a lookup.

Beginners often miss these three facts:

- **Anyone can read a JWT**. It is encoded (written in a format that anyone can turn back), not encrypted. Paste one into any JWT decoder, and the payload appears. Never put secrets in it.
- **A JWT is hard to cancel**. The server stores nothing, so a stolen JWT works until it expires. The only other way is a list of cancelled tokens. But that list brings back the lookup on the server.
- **The signing key is a secret**. If it leaks, attackers can sign their own tokens, for any user.

| | Session | JWT |
|---|---|---|
| Where the truth lives | A record on the server | Inside the token, signed |
| Log out everywhere instantly | Delete the record | Hard: wait for expiry, or keep a cancel list |
| Common use | Websites | APIs (code that other programs talk to), mobile apps, services that talk to each other |

For a typical web app, a session in an `HttpOnly` cookie is the simpler and safer choice.

---

## How it goes wrong

### Bug 1: A fast hash, or no hash

```js
import crypto from "node:crypto";

const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
await db.user.create({ data: { email, passwordHash } });
```

In plain English: the code hashes the password with SHA-256 and saves it. It looks secure, because the column is full of jumbled characters. But SHA-256 is fast and there is no salt. So Mia and Sam get the same hash, and attackers can crack common passwords quickly.

### Bug 2: The token in localStorage

```js
const { token } = await res.json();
localStorage.setItem("token", token);
```

In plain English: after login, the code saves the token in **localStorage**, a storage area in the browser. Any JavaScript on your page can read localStorage. If an attacker gets one script onto your page, it can send away every user's token. OWASP's advice is to keep session IDs and tokens in `HttpOnly` cookies.

### Bug 3: A token that is read, but not checked

The popular `jsonwebtoken` library has two functions that look alike:

- `jwt.verify()` checks the signature.
- `jwt.decode()` only reads the payload. Its own documentation warns that it does not check the signature.

Code that uses `decode` to decide who the user is will believe any token that anyone writes.

### Bug 4: Smaller leaks

- **Log out only deletes the cookie**. The session still works on the server.
- **"No such email" and "wrong password" get different messages**. This tells attackers which emails have accounts.
- **A JWT signing key like `"secret"` is in the code**. The key belongs in an environment variable, and it must be long and random.
- **There is no limit on login attempts**. Attackers can try thousands of passwords.

> **Go deeper:** [Bots signed up 10,000 times overnight. Now what?](/lessons/rate-limiting) (Level 2) shows how to limit attempts.

---

## What good looks like

### First choice: don't build it yourself

Login has many more parts than this lesson shows. Some examples are password resets, email checks, "log in with Google", two-step codes, and the end of sessions on every device. Each part has its own traps.

Ready-made login services and libraries do all of this work. Examples are **Clerk**, **Supabase Auth**, **Firebase Auth** and **Auth.js**, and many apps use them. Ask your AI to use one. Then your job is to check its settings, not to write the security yourself.

### If you write it yourself: the right pieces

**Hash with Argon2id.** At sign-up, use the `argon2` package:

```js
const passwordHash = await argon2.hash(password);
await db.user.create({ data: { email, passwordHash } });
```

In plain English:

1. **Line 1:** `argon2.hash` creates a random salt and hashes the password slowly with Argon2id. It returns one string (a piece of text) that holds everything.
2. **Line 2:** the code saves only that string. It never stores the password itself.

At login, check what the user typed against the stored hash:

```js
const user = await db.user.findUnique({ where: { email } });
// DUMMY_HASH: made once at startup with argon2.hash("any text")
const hash = user ? user.passwordHash : DUMMY_HASH;
const ok = (await argon2.verify(hash, password)) && !!user;
if (!ok) return res.status(401).json({ error: "Wrong email or password" });
```

In plain English:

1. **Line 1:** the code finds the user by email.
2. **Lines 2–4:** `argon2.verify` hashes what the user typed with the stored salt and compares the result. If there is no such user, it checks against a dummy hash.
3. **Line 5:** if there is no such user, or the password is wrong, the server gives the same answer.

Why the dummy hash? Hashing is slow on purpose. Without the dummy hash, "no such user" answers come back noticeably faster. An attacker can time your responses to find out which emails have accounts. With the dummy hash, both cases take about the same time.

**Set the session cookie with all three flags:**

```js
res.cookie("session_id", sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, in milliseconds
});
```

**Express** is the code package for building servers that these examples use. This code is how Express sends the `Set-Cookie` header that you saw earlier. `sessionId` must come from a secure random generator, for example `crypto.randomBytes` in Node (the program that runs JavaScript on a server). Never make it from a counter or the user's ID.

**On log out,** delete the session record on the server. Then clear the cookie.

---

## Test your own app

You need Chrome on a laptop or desktop. Open your app and log in.

1. **Look at your users table.** The password column must hold long strings that start with something like `$argon2id$` or `$2b$` (bcrypt). If you can read a password, stop and fix that first.
2. **Look at your cookies.** Open developer tools (F12 on Windows, Cmd+Option+I on Mac). Click the **Application** tab, then **Cookies** on the left. Pick your site and find your login cookie. Check that **HttpOnly**, **Secure** and **SameSite** are set.
3. **Try to read the cookie with JavaScript.** In the **Console** tab, type `document.cookie` and press Enter. Your session cookie must **not** appear.
4. **Check localStorage.** In the Application tab, open **Local Storage**. Look for a token there.
5. **Test the error message.** Log out. Try an email that has no account. Then try a real email with a wrong password. The two messages must be the same.
6. **Test log out.** In the Application tab, copy your session cookie's name and value. Log out. Open a private window and go to your site. In its Application tab, add a cookie with the same name and value (double-click the empty row). Reload the page. If you are logged in, the server did not end the old session.

With a login service, step 1 happens inside the service. The other steps still apply.

---

## Takeaways

**Key terms**

- **Hash:** a one-way fingerprint of a value. Same input, same hash, and no way back.
- **Salt:** a random value that the server mixes into each password before it hashes it.
- **Password hashing algorithm:** a hash for passwords that is slow on purpose: Argon2id, scrypt, bcrypt.
- **Credential stuffing:** attackers try leaked email and password pairs on other sites.
- **Session:** the server's record that a browser belongs to a logged-in user.
- **Cookie:** data that the browser keeps for a site and sends back with every request.
- **HttpOnly, Secure, SameSite:** cookie flags that block scripts, plain HTTP and other sites.
- **JWT:** a signed token with readable data inside.

**Red flags in AI-written code**

- A `password` column with readable values, or passwords hashed with `sha256` or `md5`.
- Passwords that are "encrypted", not hashed.
- Tokens or session IDs saved in `localStorage`.
- Cookies without `httpOnly`, `secure` or `sameSite`.
- `jwt.decode()` where the code needs `jwt.verify()`.
- A log out that only deletes the cookie.
- Different error messages for "no such user" and "wrong password".

**Ask your AI**

- *"How does my app store passwords? Show me the code, and the algorithm it uses."*
- *"List every cookie my app sets, with its HttpOnly, Secure and SameSite settings."*
- *"Where does my frontend keep the login token or session ID? Could JavaScript on the page read it?"*
- *"Could I replace my hand-written login code with a proven auth service or library? What would change?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**OWASP's numbers.** The Password Storage Cheat Sheet gives these minimum settings:
- Argon2id with 19 MiB of memory, 2 iterations (rounds) and 1 degree of parallelism.
- scrypt with N=2^17, r=8, p=1.
- bcrypt (older systems only) with a work factor of 10 or more.
- PBKDF2-HMAC-SHA256 with 600,000 iterations, when you must meet the FIPS-140 government standard.

As a general rule, one hash must take less than one second. The Node `argon2` package uses Argon2id by default, with settings above these minimums.

**Pepper.** Some apps also mix in a **pepper**. A pepper is one secret value for all passwords, stored outside the database (for example, in a secret manager). If only the database leaks, the hashes are useless without the pepper. OWASP calls it extra defense, not a replacement for correct hashing.

**Session rules from OWASP.**
- Session IDs need at least 64 bits of randomness (32 random bytes give 256).
- Create a new session ID after login. Then an ID that an attacker planted before login becomes useless.
- End sessions after a period of inactivity and after a maximum total time. Enforce both on the server.

**SameSite defaults.** Some browsers treat a cookie without a SameSite setting as `Lax`. Not every browser does this, so always set it yourself.

**Secure and localhost.** Browsers make an exception for `localhost` (your own computer). So `Secure` cookies still work while you test on your laptop.

**The "none" algorithm.** Some old JWT libraries accepted tokens with `"alg":"none"`, which means "no signature". OWASP says that current libraries fixed this. But make sure that your JWT library rejects it.

**Password rules.** OWASP's Authentication Cheat Sheet gives these rules:
- Passwords shorter than 8 characters are weak when two-step login is on. Without two-step login, passwords shorter than 15 characters are weak.
- Allow at least 64 characters, so that people can use long passphrases.
- Allow every character, and do not force rules like "must include a symbol".

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
