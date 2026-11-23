---
title: "The decisions your AI can't make for you"
slug: decisions-ai-cant-make
order: 66
level: 5
levelName: Systems & architecture
concepts: [Architecture trade-offs, Build vs buy, Data criticality, Availability and downtime budgets, RTO and RPO, Monolith vs microservices, Reversible decisions, Decision records]
readTime: 15 min
quiz:
  - question: "You ask your AI to design your app's architecture. In one chat it suggests microservices and Kafka; in another it suggests one simple server. Why?"
    options:
      - text: "One of the chats used a worse AI model"
      - text: "The AI is guessing randomly"
      - text: "The right answer depends on facts about your users, money, risk and team, and each chat assumed different ones"
        correct: true
      - text: "Microservices and a single server are the same thing"
    explanation: "Architecture is a set of trade-offs. Without your real facts, the AI fills in assumptions from how you asked. Give it the facts and ask for options with trade-offs, not one answer."

  - question: "Your app is for a small yoga studio's class bookings. Login, payments and email are all needed. What's the most sensible build-vs-buy choice?"
    options:
      - text: "Use existing services for login, payments and email, and spend your own effort on the booking experience"
        correct: true
      - text: "Build all of it yourself, because the AI can write it quickly"
      - text: "Build your own payment system to avoid fees"
      - text: "Buy a service for everything, including the booking experience that makes you different"
    explanation: "Login, payments and email are the same for everyone and risky to get wrong. Buy them. Build the part that makes your product different, where your own choices matter."

  - question: "Your target is 99.9% availability. Roughly how much downtime does that allow per year?"
    options:
      - text: "About 52 minutes"
      - text: "About 3.65 days"
      - text: "None at all"
      - text: "About 8.8 hours"
        correct: true
    explanation: "0.1% of a year (8,760 hours) is about 8.76 hours. 99.99% would be about 52.6 minutes, and each extra nine usually costs far more to reach."

  - question: "Your company decides it can lose at most 15 minutes of orders if the database is destroyed. Which term describes this limit?"
    options:
      - text: "Recovery time objective (RTO)"
      - text: "Recovery point objective (RPO)"
        correct: true
      - text: "Availability"
      - text: "Latency"
    explanation: "RPO is the most data you're willing to lose, measured as time since the last recovery point. RTO is how long you can be down before service is restored."

  - question: "A new app with 3 developers and 200 users is being planned. What does Martin Fowler's \"monolith first\" advice suggest?"
    options:
      - text: "Start with microservices, so you never need to split later"
      - text: "Start with one well-organized app, learn where the real boundaries are, and split only when there's a clear reason"
        correct: true
      - text: "Never use microservices under any circumstances"
      - text: "Let the AI pick at random, since it doesn't matter"
    explanation: "Fowler observed that most successful microservice systems started as a monolith that grew too big. Good service boundaries are hard to see early, and changing them across services is expensive."

  - question: "Which of these is the strongest reason to pay a human expert to review your plan?"
    options:
      - text: "You want to rename a button"
      - text: "The AI's code has a typo"
      - text: "You're about to store health records and take payments, and you can't judge whether the AI's answer is right"
        correct: true
      - text: "You want a second opinion on a color"
    explanation: "Ask a human when a decision is hard to undo, involves regulated data or money, can hurt other people, or when you can't check the AI's answer yourself."
---

# The decisions your AI can't make for you

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Backup and restore:** a copy of your data you can bring back after a disaster, which only counts if you've tested restoring it. *([The AI deleted your production database. Now what?](/lessons/backups))*
> - **Horizontal scaling:** running more copies of your app behind a load balancer instead of buying a bigger server. *([Your app went viral. Will it survive?](/lessons/scaling))*
> - **Service and circuit breaker:** a separate program your app talks to over the network, and a switch that stops calling it while it's failing. *([One slow service took your whole app down](/lessons/circuit-breakers))*
> - **Eventual consistency:** copies of data that catch up a moment later, instead of instantly. *([When everything calls everything, everything breaks](/lessons/event-driven-architecture))*

## Two chats, two architectures

Maya is building an app for local bakeries to take pre-orders. On Monday she asks her AI: *"Design a scalable architecture for my app. It needs to handle millions of users."* She gets a detailed plan: eight services, Kafka between them, a separate search engine, event sourcing for orders, and a database copied into three regions.

On Tuesday, in a new chat, she asks: *"What's the simplest way to build a pre-order app for my bakery customers?"* She gets one server, one Postgres database, Stripe for payments, and a hosting platform that deploys from GitHub.

Both answers are well written. Both sound confident. They can't both be right for Maya.

Here's the uncomfortable truth: **neither chat was wrong.** Each answered the question it was given. "Millions of users" pulled the AI toward big-company patterns; "simplest" pulled it the other way. The AI doesn't know how many bakeries Maya has (four), her budget (her savings), her team (herself), or what an hour of downtime on a Saturday morning costs (four annoyed bakeries).

Those facts decide the architecture. Only Maya has them. This last lesson is about the decisions that depend on **your users, your money, your risk and your team**, and how to make them well with an AI at your side.

---

## The mental model: every choice is a trade

Every architecture decision buys something and pays for it with something else. You've seen this in every lesson of this level:

- A **cache** buys speed and pays with stale data.
- **Events** buy independence between parts and pay with eventual consistency.
- **Change data capture** buys fresh copies and pays with one more system to run.
- **Event sourcing** buys a full history and pays with complexity, forever.

Think of your AI as an architect who knows every building material in the world and its price. It can tell you that steel is strong and expensive, and wood is cheaper and warmer. It can't tell you how many children you have, what your budget is, or whether you're moving in two years. Ask it to design "a great house" without those facts, and you'll get a beautiful house for someone else.

**Where the comparison stops working:** a house is very hard to change once it's built. Software is easier to change, *but not equally easy everywhere*. Renaming a button is easy. Moving years of data out of a database, or splitting one app into ten, is not. Part of your job is knowing which decisions are which.

### Reversible and hard-to-reverse decisions

Amazon's Jeff Bezos wrote, in his 2016 letter to shareholders, that many decisions are reversible, like "two-way doors", and can be made with a light-weight process. Amazon calls the opposite a one-way door: a decision that is very hard, or even impossible, to walk back through if you get it wrong.

| Usually easy to reverse | Usually hard to reverse |
|---|---|
| Which UI library to use | Your main database and how data is shaped |
| A caching rule | Splitting into many services |
| Which email provider sends your emails | What personal data you collect and where it's stored |
| Adding a background job | Event sourcing as the source of truth |

Make two-way-door decisions quickly, and let your AI suggest them. Slow down for one-way doors. Those are where your facts matter most.

---

## Six decisions that need your facts

### 1. Build or buy?

With AI, building feels free: ask for a login system or a payment flow, and code appears in a minute. But the code is the cheapest part. You also pay for **running it forever**: security fixes, edge cases, the 2 a.m. bug.

Martin Fowler, a well-known writer on software design, separates software into **utility** and **strategic**. Utility software supports things every business needs, and doesn't make you different from competitors: buy it. Strategic software is what makes your product special: build it, and put your best effort there.

For most apps:

- **Buy:** login, payments, sending email, file storage, error monitoring
- **Build:** the thing your users come to you for

Before you buy, ask the business questions your AI can't answer: *What does it cost at 10 times our size? Can we export our data if we leave? What happens to us if this company raises prices or shuts down?*

### 2. Which data matters most?

Not all data deserves the same care. Rank yours by the harm of losing it or getting it wrong:

1. **Money and promises:** payments, balances, orders, bookings. Losing or doubling these hurts real people. Use transactions, idempotency, tested backups, and maybe a history table.
2. **Things users created:** posts, documents, photos. Losing these loses trust. Back them up and test restores.
3. **Things you can rebuild:** caches, search indexes, analytics copies. Losing them is inconvenient. Eventual consistency is fine here.

This ranking tells you where to spend effort. Maya's orders are level 1: she uses a transaction and Stripe's idempotency keys. Her bakery search box is level 3: an hourly copy is fine.

> **Go deeper:** [A customer got charged twice. How?](/lessons/charged-twice) (Level 4) covers protecting level-1 data with transactions.

### 3. What to protect first

You can't fix every security risk on day one. Order them by **how likely** and **how bad**. For most AI-built apps, the top of the list is the same:

1. Secrets out of the code and the browser
2. An ownership check on every route that reads or changes data
3. Verified webhooks and server-side prices for anything involving money
4. Backups you've actually restored
5. Rate limits on sign-up, login and anything that costs you money

What comes next depends on you. A children's app, a health app and a bakery app have very different worst cases. Write down yours: *"What's the worst thing that could happen with our data, and to whom?"*

### 4. How much downtime is acceptable?

"It should never go down" is not a real answer: every extra bit of reliability costs more. Reliability is usually written as **availability**: the share of time your app works. Here's what each level allows:

| Availability | Downtime per year | Per 30-day month |
|---|---|---|
| 99% | about 3.65 days | about 7.2 hours |
| 99.9% | about 8.8 hours | about 43 minutes |
| 99.99% | about 53 minutes | about 4.3 minutes |

Google's Site Reliability Engineering book, written by the team that keeps Google's services running, argues that 100% is the wrong target. Users often can't tell the difference between very high levels, because their own phone or network fails more often. And each extra "nine" can cost far more than the one before.

For disasters, two more numbers matter. AWS defines them like this:

- **Recovery time objective (RTO):** the longest acceptable time between the service breaking and the service being back.
- **Recovery point objective (RPO):** the most data you can accept losing, measured as time since the last recovery point.

AWS notes these are set by the organization, not the technology, and that a recovery plan costing more than the failure itself usually isn't worth it. So ask: *What does an hour of downtime cost us, and when does it hurt most?* For Maya, Saturday mornings matter and Tuesday nights don't. Daily backups and a one-hour RTO are plenty. A bank would answer very differently.

### 5. Monolith or microservices? Default to a monolith

A **monolith** is one app: one codebase, deployed as one unit, usually with one database. **Microservices** split the app into many small services, each deployed on its own, each with its own data, talking over the network.

Microservices buy real things: large teams can deploy their parts without waiting for each other, and busy parts can be scaled separately. They pay with almost everything in this level: network calls that fail and need circuit breakers, data spread across services that needs outboxes and events, eventual consistency, and bugs that cross five services and five sets of logs.

Fowler's advice, called **"monolith first"**, comes from what he observed: almost all successful microservice stories started as a monolith that grew too big and was split, while systems built as microservices from the start often ended up in serious trouble. One reason: good boundaries between services are hard to see early, and moving code between services is much harder than inside one app.

So the default is **one well-organized app**: clear folders or modules for each area (orders, payments, users), with those areas talking through clear functions instead of reaching into each other's tables. If one part one day really needs to become its own service, those clean lines make it possible.

> **Go deeper:** [Your app went viral. Will it survive?](/lessons/scaling) (Level 4) shows how far one app can scale before splitting is needed.

### 6. When to ask a human expert

Your AI is a brilliant assistant, and it can be confidently wrong. Pay for a human (a security reviewer, a senior engineer for an afternoon, a lawyer or an accountant) when:

- **The decision is hard to reverse:** a big data migration, your core data model, a vendor you'll be locked into
- **The data is regulated or sensitive:** health records, children's data, payment card details
- **Money or legal duties are involved:** taxes, refunds, contracts, privacy laws
- **Someone else could be harmed:** a security breach, or features that affect people's safety or money
- **You can't judge the answer:** if you can't tell whether the AI is right, you're guessing

An hour of an expert's time is cheap compared with a wrong one-way door.

---

## How it goes wrong

- **The AI decided, and nobody noticed.** The database, the hosting, the auth library: chosen in the first prompt, never questioned. Months later, nobody knows why.
- **Big-company architecture for a small app.** Kafka, Kubernetes (a system for running many programs across a group of machines) and ten services for 50 users. Every lesson in this level becomes your daily problem, with none of the benefits.
- **Leading questions.** "Design a *scalable* architecture" gets you complexity. "Is microservices the right call?" gets you agreement. The AI tends to follow your framing.
- **Decisions that don't survive the next chat.** You decided "one database, no microservices" in March. In May, a new AI session doesn't know and helpfully starts splitting things up.

---

## What good looks like: a decision process

1. **Write down your facts first.** Users today and in a year, budget, team size and skills, deadline, worst case for your data, cost of an hour of downtime.
2. **Ask for options, not an answer.** *"Here are my facts. Give me two or three options, what each costs us, and what would make you change your recommendation."*
3. **Sort by door.** Decide two-way doors quickly. Slow down for one-way doors.
4. **Pick the simplest option that meets your real needs**, not imagined ones.
5. **Write it down.** Michael Nygard's **architecture decision record (ADR)** is a short file for each important decision, with a title, the context, the decision, its status and its consequences, good and bad:

```text
# 003: One app and one Postgres database
Status: Accepted, 2026-03-02
Context: 1 developer, 4 bakeries, launch in 6 weeks.
Decision: A single app on a hosting platform. No microservices.
Consequences: Fast to build. Revisit when a second team joins.
```

Keep these files in your repository, and tell your AI to read them before suggesting big changes. Now the decision survives the next chat, the next developer and your own memory.

---

## Test it yourself

1. **Write your fact sheet.** One page: users, budget, team, deadline, worst-case data loss, cost of downtime.
2. **Find the decisions the AI made.** Ask: *"List every major technology choice in this project: database, hosting, login, payments, background jobs. For each, what are the main alternatives?"* Mark the ones you never really chose.
3. **Rank your data** into the three levels above. Check that level 1 has transactions and tested backups.
4. **Price your downtime.** Pick a target from the availability table and write your RTO and RPO. Check that your backups can actually meet them.
5. **Write your first ADR** for the most important decision you've already made.

---

## What you've learned

You started this course knowing how to use a browser and an AI chat. Here's the path you've walked.

**Level 1: Foundations.** How the web works from end to end: requests, servers, databases, and where your code and data live. You learned why the browser can't be trusted and how to undo a mistake. Key lessons: [You pressed Enter. What happened in the next second?](/lessons/what-happens-when-you-open-a-website), [A player scored 999,999 points by editing the page. How?](/lessons/frontend-and-backend), [Your app forgot everyone's messages overnight. Why?](/lessons/what-is-a-database) and [The AI broke your working app. Here's your undo button](/lessons/git-as-an-undo-button).

**Level 2: Builder.** Features that are safe and correct, and the security holes AI often leaves. Key lessons: [Change one number in the URL, see everyone's invoices](/lessons/logged-in-doesnt-mean-allowed), [How one line of text can dump your whole database](/lessons/sql-injection), [Your API key leaked, and strangers are spending your money](/lessons/api-key-ended-up-public) and [The AI deleted your production database. Now what?](/lessons/backups).

**Level 3: Shipping.** Running an app for real users: test it, deploy it safely, know when it breaks, and control costs. Key lessons: [Why you should never test on your real users](/lessons/dev-staging-production), [The AI fixed one bug and quietly broke three others](/lessons/tests-worth-writing), [Your app was down for six hours and nobody noticed](/lessons/logging-and-monitoring) and [The payment timed out. Did it go through?](/lessons/timeouts-and-retries).

**Level 4: Reliability & scale.** Staying fast and correct under real load and real money. Key lessons: [Fast with 100 users, frozen at 10,000. The missing index](/lessons/database-indexes), [A customer got charged twice. How?](/lessons/charged-twice), [Fast, but showing yesterday's data](/lessons/caching) and [Your app went viral. Will it survive?](/lessons/scaling).

**Level 5: Systems & architecture.** How bigger systems stay reliable when many parts talk to each other, and the trade-offs behind each pattern. Key lessons: [One slow service took your whole app down](/lessons/circuit-breakers), [When everything calls everything, everything breaks](/lessons/event-driven-architecture), [The order was saved, but the email never went out](/lessons/outbox-pattern), [Your search results are an hour out of date. Why?](/lessons/change-data-capture), [What if your database remembered everything that ever happened?](/lessons/event-sourcing) and [Two people typed in the same document at once. Who wins?](/lessons/collaborative-editing).

Your AI can write the code for every one of these. What it can't do is know your users, your money, your risks and your team. That part is yours now, and you're ready for it.

---

## Takeaways

**Key terms**
- **Trade-off:** buying one quality (speed, safety, flexibility) by paying with another (money, complexity, freshness)
- **Two-way and one-way doors:** decisions that are easy to reverse, and decisions that aren't
- **Utility vs strategic software:** what every business needs (buy it) vs what makes you different (build it)
- **Availability:** the share of time your app works, often written in "nines"
- **RTO and RPO:** the longest acceptable downtime, and the most data you can accept losing
- **Monolith and microservices:** one app deployed as a unit, vs many small services deployed separately
- **Architecture decision record (ADR):** a short file recording one decision, why it was made, and its consequences

**Red flags**
- An architecture plan that never asked how many users, how much money or how many developers you have
- Microservices, Kafka or Kubernetes for a small team and a small app
- Building login, payments or encryption yourself
- "It must never go down", with no cost attached
- No written record of why the big choices were made
- A one-way-door decision made in a single chat, in five minutes

**Ask your AI**
- *"Before you suggest an architecture, ask me about my users, budget, team, deadline and how bad downtime or data loss would be. Then give me two or three options with their trade-offs."*
- *"Which decisions in this plan would be hard to reverse later? For each, what would we lose by choosing the simpler option now?"*
- *"Write an architecture decision record for this choice, including the negative consequences."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Error budgets.** Google's SRE book turns an availability target into a budget. If the target is 99.9%, the remaining 0.1% is an "error budget" the team is allowed to spend. While there's budget left, the team can ship new features quickly. When it's used up, releases slow down until reliability improves. This turns "reliability vs new features" from an argument into a number both sides share.

**Measuring availability.** The SRE book notes that Google often measures availability as the share of successful requests rather than uptime, because large distributed services are rarely completely down. For a small app, "share of successful requests" from your monitoring is usually more honest than "was the server running".

**Time changes the answer.** AWS points out that the impact of downtime can depend on timing: a payroll system failing just before payday is far worse than just after. Maya's Saturday mornings are the same idea. Your targets can follow your users' busy times.

**The modular monolith.** A monolith with strict internal boundaries is often called a modular monolith. Each module owns its own tables, and other modules use its functions instead of querying those tables directly. It keeps most of a monolith's simplicity while leaving the door open to splitting later.

**Superseding decisions.** In Nygard's format, when a decision changes, you don't delete the old ADR. You mark it "superseded" and link to the new one, so the history of your thinking stays visible, a small version of the idea from event sourcing.

</details>

## References

- [MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html): Martin Fowler, 2015. Successful microservice systems usually started as a monolith; systems built as microservices from scratch often ended in serious trouble; boundaries are hard to get right early.
- [UtilityVsStrategicDichotomy](https://martinfowler.com/bliki/UtilityVsStrategicDichotomy.html): Martin Fowler, 2010. Utility vs strategic software, and buying the former while building the latter.
- [Embracing Risk](https://sre.google/sre-book/embracing-risk/): Google, Site Reliability Engineering book. 100% is the wrong target, users can't tell very high availability levels apart, each extra nine costs much more, 99.99% allows about 52.56 minutes a year, request-based availability, and error budgets.
- [Business Continuity Plan (BCP)](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/business-continuity-plan-bcp.html): AWS whitepaper, Disaster Recovery of Workloads on AWS. Definitions of RTO and RPO, set by the organization, time-dependent impact, and not spending more on recovery than the failure costs.
- [2016 Letter to Shareholders](https://www.aboutamazon.com/news/company-news/2016-letter-to-shareholders): Amazon. Many decisions are reversible "two-way doors" that can use a light-weight process.
- [2024 Letter to Shareholders](https://www.aboutamazon.com/news/company-news/amazon-ceo-andy-jassy-2024-letter-to-shareholders): Amazon (Andy Jassy). Amazon's two-way and one-way door decisions, and a one-way door as one that is very hard or impossible to walk back through.
- [Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions): Michael Nygard, Cognitect, 2011. The architecture decision record format: title, context, decision, status and consequences, and superseding old decisions.
