---
title: "Your app tried to load 50,000 rows at once"
slug: pagination
order: 46
level: 4
levelName: Reliability & scale
concepts: [Pagination, LIMIT and OFFSET, Cursor (keyset) pagination, Stable sort and tiebreakers, Total counts, Page size limits]
readTime: 14 min
quiz:
  - question: "Your orders page uses LIMIT 20 OFFSET 40000 to show page 2,001, and there's an index that matches its ORDER BY. How many rows does PostgreSQL have to work through to answer it?"
    options:
      - text: "20, because LIMIT is 20"
      - text: "About 40,020: it still produces the 40,000 skipped rows, then returns the next 20"
        correct: true
      - text: "None, because OFFSET jumps straight to the right place"
      - text: "The whole table, every time, no matter the page"
    explanation: "The PostgreSQL docs say the rows skipped by OFFSET still have to be computed inside the server. So the deeper the page, the more work. Page 1 is fast, page 2,001 reads about 40,020 rows to return 20."

  - question: "Your feed sorts posts with ORDER BY created_at DESC and uses keyset pagination. Two posts were created in the same microsecond, and one of them is the last row on a page. What can go wrong?"
    options:
      - text: "Nothing, timestamps are always different"
      - text: "The database refuses to sort equal values"
      - text: "The other post can be skipped or shown twice, because the sort has no tiebreaker"
        correct: true
      - text: "The page becomes empty"
    explanation: "When two rows have the same sort value, their order isn't fixed, and a bookmark made only from created_at can't tell them apart. Adding a unique column as a tiebreaker, like ORDER BY created_at DESC, id DESC, makes the order stable."

  - question: "Your API reads ?limit= from the web address and passes it straight to the database. What is the problem?"
    options:
      - text: "Anyone can send ?limit=1000000 and make your server load a million rows"
        correct: true
      - text: "The database ignores limits sent from the browser"
      - text: "Nothing, because the frontend always sends 20"
      - text: "Limits only work with OFFSET, not with cursors"
    explanation: "Anyone can change the web address or call your API directly. The server must set a default and a maximum page size, for example 20 by default and never more than 100."

  - question: "You switch a big table from OFFSET to keyset pagination with WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT 20. Which index keeps every page fast?"
    options:
      - text: "An index on id only"
      - text: "No index, keyset pagination doesn't need one"
      - text: "An index on customer"
      - text: "An index on (created_at, id)"
        correct: true
    explanation: "An index on the same columns as the sort lets the database jump straight to the bookmark and read the next 20 rows in order. PostgreSQL can read a B-tree index backwards, so it also works for DESC."

  - question: "Your admin table shows \"Page 1 of 2,500\" on a table with 50 million rows, and every page load got slow. What is the most likely cost you added?"
    options:
      - text: "Showing page numbers uses more memory in the browser"
      - text: "Counting all matching rows on every request, which in PostgreSQL means looking at all of them"
        correct: true
      - text: "The LIMIT clause"
      - text: "Sorting by id"
    explanation: "\"Page 1 of 2,500\" needs a total, and COUNT(*) in PostgreSQL has to check every matching row. Options: drop the total, show \"1,000+\", cache the count, or use an estimate."

  - question: "Which feature is a good fit for cursor (keyset) pagination rather than page numbers?"
    options:
      - text: "A search results page where users jump straight to page 37"
      - text: "A small settings list with 12 items"
      - text: "An infinite-scroll feed where new posts arrive all the time"
        correct: true
      - text: "None, page numbers are always better"
    explanation: "A cursor says \"continue after this row\", so new posts at the top don't shift what comes next, and every page costs the same. What it can't do is jump to an arbitrary page number."
---

# Your app tried to load 50,000 rows at once

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Query:** a request to the database, written in SQL, such as "find this user's orders". *([You changed your name. Half the app still shows the old one](/lessons/designing-tables))*
> - **Index:** a sorted list of a column's values that lets the database find rows without reading the whole table. *([Fast with 100 users, frozen at 10,000. The missing index](/lessons/database-indexes))*
> - **Memory:** fast, short-term storage your server uses while it works. It has a fixed size. *([Your app restarted and all the likes vanished](/lessons/how-a-computer-runs-your-code))*
> - **Parameterized query:** a query with placeholders like `$1`, where the values are sent separately. *([How one line of text can dump your whole database](/lessons/sql-injection))*

## The page that worked for a year

You built an online shop with AI. The admin area has an **Orders** page: a table of every order, newest first. In your first month, it had 40 orders. It loaded instantly.

A year later, the shop is doing well. There are 50,000 orders. One morning you open the Orders page and wait. The page stays blank for 20 seconds. On your phone, the browser tab crashes. Your hosting dashboard says the server function ran out of memory and was restarted, and customers report that checkout was slow at the same moment.

Nothing changed in your code. The code always said *"get all the orders"*. With 40 orders, "all" was small. With 50,000, "all" is a problem, and it gets worse every day the shop does well.

This lesson is about never asking for "all": how to give back data one page at a time, which way of paging stays fast at any size, and the limits your server must enforce.

---

## The mental model: a bookmark, not a page number

Showing a long list in smaller pieces is called **pagination**. Each piece is a **page**, and the number of rows in it is the **page size**.

There are two ways to ask for "the next piece":

1. **By position:** "skip the first 40,000 orders, then give me 20." This is like telling someone to count 40,000 lines down a printed list before they start reading.
2. **By bookmark:** "give me the 20 orders that come right after *this* order." This is like putting a bookmark in a book and opening it there. You don't count the pages before it.

The first way is called **offset pagination**. The second is called **cursor pagination**, or **keyset pagination**. The bookmark is called a **cursor**.

Both give the same first page. The difference shows up on page 2,000, and when new orders arrive while someone is reading.

**Where the comparison stops working:** a database cursor points at a *row*, such as "the order created at 10:42:07 with ID 51234", not at a page. If that row is deleted, the cursor still works: the database looks for whatever comes after that point in the sort order.

### Why "load everything" breaks

Here's what happens when one request asks for all 50,000 orders. Say each order, turned into JSON, is about 1 KB (a made-up but realistic size for an order with a customer name, address and a few items).

| Step | What it costs |
|---|---|
| The database reads and sorts 50,000 rows | Database time, while other queries wait |
| Your server holds all of them in memory, then builds the JSON | About 50 MB of JSON, plus the objects it was built from |
| The response travels over the network | 50 MB is a big download, especially on a phone |
| The browser turns it into 50,000 table rows on the page | The page freezes while it builds them |

Every row grows the cost of every step. That's why this bug is invisible at 40 orders and fatal at 50,000. Serverless functions also have a fixed memory size, and some platforms cap the size of a response. On Vercel, for example, a normal function response can be at most 4.5 MB. So a big enough list can't work at all, however long you wait.

The fix is a rule: **a list endpoint never returns an unlimited number of rows.**

---

## How it goes wrong

### Bug 1: No limit at all

```js
app.get("/api/orders", requireAdmin, async (req, res) => {
  const result = await db.query("SELECT * FROM orders ORDER BY created_at DESC");
  res.json(result.rows);
});
```

In plain English: when an admin opens the Orders page, ask the database for every order, newest first, and send all of them back. `db.query` sends SQL to the database, and `result.rows` holds the rows it returned.

AI writes this often, because it's correct with test data. In Prisma, it's `prisma.order.findMany()` with no `take`.

### Bug 2: Offset pagination that gets slower every page

The usual first fix uses two SQL words:

- **`LIMIT 20`**: return at most 20 rows.
- **`OFFSET 40`**: skip the first 40 rows first.

```sql
SELECT id, customer, total, created_at
FROM orders
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 40;  -- page 3
```

In plain English: sort the orders newest first, skip 40, return the next 20. So page *n* uses `OFFSET (n - 1) × 20`.

This is a big improvement. Each response now has 20 rows. But the PostgreSQL docs warn that the rows skipped by `OFFSET` *"still have to be computed inside the server"*. The database can't jump to row 40,001. It walks through the first 40,000 in sorted order and throws them away. (That's with an index that matches the sort. Without one, it has to read and sort the whole table first.)

| Page | Rows the database works through | Rows returned |
|---|---|---|
| 1 | 20 | 20 |
| 100 | 2,000 | 20 |
| 2,001 | 40,020 | 20 |

The cost grows with the page number. Users rarely click to page 2,001, but bots do, and so does any background job that walks the whole table page by page. Each of its pages re-reads everything before it.

Offset has a second problem: **drift**. A reader is on page 1 when 3 new orders arrive. They click "Next". Everything has moved down 3 places, so page 2 starts with 3 rows they already saw. When rows are deleted, the opposite happens: some rows are skipped.

### Bug 3: Sorting by something that isn't unique

Notice the `ORDER BY created_at DESC, id DESC` above. Many AI-written queries sort by `created_at` only. But two orders can have the same `created_at`, especially when they're imported in bulk.

When two rows have the same sort value, the database may return them in either order, and the order can change between two queries. The PostgreSQL docs say that without an `ORDER BY` that gives a unique order, different `LIMIT` and `OFFSET` values *"will give inconsistent results"*. A row can show up on two pages, or on none.

The fix is a **tiebreaker**: a second sort column that is unique, almost always the primary key `id`. Sorting by `created_at, id` gives a **stable sort**: the same rows always come back in the same order.

### Bug 4: Letting the browser choose the page size

```js
const limit = Number(req.query.limit); // ?limit=1000000 works too
```

The page sends `?limit=20`. But anyone can change the web address or call your API directly with `?limit=1000000`. Now you have Bug 1 again, chosen by a stranger. As with every input, the server decides what's allowed.

---

## What good looks like

### Fix 1: Cursor (keyset) pagination

The idea: instead of "skip 40,000", remember the **last row** the reader saw, and ask for rows that come after it in the sort order.

```sql
SELECT id, customer, total, created_at
FROM orders
WHERE (created_at, id) < ($1, $2)
ORDER BY created_at DESC, id DESC
LIMIT 21;
```

In plain English:

1. **Line 3:** `$1` and `$2` are the `created_at` and `id` of the last order on the previous page. Only keep rows that come *before* it in time. `(created_at, id) < ($1, $2)` compares the pairs left to right, like words in a dictionary: first by `created_at`, and only if those are equal, by `id`.
2. **Line 4:** sort newest first, with `id` as the tiebreaker. It must match line 3, column for column.
3. **Line 5:** ask for 21 rows even though the page shows 20. If 21 come back, you know there's a next page. You show 20 and drop the extra one.

The first page is the same query without the `WHERE` line.

### Fix 2: The index that makes it fast

Keyset pagination is only fast with an index that matches the sort:

```sql
CREATE INDEX orders_created_at_id_idx ON orders (created_at, id);
```

With this index, the database jumps straight to the bookmark in the sorted list and reads the next 21 entries. The PostgreSQL docs explain that when an index matches the `ORDER BY`, the first *n* rows of a `LIMIT n` query can be read *"without scanning the remainder at all"*. The index can also be read backwards, so it serves `DESC` too.

Now page 2,001 costs about the same as page 1: roughly 21 rows of work instead of 40,020. And new orders arriving at the top don't shift anything, because the bookmark is a row, not a position.

If the list is filtered, put the filter column first: a user's own orders, newest first, need an index on `(user_id, created_at, id)`. On a big production table, create it with `CREATE INDEX CONCURRENTLY`, as you saw in the indexes lesson.

### Fix 3: The route, with a capped page size

```js
app.get("/api/orders", requireAdmin, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const after = req.query.cursor ? decodeCursor(req.query.cursor) : null;
  const rows = await getOrdersPage(after, limit + 1); // runs the SQL above
  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? encodeCursor(page.at(-1)) : null;
  res.json({ orders: page, nextCursor });
});
```

In plain English:

1. **Line 2:** read the page size the browser asked for. If it's missing or not a number, use 20. Never less than 1, **never more than 100**, whatever the request says.
2. **Line 3:** if the browser sent a cursor, turn it back into a `created_at` and an `id`. No cursor means "first page".
3. **Line 4:** run the keyset query, asking for one extra row.
4. **Lines 5–6:** keep the first `limit` rows. If the extra row came back, make a cursor from the last row on this page. If not, there's no next page.
5. **Line 7:** send the page and the cursor. The page sends `?cursor=...` back to get the next page.

`encodeCursor` turns the last row's `created_at` and `id` into one short piece of text, for example JSON encoded with base64 (a way to write any data as letters and digits that are safe in a web address). The page passes the cursor back unchanged and never builds its own. The server checks it like any other input: if it doesn't decode to a valid date and ID, reply `400 Bad Request`. If users can choose a sort ("by total"), the cursor holds *that* sort's values plus the `id`, and each sort you offer needs its own index.

### Fix 4: Think twice about total counts

"Page 1 of 2,500" looks friendly, but it needs a total, and a total has a cost. In PostgreSQL, `COUNT(*)` has to look at every matching row. Other changes may be in progress at the same moment, so the database checks row by row which rows this query is allowed to see. The PostgreSQL wiki says it *"must walk through all rows"* to do that. On 50 million rows, that's slow, and it runs on every page load.

Options, from cheapest to most exact:

- **No total.** Show "Load more" while `nextCursor` isn't empty.
- **A capped count.** Count up to 1,001 rows and show "1,000+" if you hit the cap. It stays cheap however big the table gets.
- **A cached count**, recounted every few minutes, or an **estimate**: PostgreSQL keeps an approximate row count for each table, good for "about 2.3 million".

Ask whether anyone needs the exact number. Usually nobody does.

### Page numbers or "Load more"?

| | Page numbers (offset) | "Load more" or infinite scroll (keyset) |
|---|---|---|
| Good for | Small or medium tables, search results, admin tables where people jump around | Feeds, timelines, chat history, exports, anything large or growing |
| Cost of deep pages | Grows with the page number | Stays the same |
| Needs a total count | Usually | No |
| New rows while reading | Duplicates or gaps | Stable |
| Jump to page 37 or share a link to it | Yes | No |

Offset is fine when the table stays small, or when you cap how deep users can go: for example, offer only the first 100 pages and ask the user to narrow the search after that. The cap also stops bots from asking for page 99,999.

### What changes at scale

- **Background jobs and exports** should walk a big table by keyset, in batches of a few hundred or thousand rows. A job that loads "all rows" runs out of memory just like a page does.
- **Every list endpoint** gets a default and a maximum page size, including admin ones, where this bug usually hides. Nested lists too: an order with 10,000 line items needs its own limit.

> **Go deeper:** [One page, 500 database queries](/lessons/n-plus-one-queries) (Level 4) covers another way a list page gets slow: one extra query per row.

---

## Test your own app

1. **Try a huge limit.** On your staging app, add `?limit=1000000` (or whatever name your app uses) to a list request. You should get at most your maximum.
2. **Time a deep page.** If you use offset, fill a staging table with a million fake rows (the indexes lesson shows how), then run `EXPLAIN ANALYZE` on page 1 and on a page near the end. Compare the times.
3. **Check the sort.** In every paginated query, is the last `ORDER BY` column unique? If not, add `id`.
4. **Watch for drift.** Open page 1 of a list, create a new item in another tab, then click "Next". Do you see a row you already saw?

---

## Takeaways

**Key terms**
- **Pagination:** returning a long list in pages instead of all at once
- **Page size:** rows per page. The server sets a default and a maximum.
- **Offset pagination:** "skip N rows, return the next M". Deep pages are slow and rows drift.
- **Cursor (keyset) pagination:** "return rows after this one", using the last row's sort values as a bookmark
- **Tiebreaker:** a unique column like `id` added to the sort so the order is always the same
- **Total count:** the number of matching rows. Exact counts on big tables are expensive.

**Red flags in AI-written code**
- `SELECT * FROM table` or `findMany()` with no `LIMIT` or `take` on any table that grows
- `limit`, `take` or `pageSize` read from the request with no maximum
- `ORDER BY created_at` with no unique tiebreaker
- `OFFSET` used to walk through a big table in a background job or export
- A `COUNT(*)` on a large table on every page load
- Keyset pagination with no index that matches the `ORDER BY`

**Ask your AI**
- *"Find every list endpoint in my app. For each, what is the default page size, the maximum, and how is it enforced on the server?"*
- *"Convert this OFFSET pagination to keyset pagination with a stable sort and a unique tiebreaker. Show me the index it needs."*
- *"Which of my pages show a total count? How expensive is each count on a table with 10 million rows?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Mixed sort directions.** The row comparison `(created_at, id) < ($1, $2)` only works when every column is sorted in the same direction. For `ORDER BY total DESC, id ASC`, write the condition out instead: `total < $1 OR (total = $1 AND id > $2)`, and create an index that matches, such as `(total DESC, id ASC)`.

**NULLs in sort columns.** If a sort column can be empty (`NULL`), comparisons with it give "unknown", and rows with `NULL` can fall out of the pagination. Make sort columns `NOT NULL`, or handle `NULL`s explicitly.

**Timestamp precision.** PostgreSQL timestamps keep microseconds. JavaScript's `Date` keeps only milliseconds. If your database library turns `created_at` into a `Date` and you build the cursor from that, the bookmark is slightly off, and rows created in the same millisecond can be skipped. Put the exact value in the cursor (for example, select `created_at::text` as well), or paginate on a column without this problem.

**Going backwards.** For a "Previous" button with keyset pagination, flip the comparison and the sort (`>` and `ASC`), take the rows, then reverse them before showing them.

**Prisma's options.** In Prisma, `skip` and `take` are offset pagination. Prisma also has a `cursor` option (usually used with `skip: 1` to leave out the cursor row itself). Prisma's docs describe offset as getting more expensive as the offset grows, and cursor pagination as the choice for large or growing data.

**Why the database can't jump to row 40,001.** A B-tree index is sorted by value, not numbered by position. It can find "the entry for this `created_at` and `id`" in a few steps, but it doesn't know which entry is the 40,001st without counting.

</details>

## References

- [LIMIT and OFFSET](https://www.postgresql.org/docs/current/queries-limit.html): PostgreSQL documentation. Skipped OFFSET rows are still computed; ORDER BY needed for consistent pages.
- [Indexes and ORDER BY](https://www.postgresql.org/docs/current/indexes-ordering.html): PostgreSQL documentation. An index matching ORDER BY returns the first n rows of a LIMIT without scanning the rest; backward scans for DESC.
- [Row and Array Comparisons](https://www.postgresql.org/docs/current/functions-comparisons.html): PostgreSQL documentation. Row comparisons like `(a, b) < (c, d)` compare left to right.
- [Slow Counting](https://wiki.postgresql.org/wiki/Slow_Counting): PostgreSQL wiki. Why COUNT(*) has to look at every row; estimates as an alternative.
- [Date/Time Types](https://www.postgresql.org/docs/current/datatype-datetime.html): PostgreSQL documentation. Timestamps have 1 microsecond resolution.
- [Paging Through Results](https://use-the-index-luke.com/sql/partial-results/fetch-next-page): Markus Winand, Use The Index, Luke. The keyset ("seek") method, deterministic sort with a unique tiebreaker, and PostgreSQL's index support for row values.
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations): Vercel documentation. The 4.5 MB response body limit and function memory limits.
- [Pagination](https://www.prisma.io/docs/orm/prisma-client/queries/pagination): Prisma documentation. Offset vs cursor pagination in Prisma.
