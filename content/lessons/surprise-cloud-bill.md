---
title: "You woke up to a $10,000 cloud bill. What happened?"
slug: surprise-cloud-bill
order: 42
level: 3
levelName: Shipping
concepts: [Usage-based pricing, AI API costs, Tokens, Bandwidth and egress, Budget alerts, Spending limits, Protecting expensive endpoints]
readTime: 14 min
quiz:
  - question: "You set a budget alert of $100 on your cloud account. A bug starts running up costs on Friday night. What does the alert do?"
    options:
      - text: "It stops all spending at exactly $100"
      - text: "It switches off the bug"
      - text: "It sends you a message, possibly hours later, while spending continues"
        correct: true
      - text: "It moves the extra cost to next month"
    explanation: "An alert only warns you. Spending continues until you or an automatic action stops it. Billing data can also arrive hours late, so the real total may already be higher when you read the alert."

  - question: "A React component calls your /api/summarize route inside a useEffect with no dependency list, and saves the result in state. The route calls a paid AI API. What can happen?"
    options:
      - text: "The summary is fetched once, as intended"
      - text: "Every time the result is saved, the component re-renders, the effect runs again, and it calls the AI API again in a loop"
        correct: true
      - text: "React blocks the request because it's too expensive"
      - text: "The AI API returns the same answer for free the second time"
    explanation: "Saving the result causes a re-render, which runs the effect again, which saves a new result. Each visitor's open tab can call your paid API over and over until it is closed."

  - question: "A small static website gets a huge bill even though it has no backend code. What is the most likely cause?"
    options:
      - text: "Bandwidth: a file was downloaded a huge number of times, and data sent out is billed"
        correct: true
      - text: "Static websites always cost a lot"
      - text: "The database grew too large"
      - text: "Someone guessed the admin password"
    explanation: "Hosting platforms and clouds charge for data sent to visitors. A large file downloaded millions of times by bots or a traffic spike can create a big bill without any server code."

  - question: "Your AI provider lets you set a hard monthly spending limit. What happens when your app reaches it?"
    options:
      - text: "Nothing, it is only a suggestion"
      - text: "The provider charges your card for the extra amount"
      - text: "The provider deletes your account"
      - text: "Requests to the AI API start failing, so your AI features stop working until the limit resets or you raise it"
        correct: true
    explanation: "A hard limit protects your wallet by refusing further requests. That also means your feature stops. Your app should handle that error with a friendly message."

  - question: "Which change protects your paid AI endpoint the most?"
    options:
      - text: "Hiding the AI button on the page for users who aren't logged in"
      - text: "Requiring login, limiting uses per user, limiting input and output size, and adding a daily cost cap on the server"
        correct: true
      - text: "Making the endpoint's web address long and hard to guess"
      - text: "Using a more expensive AI model"
    explanation: "Anyone can call your API without your page. Only server-side checks protect it: who may call it, how often, how big each call can be, and a total cap as a last line of defense."

  - question: "If one AI call costs your app 1 cent, and a bug makes 5 calls per second for a whole weekend (48 hours), roughly what does it cost?"
    options:
      - text: "About $86"
      - text: "About $864"
      - text: "About $8,640"
        correct: true
      - text: "About $86,400"
    explanation: "5 calls × 3,600 seconds × 48 hours = 864,000 calls. At 1 cent each, that's $8,640. Small prices become large bills when code repeats them at computer speed."
---

# You woke up to a $10,000 cloud bill. What happened?

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Pay-as-you-go:** cloud services charge for what you use, by the second, request or gigabyte, instead of a fixed price. *([There is no cloud. It's someone else's computer](/lessons/what-is-the-cloud))*
> - **Serverless function:** backend code your hosting platform runs for each request, and bills for each time it runs. *([From your laptop to a real website in one push](/lessons/hosting-platforms))*
> - **Rate limiting:** a limit on how many requests one visitor or user can make in a period of time. *([Bots signed up 10,000 times overnight. Now what?](/lessons/rate-limiting))*
> - **API key:** a secret that lets your app use a paid service, and charges your account. *([Your API key leaked, and strangers are spending your money](/lessons/api-key-ended-up-public))*

## Monday morning

You built an app that summarizes long articles with AI. It has a few hundred users and costs you a few dollars a month. On Monday morning, you open your email:

> *Your usage this billing period: $10,412.*

This is a made-up example, but stories like it are posted online again and again. And the first question is always the same: **what happened?**

Usually it's one of a few causes:

- A **bug** repeated a paid action thousands of times per minute, all weekend, while you slept.
- **Bots** found an endpoint that costs you money and used it as much as they liked.
- A **leaked API key** let strangers use your account.
- A **file or page** was downloaded a huge number of times, and every download was billed.

All of them can happen to a side project. This lesson shows how the bill grows and the four layers that stop it.

---

## The mental model: a meter, not a price tag

A phone contract has a fixed monthly price. Use it a lot or a little, you pay the same. Cloud services mostly work like a **taxi meter** instead. The meter runs as long as the ride continues, and it doesn't stop on its own. This is called **usage-based pricing**: the bill is how much you used, times the price per unit.

Here's the uncomfortable part: **your code decides how much you use.** And code works at computer speed, 24 hours a day, without asking you. A person who makes a mistake makes it once. Code that makes a mistake can make it a million times before Monday.

**Where the comparison stops working:** in a taxi, you can see the meter. In the cloud, the meter is reported late. AWS says its budget data updates up to three times a day. Vercel checks spending every few minutes. By the time a number reaches you, the real total is already higher.

### What the meter counts

| What you pay for | Typical unit | How it grows by surprise |
|---|---|---|
| **AI API calls** | Tokens (pieces of text) in and out | Loops, bots, very long prompts or answers |
| **Serverless functions** | Number of runs and how long each runs | Loops, slow calls that wait for a long time |
| **Bandwidth** (data sent to visitors) | Gigabytes sent out | Big files, videos, bots downloading the same file |
| **Storage** | Gigabytes per month | Uploads and backups nobody deletes |
| **Always-on servers and databases** | Hours running | Something you tried once and forgot |

Two words from this table need a closer look.

**Tokens.** AI providers don't charge per question. They charge per **token**: a small piece of text, often part of a word. You pay for the tokens you send (the **input**: your instructions, the user's text, the conversation so far) and for the tokens the model writes back (the **output**). So one request with a 50-page document costs far more than one with a sentence. And a chat that sends the whole conversation history with every message gets more expensive with every message.

**Egress.** Data going *out* of a cloud, to your visitors, is often called **egress**. On AWS, data sent out to the internet is billed once you pass a free monthly amount. Hosting platforms also bill bandwidth or count it against your plan. A 3 MB file is nothing. The same file downloaded a million times is about 3 terabytes.

---

## How it goes wrong

### Cause 1: A loop that calls a paid API

Here is a common one in AI-written React code:

```js
const [result, setResult] = useState(null);

useEffect(() => {
  fetch("/api/summarize", { method: "POST", body: JSON.stringify({ text }) })
    .then((r) => r.json())
    .then((data) => setResult(data)); // saving the result re-renders the page
}); // ← no dependency list: runs after every render
```

In plain English:

1. **Line 1:** keep the summary in the component's **state**: data that, when it changes, makes React draw the component again (a **re-render**).
2. **Lines 3–7:** after the component is drawn, ask the server for a summary, then save the answer in state.
3. **Line 7:** `useEffect` has no list of things it depends on, so React runs it after **every** render.

Saving the result causes a re-render. The re-render runs the effect. The effect fetches a new summary and saves it, which causes a re-render. Every visitor's open tab now calls your paid AI API in a loop, for as long as the tab stays open. The fix is one line: a dependency list, `}, [text]);`, so the effect only runs when the text changes.

The same pattern appears in other forms: a background job that fails and retries forever, calling the AI each time, or an AI "agent" that keeps calling tools with no limit on its steps.

> **Go deeper:** [The payment timed out. Did it go through?](/lessons/timeouts-and-retries) (Level 3) shows how to retry with limits.

### Cause 2: An open door to an expensive feature

You learned in the rate limiting lesson that bots love endpoints that cost money. An `/api/generate` route with no login, no limits and no size checks is free AI for anyone who finds it. It doesn't matter that your page only calls it once per click: anyone can call your API directly, without your page.

### Cause 3: A leaked key

If your AI provider's secret key ends up in your frontend code or in a public GitHub repository, strangers can use it directly. They don't even need your app. Every request they make is billed to you.

### Cause 4: Bandwidth from a traffic spike

In February 2024, a developer reported a Netlify bill of about $104,000 for bandwidth on a small static website. They described a flood of traffic that downloaded one file over and over. Netlify's CEO said publicly that the user would not be charged. That was the company's decision, not a rule you can count on.

### Cause 5: Something left running

A test database, a server from a tutorial, an old copy of your app on another platform. Each one is small. Over months, they add up.

---

## What good looks like

No single setting protects you. Use four layers, each catching what the one before missed.

### Layer 1: Know your cost per action

Before launch, work out roughly what one user action costs. For an AI feature: how many tokens does a typical request send and receive, and what does your model charge per token? Your provider's pricing page has the numbers, and every response tells you how many tokens it used.

Then do the scary multiplication. If one summary costs your app 1 cent:

- 1,000 summaries a day, from real users: $10 a day. Fine.
- A bug that calls it 5 times per second for a weekend: 5 × 3,600 seconds × 48 hours = 864,000 calls = **$8,640**.

That second number is how a "few dollars a month" app wakes up to a $10,000 bill.

### Layer 2: Budgets, alerts and hard limits

Every serious provider lets you set an amount and get warned. Some can also **stop** spending. Learn the difference:

- An **alert** only tells you. Spending continues.
- A **hard limit** refuses further usage. That protects your wallet, but your feature stops working until you raise it.

What some popular services offer (check their docs, because these features change):

| Service | What you can set |
|---|---|
| **AWS Budgets** | Alerts by email when actual or *forecast* spending passes your amount. Optional actions can also run, such as stopping specific servers or blocking new resources. AWS warns that alerts can arrive after the money is spent. |
| **Vercel Spend Management** (paid plans) | A budget with notifications at 50%, 75% and 100%, a webhook, and an option to pause your production site when the budget is reached. Vercel checks every few minutes, so pausing is not instant. |
| **Netlify** (credit-based plans) | The Free plan has a hard limit and never charges you. On paid plans, keeping automatic credit top-ups ("auto recharge") off keeps costs predictable. Turning it on keeps your sites running past your credits. |
| **OpenAI** | Spend alerts that only notify, and hard spend limits for your whole organization or for one project. Over a hard limit, requests fail with a `429` error. OpenAI notes enforcement isn't instant. |
| **Anthropic** | A monthly spend limit for your organization that you can set yourself, plus separate limits per workspace. Once reached, requests fail until the limit resets or you raise it. |

Two practical rules:

- **Set both.** An alert at a level that makes you look, and a hard limit at the level that would really hurt.
- **Use separate keys or projects** for each app and for development versus production. Then a bug in a test script can't use up your production budget, and you can see which app spent what.

### Layer 3: Protect every endpoint that costs money

The provider's limit is your last line of defense. The first line is your own server. For every route that calls a paid service:

- **Require login**, and limit how often each user can use it, with the counter in your database.
- **Limit the size** of what goes in (prompt length, file size) and what comes out (`max_tokens` for AI models).
- **Cache** answers you've already paid for. If ten users summarize the same article, pay once.
- **Never retry forever.** Use a maximum number of attempts.
- Add a **total cap** and an **off switch** on the server.

Here's what the last point looks like:

```js
app.post("/api/summarize", requireLogin, async (req, res) => {
  if (process.env.AI_ENABLED !== "true") return res.status(503).json({ error: "Summaries are paused." });
  if ((await aiCostTodayInCents()) >= 500) return res.status(503).json({ error: "Daily limit reached." });
  const msg = await anthropic.messages.create({ model: MODEL, max_tokens: 500, messages: buildMessages(req.body) });
  await recordAiCost(msg.usage); // tokens in and out, times your model's price
  res.json({ summary: msg.content[0].text });
});
```

In plain English:

1. **Line 2:** an **off switch**. If the `AI_ENABLED` setting isn't `"true"`, refuse politely. On many platforms, changing an environment variable needs a redeploy, so some teams keep this switch in a database row instead.
2. **Line 3:** a **daily cap** for the whole app: if today's AI spending is already $5 (500 cents), stop for today. This catches loops and bots that slip past the per-user limits.
3. **Line 4:** call the model, with `max_tokens` limiting how long the answer can be.
4. **Line 5:** record what this call cost. The response's `usage` field says how many input and output tokens it used.
5. **Line 6:** send the summary back.

The status `503` means "temporarily unavailable", which is honest: the feature will come back.

> **Go deeper:** [Bots signed up 10,000 times overnight. Now what?](/lessons/rate-limiting) (Level 2) covers per-user and per-IP limits in detail.

### Layer 4: Keep big files cheap

For bandwidth:

- Shrink images and use modern formats. Don't send a 4 MB photo where a 200 KB one looks the same.
- Put large files (videos, downloads, audio) in object storage behind a CDN, not in your app's functions. Compare storage providers' prices for data sent out: they differ a lot.
- A service like Cloudflare in front of your site can block floods of bad traffic before they reach the meter.

### When the bill arrives anyway

1. **Stop the bleeding.** Turn off the feature, pause the project, or lower the hard limit. If a key may have leaked, rotate it now.
2. **Find the cause.** Your provider's usage page shows *which* service and *when*. Match that time with your logs and your deploys.
3. **Fix it, and add a layer** that would have caught it.
4. **Contact support.** Explain clearly what happened and what you've changed. Providers sometimes reduce bills for honest mistakes or attacks, but it's their choice.

---

## Test your own app

1. **Find every meter.** List every service your app uses. For each, open its usage or billing page and find what it charges for.
2. **Set alerts and limits today.** On each service that supports it, set an alert at a small amount and, where available, a hard limit. This takes ten minutes.
3. **Do the scary multiplication.** For each paid feature, estimate the cost of one use. Multiply by 5 per second for 48 hours. Is that number survivable?
4. **Search for loops.** Ask your AI: *"Find every `useEffect` without a dependency list, every `while (true)` loop, and every retry without a maximum in my code. Do any of them call a paid service?"*

---

## Takeaways

**Key terms**
- **Usage-based pricing:** you pay for how much you use, like a taxi meter
- **Token:** a small piece of text that AI APIs count to bill you, for both input and output
- **Egress:** data sent out of a cloud to the internet, often billed per gigabyte
- **Budget alert:** a warning when spending passes an amount. It doesn't stop anything.
- **Hard spending limit:** a cap that refuses further usage, which also stops your feature

**Red flags**
- A route that calls a paid AI API with no login, no per-user limit or no size limit
- `max_tokens` missing, or user input sent to the model with no length check
- A `useEffect` with no dependency list that calls an API
- Retries or agent loops with no maximum
- The same API key used for development, testing and production
- No alert or limit on any provider account

**Ask your AI**
- *"List every place my app calls a service that charges per use. For each one, show how it's protected: login, per-user limit, size limit and a total cap."*
- *"Estimate the cost of one request to my AI endpoint, using my prompt and typical input. Then estimate the worst case if a bot calls it 5 times per second for 48 hours."*
- *"Add a server-side daily spending cap and an off switch to my AI features, and show a friendly message when they're reached."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Denial of wallet.** An attack whose goal isn't to take your site down but to run up your bill is sometimes called "denial of wallet". Serverless and usage-priced services make this possible, because they keep scaling up instead of slowing down. Rate limits, caps and hard limits are the defense.

**Why billing data is late.** Usage is collected from many servers, added up and priced in batches. AWS's documentation says Budgets data updates up to three times a day and that you can exceed your threshold before the notification arrives. Vercel says its spend checks run every few minutes. OpenAI says recorded spend can slightly pass a hard limit. Set limits below the amount you can truly afford.

**Forecast alerts.** AWS Budgets can alert on *forecast* spending: "at this rate, you'll pass $100 this month". This warns you earlier than an alert on actual spending, especially for slow increases.

**Cheaper AI requests.** Besides limits: send only the context the model needs, use a smaller model for simple tasks, and use your provider's prompt caching for instructions you send with every request. Many providers also offer cheaper batch processing for work that doesn't need an instant answer.

**Hidden meters.** Some costs are easy to forget: data sent between cloud regions, logs (some monitoring services bill per gigabyte stored), image optimization on hosting platforms, and build minutes. Check the full list of metered items on your platform's pricing page once a quarter.


</details>

## References

- [Managing your costs with AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html): AWS documentation. Alerts on actual and forecast costs, data updated up to three times a day, and the warning that alerts can arrive after costs pass your threshold.
- [Configuring budget actions](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html): AWS documentation. Actions that apply policies or stop specific servers, automatically or after approval.
- [Amazon EC2 On-Demand Pricing](https://aws.amazon.com/ec2/pricing/on-demand/): AWS. The free monthly allowance for data sent out to the internet, and billing beyond it.
- [Spend Management](https://vercel.com/docs/spend-management): Vercel documentation. Budgets, notifications at 50%, 75% and 100%, webhooks, pausing production deployments, and checks every few minutes.
- [Credit-based pricing plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/): Netlify documentation. The Free plan's hard limit and the auto recharge option on paid plans.
- [Spend limits](https://developers.openai.com/api/docs/guides/spend-limits): OpenAI documentation. Spend alerts that only notify, hard limits for organizations and projects, `429` errors, and enforcement that isn't instant.
- [Rate limits](https://platform.claude.com/docs/en/api/rate-limits): Anthropic documentation. Monthly spend limits you can set for your organization, workspace limits, and what happens when a limit is reached.
- [Netlify billing horror story](https://answers.netlify.com/t/netlify-billing-horror-story/113392): Netlify community forum. The February 2024 bandwidth bill reported by a developer, and Netlify's statement that the user would not be charged.
- [I am the OP of that $104K bill post](https://answers.netlify.com/t/i-am-the-op-of-that-104k-bill-post-and-i-have-some-follow-up-questions/113472): Netlify community forum. The developer's own follow-up, describing repeated requests to a single MP3 file.
- [useEffect](https://react.dev/reference/react/useEffect): React documentation. An Effect with no dependency array runs again after every render, and an Effect that updates state can loop.
