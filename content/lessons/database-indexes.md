---
title: "Fast with 100 users, frozen at 10,000. The missing index"
slug: database-indexes
order: 44
level: 4
levelName: Reliability & scale
concepts: [Indexes, Full table scan, Query speed, EXPLAIN ANALYZE, Write cost of indexes]
readTime: 14 min
quiz:
  - question: "Your app was fast with 100 users and became very slow at 10,000. The code did not change. The slow query looks up rows by user_id, and that column has no index. What is the most likely reason?"
    options:
      - text: "The database became slower because it is older"
      - text: "The database reads the full table on every request, and both the table and the number of requests grew"
        correct: true
      - text: "Your hosting platform limits apps with more than 10,000 users"
      - text: "Indexes stop working after the table reaches a certain size"
    explanation: "Without an index, the database checks every row to find one user's rows. That work grows with the table. More users also means more requests that do that work at the same time. So the two growths multiply."

  - question: "You run EXPLAIN ANALYZE and see \"Seq Scan on check_ins\" with \"Rows Removed by Filter: 1799820\". What does this tell you?"
    options:
      - text: "The query uses an index correctly"
      - text: "Someone deleted 1,799,820 rows from the table"
      - text: "The database read about 1.8 million rows and threw away almost all of them to find the few that it needed"
        correct: true
      - text: "The query failed, and you must run it again"
    explanation: "A Seq Scan reads every row. \"Rows Removed by Filter\" counts the rows that it checked and did not need. A big number there, next to a small result, is the typical sign of a missing index."

  - question: "To be safe, the AI suggests an index on every column of every table. What is the main problem with that?"
    options:
      - text: "Every insert, update and delete must also update every index. So writes get slower, and the database uses more disk space"
        correct: true
      - text: "PostgreSQL allows only one index per table"
      - text: "Indexes make reading data slower"
      - text: "Nothing. More indexes are always better"
    explanation: "An index is a second, sorted copy of some data, and the database must keep it up to date. Each extra index adds work to every write and uses space. Index the columns that your queries really search, join or sort by."

  - question: "Your table has 300 rows. You add an index on user_id, but EXPLAIN still shows a Seq Scan. Why can the database ignore the index?"
    options:
      - text: "The index is wrong, and you must delete it"
      - text: "Indexes only work on primary keys"
      - text: "EXPLAIN always shows Seq Scan, even when the database uses an index"
      - text: "For a very small table, a full read costs less than the index, so the planner chooses the scan"
        correct: true
    explanation: "The query planner estimates the cost of each option. A few hundred rows can fit in a few pages, so a read of all of them is the fastest plan. Test indexes with realistic amounts of data."

  - question: "You must add an index to a busy table with 50 million rows in production. Why use CREATE INDEX CONCURRENTLY?"
    options:
      - text: "It builds the index faster than a normal CREATE INDEX"
      - text: "A normal CREATE INDEX blocks inserts, updates and deletes on the table until it finishes, and that can freeze your app"
        correct: true
      - text: "It is the only way to create an index in PostgreSQL"
      - text: "It makes the index smaller"
    explanation: "During a normal index build, reads continue, but writes must wait until the build is done. On a big table, that can take minutes. CONCURRENTLY lets writes continue, but it takes longer and has a few rules of its own."

  - question: "Your app runs this query on every page load: find a user's orders, newest first, 20 at a time (WHERE user_id = ? ORDER BY created_at DESC). Which index fits best?"
    options:
      - text: "An index on created_at only"
      - text: "An index on (created_at, user_id), in that order"
      - text: "An index on (user_id, created_at), in that order"
        correct: true
      - text: "No index, because ORDER BY cannot use indexes"
    explanation: "A multi-column index works best when the query filters on its first column. With (user_id, created_at), the database goes directly to one user's orders. They are already sorted by date, so it reads only the first 20."
---

# Fast with 100 users, frozen at 10,000. The missing index

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Table and row:** a table holds one type of thing, like orders. Each row is one item. *([Your app forgot everyone's messages overnight. Why?](/lessons/what-is-a-database))*
> - **Query:** a request to the database, written in SQL, such as "find this user's orders". *([You changed your name. Half the app still shows the old one](/lessons/designing-tables))*
> - **Primary key and foreign key:** a primary key identifies each row (usually `id`). A foreign key points to the `id` of another table (like `user_id`). *([You changed your name. Half the app still shows the old one](/lessons/designing-tables))*
> - **Timeout:** the longest time that you will wait for an answer before you stop. *([The payment timed out. Did it go through?](/lessons/timeouts-and-retries))*

## The launch that worked too well

You built a habit tracker with AI. Every day, users tick off their habits: "ran", "read 20 pages", "drank water". The app saves each tick as a row in a `check_ins` table. The dashboard shows each user's last 30 days.

For three months, you have about 100 users. The dashboard loads almost immediately.

Then someone posts your app on social media. In one week, you have 10,000 users. And the app starts to stop working:

- The dashboard takes 6 seconds, then 15.
- Logins start to fail with timeouts.
- Your database provider's dashboard shows the database's CPU at 100%, all day.

You did not change a line of code. The same query that took milliseconds now takes seconds.

Very often, this story has one cause: a missing **index**. This lesson explains what an index is and how to prove that one is missing. It also explains why indexes everywhere are not the answer.

---

## The mental model: the index at the back of a book

Imagine a 900-page cookbook. You want every recipe with lemons. Without an index, you start at page 1 and read every page. With the index at the back, you look under "L" and find "lemon: pages 14, 212, 655". Then you go directly to those pages.

A database works in the same way:

- With no index, the database checks **every row** in the table, one by one: "Is this row for user 4821? Is this one?" This is a **full table scan**. PostgreSQL calls it a **sequential scan**, or **Seq Scan**.
- An **index** is a separate, sorted list of the values in one or more columns. Next to each value, it stores the location of the matching rows. The database searches the sorted list, then goes directly to the right rows.

![Without an index, the database reads every row of the check_ins table to find the rows for user 4821. With an index, it searches a sorted list of user IDs, then goes directly to the three matching rows.](/diagrams/database-indexes-1.svg)

Why does sorting help so much? Think of a search for one name in a sorted list of a million names.

Open the list in the middle. See if your name comes before or after that point, and ignore the half that you do not need. Each step removes half of the names that are left. After 20 steps, only one name is left, because 2 to the power of 20 is a little more than a million. A scan of the same list checks up to a million names.

PostgreSQL's default index type is the **B-tree**, a sorted structure for this type of search. B-tree indexes handle "equals" (`=`), ranges (`<`, `>`, `BETWEEN`) and sorting.

**Where the comparison stops working:** someone writes a book's index once. A database index must change every time the data changes. Every new row, edit or delete also updates every index on that table. That is the price of an index, and we will come back to it.

### Why it was fast with 100 users

With 100 users, the `check_ins` table had about 20,000 rows. A scan of 20,000 rows is so quick that nobody notices. The PostgreSQL documentation even warns that for very small tables, a scan is often the *fastest* plan. The database reads data in small blocks of storage, called **pages**. All the rows of a very small table fit in a few pages. A read of all of them costs less than a read through an index.

That is why the bug hides. Your laptop and your first users never have enough data to show it.

### Why it froze at 10,000

Two things grew at the same time:

1. **The table.** 10,000 users × 3 habits × 60 days is 1.8 million rows. Every dashboard load scans all of them to find about 180.
2. **The number of requests.** 100 times more users means about 100 times more dashboard loads.

The work per request grew 100 times, and the number of requests grew 100 times. Together, that is about **10,000 times** more work for the database.

![The work grows two ways at once: 100 times more rows to scan per request, times 100 times more requests, equals about 10,000 times more work for the database.](/diagrams/database-indexes-2.svg)

The database server has only a few CPU **cores**. A core is a part of the CPU that can work on one thing at a time. When all the cores are busy, new queries must wait in line. Every page in your app, even the login page, waits behind them. That is the "freeze".

---

## How it goes wrong

### Bug 1: Filtering on a column with no index

Here is the dashboard query that the AI wrote with Prisma (a library that lets your code talk to the database):

```js
const checkIns = await prisma.checkIn.findMany({
  where: { userId: req.user.id },
  orderBy: { date: "desc" },
  take: 30,
});
```

In plain English: find the check-ins of this user, newest first, and give me 30.

The code is correct. The problem is in the table, not in the code. Nothing tells the database how to find one user's rows quickly.

The AI created the table with a `userId` foreign key. Many people think that the database adds an index to a foreign key automatically. In PostgreSQL, it does not. A primary key or a unique constraint (a rule that two rows cannot have the same value) gets an index automatically. A foreign key does not.

### Bug 2: Searching in a way that the index cannot help

Even with an index, some searches cannot use it:

- `WHERE email LIKE '%@example.com'`: a search that starts with a wildcard (`%`, which means "any text"). A sorted list helps you find names that *start* with "Sam", not names that *end* with "son". `LIKE 'sam%'` can use a B-tree index. In PostgreSQL, you usually must create the index in a special way for this, and the docs describe how. `LIKE '%son'` cannot use one at all.
- `WHERE lower(email) = 'sam@example.com'`: the index holds `email`, not `lower(email)`. So the database cannot use the index for this search.

---

## What good looks like

### Step 1: Ask the database how it runs the query

Do not guess. Put `EXPLAIN ANALYZE` in front of the query. Then run it in your database's SQL editor:

```sql
EXPLAIN ANALYZE
SELECT * FROM check_ins WHERE user_id = 4821;
```

- `EXPLAIN` shows the **query plan**: the steps that the database chose to run the query. The **query planner** is the part of the database that chooses the steps.
- `EXPLAIN ANALYZE` really runs the query and adds real times.

Be careful with `UPDATE` and `DELETE`. `ANALYZE` really runs the query, so `EXPLAIN ANALYZE` really changes the data. For those queries, the docs suggest that you run it between `BEGIN;` and `ROLLBACK;`. `ROLLBACK;` undoes the change.

Here is output like the output that you can see before the fix, on PostgreSQL 18 or newer. Your numbers will be different:

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

- **`Parallel Seq Scan on check_ins`**: a full table scan. "Parallel" and "Gather" mean that PostgreSQL divided the scan between three helpers (`loops=3`) and then combined their results. It still reads the full table.
- **`Filter` and `Rows Removed by Filter: 599940`**: each helper checked about 600,000 rows and threw away all but 60. So the database read 1.8 million rows to return 180.
- **`Buffers: shared hit=13235`**: the scan used 13,235 pages.
- **`Execution Time: 118.701 ms`**: about a tenth of a second, on every dashboard load.
- **`cost=...`**: the planner's estimate, in its own units, not milliseconds. It is useful to compare plans, but it is not a time.

On PostgreSQL versions before 18, you do not see `Buffers` lines unless you ask for them. Also, row counts show as whole numbers (`rows=180`, not `rows=180.00`).

### Step 2: Add the index

In SQL:

```sql
CREATE INDEX check_ins_user_id_idx ON check_ins (user_id);
```

In plain English: build a sorted list of every `user_id` in `check_ins`, with a pointer to each row. Give it the name `check_ins_user_id_idx`.

With Prisma, add a line to the model in your schema file (the file that describes your tables). Then create a migration, so that you track this change like any other change to your tables:

```text
model CheckIn {
  id     Int      @id @default(autoincrement())
  userId Int
  date   DateTime
  @@index([userId])
}
```

The last line, `@@index([userId])`, tells Prisma to create an index on `userId`. By default, Prisma gives the table and the column the names from the model: `CheckIn` and `userId`. The SQL in this lesson uses `check_ins` and `user_id`. So change the names to match your own database.

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
- **`Index Cond`**: the index answered the condition, so the database did not check every row. There is no "Rows Removed by Filter" now.
- **184 pages, not 13,235, and 0.4 ms, not 118 ms.** In this example, that is about 270 times faster. The difference grows as the table grows.

Sometimes you see `Bitmap Index Scan` and `Bitmap Heap Scan`, not `Index Scan`. That is another way to use the same index. The planner often chooses it when many rows match.

### Step 3: Know the price

An index has costs:

- **Every write gets slower.** When you insert one check-in, the database writes the row *and* an entry in each index on the table. With six indexes, every insert writes to seven places. The PostgreSQL docs say this clearly: indexes add extra work to changes, so remove indexes that the database seldom or never uses.
- **Indexes use disk space.** On a big table, an index can be large.
- **A build blocks writes.** By default, `CREATE INDEX` lets other queries read the table. But it blocks inserts, updates and deletes until the build is done. On a table with millions of rows, that can take minutes, and your app cannot save anything during that time.

In production, use `CREATE INDEX CONCURRENTLY`, which lets writes continue. It takes longer. It also cannot run inside a **transaction** (a group of database changes that succeed or fail together). So check how your migration tool handles it.

For a big app, you must choose between the benefits and the costs. Some tables get thousands of writes per second and few reads, like an event log. Those tables must have very few indexes. A table that the app reads on every page load needs indexes for its common searches.

### Which columns to index

Index a column when your queries often do these things with it:

- **Filter on it** and get back a small part of the table. Examples: `WHERE user_id = ?`, `WHERE email = ?`, `WHERE status = 'pending'` (if few rows are pending).
- **Join on it**: foreign keys like `user_id` or `post_id`. Remember, PostgreSQL does not index these for you.
- **Sort by it with a limit**: `ORDER BY created_at DESC LIMIT 20`.

Some queries filter on one column and sort by another. For those, one index on both columns can do both jobs. This is a **multi-column index**. The order of the columns is important. The PostgreSQL docs say that these indexes work best when the query filters on the leading (first) columns. For "this user's orders, newest first", use `(user_id, created_at)`, not `(created_at, user_id)`.

Usually, do not index:

- Columns that you never search, join or sort by
- Columns where most rows have the same value, like a `true`/`false` column that is `true` for 95% of rows. The planner often scans anyway.
- Small tables that will stay small
- Columns that already have an index: primary keys and unique columns get one automatically. A second index on them is a copy.

> **Go deeper:** [Your app tried to load 50,000 rows at once](/lessons/pagination) (Level 4) shows how indexes make "next page" fast. [One page, 500 database queries](/lessons/n-plus-one-queries) (Level 4) covers a different cause of slow pages.

---

## Test your own app

1. **Find your slowest queries.** If you use Supabase, open the **Query Performance** report in the dashboard. Select a query and open its **Indexes** tab to see suggested indexes. Other providers have similar pages. You can also tell your AI to turn on query logging with times.
2. **Run `EXPLAIN ANALYZE`** on each slow query in your SQL editor. Look for `Seq Scan` with a large `Rows Removed by Filter`.
3. **List foreign keys without indexes.** Ask your AI: *"List every foreign key column in my schema and whether it has an index."*
4. **Test with realistic data, in staging, never in production.** Fill a test table with a million fake rows. Then run your query and `EXPLAIN ANALYZE` again:

```sql
INSERT INTO check_ins (user_id, habit, date)
SELECT floor(random() * 10000)::int + 1,
       'test habit',
       now() - random() * interval '365 days'
FROM generate_series(1, 1000000);
ANALYZE check_ins;
```

In plain English: create one million rows with random user IDs from 1 to 10,000 and random dates in the past year. `generate_series(1, 1000000)` makes the numbers 1 to 1,000,000, one row for each number. The last `ANALYZE` (without `EXPLAIN`) updates the statistics that the planner uses to choose a plan. If your `user_id` column is a foreign key, create 10,000 test users first.

> **Go deeper:** [Why you should never test on your real users](/lessons/dev-staging-production) (Level 3) explains staging.

---

## Takeaways

**Key terms**
- **Full table scan (Seq Scan):** reading every row to find the rows that you need
- **Index:** a separate, sorted list of a column's values with pointers to the rows, which the database keeps up to date
- **B-tree:** PostgreSQL's default index type, good for equals, ranges and sorting
- **Query plan:** the steps that the database chooses to run a query, shown by `EXPLAIN`
- **`EXPLAIN ANALYZE`:** runs the query and shows the plan with real times
- **Multi-column index:** one index on several columns, most useful when queries filter on its first column

**Red flags**
- `Seq Scan` with a big `Rows Removed by Filter` on a query that runs on every page load
- A foreign key column (`user_id`, `post_id`) with no index
- Searches like `LIKE '%text'` or `lower(column) = ...` on a large table
- "It's fast on my laptop" with a test table of 50 rows
- An index on every column "to be safe", on a table with many writes
- `CREATE INDEX` without `CONCURRENTLY` on a big, busy production table

**Ask your AI**
- *"Here is my slowest query and its EXPLAIN ANALYZE output. Explain each line, and tell me whether an index would help."*
- *"List the queries my app runs on every page load, and the index each one uses. Which ones would do a full table scan?"*
- *"Which indexes in my database are never used? Show me how to check before I remove any."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**How a B-tree stays shallow.** A B-tree is a tree of pages. Each page holds many sorted keys. So each step down the tree makes the search much smaller than one half. That is why an index lookup on millions of rows reads only a few pages before it gets to the rows.

**Index Only Scan.** Sometimes an index contains every column that a query needs. Then PostgreSQL can answer from the index only, and it does not read the table. The plan shows `Index Only Scan`. You can plan for this and add the extra columns to the index, but the index becomes larger.

**Expression and partial indexes.** For `WHERE lower(email) = ?`, create an index on the expression: `CREATE INDEX ON users (lower(email));`. A **partial index** covers only some rows. For example, `CREATE INDEX ON orders (created_at) WHERE status = 'pending';` is small and fast if few orders are pending.

**Other index types.** PostgreSQL also has GIN indexes, for searches inside JSON, inside arrays (lists of values in one column) and for full-text search. It also has GiST, BRIN and hash indexes. BRIN indexes are very small indexes for very large tables. They work when the values follow the order on disk, like timestamps in a log. B-tree is the right default for most columns.

**Finding unused indexes.** PostgreSQL counts how often the database uses each index. The count is in the `idx_scan` column of the `pg_stat_user_indexes` view. A view is a built-in list that you can query like a table. If an index has zero scans after weeks of real traffic, you can probably remove it.

**When CONCURRENTLY fails.** `CREATE INDEX CONCURRENTLY` can fail, for example because of duplicate values in a unique index. Then it leaves an **invalid** index. The database does not use it for searches, but it still updates it on every write. To fix this, drop (delete) the index and try again.

**Supabase index_advisor.** Supabase offers an `index_advisor` extension (an add-on for the database). It takes a query and suggests indexes, with cost estimates before and after. You can also open it from the Query Performance report. Its docs say that it only recommends B-tree indexes on one column. So use its advice as a starting point, not as the full answer.

**Reading plans for complex queries.** Plans are trees. Indented lines with `->` are steps that give their results to the line above. Start at the line with the most indent and read outward.

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
