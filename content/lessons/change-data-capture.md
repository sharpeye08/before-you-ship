---
title: "Your search results are an hour out of date. Why?"
slug: change-data-capture
order: 63
level: 5
levelName: Systems & architecture
concepts: [Change data capture (CDC), Write-ahead log (WAL), Logical decoding, Replication slots, Debezium, Derived data]
readTime: 14 min
quiz:
  - question: "A job updates your search index once an hour. A product is renamed at 10:05. What is the latest time customers might still only find it under its old name?"
    options:
      - text: "10:05, because the database saved the change at once"
      - text: "Around 11:00, when the next hourly job copies the products again"
        correct: true
      - text: "Never, because search engines read the database directly"
      - text: "The next day, because search indexes only update at night"
    explanation: "The search index is a separate copy. It only learns about the change when the next job runs, so it can be up to an hour behind the database."

  - question: "To keep search in sync, the AI adds a line to the \"edit product\" route. The line updates the search index after the database save. Later, a teammate fixes 500 prices with one SQL command in the database console. What happens?"
    options:
      - text: "Search updates, because the route runs for every change"
      - text: "The database refuses the SQL command"
      - text: "Search still shows the old prices, because the route's code never ran"
        correct: true
      - text: "Search deletes those 500 products"
    explanation: "If your own code updates the copy, this only works for changes that go through that code. Change data capture reads the database's own change log, so it sees every change, however it was made."

  - question: "What is the write-ahead log (WAL) in PostgreSQL?"
    options:
      - text: "A log of every change, written to disk before the table files are changed"
        correct: true
      - text: "A list of the slowest queries"
      - text: "A backup that runs every night"
      - text: "A log of error messages from your app"
    explanation: "Postgres writes each change to the WAL first, so it can repair itself after a crash. Change data capture reads this same log to find out what changed."

  - question: "Your Debezium connector stopped a week ago, and nobody noticed. What is the main danger to the database?"
    options:
      - text: "None, because Debezium only reads data"
      - text: "The tables are locked until Debezium starts again"
      - text: "Every change from that week is lost forever"
      - text: "The replication slot keeps all the WAL since it stopped, and the disk can fill up"
        correct: true
    explanation: "A replication slot is a bookmark that tells Postgres to keep the log until the reader has seen it. If the reader stops, the log continues to grow. Monitor your slots and drop the ones you no longer need."

  - question: "Your search updater receives change events from CDC. After a crash, it receives the same \"price changed to $60\" event twice. How should you write the updater?"
    options:
      - text: "It should stop and alert a human"
      - text: "It should add $60 to the price each time"
      - text: "It should set the product's search entry to the values in the event, so a repeat has no extra effect"
        correct: true
      - text: "It should ignore every event it has seen before, using the time it arrived"
    explanation: "CDC can deliver the same change more than once after a restart. \"Set this product to these values\" is idempotent: if you do it twice, the result is the same as once."

  - question: "A teammate renames the column stock to quantity with a migration. The search updater still reads after.stock. What is the best lesson to take from this?"
    options:
      - text: "CDC tools fix renamed columns automatically"
      - text: "When other systems read your tables through CDC, the table's shape is a contract, so change it in safe steps"
        correct: true
      - text: "Never rename a column, ever"
      - text: "Turn CDC off before every migration"
    explanation: "With CDC, other programs depend on your column names. Add the new column first, update the readers, and remove the old column last."
---

# Your search results are an hour out of date. Why?

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Cache and cache invalidation:** a saved copy of data in a faster place, and the work to make that copy match the real data again. *([Fast, but showing yesterday's data](/lessons/caching))*
> - **Transaction:** a group of database changes that succeed or fail together. *([A customer got charged twice. How?](/lessons/charged-twice))*
> - **Event and message broker:** a message that says "this happened", and a service that delivers events to every program that wants them. *([When everything calls everything, everything breaks](/lessons/event-driven-architecture))*
> - **Transactional outbox:** an event saved in an outbox table, in the same transaction as the data change. A separate program sends it later. *([The order was saved, but the email never went out](/lessons/outbox-pattern))*

## The shoe that sold out an hour ago

You run an online shoe shop. The search box is fast and smart: it finds "trail runer" even with the typo. For this, the AI set up a separate **search service**: a program built only to search text. It keeps its own copy of your products, organized for fast search. That copy is called a **search index**.

On Saturday morning, your best trail shoe sells out at 10:05. Your database knows: the stock is 0. But customers still search "trail shoe", see it at the top, click it, and get a page that says "Out of stock". One of them writes: *"Why does your search show things you don't have?"*

At 11:00, the problem stops by itself. At 11:30 it happens again with a different shoe.

The AI's code has this job:

```js
// Runs at the start of every hour
cron.schedule("0 * * * *", async () => {
  const products = await db.product.findMany();
  await search.replaceAll(products);
});
```

`cron.schedule` (from the `node-cron` package, a library you install) runs a function on a timetable. `"0 * * * *"` means "at minute 0 of every hour". Each hour, the job copies every product from the database into the search index. (`search` is a placeholder for your search service's library, here and below.)

So the search index is a photo of your products, taken once an hour. It can be up to an hour old. That is the whole bug. This lesson shows how to make the copy follow the database within seconds, and what that costs.

![A timeline from 10:00 to 11:00. The database shows the shoe sold out at 10:05, but the search index still shows it in stock until the next copy at 11:00.](/diagrams/change-data-capture-1.svg)

---

## One truth, many copies

Your database is the **source of truth**: the place that holds the real, current answer. As an app grows, it often keeps **copies** of that data in other places, each shaped for one job:

- A **search index**, for fast text search
- A **cache**, for fast reads
- An **analytics database** (often called a **data warehouse**), for big reports like "sales per country per month". These reports are too slow to run on your main database.
- Other services in your system that need to know about orders, users or products

These copies are called **derived data**: data that you can build again at any time from the source of truth. The hard question is always the same: **when the source changes, how does the copy find out?**

There are three common answers.

### Answer 1: Copy everything again, on a timetable

This is the hourly job above. It is called a **batch job**, because it moves data in large groups, not one change at a time. It is easy to write and understand, but its costs grow with your app:

- **Old data.** The copy is up to one full interval behind. Hourly means up to an hour. Nightly means up to a day.
- **Load.** A copy of 500 products is a small job. A copy of 5 million rows every hour makes your database do a lot of work for a few changes.
- **Missed deletes.** A common "smarter" version copies only the rows that changed since the last run. It uses an `updatedAt` column for this. But a deleted row is gone, so it never shows as "changed". It stays in search forever.

### Answer 2: Update the copy from your own code

The next idea: update the search index in the same API route that saves the change. This is a **dual write**: your code writes the same fact to two places. You met its main problem in [The order was saved, but the email never went out](/lessons/outbox-pattern). If the database write succeeds and the search write fails, the copies disagree, and nothing fixes it.

Also, dual writes only catch changes that go through *that* code. Admin scripts, migrations (scripts that change your tables) and a new route skip the search update. So does a teammate who fixes data in the database console (where you type SQL into the database).

### Answer 3: Ask the database what changed

The database already sees every change, from every writer. What if you could subscribe to that? That is **change data capture**, or **CDC**. A CDC tool reads every insert, update and delete from the database itself. It sends each change, in order, to the systems that keep copies.

---

## The write-ahead log: the database's diary

When you save a row in PostgreSQL ("Postgres"), Postgres first writes a short note about the change to a separate file. This file only grows at the end. The note says, for example, "in table `products`, row 42, stock changed to 0". The change counts as saved when this note is safely on disk. Postgres updates the real table files later.

This file is the **write-ahead log**, or **WAL**. "Write-ahead" means that Postgres writes the note *before* the real change. Say the server crashes while it updates the table files. On restart, Postgres reads the WAL and does again the changes that did not reach the tables. So no saved change is lost.

Think of a shop's till roll. It prints every sale, in order, as it happens. At the end of the day, the shelves show what is left, but the roll shows everything that happened.

**Where the comparison stops working:** a shop keeps a till roll forever. Postgres deletes old WAL files when it no longer needs them, unless something asks it to keep them. This matters later.

The key idea: **the WAL already contains every change, in the order it happened.** CDC does not add a new record of changes. It reads the record that is already there.

### How a program reads the WAL

The WAL uses an internal format, made for the database, not for other programs. These Postgres parts make it readable:

- **Logical decoding** turns WAL entries into clear descriptions like "row inserted into `products` with these values". Before PostgreSQL 19, you must turn it on with the setting `wal_level = logical`. From version 19, it can also turn on by itself when someone creates the first logical replication slot.
- An **output plugin** decides the format. Postgres includes one called `pgoutput`.
- A **replication slot** is a named bookmark for one reader. It remembers how far that reader got, survives crashes, and tells Postgres: *don't delete any WAL that this reader has not seen yet.*

Postgres's own **logical replication** feature uses these parts to copy chosen tables to another Postgres database, in the same order as on the original.

To send changes to something that is not Postgres, like a search service, most teams use a CDC tool.

---

## Debezium: changes as events

**Debezium** is a popular open-source CDC tool. It has connectors (plug-ins that read one kind of database) for many databases, including PostgreSQL, MySQL, MongoDB, SQL Server and Oracle. Its PostgreSQL connector works like this:

1. **Snapshot.** The first time it connects, it reads the current contents of the tables. So the copies start complete.
2. **Stream.** Then it reads new changes through logical decoding, with its own replication slot.
3. **Publish.** It turns each change into an event and sends it to **Apache Kafka**, a popular message broker. By default, each table gets its own Kafka **topic** (a named stream of events), such as `shop.public.products`. Without Kafka, Debezium Server can send events to other brokers.

![Many writers change the database. The database writes every change to the WAL. Debezium reads the WAL, sends each change as an event through Kafka, and the search updater keeps the search index close to the database.](/diagrams/change-data-capture-2.svg)

A change event looks like this (shortened):

```json
{
  "op": "u",
  "before": { "id": 42, "name": "Trail shoe", "stock": 3 },
  "after":  { "id": 42, "name": "Trail shoe", "stock": 0 },
  "source": { "table": "products", "lsn": 24023128 }
}
```

- `op` is the kind of change. It is `c` for create (insert), `u` for update, `d` for delete, and `r` for a row read during the first snapshot.
- `before` and `after` are the row before and after the change. By default, Postgres gives only the primary key in `before`. For a full old row, like here, you need a table setting (see Going deeper).
- `source` says where the change came from. `lsn` is the position of the change in the WAL.

Now the search updater reacts to each event, with no timetable:

```js
// Called once for every event on the products topic
async function onProductChange({ op, before, after }) {
  if (op === "d") return search.remove(before.id);
  await search.upsert(after.id, { name: after.name, inStock: after.stock > 0 });
}
```

If someone deleted a product, remove it from search. If not, **upsert** it: insert it if it is new, or overwrite it if it exists. A shoe that sells out at 10:05 leaves the "in stock" results seconds later, not at 11:00.

The code that saves products does not know that search exists. Every writer changes the database, the WAL records each change, and the search index follows.

### What CDC is good for

- **Search indexes** that stay close to the database
- **Cache invalidation:** remove a cached copy as soon as its row changes
- **Analytics:** stream changes into a data warehouse, instead of a full copy every night
- **The outbox relay:** Debezium can read new outbox rows from the WAL and publish them, so nothing polls the outbox table. It includes a ready-made outbox event router.

---

## How it goes wrong

CDC removes the old data problem, but it has costs. Think about them before you add CDC.

### Cost 1: One more system to run, and a disk that can fill up

A batch job is one function. CDC usually means Debezium, Kafka Connect (the system that Debezium runs inside) and Kafka. You must run, watch and upgrade all of them.

The biggest danger is the replication slot. It tells Postgres to keep the WAL until the reader has seen it. If Debezium stops and nobody notices, Postgres keeps all WAL from that moment on, and the disk slowly fills. The Postgres docs warn that in extreme cases, an unused slot can even force the database to shut down. A slot left behind by a test from months ago does the same.

![The WAL grows from left to right. The replication slot marks where Debezium stopped. Postgres must keep every entry after the bookmark, so the disk fills while Debezium is stopped.](/diagrams/change-data-capture-3.svg)

### Cost 2: Your table shape becomes a promise

Before CDC, only your app read your tables. Now the search updater reads `after.stock`. If someone renames `stock` to `quantity`, the updater breaks, but your app works. Postgres's logical replication does not copy changes to the table shape either. Its docs say that you must keep schema changes (changes to the shape of tables) in sync by hand.

Treat CDC readers like users of a public API (a contract that other programs rely on). Change tables in safe steps: add the new column, update every reader, then remove the old column.

> **Go deeper:** [You renamed one column and the live app crashed](/lessons/database-migrations) (Level 2) shows how to change tables in safe steps.

### Cost 3: Order and duplicates

Changes to the **same row** arrive in order, because Debezium uses the row's primary key as the event's key. Kafka keeps events with the same key in order. But Debezium can read changes to **different** rows or tables in a different order than they happened. Say your search updater needs a product and its category together. For a short time, it can see one without the other.

Also, after a crash, the same change can arrive twice. The Postgres docs say that clients must be ready for this. So readers must be **idempotent**: if a reader handles an event twice, the effect must be the same as once. "Set product 42 to these values" is safe. "Add 1 to the sale count" is not.

### Cost 4: It copies everything, including secrets

By default, CDC sends every column of every captured table into Kafka. This includes email addresses and password hashes (scrambled passwords). In Kafka, more programs and people can read them. Debezium can capture only chosen tables (`table.include.list`) and leave out columns (`column.exclude.list`). Use both.

### Cost 5: It's fast, not instant

The copy is still a little behind. This is **eventual consistency**: the copy will match soon, but not at the same moment. For search results, that is fine. To decide whether to sell the last pair of shoes, always ask the database.

---

## What good looks like: choose by how fresh the copy must be

The right answer depends on how old the copy can be, and how big your app is.

| Situation | Good choice |
|---|---|
| Small app, a few thousand rows | Maybe no copy at all: Postgres has built-in full text search |
| Copy can be an hour or a day old (reports) | A batch job is simple and fine |
| Copy should be seconds behind, few code paths | Update it from a background job via the outbox |
| Copy should be seconds behind, many writers, several copies | CDC |

The first row matters most. Every copy can get out of date, so first ask whether you need a second copy at all. If you use CDC:

- **Set alerts on replication slots** that hold a lot of WAL. Drop slots that you no longer use.
- **Capture only the tables and columns that you need.**
- **Make every reader idempotent.** Test it: send the same event twice.
- **Keep a way to build the copy again from nothing**, such as Debezium's snapshot. One day the copy will drift anyway.

> **Go deeper:** [What if your database remembered everything that ever happened?](/lessons/event-sourcing) (Level 5) takes the idea of "the log is the truth" much further.

---

## Test it yourself

1. **List your copies.** For each copy, write down how changes reach it. Ask your AI: *"Where does my app keep copies of database data: search, caches, analytics, other services?"*
2. **Time the delay.** Change a product name. Time how long each copy takes to show it.
3. **Delete something.** Delete a test product. Check that it disappears from every copy. Missed deletes are the most common gap.
4. **If you use Postgres CDC, check your slots** in the database console:

```sql
SELECT slot_name, active,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS wal_held
FROM pg_replication_slots;
```

This query lists every replication slot, if a reader is connected now (`active`), and how much WAL each slot keeps. A slot with `active = false` and a large, growing `wal_held` will soon become a disk problem.

---

## Takeaways

**Key terms**
- **Source of truth and derived data:** the place with the real answer, and copies that you can build again from it
- **Batch job:** a copy of data in large groups, on a timetable
- **Dual write:** your code writes the same fact to two places, which can disagree
- **Change data capture (CDC):** read every change from the database itself and send it to the copies
- **Write-ahead log (WAL):** the database's log of every change, written before the table files change
- **Logical decoding:** turns WAL entries into readable changes
- **Replication slot:** a reader's bookmark; Postgres keeps all WAL after it
- **Debezium:** an open-source CDC tool that turns database changes into events

**Which step broke?**
- Copy is always up to an hour behind → a batch job on a timetable
- Copy misses changes made outside the app → dual writes in your code
- Deleted items never leave search → sync by `updatedAt`
- Database disk continues to grow → an inactive replication slot
- Updater crashes after a migration → a renamed column that it still reads
- Counts in a copy are too high after a restart → a reader that is not idempotent

**Ask your AI**
- *"List every place my app keeps a copy of database data, how each copy is updated, and the longest it can be out of date."*
- *"Does any code update a search index or cache right after a database write? What happens if the second write fails, or if data is changed outside this code?"*
- *"If we used change data capture, which tables and columns would we capture, which would we exclude, and how would we monitor the replication slot?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Physical vs logical replication.** Postgres can copy data in two ways. Physical replication copies the WAL byte for byte to an identical standby server (a second server that is ready to take over). Read replicas (copies of the database for reads only) usually work this way. Logical replication decodes the WAL into row changes, based on the identity of each row (usually its primary key). So the reader can be a different Postgres version, a subset of tables, or a system that is not Postgres, through a tool like Debezium.

**What `before` contains.** For updates and deletes, the table's `REPLICA IDENTITY` setting decides how much of the old row appears in `before`. By default it is only the primary key. `REPLICA IDENTITY FULL` logs the whole old row, which makes the WAL larger.

**Quiet tables in a busy database.** A replication slot covers a whole database. Say Debezium captures only a quiet table while other tables are busy. Then the slot may not move forward for a long time, and WAL builds up. Debezium's docs suggest heartbeat events (`heartbeat.interval.ms`), small regular events that keep the slot moving.

**Other ways to capture changes.** Before log-based tools, teams used database triggers (code that the database runs on each change) to copy each change into a "changes" table. Other teams used queries that polled for rows with a newer `updatedAt`. Triggers add work to every write. Polling cannot see deletes and adds load. Debezium's docs give two reasons to read the log instead: it captures deletes, and it does not need polling.

**CDC and the outbox together.** Debezium's outbox event router reads inserts into an outbox table. It sends each one to a topic named after the row's `aggregatetype` column. Your app writes business data and the outbox row in one transaction, and CDC does the sending. This gives you the safety of the outbox and the speed of the log.

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
