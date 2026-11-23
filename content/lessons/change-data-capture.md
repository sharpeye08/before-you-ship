---
title: "Your search results are an hour out of date. Why?"
slug: change-data-capture
order: 63
level: 5
levelName: Systems & architecture
concepts: [Change data capture (CDC), Write-ahead log (WAL), Logical decoding, Replication slots, Debezium, Derived data]
readTime: 14 min
quiz:
  - question: "Your search index is updated by a job that runs once an hour. A product is renamed at 10:05. What is the latest time customers might still only find it under its old name?"
    options:
      - text: "10:05, because the database saved the change at once"
      - text: "Around 11:00, when the next hourly job copies the products again"
        correct: true
      - text: "Never, because search engines read the database directly"
      - text: "The next day, because search indexes only update at night"
    explanation: "The search index is a separate copy. It only learns about the change when the next job runs, so it can be up to an hour behind the database."

  - question: "To keep search in sync, the AI adds a line to the \"edit product\" route that updates the search index after saving to the database. Later, a teammate fixes 500 prices with one SQL command in the database console. What happens?"
    options:
      - text: "Search updates, because the route runs for every change"
      - text: "The database refuses the SQL command"
      - text: "Search still shows the old prices, because the route's code never ran"
        correct: true
      - text: "Search deletes those 500 products"
    explanation: "Updating the copy from your own code only works for changes that go through that code. Change data capture reads the database's own change log, so it sees every change, however it was made."

  - question: "What is the write-ahead log (WAL) in PostgreSQL?"
    options:
      - text: "A log of every change, written to disk before the table files are changed"
        correct: true
      - text: "A list of the slowest queries"
      - text: "A backup that runs every night"
      - text: "A log of error messages from your app"
    explanation: "Postgres writes each change to the WAL first, so it can repair itself after a crash. Change data capture reads this same log to find out what changed."

  - question: "Your Debezium connector has been stopped for a week, and nobody noticed. What is the main danger to the database?"
    options:
      - text: "None, because Debezium only reads data"
      - text: "The tables are locked until Debezium starts again"
      - text: "Every change from that week is lost forever"
      - text: "The replication slot keeps all the WAL since it stopped, and the disk can fill up"
        correct: true
    explanation: "A replication slot is a bookmark that tells Postgres to keep the log until the reader has seen it. If the reader stops, the log keeps growing. Monitor your slots and drop ones you no longer need."

  - question: "Your search updater receives change events from CDC. After a crash, it receives the same \"price changed to $60\" event twice. How should it be written?"
    options:
      - text: "It should stop and alert a human"
      - text: "It should add $60 to the price each time"
      - text: "It should set the product's search entry to the values in the event, so a repeat has no extra effect"
        correct: true
      - text: "It should ignore every event it has seen before, using the time it arrived"
    explanation: "CDC can deliver the same change more than once after a restart. \"Set this product to these values\" is idempotent: doing it twice gives the same result as doing it once."

  - question: "A teammate renames the column stock to quantity with a migration. The search updater still reads after.stock. What is the best lesson to take from this?"
    options:
      - text: "CDC tools fix renamed columns automatically"
      - text: "Once other systems read your tables through CDC, the table's shape is a contract, so change it in safe steps"
        correct: true
      - text: "Never rename a column, ever"
      - text: "Turn CDC off before every migration"
    explanation: "With CDC, other programs depend on your column names. Add the new column first, update the readers, and remove the old column last."
---

# Your search results are an hour out of date. Why?

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Cache and cache invalidation:** a saved copy of data kept somewhere faster, and making that copy match the real data again. *([Fast, but showing yesterday's data](/lessons/caching))*
> - **Transaction:** a group of database changes that succeed or fail together. *([A customer got charged twice. How?](/lessons/charged-twice))*
> - **Event and message broker:** a message that says "this happened", and a service that stores events and delivers them to every program that wants them. *([When everything calls everything, everything breaks](/lessons/event-driven-architecture))*
> - **Transactional outbox:** saving an event in an outbox table, in the same transaction as the data change, so a separate program can send it later. *([The order was saved, but the email never went out](/lessons/outbox-pattern))*

## The shoe that sold out an hour ago

You run an online shoe shop. The search box is fast and smart: it finds "trail runer" even with the typo. To make that work, the AI set up a separate **search service**: a program built only for searching text. It keeps its own copy of your products, organized for fast search. That copy is called a **search index**.

On Saturday morning, your best trail shoe sells out at 10:05. Your database knows: the stock is 0. But customers keep searching "trail shoe", seeing it at the top of the results, clicking it, and landing on a page that says "Out of stock". One of them writes: *"Why does your search show things you don't have?"*

At 11:00, the problem goes away by itself. At 11:30 it happens again with a different shoe.

You look at the code the AI wrote and find this:

```js
// Runs at the start of every hour
cron.schedule("0 * * * *", async () => {
  const products = await db.product.findMany();
  await search.replaceAll(products);
});
```

`cron.schedule` (from the `node-cron` package) runs a function on a timetable. `"0 * * * *"` means "at minute 0 of every hour". Each hour, the job reads every product from the database and copies all of them into the search index. (`search` is a placeholder for your search service's client library, here and in the code below.)

So the search index is a photo of your products, retaken once an hour. Between photos, it can be up to an hour old. That's the whole bug. This lesson shows how to make the copy follow the database within seconds, and what that costs.

---

## One truth, many copies

Your database is the **source of truth**: the place where the real, current answer lives. As an app grows, it often keeps **copies** of that data in other places, each shaped for one job:

- A **search index**, for fast text search
- A **cache**, for fast reads
- An **analytics database** (often called a **data warehouse**), for big reports like "sales per country per month" that would be too slow to run on your main database
- Other services in your system that need to know about orders, users or products

These copies are called **derived data**: data you could rebuild at any time from the source of truth. The hard question is always the same: **when the source changes, how does the copy find out?**

There are three common answers.

### Answer 1: Copy everything again, on a timetable

This is the hourly job above. It's called a **batch job**, because it moves data in large groups instead of one change at a time. It's easy to write and easy to understand. Its costs grow with your app:

- **Staleness.** The copy is up to one full interval behind. Hourly means up to an hour. Nightly means up to a day.
- **Load.** Copying 500 products is nothing. Copying 5 million rows every hour puts heavy load on your database for a few changes.
- **Missed deletes.** A common "smarter" version only copies rows changed since the last run, using an `updatedAt` column. A deleted row is gone, so it never shows up as "changed", and it stays in search forever.

### Answer 2: Update the copy from your own code

The next idea is to update the search index in the same API route that saves the change. This is a **dual write**: your code writes the same fact to two places. You met its main problem in [The order was saved, but the email never went out](/lessons/outbox-pattern): if the database write succeeds and the search write fails, the copies disagree, and nothing fixes it.

Worse, dual writes only catch changes that go through *that* code. Admin scripts, migrations, a new route the AI added last week, or a teammate fixing data by hand in the database console all skip the search update.

### Answer 3: Ask the database what changed

The database already sees every change, whoever made it. What if you could subscribe to that? That's **change data capture**, or **CDC**: reading every insert, update and delete from the database itself and sending each one, in order, to the systems that keep copies.

To understand how, you need to know about a log that your database has been keeping all along.

---

## The write-ahead log: the database's diary

When you save a row in PostgreSQL, Postgres doesn't change the table file on disk straight away. First, it writes a short note describing the change to a separate file that only grows at the end: "in table `products`, row 42, stock changed to 0". Only after that note is safely on disk does it count the change as saved. It updates the actual table files later.

This file is the **write-ahead log**, or **WAL**. "Write-ahead" means the note is written *before* the real change. If the server crashes while updating table files, Postgres reads the WAL on restart and redoes the changes that hadn't reached the tables yet, so nothing saved is lost.

Think of a shop's till roll. Every sale is printed on the roll, in order, as it happens. At the end of the day, the shelves show what's left, but the roll shows everything that happened.

**Where the comparison stops working:** a till roll is kept forever. Postgres deletes old WAL files once it no longer needs them, unless something asks it to keep them. You'll see why that matters soon.

The key idea for this lesson: **the WAL already contains every change, in the order it happened.** CDC doesn't add a new record of changes. It reads the one that's already there.

### How a program reads the WAL

The WAL is written in Postgres's own internal format, made for the database, not for people or other programs. Postgres has a feature that turns it into readable changes:

- **Logical decoding** turns WAL entries into clear descriptions like "row inserted into `products` with these values". (Before PostgreSQL 19, the database must be set up for it with the setting `wal_level = logical`. From version 19, it can also switch on by itself when the first logical replication slot is created.)
- An **output plugin** decides the format. Postgres includes one called `pgoutput`.
- A **replication slot** is a named bookmark for one reader. It remembers how far that reader has got, it survives crashes, and it tells Postgres: *don't delete any WAL this reader hasn't seen yet.*

Postgres's own **logical replication** feature is built on these parts. It copies chosen tables to another Postgres database, applying changes in the same order they happened on the original.

To send changes somewhere that isn't Postgres, like a search service, most teams use a CDC tool.

---

## Debezium: changes as events

**Debezium** is a widely used open-source CDC tool. It has connectors for many databases, including PostgreSQL, MySQL, MongoDB, SQL Server and Oracle. Its PostgreSQL connector works like this:

1. **Snapshot.** The first time it connects, it reads the current contents of the tables, so the copies start complete.
2. **Stream.** Then it reads new changes through logical decoding, using its own replication slot.
3. **Publish.** It turns each change into an event and sends it to **Apache Kafka**, a popular message broker. By default, each table gets its own Kafka **topic** (a named stream of events), such as `shop.public.products`. Debezium can also run without Kafka, using Debezium Server to send events to other brokers.

A change event looks roughly like this (trimmed):

```json
{
  "op": "u",
  "before": { "id": 42, "name": "Trail shoe", "stock": 3 },
  "after":  { "id": 42, "name": "Trail shoe", "stock": 0 },
  "source": { "table": "products", "lsn": 24023128 }
}
```

- `op` is the kind of change: `c` for create (insert), `u` for update, `d` for delete, and `r` for a row read during the first snapshot.
- `before` and `after` are the row before and after the change. (By default, Postgres only gives the primary key in `before`. A full old row, like here, needs a table setting explained in Going deeper.)
- `source` says where it came from. `lsn` is the change's position in the WAL.

Now the search updater doesn't need a timetable. It reacts to each event:

```js
// Called once for every event on the products topic
async function onProductChange({ op, before, after }) {
  if (op === "d") return search.remove(before.id);
  await search.upsert(after.id, { name: after.name, inStock: after.stock > 0 });
}
```

If a product was deleted, remove it from search. Otherwise, **upsert** it: insert it if it's new, or overwrite it if it exists. A shoe that sells out at 10:05 disappears from "in stock" results seconds later, not at 11:00.

Notice what changed. The code that saves products doesn't know search exists. The admin script, the teammate's SQL command and the new API route all write to the database, the WAL records every change, and the search index follows.

### What CDC is good for

- **Search indexes** that stay close to the database
- **Cache invalidation:** remove a cached copy as soon as its row changes
- **Analytics:** stream changes into a data warehouse instead of copying everything every night
- **The outbox relay:** instead of checking the outbox table every few seconds, Debezium can read new outbox rows from the WAL and publish them. It includes a ready-made outbox event router for this.

---

## How it goes wrong

CDC removes the staleness, but you pay for it in other places. These are the costs to weigh before you add it.

### Cost 1: One more system to run, and a disk that can fill up

A batch job is one function. CDC usually means Debezium, Kafka Connect (the system Debezium runs inside) and Kafka, all of which must run, be watched and be upgraded.

The sharpest danger is the replication slot. It promises Postgres's WAL will be kept until the reader has seen it. If Debezium stops and nobody notices, Postgres keeps every bit of WAL from that moment on, and the disk slowly fills. The Postgres docs warn that an unused slot can, in extreme cases, even force the database to shut down. A slot left behind by a test you ran months ago does the same.

### Cost 2: Your table shape becomes a promise

Before CDC, only your app read your tables. Now the search updater reads `after.stock`. If someone renames `stock` to `quantity`, the updater breaks, even though your app works perfectly. Postgres's logical replication doesn't copy table changes either: its docs say schema changes must be kept in sync by hand.

Treat CDC readers like users of a public API. Change tables in safe steps: add the new column, update every reader, then remove the old column.

> **Go deeper:** [You renamed one column and the live app crashed](/lessons/database-migrations) (Level 2) shows how to change tables in safe steps.

### Cost 3: Order and duplicates

Changes to the **same row** arrive in order: Debezium uses the row's primary key as the event's key, and Kafka keeps events with the same key in order. Changes to **different** rows or tables can be read in a different order than they happened. If your search updater needs a product and its category together, it may briefly see one without the other.

And after a crash, the same change can arrive twice. The Postgres docs say clients should be ready for this. So readers must be **idempotent**: handling an event twice must have the same effect as once. "Set product 42 to these values" is safe. "Add 1 to the sale count" is not.

### Cost 4: It copies everything, including secrets

By default, CDC sends every column of every captured table, including email addresses and password hashes, into Kafka, where more programs and people can read them. Debezium can capture only chosen tables (`table.include.list`) and leave out columns (`column.exclude.list`). Use both.

### Cost 5: It's fast, not instant

Even with CDC, the copy is a little behind. This is **eventual consistency**: the copy will match soon, but not at the same moment. For search results, that's fine. For deciding whether to sell the last pair of shoes, always ask the database.

---

## What good looks like: choose by how fresh the copy must be

The right answer depends on how stale the copy is allowed to be, and how big your app is.

| Situation | Good choice |
|---|---|
| Small app, a few thousand rows | Maybe no copy at all: Postgres has built-in full text search |
| Copy can be an hour or a day old (reports) | A batch job is simple and fine |
| Copy should be seconds behind, few code paths | Update it from a background job via the outbox |
| Copy should be seconds behind, many writers, several copies | CDC |

The first row matters most. Every copy can go stale, so before choosing *how* to sync a second copy, ask whether you need one. If you do use CDC:

- **Alert on replication slots** that hold a lot of WAL, and drop slots you no longer use.
- **Capture only the tables and columns you need.**
- **Make every reader idempotent**, and test it by sending the same event twice.
- **Keep a way to rebuild the copy from scratch**, such as Debezium's snapshot, for the day it drifts anyway.

> **Go deeper:** [What if your database remembered everything that ever happened?](/lessons/event-sourcing) (Level 5) takes the idea of "the log is the truth" much further.

---

## Test it yourself

1. **List your copies.** Ask your AI: *"Where does my app keep copies of database data: search, caches, analytics, other services?"* For each one, write down how changes reach it.
2. **Time the lag.** Change a product name. Count how long until search, or any other copy, shows the new name.
3. **Delete something.** Delete a test product and check that it disappears from every copy. Missed deletes are the most common gap.
4. **If you use Postgres CDC, check your slots** in the database console:

```sql
SELECT slot_name, active,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS wal_held
FROM pg_replication_slots;
```

This lists every replication slot, whether a reader is connected right now (`active`), and how much WAL each slot is forcing Postgres to keep. A slot with `active = false` and a large, growing `wal_held` is a disk problem on its way.

---

## Takeaways

**Key terms**
- **Source of truth and derived data:** where the real answer lives, and copies you could rebuild from it
- **Batch job:** copying data in large groups on a timetable
- **Dual write:** your code writing the same fact to two places, which can disagree
- **Change data capture (CDC):** reading every change from the database itself and sending it to the copies
- **Write-ahead log (WAL):** the database's log of every change, written before the table files change
- **Logical decoding:** turning WAL entries into readable changes
- **Replication slot:** a bookmark for one reader that makes Postgres keep the WAL it hasn't read
- **Debezium:** an open-source CDC tool that turns database changes into events

**Which step broke?**
- Copy is always up to an hour behind → a batch job on a timetable
- Copy misses changes made outside the app → dual writes in your code
- Deleted items never leave search → syncing by `updatedAt`
- Database disk keeps growing → an inactive replication slot
- Updater crashes after a migration → a renamed column it still reads
- Counts in a copy are too high after a restart → a reader that isn't idempotent

**Ask your AI**
- *"List every place my app keeps a copy of database data, how each copy is updated, and the longest it can be out of date."*
- *"Does any code update a search index or cache right after a database write? What happens if the second write fails, or if data is changed outside this code?"*
- *"If we used change data capture, which tables and columns would we capture, which would we exclude, and how would we monitor the replication slot?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Physical vs logical replication.** Postgres can copy data in two ways. Physical replication copies the WAL byte for byte to an identical standby server, which is how read replicas usually work. Logical replication decodes the WAL into row changes, based on each row's identity (usually its primary key), so the reader can be a different Postgres version, a subset of tables, or a non-Postgres system through a tool like Debezium.

**What `before` contains.** For updates and deletes, how much of the old row appears in `before` depends on the table's `REPLICA IDENTITY` setting. By default it's only the primary key. `REPLICA IDENTITY FULL` logs the whole old row, which makes the WAL larger.

**Quiet tables in a busy database.** A replication slot covers a whole database. If Debezium captures only a quiet table while other tables are busy, the slot may not move forward for a long time, and WAL builds up. Debezium's docs suggest heartbeat events (`heartbeat.interval.ms`) to keep the slot moving.

**Other ways to capture changes.** Before log-based tools, teams used database triggers that copied each change into a "changes" table, or queries that polled for rows with a newer `updatedAt`. Triggers add work to every write. Polling can't see deletes and adds load. Debezium's docs list capturing deletes and avoiding polling as reasons to read the log instead.

**CDC and the outbox together.** Debezium's outbox event router reads inserts into an outbox table and sends each one to a topic named after the row's `aggregatetype` column. Your app writes business data and the outbox row in one transaction; CDC does the sending. This combines the safety of the outbox with the speed of reading the log.

</details>

## References

- [Write-Ahead Logging (WAL)](https://www.postgresql.org/docs/current/wal-intro.html): PostgreSQL docs. Changes are logged before data files are written, and the log is replayed after a crash.
- [Logical Decoding Concepts](https://www.postgresql.org/docs/current/logicaldecoding-explanation.html): PostgreSQL docs. Logical decoding, output plugins, replication slots, the warning that unused slots keep WAL and can force a shutdown in extreme cases, and possible repeated changes after a crash.
- [Logical Replication: Restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html): PostgreSQL docs. Schema changes are not replicated and must be kept in sync by hand.
- [Outbox Event Router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html): Debezium docs. Debezium's ready-made support for publishing outbox rows, routed by the `aggregatetype` column.
- [Full Text Search: Introduction](https://www.postgresql.org/docs/current/textsearch-intro.html): PostgreSQL docs. Postgres's built-in text search.
- [Debezium connector for PostgreSQL](https://debezium.io/documentation/reference/stable/connectors/postgresql.html): Debezium docs. Initial snapshot, `pgoutput`, replication slots, one topic per table, event fields and `op` values, table and column filters, heartbeats.
- [Debezium Features](https://debezium.io/documentation/reference/stable/features.html): Debezium docs. Supported databases, Kafka Connect and Debezium Server, and why log-based CDC captures deletes without polling.
- [Introduction to Apache Kafka](https://kafka.apache.org/intro): Apache Kafka. Events with the same key go to the same partition and are read in the order they were written.
