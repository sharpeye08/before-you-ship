---
title: "What the padlock icon really protects, and what it doesn't"
slug: https-and-certificates
order: 26
level: 2
levelName: Builder
concepts: [HTTPS, TLS, Certificates, Certificate authorities, Let's Encrypt, Mixed content]
readTime: 13 min
quiz:
  - question: "You log in to a website on free café Wi-Fi. The site uses plain HTTP, not HTTPS. What can another person on the same network see?"
    options:
      - text: "Nothing, because Wi-Fi hides everything"
      - text: "Only the name of the website"
      - text: "Your password and login cookie, because HTTP messages travel as readable text"
        correct: true
      - text: "Only the pictures on the page"
    explanation: "Plain HTTP is like a postcard. Anyone who handles the message on its way, including someone on the same network, can read it and even change it. HTTPS puts the message in a locked box."

  - question: "A fake \"bank\" login page shows the padlock (or Chrome's newer icon for a secure connection). What does that prove?"
    options:
      - text: "That the bank checked and approved the page"
      - text: "That the connection to that website's name is encrypted, and nothing about whether the site is honest"
        correct: true
      - text: "That the site can't steal your password"
      - text: "That the site has been checked for viruses"
    explanation: "Anyone can get a certificate for a domain they control, including a scammer's look-alike domain. HTTPS proves you have a private connection to that name. It doesn't prove the people behind it are honest. Google found nearly all phishing sites use HTTPS."

  - question: "Your live site uses HTTPS. A page loads a script from http://cdn.example.com/chart.js. What happens?"
    options:
      - text: "The browser blocks the script, so the chart doesn't appear, and the console shows a Mixed Content error"
        correct: true
      - text: "The script loads normally"
      - text: "The whole page switches to HTTP"
      - text: "The browser asks the user whether to load it"
    explanation: "Loading an insecure http:// resource from an https:// page is called mixed content. Browsers block scripts, stylesheets and API requests like this, because an attacker could change them on the way. Use https:// addresses."

  - question: "Your backend fails to call another service with a \"self-signed certificate\" error. Your AI suggests setting NODE_TLS_REJECT_UNAUTHORIZED=0. What does that do?"
    options:
      - text: "It renews the certificate for you"
      - text: "It makes the connection faster but still safe"
      - text: "It only hides the warning message"
      - text: "It turns off certificate checks, so your app can no longer tell whether it's talking to the real server"
        correct: true
    explanation: "With certificate checks off, the connection is still encrypted, but to whoever answers. An attacker in the middle can pretend to be the real service. The Node.js docs say this makes TLS and HTTPS insecure. Fix the certificate problem instead."

  - question: "Certificates are getting shorter lifetimes. Let's Encrypt plans to move from 90 days to 45 days. What should you do?"
    options:
      - text: "Set a calendar reminder and renew by hand every month"
      - text: "Switch back to HTTP to avoid the hassle"
      - text: "Make sure renewal is automatic, which hosting platforms already do for you"
        correct: true
      - text: "Nothing, expired certificates still work"
    explanation: "Short lifetimes only work with automation. Vercel, Netlify and Cloudflare renew certificates for you. If you run your own server, use a tool that renews automatically and set up monitoring that warns you if it doesn't."

  - question: "You visit https://example.com/account/settings on café Wi-Fi. What can the person running the Wi-Fi usually still learn?"
    options:
      - text: "The full address, including /account/settings"
      - text: "Your password"
      - text: "The contents of the page"
      - text: "That you connected to example.com"
        correct: true
    explanation: "HTTPS hides the path, the page, your cookies and anything you type. But the website's name usually still leaks, for example through the DNS lookup, and the server's IP address is visible too."
---

# What the padlock icon really protects, and what it doesn't

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **HTTP, request and response:** the rules browsers and servers use to ask for and send pages. *([Every website is a conversation. Here's how it goes](/lessons/http-requests-and-responses))*
> - **Domain name and DNS:** the name of a website, and the system that turns it into an IP address. *([How does your browser find one computer out of billions?](/lessons/ip-addresses-and-dns))*
> - **Cookie:** a small piece of data the browser stores and sends back to the same website, often to keep you logged in. *([Never store a password. Here's what to store instead](/lessons/how-login-works))*
> - **Browser console:** the developer tools panel where the browser prints errors. *([The error message is telling you what's wrong. Read it first](/lessons/reading-error-messages))*

## Two people at the same café

You're at a café, using the free Wi-Fi. You open your app and log in.

At the next table, someone runs a program that records every message passing through the café's Wi-Fi. This is not science fiction. Free tools can do it.

If your app used plain `http://`, that person could read your email, your password and the cookie that keeps you logged in. With the cookie, they could act as you without ever knowing your password.

Your app uses `https://`, so they see only scrambled data, plus the name of the website you connected to.

Now a different story. You get an email: "Your account is locked. Log in here to fix it." The link opens a page that looks like your bank. The address bar shows the same secure icon your real bank shows. You type your password. The page belonged to a scammer. A fake message and page made to trick you into giving away your login is called **phishing**.

Both stories are about HTTPS. In the first, it did its job. In the second, it also did its job, and you were still robbed. This lesson explains what HTTPS protects, what it doesn't, and how it breaks in apps.

---

## HTTP is a postcard

When your browser sends an HTTP request, it travels through many computers: the café's Wi-Fi router, your internet provider, and networks in between. Each one passes the message along.

Plain HTTP is like a postcard. Everyone who handles it can:

- **read it:** your password, your cookies, the page you asked for
- **change it:** add an advert, swap a download for a virus, or change a bank account number on a page

They can do this without you or the server noticing.

---

## HTTPS: the same message in a locked box

**HTTPS** is HTTP sent through a secure connection. The HTTP part doesn't change. Same methods, same headers, same status codes. But before any HTTP message is sent, the browser and the server set up a protected channel. Everything travels inside it.

The rules for that protected channel are called **TLS** (Transport Layer Security). You'll also see the older name **SSL**. SSL itself is outdated, but people and dashboards still say "SSL certificate" when they mean a TLS certificate.

TLS gives you three promises:

1. **Encryption:** nobody on the way can read the messages. **Encryption** means scrambling data so only someone with the right secret key can turn it back.
2. **Integrity:** nobody on the way can change the messages without being noticed.
3. **Authentication:** you're really talking to the server for that domain name, not someone pretending to be it.

The third promise is the one people forget. Encryption alone isn't enough. If you encrypt your password and send it to an impostor, the impostor can still read it.

---

## How the box gets locked

The first moments of a TLS connection are called the **handshake**. Very simplified, it goes like this:

```text
Browser → Server: "Hello. I want a secure connection to example.com."
Server → Browser: "Here's my certificate, which proves I'm example.com."
Browser:          checks the certificate
Browser ↔ Server: agree on a fresh secret key for this connection only
Browser ↔ Server: all HTTP messages now travel encrypted with that key
```

The clever part is how two computers that never met agree on a secret while others are listening. It uses a pair of matching keys:

- a **private key**, which the server keeps secret and never sends anywhere
- a **public key**, which the server shows to everyone

Data locked with the public key can only be unlocked with the private key. And the server can use its private key to "sign" data in a way anyone can check with the public key.

Think of a shop that hands out open padlocks for free. Anyone can take one, put a message in a box and snap the padlock shut. Only the shop has the key that opens it.

**Where this comparison stops working:** real TLS uses these key pairs mostly to prove identity and agree on a shared secret. The actual messages are then encrypted with that shared secret, which is much faster. You don't need the details to build apps. You need to know that the private key must stay secret.

---

## Certificates: an ID card for a domain

In the handshake, the server sent a **certificate**. A certificate is a small file that says:

- **which domain names** it's for, like `example.com` and `www.example.com`
- **the server's public key**
- **who issued it**
- **when it's valid**: a start date and an end date

It's like a passport. Anyone can write "I am example.com" on a piece of paper. A passport is trusted because a government issued it and it's hard to fake.

For websites, the "government" is a **certificate authority** (CA): an organization that checks you control a domain and then signs your certificate. Your browser and operating system come with a list of CAs they trust. When a server sends a certificate, the browser checks:

1. Is it signed by a CA I trust?
2. Is it for the domain name in the address bar?
3. Is today between its start and end dates?

If any answer is no, the browser shows a full-page warning instead of your site.

### How a CA checks you own the domain

A CA can't visit your office. Instead, it gives you a small test that only the domain's real owner could pass. For example:

- "Put this exact file at this address on your website", or
- "Add this exact DNS record to your domain"

If the file or record appears, you control the domain, and the CA signs your certificate.

### Let's Encrypt: free and automatic

Certificates used to cost money and be installed by hand. **Let's Encrypt**, a nonprofit CA, changed that. It issues certificates for free, and the whole process, including the domain test, runs automatically through a standard called **ACME**. A small program on the server asks for the certificate, passes the test and installs it, without a human.

Hosting platforms such as Vercel, Netlify and Cloudflare do all of this for you. That's why your `.vercel.app` address and your custom domain got HTTPS without you doing anything.

### Certificates don't last long, on purpose

For years, Let's Encrypt certificates have lasted 90 days. That's getting shorter. Here is Let's Encrypt's announced schedule, as of writing:

| Date | Default Let's Encrypt lifetime |
|---|---|
| Until 10 February 2027 | 90 days |
| From 10 February 2027 | 64 days |
| From 16 February 2028 | 45 days |

This follows new industry rules that limit every publicly trusted HTTPS certificate, from any CA, to at most 47 days from March 2029.

Why shorter? If a private key is stolen, or a certificate is issued by mistake, a short lifetime limits how long it can be misused. The cost is that **nobody can renew by hand any more**. Renewal must be automatic.

---

## What HTTPS doesn't protect

This is where the scam story fits.

| HTTPS does **not** tell you... | Why |
|---|---|
| that the site is honest | A scammer can get a free certificate for `paypa1-login.example` as easily as you get one for your domain. The certificate only proves the name matches. |
| which site you visited is secret | The domain name usually still leaks: your device asks DNS for it, and the start of the handshake often names it. The server's IP address is visible too. The path, the page and everything you type are hidden. |
| that your data is safe after it arrives | HTTPS protects data while it travels. Once it reaches the server, a leaked database, a bug or an attack such as SQL injection can still expose it. |
| that the user's own device is safe | Harmful software (malware) or a bad browser extension on the user's computer sees the page before encryption and after. |

The padlock caused so much confusion that Google changed it. In 2021 research, Google found that only 11% of study participants understood what the padlock really meant. Many thought it meant "this site is safe". Google also noted that nearly all phishing sites use HTTPS. So in 2023, Chrome 117 replaced the padlock with a neutral "tune" icon that opens the site's settings. Chrome still warns users when a connection is not secure.

---

## How it goes wrong

### Bug 1: Mixed content

Your app works on your laptop. You deploy it. On the live site, a chart is missing and some data never loads. The console shows a **Mixed Content** error: the page was loaded over `https://`, but it asked for a script at an `http://` address, so the browser blocked it.

**Mixed content** means an HTTPS page loads something over plain HTTP. One insecure script is enough to break all three promises, because an attacker could change that script on its way and take over the whole page.

Browsers handle it like this:

- **Images, audio and video:** the browser tries the `https://` version instead. If it doesn't exist, the file doesn't load.
- **Scripts, stylesheets, iframes (pages inside pages) and `fetch()` requests:** blocked.

AI-written code often causes this with a hard-coded address from development:

```js
const API_URL = "http://api.example.com"; // ❌ http in production

const res = await fetch(`${API_URL}/notes`);
```

On an `https://` page, this `fetch()` is blocked. The fix is to use `https://`, or, if the API is on the same domain, a path like `fetch("/api/notes")` that automatically uses the page's own scheme.

### Bug 2: Turning off certificate checks

Your backend calls another service and fails with an error such as `SELF_SIGNED_CERT_IN_CHAIN` ("self signed certificate in certificate chain") or `UNABLE_TO_VERIFY_LEAF_SIGNATURE` ("unable to verify the first certificate"). You paste it into your AI tool. A common answer:

```js
// ❌ Never do this
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ❌ Or this
const agent = new https.Agent({ rejectUnauthorized: false });
```

Both lines tell Node.js: "accept any certificate, even if it's fake." The error goes away. So does the third promise. Your app still encrypts, but it encrypts to whoever answers. Anyone in the middle can pretend to be the service and read every secret your server sends it. The Node.js documentation says this setting "makes TLS, and HTTPS by extension, insecure".

These lines often get added "temporarily" and then reach production. Fix the real cause instead: the service's certificate is broken, or it uses a private CA that you can add to the trusted list. Ask your AI how to do that.

### Bug 3: The certificate expires or doesn't match

Chrome shows a full-page warning instead of your site. Two common error codes under it:

- `NET::ERR_CERT_DATE_INVALID`: the certificate has expired (or the visitor's clock is wrong).
- `NET::ERR_CERT_COMMON_NAME_INVALID`: the certificate is for a different name, for example `example.com` but not `www.example.com`. (A name with an extra part in front, like `www.` or `api.`, is called a **subdomain**.)

On hosting platforms, this is rare. It happens more if you run your own server and renewal silently stopped, or if your domain's DNS records point somewhere the platform didn't expect, so it can't pass the domain test. Don't count on a reminder: Let's Encrypt stopped sending expiry emails in June 2025. Set up your own expiry monitoring.

### Bug 4: Telling users to click through warnings

"If you see a warning, click **Advanced**, then **Proceed**." Never write this, even for a test site. It teaches users to ignore the one warning that protects them from impostors.

### Bug 5: Login cookies that can travel over HTTP

If your session cookie doesn't have the `Secure` setting, the browser may send it over a plain HTTP request, for example if a user types `http://` by mistake. One unencrypted request on café Wi-Fi is enough to steal it.

---

## What good looks like

- **HTTPS everywhere.** Every page, every API, every image. Hosting platforms turn it on by default.
- **HTTP sends users to HTTPS.** Typing `http://yourapp.com` should redirect to `https://`. Platforms do this for you.
- **No `http://` addresses in your code**, except `http://localhost` for development. Keep API addresses in environment variables, with `https://` in production.
- **Cookies are marked `Secure`** (and `HttpOnly`, as the login lesson explains).
- **Certificate checks stay on.** No `rejectUnauthorized: false`, no `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- **Renewal is automatic and watched.** If you run your own server, use an ACME tool and a monitoring service that warns you before expiry.

When everything above works, you can add one more header:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

This is **HSTS** (HTTP Strict Transport Security). It tells the browser: "for the next year (31,536,000 seconds), only ever connect to this domain over HTTPS, and do the same for all its subdomains." After a browser has seen it once over HTTPS, it never sends a plain HTTP request to your domain again, and it won't let users click through certificate warnings. That's powerful, so turn it on only when every subdomain has working HTTPS. Many hosting platforms let you add it in their settings.

---

## Test your own app

**1. Read your certificate (2 minutes).** Open your live app in Chrome. Click the icon on the left of the address bar, then the item about the connection being secure, then the one about the certificate. Find:

- **Issued to:** your domain name
- **Issued by:** the CA, for example Let's Encrypt or Google Trust Services
- **Validity period:** when it started and when it ends

Notice how short the period is.

**2. Try plain HTTP.** Type your address with `http://` at the start. You should land on the `https://` version.

**3. See mixed content blocking.** Open any `https://` site, open the console (F12 on Windows, Cmd+Option+I on Mac), and run:

```js
fetch("http://example.com");
```

You'll see a Mixed Content error. Now open your own app, click through every page, and watch the console for the same error.

**4. Search your code.** Search your project for `http://` (ignore `http://localhost`), `rejectUnauthorized` and `NODE_TLS_REJECT_UNAUTHORIZED`. Each match needs a reason.

**Optional:** for a full report on your domain's HTTPS setup, enter it in the free Qualys SSL Labs Server Test at `ssllabs.com/ssltest`.

---

## Takeaways

**Key terms**
- **HTTPS:** HTTP sent inside a TLS connection
- **TLS:** the rules that give a connection encryption, integrity and authentication (older name: SSL)
- **Handshake:** the start of a TLS connection, where the server shows its certificate and both sides agree on a key
- **Certificate:** a signed file that ties a domain name to a public key, with start and end dates
- **Certificate authority (CA):** an organization browsers trust to check domain ownership and sign certificates
- **Mixed content:** an HTTPS page loading something over plain HTTP
- **HSTS:** a header that tells browsers to only ever use HTTPS for your domain

**Red flags in AI-written code**
- `http://` addresses for APIs, scripts or images (other than localhost)
- `NODE_TLS_REJECT_UNAUTHORIZED = "0"` or `rejectUnauthorized: false`
- Session cookies without `Secure`
- Instructions telling users to click through a certificate warning
- "The site has HTTPS, so it's secure"

**Which step broke?**
- "Mixed Content" in the console → an `http://` address in your code or content
- A full-page warning with `ERR_CERT_DATE_INVALID` → expired certificate: check automatic renewal
- `ERR_CERT_COMMON_NAME_INVALID` → the certificate doesn't cover this exact name: check `www` and other subdomains, and your DNS records
- Backend error about a self-signed or unverifiable certificate → fix the certificate or trust the right CA; don't turn checks off

**Ask your AI**
- *"Search my project for http:// addresses, rejectUnauthorized and NODE_TLS_REJECT_UNAUTHORIZED, and explain each one."*
- *"Are my session cookies set with Secure and HttpOnly?"*
- *"Who renews my HTTPS certificate, and how would I find out if renewal failed?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**TLS versions.** The current version is TLS 1.3 (RFC 8446), which most connections use. TLS 1.2 is still used by some sites. TLS 1.0 and 1.1 should no longer be used.

**Chains and intermediates.** CAs rarely sign your certificate with their most important key, the "root". They use an **intermediate** certificate signed by the root. Your server must send its own certificate plus the intermediate, called the chain. A server that forgets the intermediate causes "unable to verify the first certificate" errors in some clients, even though some browsers still connect.

**Hiding the site name.** The domain name leaks in two common places: the DNS lookup, and a field called **SNI** at the start of the TLS handshake, which tells a shared server which certificate to use. Encrypted DNS and a newer standard, **Encrypted Client Hello** (RFC 9849), can hide both, but neither is used everywhere yet.

**More about Let's Encrypt lifetimes.** You can already opt in to 45-day certificates (the `tlsserver` profile, from May 2026) or 6-day certificates (the `shortlived` profile). Let's Encrypt recommends that renewal tools use **ARI** (ACME Renewal Information), which tells the client when to renew. Without ARI, renew about two-thirds of the way through the certificate's lifetime. A fixed "every 60 days" schedule won't work with 45-day certificates.

**The industry schedule.** In April 2025 the CA/Browser Forum, the group of CAs and browser makers that sets the rules, voted to cut the maximum certificate lifetime from 398 days to 47 days, in steps from March 2026 to March 2029.

**HSTS preload.** HSTS only works after a browser's first secure visit. To protect even the first visit, you can submit your domain to the HSTS preload list built into browsers. This needs `max-age` of at least one year, `includeSubDomains` and the `preload` token. Removing a domain from the list is slow: it takes months for the change to reach users through browser updates. Be sure first.

**Upgrading insecure requests.** The header `Content-Security-Policy: upgrade-insecure-requests` asks the browser to try `https://` for every `http://` address in your pages, including scripts. It's a useful safety net, not a replacement for fixing the addresses.

**Localhost is treated as secure.** Browsers treat `http://localhost` and `http://127.0.0.1` as secure for most purposes, which is why development works without HTTPS.

</details>

## References

- [Transport Layer Security (TLS)](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Transport_Layer_Security): MDN. TLS 1.3 is the current, most used version; TLS 1.0 and 1.1 should no longer be used.
- [Mixed content](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Mixed_content): MDN. Images, audio and video are upgraded to HTTPS, while scripts, stylesheets, iframes and `fetch()` are blocked; `upgrade-insecure-requests`; localhost counts as secure.
- [Strict-Transport-Security header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security): MDN. How HSTS works, why users can't click through warnings, and the preload requirements.
- [Command-line API: NODE_TLS_REJECT_UNAUTHORIZED](https://nodejs.org/api/cli.html): Node.js docs. Setting it to `0` "makes TLS, and HTTPS by extension, insecure".
- [Decreasing Certificate Lifetimes to 45 Days](https://letsencrypt.org/2025/12/02/from-90-to-45/): Let's Encrypt, 2 December 2025. The 64-day (10 February 2027) and 45-day (16 February 2028) dates, the opt-in `tlsserver` and `shortlived` profiles, ARI and renewing at two-thirds of the lifetime.
- [Ballot SC081v3: Introduce Schedule of Reducing Validity and Data Reuse Periods](https://cabforum.org/2025/04/11/ballot-sc081v3-introduce-schedule-of-reducing-validity-and-data-reuse-periods/): CA/Browser Forum, April 2025. Maximum certificate lifetime cut from 398 to 47 days, in steps from March 2026 to March 2029.
- [An Update on the Lock Icon](https://blog.chromium.org/2023/05/an-update-on-lock-icon.html): Chromium Blog, May 2023. The 11% finding, phishing sites using HTTPS, and the tune icon in Chrome 117.
- [net_error_list.h](https://chromium.googlesource.com/chromium/src/+/main/net/base/net_error_list.h): Chromium source code. The meaning of `CERT_DATE_INVALID` and `CERT_COMMON_NAME_INVALID`.
- [Ending Support for Expiration Notification Emails](https://letsencrypt.org/2025/01/22/ending-expiration-emails/): Let's Encrypt, January 2025. Expiry reminder emails ended on 4 June 2025.
- [TLS (SSL)](https://nodejs.org/api/tls.html): Node.js. The `SELF_SIGNED_CERT_IN_CHAIN` and `UNABLE_TO_VERIFY_LEAF_SIGNATURE` certificate errors.
- [RFC 9849: TLS Encrypted Client Hello](https://www.rfc-editor.org/rfc/rfc9849.html): IETF. The standard that hides the site name in the TLS handshake.
- [HSTS Preload List Submission](https://hstspreload.org/): hstspreload.org. Preload requirements, and that removal takes months to reach users.
