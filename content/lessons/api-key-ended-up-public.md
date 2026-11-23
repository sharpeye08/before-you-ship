---
title: "Your API key leaked, and strangers are spending your money"
slug: api-key-ended-up-public
order: 19
level: 2
levelName: Builder
concepts: [Secrets, Frontend exposure, Public environment variable prefixes, Git history, Key rotation, Secret scanning]
readTime: 13 min
quiz:
  - question: "Your page shows \"undefined\" where it reads process.env.AI_API_KEY. The AI suggests renaming it to NEXT_PUBLIC_AI_API_KEY. What happens if you accept?"
    options:
      - text: "The page works and the key stays secret"
      - text: "The key gets copied into the JavaScript that every visitor downloads"
        correct: true
      - text: "Next.js encrypts the key before sending it"
      - text: "Nothing changes, because the prefix only affects the name"
    explanation: "NEXT_PUBLIC_ tells Next.js to copy the value into the browser's JavaScript when it builds your app. That fixes \"undefined\" by making the secret public. The right fix is to use the key in backend code only."

  - question: "You committed your .env file to a public GitHub repository. An hour later you notice, delete the file and commit again. Is the key safe now?"
    options:
      - text: "Yes, the file is deleted"
      - text: "Yes, if you also make the repository private"
      - text: "No. The key is still in the earlier commit, and it may already have been copied."
        correct: true
      - text: "No, but only people with your password can see it"
    explanation: "Git keeps every commit, so the old one still contains the key. Automated programs scan public code for keys, often within minutes. Treat the key as stolen and rotate it."

  - question: "You find out your secret key leaked. What should you do first?"
    options:
      - text: "Rotate the key: create a new one, switch your app to it, and turn off the old one"
        correct: true
      - text: "Rewrite your git history to remove the key"
      - text: "Make your repository private"
      - text: "Wait and see if anyone uses it"
    explanation: "Until the old key is turned off, anyone who copied it can use it. Rotating stops that immediately. Cleaning history and fixing the cause come after."

  - question: "You move your AI key to a backend endpoint, /api/chat, which the frontend calls. What else does that endpoint need?"
    options:
      - text: "Nothing, the key is safe now"
      - text: "A NEXT_PUBLIC_ copy of the key as a backup"
      - text: "A different web address that nobody will guess"
      - text: "Checks that the user is logged in and isn't sending too many requests"
        correct: true
    explanation: "The key is now hidden, but anyone can still call /api/chat, and every call costs you money. Check who is asking and limit how often they can ask."

  - question: "Your app's frontend contains a Stripe key that starts with pk_live_. Is that a leak?"
    options:
      - text: "Yes, every key in the frontend is a leak"
      - text: "No. Stripe's publishable keys are designed to be public. Its secret keys must stay on the backend."
        correct: true
      - text: "Yes, because it says live"
      - text: "No, because Stripe keys can't be used by other people"
    explanation: "Some services give you two kinds of key: a publishable key meant for frontend code, and a secret key for your backend. The service's docs say which is which. When in doubt, treat a key as secret."

  - question: "What does GitHub's push protection do?"
    options:
      - text: "It encrypts your repository"
      - text: "It blocks a push to a public repository when it finds a known kind of secret in it"
        correct: true
      - text: "It deletes leaked keys from your history"
      - text: "It rotates your keys for you"
    explanation: "Push protection checks your commits as you push them. If it finds a known kind of secret, it stops the push before the secret reaches GitHub. It can't fix a key that's already public."
---

# Your API key leaked, and strangers are spending your money

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Secret / API key:** a setting that lets someone act as you, like a key that lets your app use a paid service. *([Your app's secrets don't belong in your code. Here's where they go](/lessons/environment-variables))*
> - **Environment variable and `.gitignore`:** settings kept outside your code, often in a `.env` file. `.gitignore` lists files Git should never save. *([Your app's secrets don't belong in your code. Here's where they go](/lessons/environment-variables))*
> - **Frontend and backend:** the code that runs in each visitor's browser, and the code that runs on your server. *([A player scored 999,999 points by editing the page. How?](/lessons/frontend-and-backend))*
> - **Commit and repository:** a commit is a save point in Git. A repository is a project folder Git tracks, with its full history. *([The AI broke your working app. Here's your undo button](/lessons/git-as-an-undo-button))*

## The email nobody wants

You built an AI cooking assistant. People type "what can I make with eggs and rice?" and get a recipe. Behind the scenes, your app sends each question to an AI provider, using your API key. You pay for every question.

You share the app with friends on Saturday. You put the code on GitHub so a friend can help.

On Monday morning, there's an email from the AI provider: your account has used far more than your normal monthly amount, over the weekend. You check your app. It has had maybe forty visitors.

Someone else has your key. They are using it for their own projects, and you are paying.

You already know secrets shouldn't be in frontend code or in Git. This lesson shows the exact ways keys still escape in AI-built apps, how to find a leak in your own app, and what to do in the first hour after one.

---

## The mental model: published is published

Here is the whole idea in one line:

> **If a secret was ever sent to a browser or pushed to a public repository, it is public. You can't take it back.**

An API key works like a house key. Whoever holds a copy can open the door. The service can't tell your copy from a stolen one, so it charges you for both.

**Where the comparison stops working:** if someone copies your house key, you change the lock and the copy is useless. With an API key, you can do the same thing: create a new key and turn off the old one. This is called **rotating** the key. Unlike a lock, it takes minutes, so do it the moment you suspect a leak.

There are two common roads to "public". Most leaked keys take one of them.

---

## Road 1: The key ends up in the frontend

The browser can only run code it has downloaded. So everything in your frontend, including any key, is on every visitor's computer. Here are the three ways AI-written code puts it there.

### Way 1: The key is written into frontend code

```js
// components/Chat.js: runs in the browser
const res = await fetch("https://api.ai-provider.example/v1/chat", {
  method: "POST",
  headers: { Authorization: "Bearer my-secret-key-123" },
  body: JSON.stringify({ message }),
});
```

In plain English: when the user asks a question, the browser sends it straight to the AI provider, with your key in the `Authorization` header. ("Bearer" is a common way to say "here is my key" in that header.)

It works. And every visitor's browser now has your key. Anyone can open developer tools, click the **Network** tab, ask one question, and read the key from the request.

### Way 2: The key gets a "public" name

The AI moves the key into `.env`, which looks safer:

```text
NEXT_PUBLIC_AI_KEY=my-secret-key-123
```

But as you learned, names starting with `NEXT_PUBLIC_` (in Next.js) or `VITE_` (in Vite) are copied into the frontend's JavaScript when your app is built. Your key is in a file every visitor downloads, exactly as in Way 1. Only the route it took is different.

### Way 3: The AI "fixes" an error

This one is the sneakiest. You did everything right: the key is in `.env` as `AI_API_KEY`, with no prefix. But your frontend code reads `process.env.AI_API_KEY`, and gets `undefined`, because frameworks keep un-prefixed variables away from the browser on purpose.

You paste the error into your AI. It replies: *"Rename the variable to `NEXT_PUBLIC_AI_API_KEY` so it's available on the client."* The error goes away. The key is now public.

The error was the framework protecting you. The real fix is to move the code that uses the key to the backend.

### "But it's hidden in a huge file"

Before your app goes live, its frontend code is squashed into a few long, hard-to-read files. That isn't protection. Anyone can search those files for text, and programs can do it automatically.

### Some keys are meant to be public

Not every key in the frontend is a leak. Some services give you two kinds:

| Service | Safe in the frontend | Must stay on the backend |
|---|---|---|
| Stripe (payments) | Publishable key, starts with `pk_` | Secret key `sk_` and restricted key `rk_` |
| Supabase (database) | Publishable key (the older version is called the `anon` key) | Secret key (the older version is called the `service_role` key) |

Public keys like these are designed to do only harmless things. For Supabase, the publishable key is only safe if your tables have Row Level Security turned on, which limits what each user can reach. If a service's docs don't say a key is safe to publish, treat it as secret.

> **Go deeper:** [Can strangers read your whole database? Check in 5 minutes](/lessons/never-trust-the-browser) (Level 2) explains Row Level Security.

---

## Road 2: The key ends up in Git history

You know `.env` belongs in `.gitignore`. Here is how keys get into Git anyway:

- **The first commit came before `.gitignore`.** `.env` was saved in commit number one. Adding it to `.gitignore` later doesn't remove it from that commit.
- **The key is in a code file, not `.env`.** A test script, a config file, or a "temporary" line the AI wrote while debugging.
- **"I deleted it in the next commit."** The new commit doesn't have the key. The old one still does. Anyone can open any old commit on GitHub.
- **The repository was private, and later made public.** Every commit becomes public, including old ones you forgot about.

If the repository is public, assume someone found the key quickly. Programs constantly copy new public code and search it for keys. In one documented case, security researchers at Palo Alto Networks' Unit 42 found attackers using leaked cloud keys within five minutes of them appearing on public GitHub.

Making the repository private afterwards doesn't help. The copies are already made.

---

## What good looks like

### Keep keys on the backend, always

The frontend asks **your** backend. Your backend adds the key and asks the AI provider. The key never leaves your server. In Next.js, a file called `app/api/chat/route.js` becomes a backend endpoint at `/api/chat`. It runs on your server, never in the browser:

```js
export async function POST(request) {
  const { message } = await request.json();
  const aiRes = await fetch("https://api.ai-provider.example/v1/chat", {
    method: "POST", body: JSON.stringify({ message }),
    headers: { Authorization: `Bearer ${process.env.AI_API_KEY}` },
  });
  return Response.json(await aiRes.json());
}
```

In plain English:

1. **Line 1:** run this function when a POST request arrives at `/api/chat`.
2. **Line 2:** read the user's question from the request.
3. **Lines 3–6:** send the question to the AI provider. On line 5, the key comes from `process.env.AI_API_KEY`, which only the server can read.
4. **Line 7:** send the AI's answer back to the browser, without the key.

The frontend now calls `fetch("/api/chat", ...)` and never sees the key.

**Your endpoint is the new front door.** Hiding the key isn't enough on its own. If `/api/chat` accepts requests from anyone, a stranger can call it a million times, and you still pay. So add a check at the start of the function:

```js
const user = await getLoggedInUser(request);
if (!user) return Response.json({ error: "Log in first" }, { status: 401 });
```

`getLoggedInUser` stands for whatever your login system provides. If nobody is logged in, the endpoint replies **401** and never calls the AI provider. You should also limit how many requests each user can send.

> **Go deeper:** [Never store a password. Here's what to store instead](/lessons/how-login-works) (Level 2) explains how the server knows who is logged in. [Bots signed up 10,000 times overnight. Now what?](/lessons/rate-limiting) (Level 2) shows how to limit requests.

### When a key leaks: the first hour

Do these in order. The order matters.

1. **Rotate the key first.** In the provider's dashboard, create a new key and delete or turn off the old one. Until you do this, the thief can keep using it. Don't wait to find out how it leaked.
2. **Put the new key in the right place.** Add it to your hosting platform's environment variables, with no public prefix, and deploy again.
3. **Check the damage.** Look at the provider's usage, billing and logs. What was used, and when? If it was a database password, check what was read or changed.
4. **Fix the cause.** Move the code to the backend, fix `.gitignore`, remove the key from code files.
5. **Then think about history.** GitHub's own docs say to revoke the key first, because once it no longer works, removing it from history is often unnecessary. Rewriting history is slow and can't remove copies other people already made.

The most common mistake is doing step 5 first: spending hours cleaning Git history while the old key still works.

### Let GitHub watch for you

GitHub runs **secret scanning**: it searches code for things that look like keys.

- **On public repositories, it's free and on automatically.** It searches your whole history and creates an alert when it finds a key.
- **GitHub tells many providers directly.** When it finds a key from one of its partner companies in a public repository, it notifies that company, which may turn the key off.
- **Push protection** checks your commits as you push them. If it finds a known kind of secret on its way to a public repository, it blocks the push and tells you why. It's on by default for your account. It offers a way to push anyway. Don't use it for a real key.

For private repositories owned by an organization, secret scanning is part of a paid GitHub product.

None of this replaces keeping keys out of your code. It's a safety net, and it only catches the kinds of secrets it knows.

---

## Test your own app

1. **Search your live site.** Open your deployed app in Chrome, open developer tools, and press **Ctrl+Shift+F** (Windows) or **Cmd+Option+F** (Mac) to search every file the page loaded. Search for the first 8 characters of each secret in your `.env`. Also search for `key`, `secret` and `Bearer`. Use your app a little first, so more files load.
2. **Read the request headers.** In the **Network** tab, use your app's main features. Click requests that go to other companies' servers. Do any carry a key that isn't a publishable one?
3. **Check public names.** List every variable starting with `NEXT_PUBLIC_` or `VITE_`. For each one ask: *would I post this value on social media?* If not, it's in the wrong place.
4. **Check your history.** In a terminal, inside your project, run:

   ```bash
   git log --all --oneline -- .env
   ```

   This lists every commit that added, changed or deleted `.env`. If it prints anything, `.env` was saved at some point. Treat every secret in it as leaked, and rotate them.
5. **Check GitHub.** In your repository, look for secret scanning alerts in the security area.

---

## Takeaways

**Key terms**
- **Secret:** a value that lets someone act as you, like an API key or a database password
- **Publishable key:** a key a service designed to be public, with limited powers
- **Rotating a key:** creating a new key and turning off the old one
- **Git history:** every commit ever made. Deleting a file only affects new commits.
- **Secret scanning:** automatic searching of code for things that look like keys
- **Push protection:** blocking a push that contains a known kind of secret

**Red flags in AI-written code**
- A key written directly in a file that runs in the browser
- A secret in a variable starting with `NEXT_PUBLIC_` or `VITE_`
- The AI fixes `undefined` by adding a public prefix to a secret
- Frontend code calling a paid service (AI, email, payments) directly with a key
- A backend endpoint that uses a paid key with no login check and no request limit
- "I deleted the key in the next commit"

**Ask your AI**
- *"Which code in my app runs in the browser, and does any of it use a secret key?"*
- *"Move every call to a paid API into a backend endpoint. Make the endpoint check the user is logged in."*
- *"My key leaked. Walk me through rotating it with [provider name], updating my hosting platform and redeploying."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Mobile apps too.** A mobile app is a frontend that people install. Anyone can unpack it and read the keys inside. The same backend pattern applies.

**Limit what each key can do.** Many providers let you create keys with fewer powers or spending limits. Stripe, for example, recommends restricted keys (`rk_`) that can only do what your app needs, and lets you limit which IP addresses can use a key. A leaked limited key does less damage. [You woke up to a $10,000 cloud bill. What happened?](/lessons/surprise-cloud-bill) covers spending limits and alerts.

**Rewriting history, if you must.** GitHub's docs recommend a tool called `git-filter-repo` (version 2.47 or later, with the `--sensitive-data-removal` option). Be aware of the costs: every commit after the leak gets a new ID, collaborators must re-download the repository, forks still contain the old commits, and fully removing cached views on GitHub requires contacting GitHub Support. This is why rotation always comes first.

**Scanning on your own computer.** Tools such as Gitleaks search your files and Git history for secrets, and can run automatically before every commit. This catches keys before they ever reach GitHub, including in private repositories.

**Secret managers.** Larger teams keep secrets in a dedicated service, a **secret manager**, instead of `.env` files. Your hosting platform's environment variables page is a simple version of the same idea.

**Supabase's secret key.** Supabase's secret key (and the older `service_role` key) skips Row Level Security completely. If it ends up in frontend code, anyone who copies it gets full access to your database. (Supabase's newer secret keys refuse requests that come from a browser, but that doesn't stop someone who copied the key from using it in their own code.)

</details>

## References

- [How to use environment variables in Next.js](https://nextjs.org/docs/app/guides/environment-variables): Next.js docs. Variables starting with `NEXT_PUBLIC_` are copied into the JavaScript sent to the browser, and other variables stay on the server.
- [Env Variables and Modes](https://vite.dev/guide/env-and-mode): Vite docs. Variables starting with `VITE_` are exposed in the frontend code.
- [About secret scanning](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning): GitHub Docs. Secret scanning is free on public repositories, searches the whole history, alerts partner providers, and needs a paid product for private organization repositories.
- [About push protection](https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection): GitHub Docs. Push protection for your account is on by default, blocks known secrets on their way to public repositories, and can be bypassed.
- [Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository): GitHub Docs. Revoke or rotate the secret first, `git-filter-repo` 2.47 or later with `--sensitive-data-removal`, and the costs of rewriting history.
- [API keys](https://docs.stripe.com/keys): Stripe docs. Publishable (`pk_`), secret (`sk_`) and restricted (`rk_`) keys, the advice to use restricted keys, and limiting which IP addresses can use a key.
- [API keys](https://supabase.com/docs/guides/api/api-keys): Supabase docs. Publishable and secret keys, their older `anon` and `service_role` names, and that the secret key skips Row Level Security.
- [CloudKeys in the Air: Tracking Malicious Operations of Exposed IAM Keys](https://unit42.paloaltonetworks.com/malicious-operations-of-exposed-iam-keys-cryptojacking/): Palo Alto Networks Unit 42, October 30, 2023. Attackers used cloud keys leaked on public GitHub within five minutes.
