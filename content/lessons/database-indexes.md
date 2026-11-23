---
title: "Fast with 100 users, frozen at 10,000. The missing index"
slug: database-indexes
order: 44
level: 4
levelName: Reliability & scale
concepts: [Indexes, Full table scan, Query speed, EXPLAIN ANALYZE, Write cost of indexes]
readTime: 14 min
quiz:
  - question: "Your app was fast with 100 users and became very slow at 10,000. The code didn't change. The slow query looks up rows by user_id, and that column has no index. What is the most likely reason?"
    options:
      - text: "The database became slower because it is older"
      - text: "The database reads the whole table on every request, and the table and the number of requests both grew"
        correct: true
      - text: "Your hosting platform limits apps with more than 10,000 users"
      - text: "Indexes stop working after the table reaches a certain size"
    explanation: "Without an index, the database checks every row to find one user's rows. That work grows with the table. More users also means more requests doing that work at the same time, so the two growths multiply."

  - question: "You run EXPLAIN ANALYZE and see \"Seq Scan on check_ins\" with \"Rows Removed by Filter: 1799820\". What does this tell you?"
    options:
      - text: "The query is using an index correctly"
      - text: "1,799,820 rows were deleted from the table"
      - text: "The database read about 1.8 million rows and threw away almost all of them to find the few it needed"
        correct: true
      - text: "The query failed and should be run again"
    explanation: "A Seq Scan reads every row. \"Rows Removed by Filter\" counts the rows it checked and didn't need. A big number there, next to a small result, is the classic sign of a missing index."

  - question: "To be safe, the AI suggests adding an index on every column of every table. What is the main problem with that?"
    options:
      - text: "Every insert, update and delete must also update every index, so writes get slower and the database uses more disk space"
        correct: true
      - text: "PostgreSQL only allows one index per table"
      - text: "Indexes make reading data slower"
      - text: "Nothing, more indexes are always better"
    explanation: "An index is a second, sorted copy of some data that the database must keep up to date. Each extra index adds work to every write and takes space. Index the columns your queries actually search, join or sort by."

  - question: "Your table has 300 rows. You add an index on user_id, but EXPLAIN still shows a Seq Scan. Why might the database ignore the index?"
    options:
      - text: "The index was created wrongly and must be deleted"
      - text: "Indexes only work on primary keys"
      - text: "EXPLAIN always shows Seq Scan, even when an index is used"
      - text: "For a tiny table, reading the whole table is cheaper than using the index, so the planner chooses the scan"
        correct: true
    explanation: "The query planner estimates the cost of each option. A few hundred rows may fit in a few pages, so reading them all is the fastest plan. Test indexes with realistic amounts of data."

  - question: "You need to add an index to a busy table with 50 million rows in production. Why might you use CREATE INDEX CONCURRENTLY?"
    options:
      - text: "It builds the index faster than a normal CREATE INDEX"
      - text: "A normal CREATE INDEX blocks inserts, updates and deletes on the table until it finishes, which can freeze your app"
        correct: true
      - text: "It is the only way to create an index in PostgreSQL"
      - text: "It makes the index smaller"
    explanation: "A normal index build lets reads continue but blocks writes until it is done. On a big table that can take minutes. CONCURRENTLY lets writes continue, but it takes longer and has a few rules of its own."

  - question: "Your app runs this query on every page load: find a user's orders, newest first, 20 at a time (WHERE user_id = ? ORDER BY created_at DESC). Which index fits best?"
    options:
      - text: "An index on created_at only"
      - text: "An index on (created_at, user_id), in that order"
      - text: "An index on (user_id, created_at), in that order"
        correct: true
      - text: "No index, because ORDER BY can't use indexes"
    explanation: "A multi-column index works best when the query filters on its first column. With (user_id, created_at), the database jumps to one user's orders, which are already sorted by date, and reads only the first 20."
---

# Fast with 100 users, frozen at 10,000. The missing index

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Table and row:** a table holds one kind of thing, like orders. Each row is one item. *([Your app forgot everyone's messages overnight. Why?](/lessons/what-is-a-database))*
> - **Query:** a request to the database, written in SQL, such as "find this user's orders". *([You changed your name. Half the app still shows the old one](/lessons/designing-tables))*
> - **Primary key and foreign key:** a column that labels each row (usually `id`), and a column that points to another table's `id` (like `user_id`). *([You changed your name. Half the app still shows the old one](/lessons/designing-tables))*
> - **Timeout:** the longest you'll wait for an answer before giving up. *([The payment timed out. Did it go through?](/lessons/timeouts-and-retries))*

## The launch that worked too well

You built a habit tracker with AI. Every day, users tick off their habits: "ran", "read 20 pages", "drank water". Each tick is saved as a row in a `check_ins` table. The dashboard shows each user's last 30 days.

For three months, you have about 100 users. The dashboard loads in a blink.

Then someone posts your app on social media. In one week, you have 10,000 users. And the app starts to die:

- The dashboard takes 6 seconds, then 15.
- Logins start failing with timeouts.
- Your database provider's dashboard shows the database's CPU at 100%, all day.

You didn't change a line of code. The same query that took milliseconds now takes seconds.

Very often, this story has one cause: a missing **index**. This lesson explains what an index is, how to prove one is missing, and why adding indexes everywhere is not the answer either.

---

## The mental model: the index at the back of a book

Imagine a 900-page cookbook, and you want every recipe with lemons. Without an index, you start at page 1 and read every page. With the index at the back, you look under "L", find "lemon: pages 14, 212, 655", and go straight there.

A database works the same way.

- With no index, the database checks **every row** in the table, one by one: "Is this one for user 4821? Is this one?" This is called a **full table scan**. PostgreSQL calls it a **sequential scan**, or **Seq Scan**.
- An **index** is a separate, sorted list of the values in one or more columns. Next to each value, it stores where the matching rows are. The database searches the sorted list, then jumps straight to the right rows.

Why does sorting help so much? Think of finding one name in a sorted list of a million names. Open the middle, see whether your name comes before or after, and throw away the half you don't need. Each step halves what's left. After 20 steps, you're down to one name, because 2 to the power of 20 is just over a million. A scan of the same list checks up to a million names.

PostgreSQL's default index type is the **B-tree**, a sorted structure built for this kind of search. B-tree indexes handle "equals" (`=`), ranges (`<`, `>`, `BETWEEN`) and sorting.

**Where the comparison stops working:** a book's index is written once. A database index must change every time the data changes. Every new row, edit or delete also updates every index on that table. That's the price of an index, and we'll come back to it.

### Why it was fast with 100 users

With 100 users, the `check_ins` table had maybe 20,000 rows. Scanning 20,000 rows is quick enough that nobody notices. The PostgreSQL documentation even warns that for tiny tables, a scan is often the *fastest* plan: all the rows fit in a few small blocks of storage, and reading them all is cheaper than using an index. The database reads data in these small blocks, called **pages**.

That's why the bug hides. Your laptop and your first users never have enough data to show it.

### Why it froze at 10,000

Two things grew at once:

1. **The table.** 10,000 users × 3 habits × 60 days is 1.8 million rows. Every dashboard load scans all of them to find about 180.
2. **The number of requests.** 100 times more users means about 100 times more dashboard loads.

The work per request grew 100 times, and the number of requests grew 100 times. Together, that's roughly **10,000 times** more work for the database. The database server has only a few CPU **cores**: parts of the CPU that can each work on one thing at a time. Once they're all busy, new queries wait in line, and every page in your app, even the login page, waits behind them. That's the "freeze".

---

## How it goes wrong

### Bug 1: Filtering on a column with no index

Here's the dashboard query the AI wrote, with Prisma:

```js
const checkIns = await prisma.checkIn.findMany({
  where: { userId: req.user.id },
  orderBy: { date: "desc" },
  take: 30,
});
```

In plain English: find the check-ins that belong to this user, newest first, and give me 30.

The code is correct. The problem isn't in the code. It's in the table: nothing tells the database how to find one user's rows quickly. The AI created the table with a `userId` foreign key, and many people assume a foreign key is indexed automatically. In PostgreSQL, it isn't. A primary key or a unique constraint gets an index automatically. A foreign key doesn't.

### Bug 2: Searching in a way the index can't help

Even with an index, some searches can't use it:

- `WHERE email LIKE '%@example.com'`: a search that starts with a wildcard (`%`). A sorted list helps you find names that *start* with "Sam", not names that *end* with "son". `LIKE 'sam%'` can use a B-tree index (in PostgreSQL, the index usually has to be created in a special way for this, which the docs describe). `LIKE '%son'` can't use one at all.
- `WHERE lower(email) = 'sam@example.com'`: the index holds `email`, not `lower(email)`, so the database can't use it for this search.

---

## What good looks like

### Step 1: Ask the database how it runs the query

Don't guess. Put `EXPLAIN ANALYZE` in front of the query and run it in your database's SQL editor:

```sql
EXPLAIN ANALYZE
SELECT * FROM check_ins WHERE user_id = 4821;
```

- `EXPLAIN` shows the **query plan**: the steps the database has chosen to run the query. The part of the database that chooses is called the **query planner**.
- `EXPLAIN ANALYZE` actually runs the query and adds real timings.

Be careful: because `ANALYZE` really runs the query, `EXPLAIN ANALYZE` on an `UPDATE` or `DELETE` really changes data. For those, the docs suggest running it between `BEGIN;` and `ROLLBACK;`, which undoes the change.

Here's output like what you'd see before the fix, on PostgreSQL 18 or newer (your numbers will differ):

```text
Gather  (cost=1000.00..23627.60 rows=176 width=40) (actual time=1.204..118.637 rows=180.00 loops=1)
  Workers Planned: 2
  Workers Launched: 2
  Buffers: shared hit=13235
  ->  Parallel Seq Scan on check_ins  (cost=0.00..22610.00 rows=73 width=40) (actual time=38.117..112.524 rows=60.00 loops=3)
        Filter: (user_id = 4821)
        Rows Removed by Filter: 599940
        Buffers: shared hit=13235
Planning Time: 0.091 ms
Execution Time: 118.701 ms
```

You can ignore most of it. Read these parts:

- **`Parallel Seq Scan on check_ins`**: a full table scan. "Parallel" and "Gather" mean PostgreSQL split the scan between three helpers (`loops=3`) and combined their results. It's still reading the whole table.
- **`Filter` and `Rows Removed by Filter: 599940`**: each helper checked about 600,000 rows and threw away all but 60. That's 1.8 million rows read to return 180.
- **`Buffers: shared hit=13235`**: the scan touched 13,235 pages.
- **`Execution Time: 118.701 ms`**: about a tenth of a second, on every dashboard load.
- **`cost=...`**: the planner's estimate, in its own units, not milliseconds. Useful for comparing plans, not as a time.

On PostgreSQL versions before 18, you won't see `Buffers` lines unless you ask for them, and row counts appear as whole numbers (`rows=180` instead of `rows=180.00`).

### Step 2: Add the index

In SQL:

```sql
CREATE INDEX check_ins_user_id_idx ON check_ins (user_id);
```

In plain English: build a sorted list of every `user_id` in `check_ins`, with a pointer to each row, and name it `check_ins_user_id_idx`.

With Prisma, you add a line to the model in your schema file and create a migration, so the change is tracked like any other change to your tables:

```text
model CheckIn {
  id     Int      @id @default(autoincrement())
  userId Int
  date   DateTime
  @@index([userId])
}
```

The last line, `@@index([userId])`, asks Prisma to create an index on `userId`. (By default, Prisma names the table and column after the model, `CheckIn` and `userId`. The SQL in this lesson uses `check_ins` and `user_id`, so adjust the names to match your own database.)

> **Go deeper:** [You renamed one column and the live app crashed](/lessons/database-migrations) (Level 2) explains migrations.

Run `EXPLAIN ANALYZE` again:

```text
Index Scan using check_ins_user_id_idx on check_ins  (cost=0.43..708.12 rows=176 width=40) (actual time=0.031..0.402 rows=180.00 loops=1)
  Index Cond: (user_id = 4821)
  Index Searches: 1
  Buffers: shared hit=184
Planning Time: 0.112 ms
Execution Time: 0.437 ms
```

- **`Index Scan using check_ins_user_id_idx`**: the database used your index.
- **`Index Cond`**: the condition was answered by the index, not by checking every row. No more "Rows Removed by Filter".
- **184 pages instead of 13,235, and 0.4 ms instead of 118 ms.** In this example, that's roughly 270 times faster, and the gap grows as the table grows.

Sometimes you'll see `Bitmap Index Scan` and `Bitmap Heap Scan` instead of `Index Scan`. That's another way of using the same index, often chosen when many rows match.

### Step 3: Know the price

An index is not free:

- **Every write gets slower.** Inserting one check-in now writes the row *and* an entry in each index on the table. With six indexes, every insert writes to seven places. The PostgreSQL docs put it plainly: indexes add overhead to changes, so indexes that are seldom or never used should be removed.
- **Indexes take disk space**, and on a big table, an index can be large.
- **Building one blocks writes.** By default, `CREATE INDEX` lets other queries read the table, but blocks inserts, updates and deletes until the build is done. On a table with millions of rows, that can take minutes, and your app can't save anything meanwhile. In production, use `CREATE INDEX CONCURRENTLY`, which lets writes continue. It takes longer and can't run inside a **transaction** (a group of database changes that succeed or fail together), so check how your migration tool handles it.

At scale, this is a real trade-off. A table with thousands of writes per second and few reads, like an event log, should have very few indexes. A table read on every page load deserves indexes for its common searches.

### Which columns to index

Index a column when your queries regularly:

- **Filter on it** and get back a small part of the table: `WHERE user_id = ?`, `WHERE email = ?`, `WHERE status = 'pending'` (if few rows are pending).
- **Join on it**: foreign keys like `user_id` or `post_id`. Remember, PostgreSQL doesn't index these for you.
- **Sort by it with a limit**: `ORDER BY created_at DESC LIMIT 20`.

For a query that filters on one column and sorts by another, one index on both columns can do both jobs. This is a **multi-column index**. Order matters: the PostgreSQL docs say these indexes are most efficient when the query filters on the leading (first) columns. For "this user's orders, newest first", use `(user_id, created_at)`, not `(created_at, user_id)`.

Usually don't index:

- Columns you never search, join or sort by
- Columns where most rows have the same value, like a `true`/`false` column that's `true` for 95% of rows. The planner will often scan anyway.
- Small tables that will stay small
- Columns that already have one: primary keys and unique columns get an index automatically. Adding another one duplicates it.

> **Go deeper:** [Your app tried to load 50,000 rows at once](/lessons/pagination) (Level 4) shows how indexes make "next page" fast, and [One page, 500 database queries](/lessons/n-plus-one-queries) (Level 4) covers a different cause of slow pages.

---

## Test your own app

1. **Find your slowest queries.** If you use Supabase, open the **Query Performance** report in the dashboard. Select a query and open its **Indexes** tab to see suggested indexes. Other providers have similar pages. You can also ask your AI to turn on query logging with timings.
2. **Run `EXPLAIN ANALYZE`** on each slow query in your SQL editor. Look for `Seq Scan` with a large `Rows Removed by Filter`.
3. **List foreign keys without indexes.** Ask your AI: *"List every foreign key column in my schema and whether it has an index."*
4. **Test with realistic data, in staging, never production.** Fill a test table with a million fake rows, then run your query and `EXPLAIN ANALYZE` again:

```sql
INSERT INTO check_ins (user_id, habit, date)
SELECT floor(random() * 10000)::int + 1,
       'test habit',
       now() - random() * interval '365 days'
FROM generate_series(1, 1000000);
ANALYZE check_ins;
```

In plain English: create one million rows with random user IDs from 1 to 10,000 and random dates in the past year. `generate_series(1, 1000000)` produces the numbers 1 to 1,000,000, one row each. The final `ANALYZE` (without `EXPLAIN`) updates the statistics the planner uses to choose a plan. If your `user_id` column is a foreign key, you'll need 10,000 test users first.

> **Go deeper:** [Why you should never test on your real users](/lessons/dev-staging-production) (Level 3) explains staging.

---

## Takeaways

**Key terms**
- **Full table scan (Seq Scan):** reading every row to find the ones you need
- **Index:** a separate, sorted list of a column's values with pointers to the rows, kept up to date by the database
- **B-tree:** PostgreSQL's default index type, good for equals, ranges and sorting
- **Query plan:** the steps the database chooses to run a query, shown by `EXPLAIN`
- **`EXPLAIN ANALYZE`:** runs the query and shows the plan with real timings
- **Multi-column index:** one index on several columns, most useful when queries filter on its first column

**Red flags**
- `Seq Scan` with a big `Rows Removed by Filter` on a query that runs on every page load
- A foreign key column (`user_id`, `post_id`) with no index
- Searches like `LIKE '%text'` or `lower(column) = ...` on a large table
- "It's fast on my laptop" with a test table of 50 rows
- An index on every column "to be safe", on a table with lots of writes
- `CREATE INDEX` without `CONCURRENTLY` on a big, busy production table

**Ask your AI**
- *"Here is my slowest query and its EXPLAIN ANALYZE output. Explain each line, and tell me whether an index would help."*
- *"List the queries my app runs on every page load, and the index each one uses. Which ones would do a full table scan?"*
- *"Which indexes in my database are never used? Show me how to check before I remove any."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**How a B-tree stays shallow.** A B-tree is a tree of pages. Each page holds many sorted keys, so each step down the tree narrows the search far more than halving it. That's why an index lookup on millions of rows touches only a few pages before it reaches the rows.

**Index Only Scan.** If an index contains every column a query needs, PostgreSQL can answer from the index alone and skip reading the table. The plan shows `Index Only Scan`. You can design for this by adding the extra columns to the index, but the index grows.

**Expression and partial indexes.** For `WHERE lower(email) = ?`, create an index on the expression: `CREATE INDEX ON users (lower(email));`. A **partial index** covers only some rows: `CREATE INDEX ON orders (created_at) WHERE status = 'pending';` is small and fast if few orders are pending.

**Other index types.** PostgreSQL also has GIN indexes (for searching inside JSON, arrays and full-text search), GiST, BRIN (tiny indexes for huge tables where values follow the physical order, like timestamps in a log) and hash indexes. B-tree is the right default for most columns.

**Finding unused indexes.** PostgreSQL counts how often each index is used in the `pg_stat_user_indexes` view (the `idx_scan` column). An index with zero scans over weeks of real traffic is a candidate for removal.

**When CONCURRENTLY fails.** If `CREATE INDEX CONCURRENTLY` fails, for example because of duplicate values in a unique index, it leaves behind an **invalid** index. The database ignores it for searches but still updates it on every write. The fix is to drop it and try again.

**Supabase index_advisor.** Supabase offers an `index_advisor` extension that takes a query and suggests indexes, with before-and-after cost estimates. You can also reach it from the Query Performance report. Its docs say it only recommends single-column B-tree indexes, so treat its advice as a starting point, not the full answer.

**Reading plans for complex queries.** Plans are trees: indented lines with `->` are steps that feed the line above. Read from the most indented line outward.

</details>

## References

- [Indexes: Introduction](https://www.postgresql.org/docs/current/indexes-intro.html): PostgreSQL documentation. The book index analogy, scanning the whole table without an index, the overhead indexes add to data changes, and writes being blocked during a normal CREATE INDEX.
- [Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html): PostgreSQL documentation. The format of EXPLAIN and EXPLAIN ANALYZE output (Seq Scan, Filter, Rows Removed by Filter, Index Cond, Index Searches, Buffers), costs in arbitrary units, and using BEGIN/ROLLBACK for data changes.
- [PostgreSQL 18 release notes](https://www.postgresql.org/docs/18/release-18.html): PostgreSQL. BUFFERS shown automatically with EXPLAIN ANALYZE, fractional row counts, and index lookup counts.
- [Index Types](https://www.postgresql.org/docs/current/indexes-types.html): PostgreSQL documentation. B-tree is the default, the operators it supports, and `LIKE 'foo%'` versus `LIKE '%bar'`.
- [Multicolumn Indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html) and [Unique Indexes](https://www.postgresql.org/docs/current/indexes-unique.html): PostgreSQL documentation. Leading columns matter most; primary keys and unique constraints get an index automatically.
- [Examining Index Usage](https://www.postgresql.org/docs/current/indexes-examine.html): PostgreSQL documentation. Run ANALYZE first, test with real data, and why tiny test tables are misleading.
- [CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html) and [Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html): PostgreSQL documentation. Building indexes CONCURRENTLY, its limits and invalid indexes; foreign keys are not indexed automatically.
- [index_advisor](https://supabase.com/docs/guides/database/extensions/index_advisor): Supabase documentation. Index suggestions in the Query Performance report, limited to single-column B-tree indexes.
