---
title: "Two transactions, one wrong answer"
slug: isolation-levels
order: 48
level: 4
levelName: Reliability & scale
concepts: [Isolation levels, Dirty reads, Non-repeatable reads, Phantom reads, Lost updates, Write skew, Serializable, Serialization failures]
readTime: 14 min
quiz:
  - question: "A class has 20 spots and 19 bookings. Two people book at the same moment. Each booking runs in a transaction that counts the bookings, sees 19, and inserts a new one. The database uses PostgreSQL's default isolation level. What happens?"
    options:
      - text: "One transaction waits for the other, so only one booking is saved"
      - text: "Both see 19, both insert, and the class ends up with 21 bookings"
        correct: true
      - text: "PostgreSQL rejects the second booking with an error"
      - text: "Both bookings are rolled back"
    explanation: "Read Committed only shows each statement the data that was committed when it started. Neither transaction has committed when the other counts, so both see 19. They insert different rows, so nothing makes either one wait."

  - question: "What is a dirty read, and can it happen in PostgreSQL?"
    options:
      - text: "Reading data from a backup. Yes, at any level"
      - text: "Reading a row twice and getting two values. Only at Serializable"
      - text: "Reading a row that has been deleted. Yes, at Read Committed"
      - text: "Reading another transaction's changes before it commits. No, PostgreSQL never allows it"
        correct: true
    explanation: "A dirty read sees work that might still be rolled back. The SQL standard allows it at Read Uncommitted, but PostgreSQL treats Read Uncommitted exactly like Read Committed, so it never happens."

  - question: "You switch your booking transaction to Serializable. Under load, some requests now fail with SQLSTATE 40001, \"could not serialize access\". What should your code do?"
    options:
      - text: "Retry the whole transaction from the beginning, including the reads and checks, a limited number of times"
        correct: true
      - text: "Retry only the last INSERT statement"
      - text: "Switch back to Read Committed, because Serializable is broken"
      - text: "Show the user an error and never retry"
    explanation: "A serialization failure means the database cancelled your transaction to keep the result correct. The reads it was based on may be out of date, so the whole transaction must run again, including the logic that decided what to write. PostgreSQL doesn't retry for you."

  - question: "Under PostgreSQL's Repeatable Read, two transactions read a product's stock (5) and both try to UPDATE it to 4. What happens?"
    options:
      - text: "Both succeed and the stock is 4, so one sale is lost"
      - text: "Both succeed and the stock is 3"
      - text: "The second one to update gets a serialization error after the first commits, so the lost update is caught"
        correct: true
      - text: "Repeatable Read blocks the second transaction forever"
    explanation: "Repeatable Read won't let a transaction update a row that another transaction changed and committed after its snapshot was taken. It cancels it with \"could not serialize access due to concurrent update\", and your code retries."

  - question: "Why doesn't Repeatable Read stop the 21-bookings problem?"
    options:
      - text: "Because Repeatable Read allows dirty reads"
      - text: "Because the two transactions insert different rows, so there is no single row they both change. This is write skew"
        correct: true
      - text: "Because Repeatable Read doesn't use transactions"
      - text: "It does stop it"
    explanation: "Repeatable Read catches two transactions changing the same row. Here each transaction reads the same data but writes a different new row, so no conflict is visible at that level. Only Serializable, or an explicit lock, catches this."

  - question: "Inside a Serializable transaction that may be retried, your code calls the payment service to charge the customer. What is the risk?"
    options:
      - text: "None, the database will undo the charge on retry"
      - text: "The payment service will refuse the request"
      - text: "Serializable transactions can't make network calls"
      - text: "Each retry can charge the customer again, because the database can't undo a call to another service"
        correct: true
    explanation: "A rollback only undoes changes in your own database. Keep outside calls out of transactions that may be retried, or protect them with an idempotency key."
---

# Two transactions, one wrong answer

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Transaction:** a group of database changes that succeed or fail together, ending in `COMMIT` (save) or `ROLLBACK` (undo). *([A customer got charged twice. How?](/lessons/charged-twice))*
> - **Lost update:** two requests read the same value, and one write silently overwrites the other. *([A customer got charged twice. How?](/lessons/charged-twice))*
> - **Row lock (`SELECT ... FOR UPDATE`):** makes other transactions wait before changing a row you're working on. *([A customer got charged twice. How?](/lessons/charged-twice))*
> - **Retry with backoff:** trying a failed operation again, waiting a little longer, with some randomness, each time. *([The payment timed out. Did it go through?](/lessons/timeouts-and-retries))*

## 21 people in a class with 20 spots

You run a booking app for a yoga studio. Each class has 20 spots. After reading about double charges, you were careful: the booking code runs inside a **transaction**. It counts the bookings for the class, and only adds a new one if there are fewer than 20.

On Monday, the 6 pm class shows **21 bookings**. Twenty-one people arrive with mats.

You check the logs. The last two bookings arrived 15 milliseconds apart. Here's what the database did:

| Time | Transaction A (Mia) | Transaction B (Leo) |
|---|---|---|
| 0 ms | Counts bookings: 19 | |
| 15 ms | | Counts bookings: 19 |
| 20 ms | 19 < 20, inserts Mia's booking | |
| 25 ms | Commits | |
| 30 ms | | 19 < 20, inserts Leo's booking |
| 35 ms | | Commits |

Each transaction was correct on its own. Together, they produced a wrong answer.

The transaction did its job: all or nothing. What it did *not* do is keep the two apart. Leo's count ran while Mia's booking was still unsaved, so it saw 19. How strictly transactions are kept apart is the **I** in ACID, **isolation**. It's a choice between levels, and your database picked one for you.

---

## The mental model: as if there were a queue

The perfect result is easy to describe: **the outcome is the same as if the transactions had run one at a time, in some order.** If Mia had gone first and Leo second, Leo would have counted 20 and been told "full". Running one after another is called **serial** execution.

Databases don't really run transactions one at a time: that would be far too slow. Hundreds run at once. The **isolation level** decides how much of that overlap a transaction can notice, and which strange results are allowed.

Think of a shared calendar on a kitchen wall. The strictest rule is "one person at the calendar at a time": no double bookings, but people wait in line. A looser rule is "take a photo, plan from the photo, then write your booking". Faster, but two people can plan from the same photo and both take the last free slot.

**Where the comparison stops working:** databases have a third option. Everyone works at once, the database watches for dangerous overlaps, and it cancels one transaction if the result couldn't have happened in a queue. That transaction must start again.

### Five ways overlapping transactions go wrong

These problems are called **anomalies**. Here they are in plain words:

| Anomaly | What happens | Example |
|---|---|---|
| **Dirty read** | You read another transaction's change before it commits. It may be rolled back, so you saw something that never existed. | A balance shows $500 from a transfer that then fails |
| **Non-repeatable read** | You read the same row twice in one transaction and get different values, because someone committed a change in between. | A report reads a price twice and gets $80, then $60 |
| **Phantom read** | You run the same search twice and new rows have appeared (or disappeared). | Count bookings: 19. Count again: 20 |
| **Lost update** | Two transactions read a value, both change it, and one write overwrites the other. | Stock 5, two sales, stock ends at 4 |
| **Write skew** | Two transactions read the same data, each changes something *different*, and together they break a rule. | The 21-bookings class |

Write skew is the sneaky one. Mia and Leo never touched the same row. The rule they broke, "at most 20", lives across many rows, so no single row shows the conflict. Another classic: two doctors are on call, and at least one must stay. Each checks "is someone else on call?" at the same moment, sees yes, and goes off call.

### The standard levels

The SQL standard defines four levels by which of the first three anomalies they allow:

| Level | Dirty read | Non-repeatable read | Phantom read |
|---|---|---|---|
| Read Uncommitted | Allowed (never in PostgreSQL) | Possible | Possible |
| Read Committed | No | Possible | Possible |
| Repeatable Read | No | No | Allowed (never in PostgreSQL) |
| Serializable | No | No | No |

Two things to notice. First, **PostgreSQL never allows dirty reads**. If you ask for Read Uncommitted, it gives you Read Committed. Second, Serializable means more than "no phantoms": it promises the queue result, so it rules out every anomaly, including write skew.

---

## What PostgreSQL really does

PostgreSQL's isolation is built on **snapshots**. A snapshot is a frozen view of the database at one moment: every change committed before that moment is in it, and nothing after. The levels differ in *when* the snapshot is taken and *what* gets checked.

### Read Committed: the default

**Read Committed is PostgreSQL's default.** Each statement gets a fresh snapshot when it starts. So within one transaction, two statements can see different data, if someone committed in between. That's why non-repeatable and phantom reads are possible.

In the yoga story, Leo's count got a snapshot at 15 ms. Mia hadn't committed yet, so her booking wasn't in it. (A single `UPDATE` with a condition is still safe here: it waits for the other change and re-checks, as the double-charge lesson showed.)

### Repeatable Read: one snapshot for the whole transaction

At Repeatable Read, the snapshot is taken at the first statement of the transaction and kept until the end. Every read sees the same data, so no non-repeatable or phantom reads.

It also catches lost updates. If your transaction tries to update or delete a row that another transaction changed and committed after your snapshot, PostgreSQL cancels yours with:

```text
ERROR:  could not serialize access due to concurrent update
```

But it **doesn't catch write skew**. Mia and Leo would still both count 19 from their snapshots and insert different rows. No row was changed by both, so nothing is detected.

### Serializable: the queue result, or an error

Serializable works like Repeatable Read, plus it watches which data each transaction read and wrote. If a group of transactions could produce a result that no one-at-a-time order would give, PostgreSQL cancels one of them:

```text
ERROR:  could not serialize access due to read/write dependencies among transactions
```

The other one commits. In the yoga story, Mia's booking is saved, Leo's transaction is cancelled, and when it runs again it counts 20 and says "full".

This tracking doesn't make transactions wait for each other. The price is different: some transactions get cancelled, and the docs warn that it can sometimes cancel one that would have been fine.

Here's the full picture for PostgreSQL:

| Level | Dirty | Non-repeatable | Phantom | Lost update | Write skew |
|---|---|---|---|---|---|
| Read Committed (default) | No | Possible | Possible | Possible* | Possible |
| Repeatable Read | No | No | No | Error, retry | Possible |
| Serializable | No | No | No | Error, retry | Error, retry |

\* When your code reads a value, computes in JavaScript and writes it back. A single `UPDATE` that does the maths itself is safe.

---

## How it goes wrong

### Bug 1: "It's in a transaction, so it's safe"

```js
await prisma.$transaction(async (tx) => {
  const taken = await tx.booking.count({ where: { classId } });
  if (taken >= 20) throw new Error("Class is full");
  await tx.booking.create({ data: { classId, userId: req.user.id } });
});
```

In plain English: inside a transaction, count this class's bookings; if there are 20, stop; otherwise create a booking.

This is the yoga bug. It runs at Read Committed, because Prisma uses your database's default level unless you set one. Two of these can still both count 19. It passes every test where you click one button at a time.

### Bug 2: Turning on Serializable and forgetting the errors

You set the app to Serializable. The 21-bookings bug is gone. But when a popular class opens, some users get a `500` error page. Serialization errors are normal at this level: the database is saying "I cancelled this to keep your data correct, please run it again". Code that doesn't retry them turns correctness into failures.

### Bug 3: Retrying the wrong thing

- **Retrying only the last statement.** The insert was based on a count that's now out of date. The PostgreSQL docs say to retry the *complete* transaction, including the logic that decided what to write. That's why PostgreSQL can't retry for you: it can't re-run your JavaScript.
- **Side effects inside the transaction.** If it sends an email or charges a card, each retry does it again. A rollback only undoes changes in your database.

### Bug 4: Serializable in one place only

Serializable checks for conflicts among transactions that are *also* Serializable. If the booking page uses it but an admin "add attendee" route runs at Read Committed, the two can still overbook together.

---

## What good looks like

### Option 1: Lock the thing the rule is about

The rule is "at most 20 bookings *per class*". So make every booking for a class go through the class's own row:

```js
await prisma.$transaction(async (tx) => {
  await tx.$queryRaw`SELECT id FROM "Class" WHERE id = ${classId} FOR UPDATE`;
  const taken = await tx.booking.count({ where: { classId } });
  if (taken >= 20) throw new Error("Class is full");
  await tx.booking.create({ data: { classId, userId: req.user.id } });
});
```

Only line 2 is new. It locks the class's row. Leo's transaction now waits at line 2 until Mia's commits. Then, because Read Committed gives each statement a fresh snapshot, Leo's count on line 3 sees 20, and he's told the class is full.

Locking the booking rows wouldn't help: the conflict is about a row that *doesn't exist yet*. Locking the parent row turns "a rule across many rows" into "one row everyone queues for".

### Option 2: Serializable, with a retry loop

When the rule is too complex to point at one row, ask the database to find conflicts for you, and retry:

```js
for (let attempt = 1; attempt <= 5; attempt++) {
  try {
    return await prisma.$transaction((tx) => bookSpot(tx, classId, userId), { isolationLevel: "Serializable" });
  } catch (err) {
    if (err.code !== "P2034" || attempt === 5) throw err;
    await new Promise((r) => setTimeout(r, Math.random() * 50 * attempt)); // short random wait, then run it all again
  }
}
```

In plain English:

1. **Lines 1–3:** run the whole booking (`bookSpot` holds the count and insert from Bug 1) as a Serializable transaction. If it commits, return.
2. **Line 5:** Prisma reports write conflicts like this one, and deadlocks, with the code `P2034`. Any other error, or a fifth failure, is passed on. In PostgreSQL itself, every error carries a five-character code called its **SQLSTATE**, and serialization failures always have `40001`.
3. **Line 6:** wait a few random milliseconds so the competing transactions don't collide again, then start over from the count.

Keep the email and the charge *after* the loop, once the booking is committed.

### Option 3: Make it one statement or a constraint

Often the best fix needs no special level: store a `booked` count on the class and claim a spot with one conditional `UPDATE` (`WHERE booked < capacity`) plus a `CHECK` constraint, as in the double-charge lesson.

### Lock or Serializable?

| | `SELECT ... FOR UPDATE` | Serializable + retry |
|---|---|---|
| Best when | The rule belongs to one row you can name (a class, an account, a cart) | The rule spans many rows or tables, and it's hard to say what to lock |
| Under contention | Transactions wait in line | Some fail and run again |
| Main risk | Forgetting the lock in one code path; deadlocks | Missing retry handling; retrying side effects |
| Other code | Must take the same lock | Must also run as Serializable |

### What changes at scale

Both tools get more expensive as more transactions hit the *same* data at once.

- **Locks** line up requests. If each booking holds the class lock for 5 ms, 100 people booking in the same instant means the last one waits about half a second. Fine for one class, not for a row every request touches, like a global counter.
- **Serializable** turns crowding on the same data into retries. Each retry is another full transaction, so a burst of conflicts adds load when the database is busiest. Cap the attempts and add random waits. The PostgreSQL docs also advise declaring transactions `READ ONLY` when they only read.
- **Long transactions hurt both:** locks are held longer, and there's more time for conflicts. Never wait for a network call or a user inside a transaction.

> **Go deeper:** [Two tasks waiting for each other forever](/lessons/locks-and-deadlocks) (Level 4) covers deadlocks, which both tools can cause.

---

## Test your own app

Use your staging database, never production.

1. **Check your level.** In your SQL editor, run `SHOW default_transaction_isolation;`. On a standard PostgreSQL setup it says `read committed`.
2. **Reproduce the overlap by hand.** Open two terminal windows, connect both to staging with `psql` (PostgreSQL's command-line tool), and step through this, one line at a time, alternating between windows:

```sql
BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT count(*) FROM bookings WHERE class_id = 7;   -- run in A, then in B
INSERT INTO bookings (class_id, user_id) VALUES (7, 101);  -- A uses 101, B uses 102
COMMIT;  -- in A, then in B
```

Both commits succeed. Now repeat with `SERIALIZABLE` on the first line: one of the two windows gets `could not serialize access`.

3. **Hit it with parallel requests.** Run the 10-requests-at-once test from the double-charge lesson against your booking, stock or credits route, then count the rows.

---

## Takeaways

**Key terms**
- **Isolation level:** how much concurrent transactions can see of each other, and which anomalies are allowed
- **Snapshot:** a frozen view of committed data at one moment
- **Dirty / non-repeatable / phantom read:** seeing uncommitted data / a changed row / new or missing rows within one transaction
- **Write skew:** two transactions read the same data, write different rows, and together break a rule
- **Read Committed:** PostgreSQL's default; a fresh snapshot for each statement
- **Repeatable Read:** one snapshot per transaction; catches lost updates, not write skew
- **Serializable:** the result of running one at a time, or a serialization failure (SQLSTATE `40001`) that you must retry

**Red flags in AI-written code**
- Count or check, then insert, inside a transaction, with no lock and no stricter level
- "It's in a transaction" given as the reason a race can't happen
- `isolationLevel: Serializable` with no retry around it
- A retry that repeats only the last query, or that repeats emails or charges
- Serializable in one route while other routes change the same data at Read Committed

**Ask your AI**
- *"Find every transaction in my app that reads data, checks a rule, and then writes. Which isolation level does each run at, and could two of them at once break the rule?"*
- *"For this booking flow, compare SELECT ... FOR UPDATE on the parent row with Serializable plus retries. Which fits better, and why?"*
- *"Where does my app handle serialization failures (SQLSTATE 40001 or Prisma P2034)? Retry the whole transaction, at most 5 times, with a short random wait, and no side effects inside."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Why the lock trick needs Read Committed.** In Option 1, Leo's count sees Mia's booking because Read Committed takes a new snapshot for each statement, after the lock wait. At Repeatable Read, the snapshot is taken when the transaction's first statement starts, which is the locking `SELECT` itself, before the wait. Leo's count would then use the old snapshot and still see 19. If you combine locks with a stricter level, think through when the snapshot is taken.

**How Serializable works in PostgreSQL.** It's called Serializable Snapshot Isolation (SSI). It records what each transaction read using **predicate locks**. Despite the name, these never make anyone wait, and they can't cause deadlocks. They only exist to spot dangerous patterns of reads and writes. Because the tracking is approximate, some cancellations are false alarms.

**Which errors to retry.** The PostgreSQL docs say serialization failures (`40001`) can be retried without conditions. Deadlocks (`40P01`) are often worth retrying too. Unique violations (`23505`) sometimes are, for example when two transactions picked the same new key, but they can also be a real, permanent error, so retry them with care. A retry isn't guaranteed to succeed: under heavy contention, it can take several attempts.

**Read-only transactions.** At Repeatable Read, transactions that only read never get serialization failures. At Serializable, a transaction declared `SERIALIZABLE READ ONLY DEFERRABLE` waits at the start until it can run without any risk of being cancelled, which is useful for long reports.

**Other databases differ.** MySQL's InnoDB engine uses Repeatable Read by default, not Read Committed, and its Repeatable Read behaves differently from PostgreSQL's. The same level name doesn't mean the same behavior everywhere. If your app moves between databases, test its concurrent paths again.

**Read Committed's re-check has limits.** The `WHERE` re-check after a wait only looks at the updated row. The PostgreSQL docs say this makes Read Committed unsuitable for commands with complex search conditions, while being right for simple ones.

</details>

## References

- [Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html): PostgreSQL documentation. Anomaly definitions, the isolation level table, Read Committed as default, no dirty reads, snapshot timing, both error messages, SSI, READ ONLY advice.
- [Serialization Failure Handling](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html): PostgreSQL documentation. SQLSTATE 40001, 40P01 and 23505, retrying the complete transaction, no automatic retry, multiple retries.
- [Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html): PostgreSQL documentation. What `SELECT ... FOR UPDATE` blocks and its behavior at stricter levels.
- [Serializable Snapshot Isolation (SSI)](https://wiki.postgresql.org/wiki/SSI): PostgreSQL wiki. Write skew and how Serializable detects it where Repeatable Read doesn't.
- [Transactions and batch queries](https://www.prisma.io/docs/orm/prisma-client/queries/transactions): Prisma documentation. The `isolationLevel` option, database default levels, and retrying P2034 errors.
- [Transaction Isolation Levels (InnoDB)](https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html): MySQL documentation. Repeatable Read as InnoDB's default.
