# MVP Scope

Goal: a free, no-login website where people who build with AI learn the software engineering fundamentals that stop their apps from breaking.

## Audience
**Main audience: complete beginners.** People building apps with AI who have never studied networking, databases, operating systems or security: students, founders, designers, career switchers. They bring most of the traffic.

**The journey: beginner → production-ready engineer.** Lesson 1 assumes the reader knows only how to use a web browser and an AI chat tool. Each lesson builds on the ones before it, and the difficulty rises gradually through five levels.

**Also served:** developers who already know some of this. They can start at a later level, follow cross-links to the lesson they need, and read the optional "Going deeper" sections.

## Levels

| Level | Name | Reader starts knowing | Reader finishes able to |
|-------|------|-----------------------|-------------------------|
| 1 | Foundations | Nothing technical | Explain what happens between clicking a link and seeing a page, where an app's code and data live, and how to undo and debug basic problems |
| 2 | Builder | Level 1 | Build features that are safe and correct, and spot the common security holes in AI-written code |
| 3 | Shipping | Levels 1–2 | Run an app for real users: test it, deploy it safely, know when it breaks, and control costs |
| 4 | Reliability & scale | Levels 1–3 | Keep an app fast and correct under real load and real money: databases under pressure, concurrency, caching and limits |
| 5 | Systems & architecture | Levels 1–4 | Understand how bigger systems stay reliable when many services talk to each other, and make design decisions the AI can't make |

## Website
- **Pages:** homepage, lesson list (grouped by level, with completed checkmarks), lesson page, lesson complete page. Readable on phone and desktop.
- **Quiz:** shown at the end of each lesson, graded in the browser. Option order is shuffled each time it loads.
- **Analytics: Cloudflare Web Analytics.** Gives page views, visitors, top pages and where visitors came from.
  - It does **not** support custom events (Cloudflare's FAQ: "Not yet"), so it can't count button clicks or quiz results. We don't track quiz results.
- **"Mark as completed" button** at the end of every lesson, after the quiz:
  - Saves a checkmark in the reader's browser (`localStorage`), so the lesson list shows which lessons they've finished. No login; progress stays on that device and browser only.
  - Then opens a short "Lesson complete" page at `/lessons/<slug>/complete` with a link to the next lesson.
  - Cloudflare counts views of the `/complete` pages, which gives us lesson completions per lesson without custom events.
  - Pressing the button again on a completed lesson un-marks it and doesn't open the page, so counts stay honest.
- **"Report a mistake" link on every lesson**, opening a new GitHub issue from a template:
  - Link format: `https://github.com/<owner>/<repo>/issues/new?template=report-a-mistake.md&title=Mistake+in:+<lesson title>`
  - Don't put `labels=` in the link: GitHub shows a 404 page to anyone without permission to add labels. The label is set in the template instead (`.github/ISSUE_TEMPLATE/report-a-mistake.md`).
  - Needs a public repo and a `content-mistake` label created in it. Readers need a GitHub account to report.

## Lessons: 66 at launch, read in this order

Each lesson is a real problem people hit when building with AI. Files are named by slug (`content/lessons/<slug>.md`) so numbers can change without breaking links.

### Level 1 — Foundations

| # | Slug | Title | Core concepts |
|---|------|-------|---------------|
| 1 | `what-happens-when-you-open-a-website` | You pressed Enter. What happened in the next second? | Network, internet, browser, server, client, request and response (big picture only) |
| 2 | `ip-addresses-and-dns` | How does your browser find one computer out of billions? | URL, domain name, IP address, DNS |
| 3 | `http-requests-and-responses` | Every website is a conversation. Here's how it goes | HTTP, request, response, status codes, headers |
| 4 | `what-a-web-page-is-made-of` | Take a web page apart and see what's inside | HTML, CSS, JavaScript, many requests per page, developer tools |
| 5 | `website-errors` | "This site can't be reached": what broke, and where? | Reading browser errors by step: DNS, connection, status codes, blank pages |
| 6 | `frontend-and-backend` | A player scored 999,999 points by editing the page. How? | Frontend, backend, trust boundary |
| 7 | `what-is-an-api` | The hidden conversation behind every button you tap | API, endpoint, JSON |
| 8 | `what-is-a-database` | Your app forgot everyone's messages overnight. Why? | Database, tables, rows, persistence |
| 9 | `how-a-computer-runs-your-code` | Your app restarted and all the likes vanished | CPU, memory, disk, process |
| 10 | `localhost-vs-production` | It works on my laptop. Why can't my friend open it? | Localhost, hosting, deploying, domains |
| 11 | `environment-variables` | Your app's secrets don't belong in your code. Here's where they go | Configuration, environment variables, `.env` |
| 12 | `packages-and-dependencies` | It works on my machine, but not on yours. Blame the packages | Packages, npm, versions, lockfiles |
| 13 | `git-as-an-undo-button` | The AI broke your working app. Here's your undo button | Git, commits, branches, GitHub |
| 14 | `reading-error-messages` | The error message is telling you what's wrong. Read it first | Errors, stack traces, logs, terminal, browser console |
| 15 | `what-is-the-cloud` | There is no cloud. It's someone else's computer | Cloud providers (AWS, Google Cloud, Azure), pay-as-you-go, AWS building blocks |
| 16 | `hosting-platforms` | From your laptop to a real website in one push | Hosting platforms, deploys from GitHub, builds, CDNs, serverless functions, preview links |

Lessons 1–5 were one lesson in an earlier draft. They were split so each idea gets enough room at a beginner's pace. The earlier draft is in `content/drafts/source-for-lessons-2-to-5.md` as source material.

### Level 2 — Builder

| # | Slug | Title | Core concepts |
|---|------|-------|---------------|
| 17 | `http-methods-and-status-codes` | The app said "Saved!". The note was never saved | HTTP methods, status codes, headers |
| 18 | `designing-tables` | You changed your name. Half the app still shows the old one | Data modeling, primary and foreign keys, relationships |
| 19 | `api-key-ended-up-public` | Your API key leaked, and strangers are spending your money | Secrets, frontend exposure, git history |
| 20 | `how-login-works` | Never store a password. Here's what to store instead | Password hashing, sessions, cookies, tokens |
| 21 | `logged-in-doesnt-mean-allowed` | Change one number in the URL, see everyone's invoices | Authentication vs authorization, IDOR |
| 22 | `never-trust-the-browser` | Can strangers read your whole database? Check in 5 minutes | Server-side validation, Row Level Security |
| 23 | `sql-injection` | How one line of text can dump your whole database | SQL injection, parameterized queries |
| 24 | `cross-site-scripting` | A comment that runs code in every visitor's browser | XSS, escaping output |
| 25 | `cors` | "Blocked by CORS policy": why the browser said no | Same-origin policy, CORS |
| 26 | `https-and-certificates` | What the padlock icon really protects, and what it doesn't | HTTPS, TLS, certificates |
| 27 | `cloudflare` | One company went down, and a big chunk of the internet went with it | Reverse proxy, DNS, CDN, DDoS protection, firewall, Cloudflare's own hosting |
| 28 | `rate-limiting` | Bots signed up 10,000 times overnight. Now what? | Rate limiting, abuse prevention |
| 29 | `webhooks` | Free stuff with one fake "payment succeeded" message | Webhooks, signature verification |
| 30 | `file-uploads` | The profile picture that ran code on your site | File size and type limits, storage |
| 31 | `dangerous-packages` | The AI suggested a package that didn't exist. Then someone made it | Supply chain attacks, typosquatting, hallucinated packages |
| 32 | `handling-errors` | Your error page showed your database details to everyone | Error handling, not leaking internal details |
| 33 | `database-migrations` | You renamed one column and the live app crashed | Migrations, schema changes |
| 34 | `backups` | The AI deleted your production database. Now what? | Backups, restore testing |

### Level 3 — Shipping

| # | Slug | Title | Core concepts |
|---|------|-------|---------------|
| 35 | `dev-staging-production` | Why you should never test on your real users | Environments: development, staging, production |
| 36 | `tests-worth-writing` | The AI fixed one bug and quietly broke three others | Automated tests, regression |
| 37 | `ci-cd` | Stop broken code before it ever goes live | CI/CD, automated pipelines |
| 38 | `logging-and-monitoring` | Your app was down for six hours and nobody noticed | Logging, monitoring, alerts |
| 39 | `debugging-production` | It only breaks in production. How do you find out why? | Reproducing, isolating, debugging |
| 40 | `background-jobs` | Sign-up takes 10 seconds because of one email | Background jobs, queues |
| 41 | `timeouts-and-retries` | The payment timed out. Did it go through? | Timeouts, retries, idempotency |
| 42 | `surprise-cloud-bill` | You woke up to a $10,000 cloud bill. What happened? | Usage-based pricing, spending limits, AI API costs |
| 43 | `reading-code-you-didnt-write` | The AI wrote 500 lines. How do you know they're safe? | Reviewing AI-written code |

### Level 4 — Reliability & scale

| # | Slug | Title | Core concepts |
|---|------|-------|---------------|
| 44 | `database-indexes` | Fast with 100 users, frozen at 10,000. The missing index | Indexes, query speed |
| 45 | `n-plus-one-queries` | One page, 500 database queries | N+1 queries |
| 46 | `pagination` | Your app tried to load 50,000 rows at once | Pagination, offset vs cursor, limits |
| 47 | `charged-twice` | A customer got charged twice. How? | Transactions, ACID, race conditions |
| 48 | `isolation-levels` | Two transactions, one wrong answer | Isolation levels, dirty reads, lost updates, serializable |
| 49 | `event-loop` | One slow request froze the whole server | Async, event loop, threads |
| 50 | `processes-and-threads` | How one server handles thousands of users at once | Processes vs threads, concurrency vs parallelism, shared memory |
| 51 | `locks-and-deadlocks` | Two tasks waiting for each other forever | Mutex, semaphore, deadlock, database deadlocks |
| 52 | `memory-leaks` | Your server crashes every few days, like clockwork | Memory, leaks, limits |
| 53 | `caching` | Fast, but showing yesterday's data | Caching, cache invalidation |
| 54 | `cache-strategies` | Your cache expired and the database collapsed | Cache-aside, write-through, write-back, TTLs, cache stampedes |
| 55 | `rate-limiting-algorithms` | How does a rate limiter count to 100? | Fixed window, sliding window, token bucket, leaky bucket |
| 56 | `latency-and-cdns` | Fast in the US, painfully slow in India | Latency, CDNs |
| 57 | `realtime-updates` | How chat apps update without you refreshing | Polling, WebSockets |
| 58 | `scaling` | Your app went viral. Will it survive? | Vertical and horizontal scaling, load balancers |
| 59 | `sql-vs-nosql` | SQL or NoSQL? The AI chose for you. Was it right? | Relational vs document databases, trade-offs |

### Level 5 — Systems & architecture

| # | Slug | Title | Core concepts |
|---|------|-------|---------------|
| 60 | `circuit-breakers` | One slow service took your whole app down | Circuit breaker, fallbacks, cascading failures |
| 61 | `event-driven-architecture` | When everything calls everything, everything breaks | Events, message brokers, publish/subscribe, eventual consistency |
| 62 | `outbox-pattern` | The order was saved, but the email never went out | Dual writes, transactional outbox |
| 63 | `change-data-capture` | Your search results are an hour out of date. Why? | Change data capture (CDC), write-ahead log |
| 64 | `event-sourcing` | What if your database remembered everything that ever happened? | Event sourcing, projections, CQRS |
| 65 | `collaborative-editing` | Two people typed in the same document at once. Who wins? | Operational transformation (OT), CRDTs |
| 66 | `decisions-ai-cant-make` | The decisions your AI can't make for you | Architecture trade-offs |

## Outlines: cloud, hosting and Cloudflare lessons

These three lessons explain the services beginners hear about constantly. They come in this order because each builds on the one before: the cloud is rented computers, hosting platforms are built on the cloud, and Cloudflare sits in front of either one.

### 15. What is "the cloud"? Renting someone else's computers (Level 1)
- **Hook:** everyone says apps "run in the cloud". There's no cloud. It's someone else's computers, in a data center, that you rent.
- **Core idea:** instead of buying and running your own servers, you rent them from a **cloud provider** and pay for what you use, by the second, hour or gigabyte. Like renting a bike by the hour instead of buying one.
- **The big three:** Amazon Web Services (**AWS**), Google Cloud and Microsoft Azure.
- **AWS's main building blocks, one analogy each:**
  - **EC2:** rent a whole computer that runs all the time
  - **S3:** a giant storage room for files (images, videos, backups)
  - **RDS:** a database that AWS looks after for you
  - **Lambda:** code that only runs when it's needed, and you pay only while it runs. This is called **serverless**: there are still servers, you just never manage them.
- **Why beginners usually don't start on AWS:** it gives you raw parts with hundreds of settings, like buying ingredients instead of a ready meal. Easy to set up wrong, and pay-per-use means mistakes can cost money.
- **Try it:** look at the AWS services list and count how many there are.
- **Links forward:** hosting platforms (next lesson), surprise cloud bill (Level 3).

### 16. How Vercel and Netlify put your app online (Level 1)
- **Hook:** your app works on your laptop. How do other people open it?
- **Core idea:** a **hosting platform** takes your code and does all the cloud setup for you. You connect your GitHub repository once. After that, every time you push code:
  1. The platform downloads your code and **builds** it: turns it into files ready to send to browsers
  2. Pages, images, CSS and JavaScript go onto a **CDN**: copies on servers in many countries, so they load fast everywhere
  3. Your backend code becomes **serverless functions** that run only when a request arrives
  4. You get a live web address, like `yourapp.vercel.app`
- **Preview links:** each branch or pull request gets its own test web address before it goes live.
- **Connecting your own domain:** the DNS records from lesson 2, in practice.
- **Environment variables:** set in the platform's dashboard, not in your code.
- **Under the hood:** these platforms are built on top of big cloud providers. Vercel has written that its functions run on AWS Lambda (July 2025 engineering post). Netlify launched its functions in 2018 as a way to use AWS Lambda without an AWS account; its current docs still mention Lambda runtimes but don't state the current architecture plainly. You pay more per unit than raw AWS in exchange for not managing anything.
- **How it goes wrong:** build fails (read the build logs), function timeouts, free-plan limits, environment variable missing in production but present on your laptop.
- **Try it:** deploy a one-page site and watch the build logs.

### 27. Cloudflare: the security guard in front of your website (Level 2)
- **Hook:** when Cloudflare has an outage, a large part of the internet goes down at the same time. Why does one company matter that much?
- **Core idea:** Cloudflare runs a huge network of servers in cities around the world. When you put your site "behind" Cloudflare, visitors' requests reach Cloudflare first, and Cloudflare passes them on to your real server. A server that stands in front of yours like this is called a **reverse proxy**.
- **What it does from that position (all available on the free plan):**
  - **DNS:** answers the "which IP address?" question for your domain
  - **CDN:** keeps copies of your pages close to visitors
  - **HTTPS:** a free certificate, so visitors see the padlock
  - **DDoS protection:** absorbs floods of fake traffic meant to knock your site offline
  - **Firewall (WAF):** blocks known attack patterns before they reach your server
- **Its own hosting too:** Cloudflare also runs code (Workers), hosts sites (Pages) and stores files (R2), competing with Vercel, Netlify and AWS.
- **How it goes wrong:** settings that cause redirect loops, cached old pages after an update, Cloudflare outages taking your site down with it.
- **Before writing:** verify the specific outage used in the hook, the current free-plan feature list, and current product names.

## Lesson format
- 10–15 minute read for the main lesson (about 1,800–2,500 words, not counting "Going deeper")
- Structure: Before you start → Hook → Mental model → How it goes wrong → What good looks like → Test your own app → Takeaways → Going deeper (optional) → Quiz
- Every lesson gives the reader: one mental model, one red flag, one question to ask their AI
- Code snippets under 15 lines
- Frontmatter: `title`, `slug`, `order`, `level`, `levelName`, `concepts`, `readTime`, `quiz`

## Writing style by level

| | Level 1 Foundations | Level 2 Builder | Levels 3–5 |
|---|---|---|---|
| Assumes | Nothing | Level 1 lessons | All earlier lessons |
| New terms | Explain every one | Explain every term not covered earlier | Explain every term not covered earlier |
| Code | Rare; every line explained in plain English | Short snippets, each followed by a plain-English walkthrough | More code, still with a short explanation of what matters |
| Depth | What it is and why it matters | How it breaks in AI-written code and how to fix it | Trade-offs, numbers, what happens at scale |

### Level 1: write for a kid who just got into programming
Picture a curious 13-year-old who has used apps and websites but has never studied how any of it works. Every Level 1 lesson must work for them.

- **One idea per section.** Introduce at most two new terms in a section. If a section needs more, split it.
- **Zoom in slowly.** Give the big picture first, then zoom into one part per lesson. Lesson 1 is the whole journey in simple terms; lessons 2–5 each zoom into one step.
- **Use their world for examples:** YouTube, games, group chats, school, shops, the post. Not offices, invoices or businesses.
- **Don't assume experiences they haven't had:** buying a domain, using a terminal, deploying an app, writing code for money.
- **Short sentences.** Aim for under 15 words. One idea per sentence.
- **"In short" box at the end of each section:** one or two sentences recapping it, so a reader who got lost can catch up.
- **Show, don't just tell:** a simple diagram or a "try it yourself" step whenever possible.
- **Never say "simply", "just", "obviously" or "easy".** If it were obvious, they wouldn't be reading.

## Writing rules (all levels)
- **Catchy, honest titles.** Every title is a real problem the reader might hit, phrased as a scenario or a question: "Your API key leaked, and strangers are spending your money", "The payment timed out. Did it go through?". The title must match what the lesson actually covers. Hypothetical numbers are fine; invented "real" events are not. Keep titles under 70 characters, and in Level 1 use no term the reader doesn't know yet. The concepts show as tags under the title, so the title doesn't need to name them.
- **Titles live in the MVP.md tables.** After changing one, run `node scripts/sync-titles.mjs` to copy it into the lesson file and into callout links in other lessons.
- **Never use a term before it's explained.** This includes the hook, headings, code, takeaways and quiz. The hook is the most dangerous place: it's the first thing a beginner reads, so it must make sense with zero knowledge. If the hook shows something unfamiliar (like an error code), say plainly that it's normal not to understand it yet and that the lesson will explain it.
- **Jargon check before finishing a lesson:** go through it top to bottom and list every technical word in the order it first appears. Each one must be explained at or before that point, or be in the "Before you start" box. Words that feel basic to developers count too: server, localhost, terminal, route, header, cache, hosting provider.
- **Name it, explain it, use it:** plain English first, then the real term in bold, then always use the real term. Never drop the real term; readers need it to talk to their AI and to other developers.
- **"Before you start" box:** at most 4 terms from earlier lessons that this lesson depends on, each with a one-line meaning and a link. This catches readers who arrive from Google instead of lesson 1.
- **The main idea must make sense without reading the code.** Every code block is followed by a plain-English explanation of what's wrong and why.
- **Everyday analogies** (wristbands, receipts, hotel keycards), and say where the analogy stops being true.
- **Simple English:** short sentences, no idioms or slang. Many readers are not native English speakers.
- **Advanced details go in "Going deeper"**, a collapsed section at the end. The main lesson and the quiz never depend on it.
- **Review test:** would someone who has read only the earlier lessons understand every sentence? If not, rewrite it.

## Cross-links
Lessons link to each other so readers can move at their own level:
- **Backward:** the "Before you start" box links to earlier lessons.
- **Forward:** when a lesson touches a topic that a later lesson covers in depth, add a link right there, written as a callout:
  `> **Go deeper:** [Lesson title](/lessons/<slug>) (Level N)`
  Intermediate readers can jump straight to the lesson that matters to them.
- Always link by slug, never by lesson number. Every link must point to a lesson in the list above.

## Fact-checking
- List every factual claim in a lesson (rankings, dates, tool behavior, error messages, protocol details) and check each one against an authoritative source: official docs, specs, MDN, OWASP.
- Check twice. If a claim can't be verified, cut it or rewrite it so it's true.
- Prefer claims that won't go stale. Use example values that can't be wrong, such as documentation IP addresses (`203.0.113.x`) and `example.com`.

## Quiz rules
Every lesson ends with a multiple-choice quiz. It is graded in the browser against a fixed answer key: no server, no code execution, no AI grading, so it costs nothing to run.

- 5–6 questions per lesson, 4 options each, exactly one correct
- Test understanding, not memory: prefer "what happens if…" situations over "define X"
- Wrong options should be mistakes a real beginner would make
- Every question has an explanation, shown after the reader answers
- Only test the main lesson, never "Going deeper"
- Anyone who has read this lesson and the earlier ones must be able to answer every question
- Stored in the lesson's frontmatter, in this format:

```yaml
quiz:
  - question: "How should your server know which user is making a request?"
    options:
      - text: "From the form the user filled in"
      - text: "From the session the server created when the user logged in"
        correct: true
      - text: "From the web address"
      - text: "From whatever user ID the browser sends"
    explanation: "The user can change anything their browser sends. Only the session was created by the server itself."
```

## Not in the MVP
Login, progress synced across devices, learning paths, topic map, glossary, search, comments, newsletter, code-execution exercises, tracking quiz results.
