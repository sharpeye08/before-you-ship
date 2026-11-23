---
title: "What if your database remembered everything that ever happened?"
slug: event-sourcing
order: 64
level: 5
levelName: Systems & architecture
concepts: [Event sourcing, Event store, Replaying events, Projections, CQRS, Event versioning]
readTime: 14 min
quiz:
  - question: "A wallet app stores one row per user with a balance column, and updates it on every payment. A customer asks why their balance went from $120 to $0 last week. What is the problem?"
    options:
      - text: "The database is too slow to answer"
      - text: "Each update replaced the old balance, so the app no longer knows what happened"
        correct: true
      - text: "Balances should be stored as text"
      - text: "The customer needs to log in again"
    explanation: "A normal table keeps only the current value. Every update overwrites the one before it, so the history is gone unless you saved it somewhere else."

  - question: "In an event-sourced wallet, how does the app find the current balance?"
    options:
      - text: "It reads a balance column that is updated in place"
      - text: "It asks the bank"
      - text: "It replays the wallet's events in order, such as deposits and withdrawals, and adds them up"
        correct: true
      - text: "It reads the most recent event only"
    explanation: "In event sourcing, the events are the source of truth. The current state is calculated by replaying them, often with snapshots or projections so it doesn't have to start from the beginning every time."

  - question: "A bug recorded a deposit of $500 that should have been $50. What is the right fix in an event-sourced system?"
    options:
      - text: "Append a new event that corrects it, and fix the bug in the code"
        correct: true
      - text: "Edit the old event to say $50"
      - text: "Delete the whole wallet's history"
      - text: "Nothing, because events can't be wrong"
    explanation: "Events are a permanent record, so you don't edit them. You add a correcting event, which also leaves a clear history of what went wrong and how it was fixed."

  - question: "Your app shows a list of all wallets with more than $1,000. Replaying every wallet's events for each page load is too slow. What is the usual solution?"
    options:
      - text: "Stop using events and delete them"
      - text: "Cache the page for a day"
      - text: "Show only one wallet at a time"
      - text: "A projection: a normal table kept up to date from the events, made for this kind of read"
        correct: true
    explanation: "A projection (or read model) listens to events and keeps a table shaped for reading. If it's ever wrong, you can delete it and rebuild it by replaying the events."

  - question: "A user deletes their account and asks you to erase their personal data. Their name and email are written inside years of events that should never change. What is a common approach?"
    options:
      - text: "Tell the user it's impossible"
      - text: "Store personal data outside the events and refer to it by ID, or encrypt it with a key per person and delete the key"
        correct: true
      - text: "Rewrite every event by hand"
      - text: "Rename the user to \"Deleted\" in the newest event only"
    explanation: "Append-only events conflict with deleting personal data. Keeping that data outside the events, or making it unreadable by deleting its key (crypto-shredding), solves this without breaking the event history."

  - question: "You're building a simple to-do app for a weekend project. A friend says you should use event sourcing and CQRS. What's the best answer?"
    options:
      - text: "Yes, every serious app needs them"
      - text: "Yes, because they make apps faster"
      - text: "Only if the AI suggests it"
      - text: "Probably not: a normal database with an optional history table is simpler and enough"
        correct: true
    explanation: "Martin Fowler and Microsoft both warn that these patterns add a lot of complexity. They pay off for parts of a system that truly need full history, like a ledger, not for simple apps."
---

# What if your database remembered everything that ever happened?

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Transaction:** a group of database changes that succeed or fail together. *([A customer got charged twice. How?](/lessons/charged-twice))*
> - **Event and eventual consistency:** a message that says "this happened", and copies of data that catch up a moment later instead of instantly. *([When everything calls everything, everything breaks](/lessons/event-driven-architecture))*
> - **Idempotent:** doing something twice has the same effect as doing it once. *([The payment timed out. Did it go through?](/lessons/timeouts-and-retries))*
> - **Change data capture (CDC):** reading every change from the database's own log and sending it to other systems. *([Your search results are an hour out of date. Why?](/lessons/change-data-capture))*

## "Where did my $120 go?"

You built a small wallet app with AI. Users add money, pay friends and withdraw. The database has a `wallets` table, and each wallet has one row:

| id | owner | balance | updated_at |
|---|---|---|---|
| w1 | Ana | 0 | 2026-03-14 09:12 |

One morning, Ana writes to support: *"Last week I had $120. Now it says $0. What happened?"*

You open the database. The row says `balance = 0`. That's all it says. It doesn't say whether Ana paid a friend, withdrew to her bank, or whether a bug set it to zero. Each payment ran an `UPDATE` that replaced the old balance with a new one. The database did its job: it kept the **current state**. The past was thrown away, one update at a time.

Now imagine a database that never threw anything away. Instead of "the balance is 0", it kept every step: opened, $120 added, $20 paid to Ben, $100 withdrawn. You could answer Ana in one minute. You could even say what her balance was at any moment last week.

That idea has a name: **event sourcing**. This lesson explains how it works, what it gives you, and why most apps, probably including yours, shouldn't use it everywhere.

---

## The mental model: a bank statement

Your bank doesn't only store "balance: $430". It keeps a list of every deposit and every payment, in order. Your balance is the sum of that list. If the bank ever doubted the number, it could add the list up again from the beginning.

That's event sourcing: **store every change as an event, in order, and treat that list as the truth.** The current state is something you calculate from it.

- An **event** is a fact about something that already happened, named in the past tense: `MoneyDeposited`, `MoneyWithdrawn`, `WalletClosed`.
- Events are stored in an **event store**: a list you only ever add to at the end, never edit and never delete from. This is called **append-only**.
- All the events for one thing, such as one wallet, form its **stream**.
- Calculating the current state by running through the events is called **replaying** them.

**Where the comparison stops working:** a bank chooses for you what a "transaction" is. In your app, you design the events yourself, and that's harder than it sounds. A good event says *why* something changed (`MoneyPaidToFriend`), not only the new value (`BalanceChanged`).

You've already met this idea twice. Git keeps every commit, so you can see every change ever made and go back to any point. (Martin Fowler, a well-known writer on software design, names version control as a common example of event sourcing, although Git actually saves a full snapshot of your files in each commit, not only the change.) And the database's write-ahead log from [Your search results are an hour out of date. Why?](/lessons/change-data-capture) is a list of changes the database can replay after a crash. Event sourcing brings the same idea up to your app's own data.

### What it looks like in code

Ana's wallet, as a stream of events:

```js
const events = [
  { type: "WalletOpened",   walletId: "w1" },
  { type: "MoneyDeposited", walletId: "w1", amount: 120 },
  { type: "MoneyPaid",      walletId: "w1", amount: 20, to: "ben" },
  { type: "MoneyWithdrawn", walletId: "w1", amount: 100 },
];
```

Four facts, in the order they happened. Nothing is ever overwritten. Ana's question has an answer: she paid Ben $20 and withdrew $100.

To get the balance, you replay the events:

```js
function balanceOf(events) {
  let balance = 0;
  for (const e of events) {
    if (e.type === "MoneyDeposited") balance += e.amount;
    if (e.type === "MoneyPaid" || e.type === "MoneyWithdrawn") balance -= e.amount;
  }
  return balance;
}
```

Start at 0, then go through the events one by one: add deposits, subtract payments and withdrawals. For Ana: 0 + 120 − 20 − 100 = 0. Stop the loop early, at an event from last Tuesday, and you get her balance last Tuesday.

### Making a change

In a normal app, a withdrawal is an `UPDATE`. In an event-sourced app, it's three steps: load the stream, check the rules, append a new event.

```js
async function withdraw(walletId, amount) {
  const events = await store.read(walletId);
  if (balanceOf(events) < amount) throw new Error("Not enough money");
  await store.append(walletId, { type: "MoneyWithdrawn", walletId, amount }, {
    expectedVersion: events.length, // refuse if anyone appended meanwhile
  });
}
```

`store` is a placeholder for an event store library or your own append-only table; real libraries have their own names for these options. `expectedVersion` handles a race. Ana's phone and laptop both try to withdraw $100 at the same moment, and both read 4 events. The first append succeeds and the stream now has 5 events. The second append says "I expected 4", the store refuses, and the code can reload and check the balance again. This is called **optimistic concurrency**: don't lock anything, but refuse a write if the data changed since you read it.

> **Go deeper:** [Two transactions, one wrong answer](/lessons/isolation-levels) (Level 4) covers the same kind of race in a normal database.

---

## Reading fast: projections and CQRS

Replaying events works well for one wallet. But your app also needs pages like "all wallets with more than $1,000" or "total deposits today". Replaying every wallet's history on every page load would be far too slow.

So event-sourced apps keep **projections** (also called **read models**): normal tables, built from the events and shaped for one kind of question. A small program listens to new events and updates them:

```js
// Runs for every new event, in order
async function updateBalances(e) {
  const delta = { MoneyDeposited: e.amount, MoneyPaid: -e.amount, MoneyWithdrawn: -e.amount }[e.type];
  if (delta === undefined) return;
  await db.query(
    `UPDATE wallet_balances SET balance = balance + $1, last_event = $2
     WHERE wallet_id = $3 AND last_event < $2`, [delta, e.position, e.walletId]);
}
```

For each money event, it adds or subtracts the amount in a `wallet_balances` table. (This assumes another handler, not shown, creates the wallet's row with `last_event = 0` when `WalletOpened` arrives.) Each event has a `position`, its place in the stream, and the table remembers the last one it applied (`last_event`). If the same event arrives twice, `last_event < $2` is false and nothing changes, so the handler is idempotent. Your pages read `wallet_balances` with ordinary SQL, as fast as any other app.

Two things make projections special:

1. **They can be thrown away.** The events are the truth. If a projection has a bug, fix the code, delete the table and replay all the events to rebuild it.
2. **You can add new ones later, with full history.** Six months in, you want a "spending per month" chart. You write a new projection and replay every event since day one. The chart is complete from the first day, even though you never planned it.

### CQRS in simple terms

This split has a name: **CQRS**, short for **Command Query Responsibility Segregation**. Ignore the long name. It means: **use one model for changing data, and a different model for reading it.**

- A **command** asks to change something: "withdraw $100". It goes to the write side: here, the event store and its rules.
- A **query** asks a question: "show my balance". It goes to the read side: here, the projections.

CQRS doesn't need event sourcing; any app can separate its write and read models. But event sourcing is almost always used with CQRS, because the event store is good at recording changes and bad at answering questions.

The price is **eventual consistency**. The projection updates a moment after the event is saved. Ana withdraws $100 and, for a brief moment, her balance page may still show $100. Design for it: for example, show the result of the withdrawal from the command's own answer, instead of reading the projection straight away.

---

## What you get

- **A full audit trail.** Every change, in order, with its reason. For money, medical records or anything regulated, "what happened and when?" has a real answer.
- **Time travel.** Replay up to any moment to see the state back then. Fowler calls this a **temporal query**.
- **Better debugging.** A user reports a strange balance. Copy their events to your laptop, replay them and watch the bug happen, step by step.
- **New reports from old data**, by building new projections from the full history.
- **Intent, not only values.** `MoneyPaid { to: "ben" }` tells you much more than `balance changed to 100`.

---

## How it goes wrong

Those benefits are real. So are the costs, and they're why both Fowler and Microsoft's architecture guidance warn against using these patterns by default. Microsoft's Event Sourcing page says that for most systems, and most parts of a system, traditional data management is enough.

### Cost 1: Everything gets more complicated

Simple questions become projects. "How many users have more than $1,000?" needs a projection. There's no `UPDATE` to fix a typo. Every new developer, and every AI session, must learn how your events, projections and replays fit together. Microsoft notes it's costly to move to or away from event sourcing, and that it limits later design choices. Fowler says that for most systems, CQRS "adds risky complexity".

### Cost 2: Events are forever, but their shape changes

In year one, `MoneyDeposited` has `amount: 120`, in dollars. In year two, you switch to cents to avoid rounding errors: `amount: 12000`. You can't rewrite the old events; they're the permanent record. So your replay code must understand **every version of every event ever written**, forever.

Common strategies:

- Add a **version number** to each event, and handle each version.
- Make readers **tolerant**: ignore unknown fields and use defaults for missing ones.
- **Upcast**: convert old events to the newest shape while reading them, so the rest of the code sees only one version.

With a normal table, you'd run one migration and move on.

### Cost 3: Mistakes stay in the history

If a bug writes a deposit of $500 instead of $50, fixing the code doesn't fix the event. You append a **compensating event**, one that cancels or corrects an earlier one, like `DepositCorrected { amount: -450 }`. That's honest and traceable, but every bug now needs a data repair plan too.

### Cost 4: Deleting personal data

Many privacy laws give people the right to have their personal data deleted, often called the **right to be forgotten**. An append-only store that never deletes anything conflicts with that directly. If Ana's name and email are inside thousands of events, you can't just remove them. Common answers:

- **Keep personal data out of events.** Store it in a normal table and put only Ana's ID in events. Delete the row, and the events no longer point to a person.
- **Crypto-shredding.** Encrypt each person's data in the events with their own key. To "delete" it, delete the key. The events stay, but that data can never be read again.

Both must be designed from the start. Adding them later means rewriting history you promised never to rewrite.

### Cost 5: Replays that repeat side effects

When you rebuild a projection, you replay old events. If an event handler sends emails or charges cards, a replay sends 10,000 old emails. Keep side effects out of replays, and make handlers idempotent, because events can be delivered more than once.

---

## What good looks like: use it where history is the product

Most apps need history for **a few tables**, not a whole new architecture. Ask:

| Question | If yes |
|---|---|
| Do I only need to answer "who changed what, when"? | Add a **history table** next to your normal tables |
| Is the history itself the core of the product (a ledger, bookings, medical records)? | Consider event sourcing **for that part only** |
| Is this a prototype, a simple app, or a team new to events? | Use a normal database |

A history table is often enough. In the same transaction as each change, insert a row describing it:

```sql
BEGIN;
UPDATE wallets SET balance = balance - 20 WHERE id = 'w1';
INSERT INTO wallet_history (wallet_id, change, reason, actor_id, at)
VALUES ('w1', -20, 'paid ben', 'u17', now());
COMMIT;
```

Both rows are saved together, or neither is. The difference from event sourcing: here the `wallets` table is still the truth, and history is a record beside it. That's a lot simpler, and it answers Ana's question.

If you do adopt event sourcing, Microsoft's advice is to use it only in the parts that benefit most, such as a payment ledger, and keep plain tables for things like user profiles and settings. Prefer a purpose-built event store or a well-tested library: Microsoft notes that with a plain database table, you must build features like reading one stream and optimistic concurrency yourself. Design your event names, versioning and personal-data plan before the first event is written.

> **Go deeper:** [The decisions your AI can't make for you](/lessons/decisions-ai-cant-make) (Level 5) is about making exactly this kind of trade-off.

---

## Test it yourself

1. **The Ana test.** Pick the most important table in your app, such as orders, balances or bookings. Change one record twice. Now try to find out what its first value was, and who changed it. If you can't, decide whether a customer or your future self will ever need that answer.
2. **Name your events.** Write down, in the past tense, the five to ten things that happen in your app's main flow: `OrderPlaced`, `PaymentReceived`, `OrderShipped`. Even if you never use event sourcing, this list is a great way to understand your own app, and a great prompt for your AI.
3. **Find the personal data.** For each event or history row you'd store, mark which fields are personal. Those are the fields that must be deletable.

---

## Takeaways

**Key terms**
- **Event sourcing:** storing every change as an event and treating the list of events as the truth
- **Event store and stream:** the append-only list of events, and the events for one thing
- **Replaying:** calculating the current state by going through the events in order
- **Projection (read model):** a normal table built from the events, made for fast reading, that can be rebuilt
- **CQRS:** using one model to change data (commands) and another to read it (queries)
- **Compensating event:** a new event that corrects or cancels an earlier one
- **Upcasting:** converting old event shapes to the current shape while reading them

**Red flags**
- Event sourcing suggested for a simple app "because it's best practice"
- Code that edits or deletes old events
- Names, emails or addresses written straight into events, with no deletion plan
- Event handlers that send emails or charge cards during a replay
- No version number or plan for changing event shapes
- Pages that break because a projection is a moment behind

**Ask your AI**
- *"Which tables in my app would I need history for, to answer a customer asking 'what happened to my data?' Suggest the simplest way to keep that history."*
- *"I'm considering event sourcing for this part of my app. List what it would cost us in complexity, event versioning and deleting personal data, and suggest a simpler alternative."*
- *"Review my event handlers: are they idempotent, and do any of them cause side effects when events are replayed?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Snapshots.** A wallet with 50,000 events is slow to replay. Systems save a **snapshot**, the calculated state at, say, every 100th event. To load the wallet, start from the latest snapshot and replay only the events after it. Snapshots are only a speed-up; the events stay the truth, and snapshots can be recreated.

**Event store vs message broker.** Kafka keeps a log of events, so it's tempting to use it as your event store. Microsoft's guidance warns against this: brokers usually can't read one entity's stream on its own or refuse an append when the stream changed (optimistic concurrency). Use a broker to share events with other systems, and a real event store (a purpose-built database, or a carefully designed append-only table) to hold the truth.

**CDC events vs domain events.** CDC gives you low-level row changes: "column `stock` went from 3 to 0". Event sourcing stores business facts: "two shoes were sold to order 981". Microsoft's example is the difference between "two seats were reserved" and "remaining seats changed to 42": the first says what happened, the second only the result.

**Testing.** Event-sourced logic is easy to test in a "given, when, then" style: *given* these past events, *when* this command runs, *then* expect these new events. No database needed. You still need tests for projections, duplicate events and old event versions.

**External systems during replay.** Fowler's article describes wrapping calls to other systems in "gateways" that do nothing during a replay, and recording answers from other systems so a replay uses the same answers instead of today's ones.

</details>

## References

- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html): Martin Fowler. Capturing all changes as a sequence of events, complete rebuilds, temporal queries, accounting and version control as examples, and handling external systems during replay.
- [CQRS](https://martinfowler.com/bliki/CQRS.html): Martin Fowler. Using a different model to update than to read, its fit with event sourcing, and the warning that for most systems it adds risky complexity.
- [Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing): Microsoft Azure Architecture Center. Append-only stores, replay, materialized views, optimistic concurrency, compensating events, event versioning and upcasting, personal data and crypto-shredding, snapshots, and when not to use the pattern.
- [CQRS pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs): Microsoft Azure Architecture Center. Commands and queries, separate read and write models, eventual consistency, and when the pattern isn't suitable.
