---
title: "The order was saved, but the email never went out"
slug: outbox-pattern
order: 62
level: 5
levelName: Systems & architecture
concepts: [Dual writes, Transactional outbox, Message relay, Polling publisher, At-least-once delivery, Idempotent consumers, Change data capture]
readTime: 14 min
quiz:
  - question: "Your route saves an order in the database, then publishes an \"order placed\" event to a message broker. A deploy restarts the server between the two lines. What happens?"
    options:
      - text: "The database rolls back the order automatically"
      - text: "The broker notices and publishes the event itself"
      - text: "The order exists, but the event is never sent, so no email goes out and nothing ships"
        correct: true
      - text: "The order is saved twice"
    explanation: "The database and the broker are two separate systems. The save is already committed, and the publish never ran. Nothing remembers that it still needs to happen. This is the dual-write problem."

  - question: "To fix that, the AI moves the publish inside the database transaction, before the commit. Later in the same transaction, a stock update fails and everything rolls back. What happens?"
    options:
      - text: "The event is rolled back too"
      - text: "The event was already sent, so other services react to an order that doesn't exist"
        correct: true
      - text: "The order is saved anyway"
      - text: "Nothing, because the broker waits for the commit"
    explanation: "A rollback only undoes changes in your own database. It can't unsend a message that already left. Sending before the commit swaps a lost message for a ghost message."

  - question: "With the transactional outbox pattern, what does the order route do?"
    options:
      - text: "Saves the order and an outbox row describing the event, in the same database transaction"
        correct: true
      - text: "Publishes the event first, then saves the order"
      - text: "Saves the order, then publishes the event three times to be safe"
      - text: "Sends the email directly from the route"
    explanation: "Both writes are in one database, in one transaction, so they succeed or fail together. A separate relay publishes the outbox rows to the broker afterwards."

  - question: "The relay publishes an outbox row to the broker, then crashes before it marks the row as sent. When it restarts, what happens?"
    options:
      - text: "The event is lost"
      - text: "The database refuses to start"
      - text: "The broker deletes the first copy"
      - text: "The relay publishes the same event again, so consumers must handle duplicates"
        correct: true
    explanation: "The outbox gives at-least-once delivery: an event is never lost, but it can be sent twice. That's why each outbox row has a fixed event ID, and consumers skip IDs they've already handled."

  - question: "Why is the event ID created when the outbox row is written, and not by the relay each time it publishes?"
    options:
      - text: "Random IDs are faster to create in the database"
      - text: "So every publish of the same event carries the same ID, and consumers can recognize repeats"
        correct: true
      - text: "Because brokers don't accept IDs"
      - text: "It doesn't matter where the ID is created"
    explanation: "Like an idempotency key, the ID belongs to the event, not to the attempt. A new ID on every publish would make a repeat look like a brand-new event."

  - question: "Your outbox monitoring shows the oldest unsent row is 40 minutes old, and the count keeps growing. What is the most likely problem?"
    options:
      - text: "Customers are placing too few orders"
      - text: "The database has lost the orders"
      - text: "The relay has stopped, or it can't reach the broker"
        correct: true
      - text: "The consumers are processing events twice"
    explanation: "Rows wait in the outbox until the relay publishes them. A growing backlog of old rows means publishing isn't happening. Nothing is lost yet, but nothing is going out either, so this deserves an alert."
---

# The order was saved, but the email never went out

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Transaction:** a group of database changes that succeed or fail together, ending in `COMMIT` (save) or `ROLLBACK` (undo). *([A customer got charged twice. How?](/lessons/charged-twice))*
> - **Event and message broker:** a message reporting something that happened, and the system that stores such messages and delivers them to other services. *([When everything calls everything, everything breaks](/lessons/event-driven-architecture))*
> - **Idempotent consumer:** a service that does the work only once, however many times the same event arrives. *([When everything calls everything, everything breaks](/lessons/event-driven-architecture))*
> - **Worker:** code that runs outside any user's request and does work in the background. *([Sign-up takes 10 seconds because of one email](/lessons/background-jobs))*

## The order that nobody else heard about

A customer writes to you on Monday:

> "I paid on Friday. The charge is on my card, and I can see the order in my account. But I never got a confirmation email, and nothing has shipped."

You look. The order is in your database, paid. But the email service has no record of it. The warehouse service, which packs a box whenever it hears that an order was placed, has never heard of it either.

You search the logs for Friday. The order was saved at 14:02:07. At 14:02:07, a deploy restarted your server. Your order route saves the order first, and then publishes an `order.placed` event to your message broker. The save ran. The restart came before the publish. The event was never sent, and nothing in your system remembered that it should have been.

It happens rarely: only when a crash, a deploy or a broker hiccup lands in a gap of a few milliseconds. But with enough orders, rare becomes every week, and each time it's a customer who paid and got nothing. This lesson is about that gap.

---

## The mental model: two systems, no shared undo

The order route writes to **two separate systems**: your database and your message broker. Writing the same change to two systems that can't share a transaction is called a **dual write**.

A transaction only covers your own database. There is no `ROLLBACK` that also takes back a message sent to a broker, an email sent through an email API, or a job added to a separate queue service. So whichever order you do the two writes in, there's a moment when one has happened and the other hasn't. If anything stops your code in that moment, the systems disagree.

| You do | What can go wrong in the gap | Result |
|---|---|---|
| Save, then send | A crash, deploy or broker outage after the save | The order exists, the event never goes out: a **lost message** |
| Send, then save | The save fails or rolls back after the send | Other services react to an order that doesn't exist: a **ghost message** |

Think of a shop assistant who writes each sale in the sales book, then phones the warehouse. If the phone line is dead, or the assistant's shift ends between the two steps, the book says "sold" and the warehouse knows nothing.

The fix in the shop: on the **same page** of the sales book, in the same moment, write a note for the warehouse in an "outgoing" column. A runner walks through the book every few minutes, delivers every note that isn't ticked yet, and ticks it. If the runner is interrupted before ticking, they deliver that note again on the next round, so the warehouse checks: "Did I already pack order 1042?"

**Where the comparison stops working:** in a paper book, writing the sale and the note is not magically all-or-nothing. In a database transaction, it is. That's what makes the software version reliable.

---

## How it goes wrong

### Bug 1: Send after commit

This is the code from the story:

```js
const order = await db.order.create({ data: orderData });
// a crash, a deploy or a broker outage here: the event is never sent
await broker.publish("order.placed", { orderId: order.id });
res.status(201).json(order);
```

In plain English: save the order (committed at once), then publish the event. If the process stops between those lines, the order is saved and the event is gone. (`broker` is a placeholder for your message broker's client library, and `orderData` for the order details.)

Retrying the publish helps when the broker is unreachable for a second. It doesn't help when your server stops: the retry was only in the memory of a process that no longer exists.

### Bug 2: Send before commit

You ask your AI to fix it, and it moves the publish inside the transaction:

```js
await db.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  await broker.publish("order.placed", { orderId: order.id }); // sent now...
  await tx.product.update({ where: { id: productId }, data: { stock: { decrement: 1 } } }); // ...this can still fail
});
```

In plain English: inside a transaction, save the order, publish the event, then reduce the stock.

The event leaves at line 3. If line 4 fails, or the commit itself fails, the database rolls back the order. The email service now sends a receipt for an order that doesn't exist, and the warehouse looks up an order ID it can't find. The rollback can't unsend the message.

This version has a second problem you've seen before: the transaction waits on the network while it holds locks. Network calls don't belong inside transactions.

### Bug 3: The same gap, with other names

The gap isn't only about message brokers. These have exactly the same problem:

- Save the order, then call an email API directly
- Save the user, then add a welcome job to a queue service that has its own storage
- Save a payment, then update a search index or a cache in another system

Any time one action changes your database **and** something outside it, ask: what if the process stops between the two?

---

## What good looks like: the transactional outbox

The fix is to turn two writes into one. Instead of sending the message, **write it into your own database**, in the same transaction as the order. A separate process sends it later. This is the **transactional outbox** pattern.

It has two parts:

1. An **outbox table**: messages waiting to be sent, stored in the same database as your data.
2. A **message relay**: a worker that reads new rows from the outbox, publishes them to the broker, and marks them as sent.

### Step 1: The outbox table

```sql
CREATE TABLE outbox (
  id         bigserial PRIMARY KEY,     -- a growing number: also the sending order
  event_id   uuid NOT NULL UNIQUE,      -- stays the same however often it's sent
  topic      text NOT NULL,             -- for example 'order.placed'
  payload    jsonb NOT NULL,            -- the event's data, stored as JSON
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at    timestamptz                -- empty until the relay has published it
);
```

Each row is one event waiting to go out. `bigserial` makes PostgreSQL number the rows 1, 2, 3... automatically, and `jsonb` stores JSON data.

### Step 2: Write the order and the event together

```js
const order = await db.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  await tx.outbox.create({ data: {
    eventId: crypto.randomUUID(), topic: "order.placed", payload: { orderId: order.id },
  } });
  return order;
});
```

In plain English: in one transaction, save the order and save a row in the outbox that describes the event. Nothing goes over the network.

Now replay every failure:

- **The server crashes before the commit:** neither the order nor the outbox row exists. The customer sees an error and tries again. Nothing is half-done.
- **The server crashes after the commit:** both exist. The event hasn't been sent yet, but it's written down in the database, so it will be.
- **The transaction rolls back:** both disappear. No ghost message.

The order and its event now succeed or fail **together**.

### Step 3: The relay

```js
async function relayOnce() {
  const rows = await db.outbox.findMany({ where: { sentAt: null }, orderBy: { id: "asc" }, take: 100 });
  for (const row of rows) {
    await broker.publish(row.topic, { eventId: row.eventId, ...row.payload });
    await db.outbox.update({ where: { id: row.id }, data: { sentAt: new Date() } });
  }
}
while (true) { await relayOnce().catch(console.error); await sleep(1000); } // in a worker
```

In plain English:

1. **Line 2:** find up to 100 rows that haven't been sent, oldest first.
2. **Lines 3–5:** publish each one to the broker, then mark it as sent.
3. **Line 8:** do this every second, forever, in a worker, not in a route. If a round fails, log the error and try again next round. (`sleep` is a small helper you write that waits that many milliseconds, `db.outbox` is the Prisma model for the table above, and `broker` is still a placeholder.)

If the broker is down, `publish` throws an error, the rows stay unsent, and the next round tries again. While your database is safe, no event is lost. This simple version, which asks the table for new rows on a timer, is called a **polling publisher**.

The relay runs as a separate always-on worker. On a serverless platform, you can run it as a scheduled job instead, accepting a longer delay between rounds.

### The catch: at least once, never "exactly once"

Look at lines 4 and 5 again. If the relay crashes after publishing but before marking the row as sent, it publishes the same row again after restarting. The outbox gives you **at-least-once** delivery: never lost, sometimes twice.

So consumers must be idempotent, exactly as in the event-driven lesson: record each `eventId` they've handled, and skip the ones they've seen. This is why the event ID is created **once, inside the transaction**, and stored in the row. Every publish of that row carries the same ID. It's the same rule as for idempotency keys: one ID per operation, not per attempt.

> **Go deeper:** [When everything calls everything, everything breaks](/lessons/event-driven-architecture) (Level 5) shows the idempotent consumer code.

### Keep it healthy

- **Order:** one relay that sends rows in `id` order keeps events roughly in the order they were written. (Not exactly: an `id` is given when the row is inserted, so two transactions running at once can commit in a different order than their ids.) Several relays working in parallel can mix the order, and some brokers may reorder anyway, so consumers still shouldn't depend on it.
- **Clean up:** delete or archive sent rows after a few days, so the table doesn't grow forever.
- **Watch the backlog:** the number of unsent rows, and the age of the oldest one, tell you whether the relay is working. If the oldest unsent row is more than a few minutes old, alert. Nothing is lost, but nothing is going out.

### Polling, or reading the database's own log

Polling is simple, but it queries the table every second, and an event can wait up to a second before it's sent.

There's another way to find new outbox rows. Many databases write every change to a log before they change the real data. PostgreSQL calls this the **write-ahead log** (WAL). A tool can read that log and publish each new outbox row as soon as it's committed, with no polling. Reading a database's change log to react to changes is called **change data capture** (CDC). Debezium is one open-source tool that does this, with a built-in outbox feature.

> **Go deeper:** [Your search results are an hour out of date. Why?](/lessons/change-data-capture) (Level 5) explains change data capture and the write-ahead log.

### Do you need it?

The outbox adds a table, a worker to run and watch, and a short delay. It's worth it when a lost or ghost message costs real money or trust: orders, payments, shipping, account changes. For analytics, where losing a rare event doesn't matter, a plain publish after commit may be fine.

And sometimes you already have an outbox without the name. If your job queue stores its jobs as rows in the **same** database, and you add the job using the same transaction as the order, the job and the order commit together.

---

## Test your own app

Do this in staging.

1. **Find your dual writes.** Ask your AI: *"List every place where my code saves to the database and then sends a message, calls an API, adds a job or updates a cache in another system."*
2. **Crash in the gap.** Temporarily add `throw new Error("test")` right after the save, in the old code. Place an order. The order exists, and the event doesn't. With the outbox, crash the server right after the commit: the event should still go out once the relay runs.
3. **Stop the broker.** Turn off the broker (or point the relay at a wrong address) and place five orders. Checkout should still work, and five rows should wait in the outbox. Turn it back on: all five should be published.
4. **Send one row twice.** Set `sent_at` back to empty for a row that was already sent, and let the relay send it again. The customer should still get one email.
5. **Check the backlog query.** Run it and add it to your monitoring:

```sql
SELECT count(*), min(created_at) FROM outbox WHERE sent_at IS NULL;
```

---

## Takeaways

**Key terms**
- **Dual write:** writing one change to two systems that can't share a transaction
- **Lost message / ghost message:** saved but never sent / sent but never saved
- **Transactional outbox:** saving the message in an outbox table, in the same transaction as the data
- **Message relay:** a worker that publishes outbox rows to the broker and marks them as sent
- **Polling publisher:** a relay that checks the outbox table on a timer
- **Write-ahead log (WAL):** the log where PostgreSQL records every change before applying it
- **Change data capture (CDC):** reading the database's change log to react to changes

**Red flags in AI-written code**
- `create` or `update`, then `publish`, `send`, `enqueue` or a call to an API, with nothing to recover if the process stops in between
- A publish or API call inside a database transaction
- "We retry the publish, so it's safe" (retries in memory die with the process)
- An outbox relay with no monitoring of unsent rows
- A new event ID generated by the relay on each publish, instead of stored in the row
- Consumers that assume each event arrives exactly once

**Which step broke?**
- Order saved, no event, nothing in the outbox → the code isn't writing to the outbox in the same transaction
- Rows in the outbox, never sent → the relay is stopped or can't reach the broker
- Event sent twice, customer got two emails → the consumer isn't idempotent
- Event for an order that doesn't exist → something publishes before the commit

**Ask your AI**
- *"Find every dual write in my code: a database save followed by a message, an API call or a job in another system. What happens if the server stops between the two?"*
- *"Add a transactional outbox for [this event]: the table, writing to it in the same transaction, and a relay worker. Show what happens if the relay crashes after publishing."*
- *"Write a monitoring query and an alert for unsent outbox rows older than five minutes."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Why not one transaction across both systems?** A protocol called two-phase commit (2PC) can coordinate a transaction across several systems. microservices.io notes that it's usually not an option: many databases and message brokers don't support it, and it ties your service tightly to both. The outbox gets the same safety with only your own database's transaction.

**Several relays at once.** One relay is a single point of failure, but two relays reading the same rows send everything twice. PostgreSQL's `SELECT ... FOR UPDATE SKIP LOCKED` lets each relay lock a batch of rows and skip rows another relay has already locked. The PostgreSQL docs describe `SKIP LOCKED` as suitable for many consumers reading a queue-like table, and not for general-purpose work. Parallel relays can send events out of order, so many teams group events by a key, such as the order ID, and keep one sender per key.

**The inbox.** The consumer side often gets its own table too: the `processed_events` table from the event-driven lesson. It's sometimes called an **inbox**: a record of which incoming events were already handled, written in the same transaction as the work.

**Debezium's outbox router.** Debezium is a change data capture tool. Its outbox event router turns new outbox rows into messages on Kafka topics. Its default outbox table has columns such as `id`, `aggregatetype`, `aggregateid`, `type` and `payload`. It uses `aggregatetype` to build the topic name, and `aggregateid` as the message key, which keeps events for the same order in order.

**Outboxes in NoSQL databases.** microservices.io notes that in a NoSQL database, the outbox can be a property of each record instead of a table. AWS's guide shows a version on DynamoDB: the event is stored in the same item, DynamoDB's built-in change stream captures it, and a small function reads the stream and sends the event on, doing the relay's job.

**An alternative: event sourcing.** Instead of saving the current state *and* an event, you can store only the events and work out the current state from them. Then there's only one write.

> **Go deeper:** [What if your database remembered everything that ever happened?](/lessons/event-sourcing) (Level 5)

</details>

## References

- [Pattern: Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html): microservices.io (Chris Richardson). The problem of updating a database and sending a message atomically, why 2PC is usually not an option, the outbox table and message relay, duplicate publishing, and idempotent consumers.
- [Pattern: Transaction log tailing](https://microservices.io/patterns/data/transaction-log-tailing.html): microservices.io (Chris Richardson). Publishing outbox rows by reading the database's transaction log, such as the PostgreSQL WAL, as an alternative to polling.
- [Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html): AWS Prescriptive Guidance. The dual-write problem, failures after the commit and sends before a rollback, the outbox table written in the same transaction, duplicate messages, ordering, and the CDC version with DynamoDB.
- [Outbox Event Router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html): Debezium documentation. Capturing outbox inserts and routing them to Kafka topics, and the default outbox columns.
- [Write-Ahead Logging (WAL)](https://www.postgresql.org/docs/current/wal-intro.html): PostgreSQL documentation. Changes are written to the log before the data files.
- [SELECT](https://www.postgresql.org/docs/current/sql-select.html): PostgreSQL documentation. `FOR UPDATE SKIP LOCKED` for many consumers reading a queue-like table.
