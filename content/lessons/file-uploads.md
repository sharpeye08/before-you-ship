---
title: "The profile picture that ran code on your site"
slug: file-uploads
order: 30
level: 2
levelName: Builder
concepts: [File uploads, File size limits, File type checks, Magic bytes, Object storage, Separate domain for user content, Signed URLs]
readTime: 14 min
quiz:
  - question: "Your upload code accepts a file if its name ends in .png. A user renames page.html to page.png and uploads it. What does your check prove?"
    options:
      - text: "That the file is a real PNG image"
      - text: "That the file is safe to show to other users"
      - text: "Only that the user typed .png at the end of the name"
        correct: true
      - text: "That the browser checked the file"
    explanation: "The file name is chosen by the user. So is the type the browser sends. To know what a file really is, the server must look at its contents, starting with the first bytes, called the file signature or magic bytes."

  - question: "Your app runs on a hosting platform with serverless functions. The AI saves uploaded photos to a folder on the server's disk. What is likely to happen?"
    options:
      - text: "The photos are saved forever, like on your laptop"
      - text: "The photos fail to save or disappear, because function disks are temporary and each copy of your code has its own"
        correct: true
      - text: "The photos are automatically moved to a CDN"
      - text: "The photos are stored in the user's browser"
    explanation: "Serverless functions can't keep files: their disk is read-only apart from a small temporary folder, and many copies of your code run at once. Uploads belong in object storage, like S3, Cloudflare R2 or Supabase Storage."

  - question: "A user uploads an SVG image containing a script. Your app saves it and serves it from yourapp.com/uploads/logo.svg. Someone opens that link. What can happen?"
    options:
      - text: "Nothing, SVG files are only pictures"
      - text: "The browser downloads the file without opening it"
      - text: "The file is blocked by HTTPS"
      - text: "The script runs as if it were part of yourapp.com, like an XSS attack"
        correct: true
    explanation: "SVG files can contain JavaScript. When the file is opened directly from your main domain, the browser treats the script as your website's code. That's why user uploads should be served from a separate domain, and why many apps refuse SVG uploads."

  - question: "Where should your server check the maximum file size?"
    options:
      - text: "On the server, while the file arrives, and stop reading once it's too big"
        correct: true
      - text: "Only in the browser, before the file is sent"
      - text: "After the file is fully saved to disk"
      - text: "Nowhere, size doesn't matter for security"
    explanation: "A check in the browser is nice for users, but bots don't use your page. The server must stop reading a file as soon as it goes over the limit, so a huge file can't fill your disk or memory."

  - question: "Users upload private tax documents. You keep them in a private storage bucket. How should a user download their own document?"
    options:
      - text: "Make the bucket public so links work"
      - text: "Email the file to the user"
      - text: "After checking the user owns it, your server creates a signed URL that expires after a few minutes"
        correct: true
      - text: "Put the storage password in the frontend so the browser can download it"
    explanation: "A signed URL is a temporary link that works without logging in to the storage service. Anyone who has it can use it until it expires, so your server must check ownership before creating it, and keep the expiry short."

  - question: "The AI saves uploads using the file name the user sent, like avatar.png. What problem can this cause?"
    options:
      - text: "None, users choose good names"
      - text: "Two users who upload avatar.png overwrite each other, and a name like ../../server.js can try to reach another folder"
        correct: true
      - text: "The file will be too large"
      - text: "The browser will refuse to upload it"
    explanation: "The file name is user input. Generate your own random name on the server, such as a UUID, and keep the original name only as data if you need to show it."
---

# The profile picture that ran code on your site

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **XSS (cross-site scripting):** when an attacker's code runs in other people's browsers as if it were part of your site. *([A comment that runs code in every visitor's browser](/lessons/cross-site-scripting))*
> - **Serverless functions:** backend code that a hosting platform runs only when a request arrives, often as many copies at once. *([From your laptop to a real website in one push](/lessons/hosting-platforms))*
> - **S3:** Amazon's service for storing files in the cloud. *([There is no cloud. It's someone else's computer](/lessons/what-is-the-cloud))*
> - **Never trust the browser:** anything the browser sends can be changed by the user, so the server must check it. *([Can strangers read your whole database? Check in 5 minutes](/lessons/never-trust-the-browser))*

## The profile picture feature

You ask your AI to add profile pictures to your app. It takes five minutes. Users pick an image, it uploads, and it appears next to their name. In the first week, three things happen.

On Monday, someone uploads a 3 GB video as their profile picture. Your server's disk fills up, and the whole app stops working until you delete it.

On Wednesday, you deploy an update. Every profile picture disappears.

On Friday, a user reports a strange link: `yourapp.com/uploads/logo.svg`. When they opened it, a message popped up saying "Your session has been stolen". It was a joke this time. It could have been real.

All three problems come from one fact: **an uploaded file is user input**. It's the biggest and least predictable kind of user input your app will ever receive.

---

## The mental model: a parcel from a stranger

Most user input is a few words: a name, an email, a comment. An upload is a whole file. And every part of it is chosen by the person sending it:

- **The name:** `cute-cat.png`, or `../../server.js`
- **The type the browser reports:** "this is an image", which the user can change
- **The size:** a few kilobytes, or many gigabytes
- **The contents:** a photo, or a web page with a script inside

Think of a company mailroom that accepts parcels from strangers. A careful mailroom does five things:

1. **Weighs the parcel** and refuses anything too heavy.
2. **Looks inside**, instead of trusting the label.
3. **Puts its own label on it**, instead of using the sender's.
4. **Stores it in a separate warehouse**, not in the office where people work.
5. **Hands it out only with a pickup slip** that expires.

These are the ideas behind the rules of safe uploads. The rest of this lesson goes through the rules one by one.

**Where the comparison stops working:** a parcel is one thing. A digital file can be two things at once. A file can be a valid image *and* contain hidden text that a browser treats as code. That's why looking inside is necessary, but not always enough on its own.

---

## How it goes wrong

Here's upload code like the AI often writes. It uses **multer**, a popular package that receives uploaded files in Express (the Node.js server package used in the code in these lessons).

```js
const storage = multer.diskStorage({
  destination: "public/uploads",
  filename: (req, file, cb) => cb(null, file.originalname),
});
app.post("/api/avatar", requireLogin, multer({ storage }).single("avatar"), (req, res) => {
  if (!req.file.mimetype.startsWith("image/")) return res.status(400).json({ error: "Images only" });
  res.json({ url: `/uploads/${req.file.originalname}` });
});
```

In plain English:

1. **Lines 1–4:** Save uploaded files to the `public/uploads` folder on the server's disk, using the name the user's file had.
2. **Line 5:** When a logged-in user uploads a file called `avatar`, run multer first. It receives and saves the file.
3. **Line 6:** If the file's type doesn't start with `image/`, reply with an error.
4. **Line 7:** Otherwise, send back the address of the saved file.

It works when you test it with a photo. Here's what's wrong:

- **No size limit.** multer's file size limit is "no limit" unless you set one. That's your Monday.
- **The type check trusts the browser.** `mimetype` comes from the **Content-Type** the browser sent: a label, not a look inside. **OWASP**, a non-profit whose web security guides are used across the industry, says in its File Upload Cheat Sheet that this value "cannot be trusted, as it is trivial to spoof".
- **The check happens too late.** multer saves the file *before* line 6 runs. Even rejected files stay on the disk.
- **The user chooses the file name.** Two users who upload `avatar.png` overwrite each other. And in code that uses the name without cleaning it, a name with `../` in it can try to point to a different folder. This trick is called **path traversal**. (multer removes folder parts from the name by default, but not every tool does, so don't rely on it.)
- **Files live on the server's disk.** On a serverless platform, that disk is temporary. That's your Wednesday.
- **Files are served from your main domain.** That's your Friday.

---

## What good looks like

### Rule 1: Limit the size, on the server

Set a maximum size that fits the feature. A profile picture might need 5 MB. A PDF invoice might need 10 MB. Also limit how many files one request can contain.

```js
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB, one file
});
```

In plain English: keep the uploaded file in memory (not on disk) while you check it, stop reading any file bigger than 5 MB, and accept only one file per request. multer's docs warn that keeping files in memory can use up your server's memory if files are large, which is one more reason the size limit matters.

When a file is too big, multer raises an error with the code `LIMIT_FILE_SIZE`. Ask your AI to turn it into a clear message and the status code **413 Content Too Large**.

A size check in the browser is also good, because users get a quick message instead of waiting for a big upload to fail. But it's a convenience only. The server check is the real one.

Your hosting platform may have its own limit too. Vercel, for example, limits the request body sent to a function to 4.5 MB by default (as of writing). Bigger uploads need to go straight to storage, which you'll see in Rule 6.

### Rule 2: Check the type by looking inside

Most file formats start with a few fixed bytes that identify them, called the **file signature** or **magic bytes**. Every PNG file starts with the same 8 bytes: `89 50 4E 47 0D 0A 1A 0A`. (Programmers write bytes in **hexadecimal**, a number system that uses 0–9 and A–F.) JPEG, WebP and most other formats have their own signatures. A text file renamed to `.png` doesn't start with any of them.

The `file-type` package reads these bytes for you:

```js
import { fileTypeFromBuffer } from "file-type";

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

const type = await fileTypeFromBuffer(req.file.buffer); // reads the first bytes
if (!type || !ALLOWED.includes(type.mime)) {
  return res.status(400).json({ error: "Please upload a PNG, JPEG or WebP image." });
}
```

In plain English:

1. **Line 3:** Make a short list of the types you accept. This is called an **allowlist**: everything not on the list is refused.
2. **Line 5:** Look at the first bytes of the uploaded file and work out its real type. If no known signature matches, `type` is empty.
3. **Lines 6–8:** If the type is unknown or not on the list, refuse the file.

Three things to know:

- **Use an allowlist, not a blocklist.** "Refuse `.exe` and `.html`" always misses something. "Accept only PNG, JPEG and WebP" doesn't.
- **Magic bytes are a strong signal, not proof.** OWASP warns that a signature check should not be used on its own. For images, the safest step is to **re-encode** them: open the image with an image library and save a fresh copy. This also removes hidden **metadata**, such as the GPS location where a phone photo was taken.
- **Be careful with SVG and HTML.** SVG images are text, and they can contain JavaScript. `file-type` doesn't detect SVG at all. If you don't need SVG uploads, don't accept them.

### Rule 3: Give every file your own name

Never use the user's file name to store the file. Create a random one on the server. OWASP's cheat sheet calls a random name, such as a UUID, "essential".

```js
const key = `avatars/${crypto.randomUUID()}.${type.ext}`;
```

This builds a name like `avatars/3f8a1c9e-72b4-4d1a-9c3e-5b6f8a2d1e7c.png`, using the extension you detected in Rule 2, not the one the user sent. If you want to show the original name ("tax-return-2024.pdf"), save it in your database as plain text, and treat it like any other user input when you display it.

### Rule 4: Store files in object storage, not on your server

**Object storage** is a cloud service made for storing files. S3 is the best-known one. Others include Cloudflare R2 and Supabase Storage. Files are kept in a container called a **bucket**.

Why not the server's own disk?

- **Serverless disks don't keep files.** On Vercel, for example, a function's disk is read-only, apart from a small temporary `/tmp` folder.
- **Deploys replace the server.** Files saved next to your code can vanish with the next deploy.
- **More than one server.** If your app runs on two servers, a file saved on one isn't on the other.
- **A full disk stops everything.** If uploads fill the disk, your app, its logs and maybe your database stop too.

Object storage keeps files safe when servers come and go, and it grows as you need it.

### Rule 5: Serve uploads from a different domain

This is the fix for Friday's link. Browsers decide what code may do based on the **origin** it came from: the domain in the address bar. If a user's SVG or HTML file opens at `yourapp.com/uploads/...`, any script inside it runs *as yourapp.com*. It can read pages, send requests with the user's cookies, and do anything your own code can. That's XSS through an upload.

If the same file is served from a **different domain**, its script runs as that other domain, which has none of your users' cookies or data. Big companies do this: Google, for example, has served risky user content from separate domains such as `googleusercontent.com`.

For your app:

- Serve files from your storage provider's own domain, or from a separate domain you own, like `yourapp-files.com`. A subdomain like `files.yourapp.com` is better than nothing, but a fully separate domain is safer.
- For files people download rather than view, have storage send the header `Content-Disposition: attachment`. It tells the browser "save this file", instead of opening it.

> **Go deeper:** [A comment that runs code in every visitor's browser](/lessons/cross-site-scripting) (Level 2) explains why code running "as your site" is so dangerous.

### Rule 6: Private files need signed URLs

Profile pictures can be public. Tax documents, contracts and medical scans can't. Keep those in a **private bucket**, where nobody can download anything without permission.

To let one user download one file, your server creates a **signed URL**: a link to a single file, with a signature and an expiry time inside it. The storage service checks the signature, so the link works without a password.

Two rules for signed URLs:

- **Check authorization first.** Before creating the link, check that the logged-in user is allowed to see that file. Otherwise you have an IDOR bug with extra steps.
- **Keep the expiry short.** AWS describes these links as working for anyone who has them. A link that's forwarded, saved in browser history or posted in a chat keeps working until it expires. Minutes is usually enough.

Signed URLs work for uploads too. Your server checks the user, then creates a signed *upload* URL, and the browser sends the file straight to storage. This avoids your platform's request size limit. But it also skips the checks in Rules 1–3, so ask your AI how to check size and type for direct uploads, for example by checking the file after it lands in storage.

> **Go deeper:** [Change one number in the URL, see everyone's invoices](/lessons/logged-in-doesnt-mean-allowed) (Level 2) explains the ownership checks every file download needs.

---

## Test your own app

Use a test account on your own app.

1. **Size:** upload a file bigger than your limit. A large video works. You should get a clear error message, not a crash, a long wait or a success.
2. **Disguised file:** create a text file, type a few words, save it, and rename it to `test.png`. Upload it. It should be refused.
3. **SVG:** if your app accepts SVG, save this as `test.svg` and upload it: `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.domain)</script></svg>`. Then open the uploaded file's link directly in a new tab. If a box pops up showing your main domain, you have Friday's bug.
4. **Where files live:** right-click an uploaded image and choose "Open image in new tab". Is the domain in the address bar your main domain? Does the file still exist after your next deploy?
5. **Private files:** copy a signed link to a private file. Open it in a private window. Wait until it should have expired, and try again. It should stop working. Then log in as a second user and try to request a link to the first user's file.

---

## Takeaways

**Key terms**
- **Magic bytes (file signature):** the first bytes of a file that show its real type
- **Allowlist:** a list of what you accept; everything else is refused
- **Path traversal:** using `../` in a file name to reach another folder
- **Object storage / bucket:** a cloud service for files (S3, R2, Supabase Storage), and the container files live in
- **Signed URL:** a temporary link to one file that works for anyone who has it, until it expires

**Red flags in AI-written code**
- No `fileSize` limit, or a size check only in the browser
- The file type is checked with the file name's extension or `file.mimetype` alone
- Files are saved with `file.originalname`
- Uploads go to a folder like `public/uploads` on the server
- Uploaded files are served from your main domain
- A public bucket for private documents, or signed URLs that last for days

**Ask your AI**
- *"Walk me through what happens when a user uploads a 5 GB file, a text file renamed to .png, and an SVG with a script inside."*
- *"Where are uploaded files stored, and from which domain are they served?"*
- *"For private files, show me where we check ownership before creating a signed URL, and how long the URL lasts."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**OWASP's other advice.** The OWASP File Upload Cheat Sheet also recommends: only letting authorized users upload; checking extensions after decoding the file name, to catch tricks like `photo.png.php` or hidden characters; scanning files with antivirus or a sandbox where possible; using Content Disarm and Reconstruction (CDR) for documents like PDF and DOCX, which rebuilds the file without active parts; and protecting the upload form against cross-site request forgery. Its storage advice, in order of preference: store files on a different host, then outside the folder your web server serves, then (last choice) inside it with tight permissions.

**Zip files.** A tiny zip file can unpack into gigabytes. This is called a **zip bomb**. If you must accept archives, apply size limits to the unpacked contents too. OWASP doesn't recommend accepting zip files, because they can contain any kind of file.

**Headers as well as a separate domain.** A 2023 Google security article ("Securely hosting user data in modern web applications") calls the separate domain the classic solution and adds a set of headers for user files such as images and downloads: a well-known `Content-Type`, `X-Content-Type-Options: nosniff` (stops the browser guessing the type), `Content-Disposition: attachment`, `Content-Security-Policy: sandbox` and `default-src 'none'` (no scripts or other resources), and `Cross-Origin-Resource-Policy: same-site`. The `sandbox` policy makes the browser isolate the file as if it came from a separate domain. For active content like HTML and SVG that must be shown, it recommends the `sandbox` policy or, for full isolation, a separate sandbox domain.

**Don't register multer for every route.** multer's docs say never to add it as global middleware, because attackers could then upload files to routes you never meant to accept files on. Add it only to upload routes, as in this lesson.

**S3 presigned URL limits.** URLs created with the AWS SDK or CLI can last up to 7 days, and those created in the S3 console up to 12 hours. A URL also stops working when the credentials that signed it expire, which is often much sooner.

</details>

## References

- [File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): OWASP. Content-Type "trivial to spoof", signature checks not to be used alone, random file names as "essential", allowlists, storage on a different host, zip files, CDR and CSRF.
- [multer README](https://github.com/expressjs/multer): Express. `diskStorage` and `memoryStorage`, `originalname` keeping only the base name unless `preservePath` is set, the `fileSize` limit (default: no limit), the memory warning, the `LIMIT_FILE_SIZE` error code, and the warning never to add multer as global middleware.
- [file-type README](https://github.com/sindresorhus/file-type): Sindre Sorhus. Detecting a file's type from its magic number with `fileTypeFromBuffer`, `undefined` when nothing matches, and SVG not being supported.
- [Portable Network Graphics (PNG) Specification, section 5.2](https://www.w3.org/TR/png-3/): W3C. The 8-byte PNG signature `89 50 4E 47 0D 0A 1A 0A`.
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations) and [Runtimes](https://vercel.com/docs/functions/runtimes): Vercel. The 4.5 MB default request body limit, and the read-only function filesystem with a small writable `/tmp` folder whose files don't persist.
- [RFC 9110, section 15.5.14: 413 Content Too Large](https://www.rfc-editor.org/rfc/rfc9110.html#name-413-content-too-large): IETF. The name and meaning of status code 413.
- [Download and upload objects with presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html): AWS. Presigned URLs as bearer tokens, the 7-day (SDK/CLI) and 12-hour (console) maximums, and early expiry when the signing credentials expire.
- [Securely Hosting User Data in Modern Web Applications](https://security.googleblog.com/2023/04/securely-hosting-user-data-in-modern.html): Google Security Blog (2023). Sandbox domains such as `googleusercontent.com` as the classic solution, and the recommended headers for user files.
