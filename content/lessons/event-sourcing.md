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
    explanation: "A normal table keeps only the current value. Every update overwrites the value before it. So the history is gone, unless you saved it somewhere else."

  - question: "In an event-sourced wallet, how does the app find the current balance?"
    options:
      - text: "It reads a balance column that is updated in place"
      - text: "It asks the bank"
      - text: "It replays the wallet's events in order, such as deposits and withdrawals, and adds them up"
        correct: true
      - text: "It reads the most recent event only"
    explanation: "In event sourcing, the events are the source of truth. The app calculates the current state by replaying them. Snapshots or projections often save it from a start at the beginning every time."

  - question: "A bug recorded a deposit of $500 that should have been $50. What is the right fix in an event-sourced system?"
    options:
      - text: "Append a new event that corrects it, and fix the bug in the code"
        correct: true
      - text: "Edit the old event to say $50"
      - text: "Delete the whole wallet's history"
      - text: "Nothing, because events can't be wrong"
    explanation: "Events are a permanent record, so you don't edit them. You add a correcting event. This also leaves a clear history of what went wrong and how you fixed it."

  - question: "Your app shows a list of all wallets with more than $1,000. A replay of every wallet's events for each page load is too slow. What is the usual solution?"
    options:
      - text: "Stop using events and delete them"
      - text: "Cache the page for a day"
      - text: "Show only one wallet at a time"
      - text: "A projection: a normal table kept up to date from the events, made for this kind of read"
        correct: true
    explanation: "A projection (or read model) listens to events and keeps a table shaped for reading. If it is ever wrong, you can delete it and build it again by replaying the events."

  - question: "A user deletes their account and asks you to erase their personal data. Their name and email are inside years of events that should never change. What is a common approach?"
    options:
      - text: "Tell the user it's impossible"
      - text: "Store personal data outside the events and refer to it by ID, or encrypt it with a key per person and delete the key"
        correct: true
      - text: "Rewrite every event by hand"
      - text: "Rename the user to \"Deleted\" in the newest event only"
    explanation: "Append-only events conflict with the deletion of personal data. You can keep that data outside the events. Or you can make it unreadable by deleting its key (crypto-shredding). Both keep the event history intact."

  - question: "You're building a simple to-do app for a weekend project. A friend says you should use event sourcing and CQRS. What's the best answer?"
    options:
      - text: "Yes, every serious app needs them"
      - text: "Yes, because they make apps faster"
      - text: "Only if the AI suggests it"
      - text: "Probably not: a normal database with an optional history table is simpler and enough"
        correct: true
    explanation: "Martin Fowler and Microsoft both warn that these patterns add a lot of complexity. They are worth it for parts of a system that truly need full history, like a ledger. They are not worth it for simple apps."
---

# What if your database remembered everything that ever happened?

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Transaction:** a group of database changes that succeed or fail together. *([A customer got charged twice. How?](/lessons/charged-twice))*
> - **Event and eventual consistency:** a message that says "this happened", and copies of data that catch up a moment later, not at once. *([When everything calls everything, everything breaks](/lessons/event-driven-architecture))*
> - **Idempotent:** if you do something twice, the effect is the same as once. *([The payment timed out. Did it go through?](/lessons/timeouts-and-retries))*
> - **Change data capture (CDC):** a tool reads every change from the database's own log and sends it to other systems. *([Your search results are an hour out of date. Why?](/lessons/change-data-capture))*

## "Where did my $120 go?"

You built a small wallet app with AI. Users add money, pay friends and withdraw. The database has a `wallets` table, and each wallet has one row:

| id | owner | balance | updated_at |
|---|---|---|---|
| w1 | Ana | 0 | 2026-03-14 09:12 |

One morning, Ana writes to support: *"Last week I had $120. Now it says $0. What happened?"*

You open the database. The row says `balance = 0`, and nothing more. It does not say if Ana paid a friend or withdrew to her bank. It does not say if a bug set it to zero. Each payment ran an `UPDATE` that replaced the old balance with a new one.

The database did its job: it kept the **current state**. It threw away the past, one update at a time.

Now imagine a database that never threw anything away. It kept every step: opened, $120 added, $20 paid to Ben, $100 withdrawn. You could answer Ana in one minute. You could even say what her balance was at any moment last week.

That idea has a name: **event sourcing**. This lesson explains how it works and what it gives you. It also explains why most apps, probably including yours, should not use it everywhere.

---

## The mental model: a bank statement

Your bank does not store only "balance: $430". It keeps a list of every deposit and every payment, in order. Your balance is the sum of that list. If the bank ever doubted the number, it could add up the list again from the beginning.

That is event sourcing: **store every change as an event, in order, and treat that list as the truth.** You calculate the current state from the list.

- An **event** is a fact about something that already happened. Its name uses the past tense: `MoneyDeposited`, `MoneyWithdrawn`, `WalletClosed`.
- The **event store** keeps the events. It is a list that you only add to at the end. You never edit it and never delete from it. This is called **append-only**.
- All the events for one thing, such as one wallet, form its **stream**.
- To **replay** events is to run through them in order and calculate the current state.

![Top: a normal table keeps only balance 0, because each update overwrote the old value. Bottom: an event store keeps every step, and a replay of the four events gives the same balance of 0.](/diagrams/event-sourcing-1.svg)

**Where the comparison stops working:** a bank decides for you what a "transaction" is. In your app, you design the events yourself, and that is harder than it sounds. A good event says *why* something changed (`MoneyPaidToFriend`), not only the new value (`BalanceChanged`).

You already met this idea twice. First, Git keeps every commit (a saved version of your code). So you can see every change and go back to any point. Martin Fowler, a well-known writer on software design, names version control as a common example of event sourcing. In fact, Git saves a full snapshot of your files in each commit, not only the change.

Second, the database's write-ahead log from [Your search results are an hour out of date. Why?](/lessons/change-data-capture) is a list of changes. The database can replay it after a crash. Event sourcing brings the same idea to your app's own data.

### What it looks like in code

Ana's wallet is a stream of events:

```js
const events = [
  { type: "WalletOpened",   walletId: "w1" },
  { type: "MoneyDeposited", walletId: "w1", amount: 120 },
  { type: "MoneyPaid",      walletId: "w1", amount: 20, to: "ben" },
  { type: "MoneyWithdrawn", walletId: "w1", amount: 100 },
];
```

These are four facts, in order. Nothing is overwritten. Ana's question has an answer: she paid Ben $20 and withdrew $100.

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

Start at 0, then go through the events one by one. Add deposits, and subtract payments and withdrawals. For Ana: 0 + 120 − 20 − 100 = 0. If you stop the loop early, at an event from last Tuesday, you get her balance last Tuesday.

### Making a change

In a normal app, a withdrawal is an `UPDATE`. In an event-sourced app, it has three steps: load the stream, check the rules, and append a new event.

```js
async function withdraw(walletId, amount) {
  const events = await store.read(walletId);
  if (balanceOf(events) < amount) throw new Error("Not enough money");
  await store.append(walletId, { type: "MoneyWithdrawn", walletId, amount }, {
    expectedVersion: events.length, // refuse if anyone appended meanwhile
  });
}
```

`store` is a placeholder for an event store library or your own append-only table. Real libraries have their own names for these options.

`expectedVersion` handles a race (two actions at the same time that get in each other's way). Say Ana's phone and laptop both try to withdraw $100 at the same moment. Both read 4 events.

The first append succeeds, and the stream now has 5 events. The second append says "I expected 4", so the store refuses it. The code can load the stream again and check the balance again. This is called **optimistic concurrency**: lock nothing, but refuse a write if the data changed after you read it.

> **Go deeper:** [Two transactions, one wrong answer](/lessons/isolation-levels) (Level 4) covers the same kind of race in a normal database.

---

## Reading fast: projections and CQRS

A replay works well for one wallet. But your app also needs pages like "all wallets with more than $1,000" or "total deposits today". A replay of every wallet's history on every page load is much too slow.

So event-sourced apps keep **projections** (also called **read models**). A projection is a normal table, built from the events and shaped for one kind of question. A small program listens to new events and updates it:

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

For each money event, it adds or subtracts the amount in a `wallet_balances` table. (This code assumes that another handler, not shown, creates the wallet's row with `last_event = 0` when `WalletOpened` arrives.)

Each event has a `position`, its place in the stream. The table remembers the last position it applied (`last_event`). If the same event arrives twice, `last_event < $2` is false and nothing changes. So the handler is idempotent. Your pages read `wallet_balances` with ordinary SQL, as fast as any other app.

Two things make projections special:

1. **You can throw them away.** The events are the truth. If a projection has a bug, fix the code, delete the table, and replay all the events to build it again.
2. **You can add new ones later, with full history.** After six months, you want a "spending per month" chart. You write a new projection and replay every event since day one. The chart is complete from the first day, but you never planned it.

### CQRS in simple terms

This split has a name: **CQRS**, short for **Command Query Responsibility Segregation**. It means: **use one model to change data, and a different model to read it.**

- A **command** asks to change something: "withdraw $100". It goes to the write side. Here, that is the event store and its rules.
- A **query** asks a question: "show my balance". It goes to the read side. Here, that is the projections.

![A command goes to the write side, which checks the rules and appends an event to the event store. The projection updater reads new events and updates the projection table. A query reads from the projection table.](/diagrams/event-sourcing-2.svg)

CQRS does not need event sourcing. Any app can separate its write model and its read model. But teams almost always use event sourcing with CQRS, because the event store is bad at answering questions.

The price is **eventual consistency**. The projection updates a moment after the event store saves the event. Ana withdraws $100, and for a short moment, her balance page can still show $100. Design for this. For example, show the result of the withdrawal from the command's own answer. Do not read the projection right away.

---

## What you get

- **A full audit trail** (a record of every change). You have every change, in order, with its reason. For money, medical records or anything with legal rules, "what happened and when?" has a real answer.
- **Time travel.** Replay up to any moment to see the state at that time. Fowler calls this a **temporal query**.
- **Better debugging.** A user reports a strange balance. Copy their events to your laptop, replay them, and watch the bug happen.
- **New reports from old data**, from new projections built from the full history.
- **Intent, not only values.** `MoneyPaid { to: "ben" }` tells you much more than `balance changed to 100`.

---

## How it goes wrong

Those benefits are real. So are the costs. Because of them, both Fowler and Microsoft's architecture guidance warn against these patterns by default. Microsoft's Event Sourcing page says that traditional data management is enough for most systems, and for most parts of a system.

### Cost 1: Everything gets more complicated

"How many users have more than $1,000?" needs a projection. There is no `UPDATE` to fix a typo. Every new developer, and every AI session, must learn how your events, projections and replays fit together. Microsoft notes that a move to or away from event sourcing is costly, and that it limits later design choices. Fowler says that for most systems, CQRS "adds risky complexity".

### Cost 2: Events are forever, but their shape changes

In year one, `MoneyDeposited` has `amount: 120`, in dollars. In year two, you change to cents to avoid rounding errors: `amount: 12000`. You cannot rewrite the old events, because they are the permanent record. So your replay code must understand **every version of every event ever written**, forever.

Common strategies:

- Add a **version number** to each event, and handle each version.
- Make readers **tolerant**: ignore unknown fields and use defaults for missing ones.
- **Upcast**: change old events to the newest shape while you read them. Then the rest of the code sees only one version.

With a normal table, you run one migration (a script that changes the table) and continue.

### Cost 3: Mistakes stay in the history

Say a bug writes a deposit of $500 instead of $50. A fix to the code does not fix the event. You append a **compensating event**: a new event that cancels or corrects an earlier one, like `DepositCorrected { amount: -450 }`. That is honest and easy to trace. But every bug now needs a plan to repair the data too.

### Cost 4: Deleting personal data

Many privacy laws give people the right to have their personal data deleted. This is often called the **right to be forgotten**. An append-only store never deletes anything, so it conflicts with that right. If Ana's name and email are inside thousands of events, you cannot remove them easily. Common answers:

- **Keep personal data out of events.** Store it in a normal table, and put only Ana's ID in events. Delete the row, and the events no longer point to a person.
- **Crypto-shredding.** Encrypt (scramble with a secret key) each person's data in the events, with a key for that person. To "delete" the data, delete the key. The events stay, but nobody can read that data again.

You must design both from the start. If you add them later, you must rewrite the history that you promised never to rewrite.

### Cost 5: Replays that repeat side effects

A side effect is an action outside your data, like an email or a card charge. When you build a projection again, you replay old events. If an event handler sends emails or charges cards, a replay sends 10,000 old emails. Keep side effects out of replays. Also make handlers idempotent, because events can arrive more than once.

---

## What good looks like: use it where history is the product

Most apps need history for **a few tables**, not a new architecture. Ask:

| Question | If yes |
|---|---|
| Do I only need to answer "who changed what, when"? | Add a **history table** next to your normal tables |
| Is the history itself the core of the product (a ledger, bookings, medical records)? | Consider event sourcing **for that part only** |
| Is this a prototype, a simple app, or a team new to events? | Use a normal database |

(A **ledger** is a list of every movement of money.) A history table is often enough. In the same transaction as each change, insert a row that describes the change:

```sql
BEGIN;
UPDATE wallets SET balance = balance - 20 WHERE id = 'w1';
INSERT INTO wallet_history (wallet_id, change, reason, actor_id, at)
VALUES ('w1', -20, 'paid ben', 'u17', now());
COMMIT;
```

The database saves both rows together, or neither. Here is the difference from event sourcing: the `wallets` table is still the truth, and the history is a record next to it. That is much simpler, and it answers Ana's question.

If you do use event sourcing, Microsoft's advice is to use it only in the parts that benefit most, such as a payment ledger. Keep plain tables for things like user profiles and settings. Use a purpose-built event store or a well-tested library. Microsoft notes that with a plain database table, you must build some features yourself, such as reading one stream and optimistic concurrency. Design your event names, versions and personal-data plan before you write the first event.

> **Go deeper:** [The decisions your AI can't make for you](/lessons/decisions-ai-cant-make) (Level 5) is about this kind of trade-off.

---

## Test it yourself

1. **The Ana test.** Pick the most important table in your app, such as orders, balances or bookings. Change one record twice. Now try to find its first value, and who changed it. If you cannot, decide if a customer or your future self will ever need that answer.
2. **Name your events.** Write down the five to ten things that happen in your app's main flow. Use the past tense: `OrderPlaced`, `PaymentReceived`, `OrderShipped`. Even without event sourcing, this list helps you and your AI understand your app.
3. **Find the personal data.** For each event or history row that you would store, mark the personal fields. Those are the fields that you must be able to delete.

---

## Takeaways

**Key terms**
- **Event sourcing:** store every change as an event, and treat the list of events as the truth
- **Event store and stream:** the append-only list of events, and the events for one thing
- **Replaying:** go through the events in order to calculate the current state
- **Projection (read model):** a normal table built from the events, made for fast reads, that you can build again
- **CQRS:** one model to change data (commands) and another to read it (queries)
- **Compensating event:** a new event that corrects or cancels an earlier one
- **Upcasting:** change old event shapes to the current shape while you read them

**Red flags**
- Event sourcing suggested for a simple app "because it's best practice"
- Code that edits or deletes old events
- Names, emails or addresses written straight into events, with no plan to delete them
- Event handlers that send emails or charge cards during a replay
- No version number or plan for changes to event shapes
- Pages that break because a projection is a moment behind

**Ask your AI**
- *"Which tables in my app need history, so I can answer a customer who asks what happened to their data? Suggest the simplest way to keep that history."*
- *"I'm considering event sourcing for this part of my app. List what it would cost us in complexity, event versioning and deleting personal data, and suggest a simpler alternative."*
- *"Review my event handlers: are they idempotent, and do any of them cause side effects when events are replayed?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Snapshots.** A replay of a wallet with 50,000 events is slow. So systems save a **snapshot**: the calculated state at, for example, every 100th event. To load the wallet, start from the latest snapshot and replay only the events after it. Snapshots only make loads faster. The events stay the truth, and you can create the snapshots again.

**Event store vs message broker.** Kafka keeps a log of events, so you may want to use it as your event store. Microsoft's guidance warns against this. Brokers usually cannot read the stream of one thing on its own. They also cannot refuse an append when the stream changed (optimistic concurrency). Use a broker to share events with other systems. Use a real event store to hold the truth: a purpose-built database, or a carefully designed append-only table.

**CDC events vs domain events.** CDC gives you low-level row changes: "column `stock` went from 3 to 0". Event sourcing stores business facts: "two shoes were sold to order 981". Microsoft's example compares "two seats were reserved" and "remaining seats changed to 42". The first says what happened. The second gives only the result.

**Testing.** Event-sourced logic is easy to test in a "given, when, then" style. *Given* these past events, *when* this command runs, *then* expect these new events. You need no database. You still need tests for projections, duplicate events and old event versions.

**External systems during replay.** Fowler's article describes "gateways": wrappers around calls to other systems that do nothing during a replay. It also describes how to record answers from other systems. Then a replay uses the same answers, not today's answers.

</details>

## References

- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html): Martin Fowler. Capturing all changes as a sequence of events, complete rebuilds, temporal queries, accounting and version control as examples, and handling external systems during replay.
- [CQRS](https://martinfowler.com/bliki/CQRS.html): Martin Fowler. Using a different model to update than to read, its fit with event sourcing, and the warning that for most systems it adds risky complexity.
- [Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing): Microsoft Azure Architecture Center. Append-only stores, replay, materialized views, optimistic concurrency, compensating events, event versioning and upcasting, personal data and crypto-shredding, snapshots, and when not to use the pattern.
- [CQRS pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs): Microsoft Azure Architecture Center. Commands and queries, separate read and write models, eventual consistency, and when the pattern isn't suitable.
