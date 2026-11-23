---
title: "Your app tried to load 50,000 rows at once"
slug: pagination
order: 46
level: 4
levelName: Reliability & scale
concepts: [Pagination, LIMIT and OFFSET, Cursor (keyset) pagination, Stable sort and tiebreakers, Total counts, Page size limits]
readTime: 14 min
quiz:
  - question: "Your orders page uses LIMIT 20 OFFSET 40000 to show page 2,001. An index matches its ORDER BY. How many rows must PostgreSQL work through to answer it?"
    options:
      - text: "20, because LIMIT is 20"
      - text: "About 40,020: it still produces the 40,000 skipped rows, then returns the next 20"
        correct: true
      - text: "None, because OFFSET jumps straight to the right place"
      - text: "The whole table, every time, for any page"
    explanation: "The PostgreSQL docs say that the server must still compute the rows that OFFSET skips. So the deeper the page, the more work. Page 1 is fast. Page 2,001 reads about 40,020 rows to return 20."

  - question: "Your feed sorts posts with ORDER BY created_at DESC and uses keyset pagination. Two posts have the same created_at, to the microsecond. One of them is the last row on a page. What can go wrong?"
    options:
      - text: "Nothing, timestamps are always different"
      - text: "The database refuses to sort equal values"
      - text: "The other post can be skipped or shown twice, because the sort has no tiebreaker"
        correct: true
      - text: "The page becomes empty"
    explanation: "When two rows have the same sort value, their order isn't fixed. A bookmark made only from created_at can't tell them apart. A unique column as a tiebreaker makes the order stable, for example ORDER BY created_at DESC, id DESC."

  - question: "Your API reads ?limit= from the web address and passes it directly to the database. What is the problem?"
    options:
      - text: "Anyone can send ?limit=1000000 and make your server load a million rows"
        correct: true
      - text: "The database ignores limits sent from the browser"
      - text: "Nothing, because the frontend always sends 20"
      - text: "Limits only work with OFFSET, not with cursors"
    explanation: "Anyone can change the web address or call your API directly. The server must set a default and a maximum page size. For example, use 20 by default and never more than 100."

  - question: "You change a big table from OFFSET to keyset pagination with WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT 20. Which index keeps every page fast?"
    options:
      - text: "An index on id only"
      - text: "No index, keyset pagination doesn't need one"
      - text: "An index on customer"
      - text: "An index on (created_at, id)"
        correct: true
    explanation: "An index on the same columns as the sort lets the database jump straight to the bookmark. Then it reads the next 20 rows in order. PostgreSQL can read a B-tree index backwards, so it also works for DESC."

  - question: "Your admin table shows \"Page 1 of 2,500\" for a table with 50 million rows. Every page load got slow. What is the most likely cost that you added?"
    options:
      - text: "Page numbers use more memory in the browser"
      - text: "Counting all matching rows on every request, which in PostgreSQL means looking at all of them"
        correct: true
      - text: "The LIMIT clause"
      - text: "Sorting by id"
    explanation: "\"Page 1 of 2,500\" needs a total, and COUNT(*) in PostgreSQL must check every matching row. Options: drop the total, show \"1,000+\", cache the count, or use an estimate."

  - question: "Which feature is a good fit for cursor (keyset) pagination, and not page numbers?"
    options:
      - text: "A search results page where users jump straight to page 37"
      - text: "A small settings list with 12 items"
      - text: "An infinite-scroll feed where new posts arrive all the time"
        correct: true
      - text: "None, page numbers are always better"
    explanation: "A cursor says \"continue after this row\". So new posts at the top don't move what comes next, and every page costs the same. But a cursor can't jump to any page number you choose."
---

# Your app tried to load 50,000 rows at once

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Query:** a request to the database, written in SQL, such as "find this user's orders". *([You changed your name. Half the app still shows the old one](/lessons/designing-tables))*
> - **Index:** a sorted list of a column's values that lets the database find rows without reading the whole table. *([Fast with 100 users, frozen at 10,000. The missing index](/lessons/database-indexes))*
> - **Memory:** fast, short-term storage that your server uses while it works. It has a fixed size. *([Your app restarted and all the likes vanished](/lessons/how-a-computer-runs-your-code))*
> - **Parameterized query:** a query with placeholders like `$1`. The values go to the database separately. *([How one line of text can dump your whole database](/lessons/sql-injection))*

## The page that worked for a year

You built an online shop with AI. The admin area is the part of the app that only you and your staff can open. It has an **Orders** page: a table of every order, newest first. In your first month, it had 40 orders. It loaded instantly.

A year later, the shop does well. There are 50,000 orders. One morning you open the Orders page and wait. The page stays blank for 20 seconds. On your phone, the browser tab crashes.

Your hosting company runs your server code as a **function**: a small program that it starts for each request. Its dashboard says the function ran out of memory, and the platform restarted it. At the same moment, customers say that checkout was slow.

Nothing changed in your code. The code always said *"get all the orders"*. With 40 orders, "all" was small. With 50,000, "all" is a problem.

This lesson shows how to send data one page at a time, and how to keep every page fast.

---

## The mental model: a bookmark, not a page number

**Pagination** means you show a long list in smaller pieces. Each piece is a **page**. The number of rows in it is the **page size**.

There are two ways to ask for "the next piece":

1. **By position:** "Skip the first 40,000 orders, then give me 20". This is like counting 40,000 lines down a printed list before you read.
2. **By bookmark:** "Give me the 20 orders right after *this* order". This is like opening a book at a bookmark. You don't count the pages before it.

The first way is **offset pagination**. The second is **cursor pagination**, also called **keyset pagination**. The bookmark is the **cursor**.

Both give the same first page. The difference appears on page 2,000. It also appears when new orders arrive while someone reads the list.

![Top: offset pagination reads 40,000 rows and throws them away, then returns 20. Bottom: cursor pagination starts after the bookmark and reads only the next 20 rows.](/diagrams/pagination-1.svg)

**Where the comparison stops working:** a database cursor points at a *row*, not at a page. For example, it points at "the order created at 10:42:07 with ID 51234". If someone deletes that row, the cursor still works. The database looks for the rows that come after that point in the sort order.

### Why "load everything" breaks

Here's what happens when one request asks for all 50,000 orders. Your server sends data as **JSON**, a text format for data. Say each order in JSON is about 1 KB. That size is made up but realistic for an order with a customer name, an address and a few items.

| Step | What it costs |
|---|---|
| The database reads and sorts 50,000 rows | Database time, while other queries wait |
| Your server holds all of them in memory, then builds the JSON | About 50 MB of JSON, plus the objects it was built from |
| The response travels over the network | 50 MB is a big download, especially on a phone |
| The browser turns it into 50,000 table rows on the page | The page freezes while it builds them |

Each row adds to the cost of each step. So this bug is invisible at 40 orders, but it breaks the app at 50,000. Serverless functions (functions that the platform starts and stops for you) also have a fixed memory size. Some platforms also limit the size of a response. On Vercel, for example, a normal function response can be at most 4.5 MB. So a list that is big enough can't work at all, however long you wait.

An **endpoint** is one web address of your API, such as `/api/orders`. The fix is a rule: **a list endpoint never returns an unlimited number of rows.**

---

## How it goes wrong

### Bug 1: No limit at all

```js
app.get("/api/orders", requireAdmin, async (req, res) => {
  const result = await db.query("SELECT * FROM orders ORDER BY created_at DESC");
  res.json(result.rows);
});
```

In plain English: when an admin opens the Orders page, ask the database for every order, newest first. Then send all of them back. `db.query` sends SQL to the database. `result.rows` holds the rows that it returned.

AI writes this often, because it's correct with test data. In Prisma (an ORM, a package that talks to the database for you), it's `prisma.order.findMany()` with no `take`.

### Bug 2: Offset pagination that gets slower every page

The usual first fix uses two SQL words:

- **`LIMIT 20`**: return at most 20 rows.
- **`OFFSET 40`**: first skip 40 rows.

```sql
SELECT id, customer, total, created_at
FROM orders
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 40;  -- page 3
```

In plain English: sort the orders newest first, skip 40, and return the next 20. So page *n* uses `OFFSET (n - 1) × 20`.

Each response now has only 20 rows. But the docs of PostgreSQL, the database in these examples, give a warning. The rows that `OFFSET` skips *"still have to be computed inside the server"*.

The database can't jump to row 40,001. It walks through the first 40,000 rows in sorted order and throws them away. (That's with an index that matches the sort. Without one, it must first read and sort the whole table.)

| Page | Rows the database works through | Rows returned |
|---|---|---|
| 1 | 20 | 20 |
| 100 | 2,000 | 20 |
| 2,001 | 40,020 | 20 |

The cost grows with the page number. Users rarely click to page 2,001, but bots (programs that visit pages automatically) do. A **background job** does too: code that runs on its own, without a user who waits. If it walks the whole table page by page, each page reads again everything before it.

Offset has a second problem: **drift**. A reader is on page 1 when 3 new orders arrive. They click "Next". Everything moved down 3 places, so page 2 starts with 3 rows they already saw. When someone deletes rows, the opposite happens: the reader misses some rows.

![With 4 rows per page, page 1 shows orders 50 to 47. After 3 new orders arrive, page 2 with an offset shows orders 49, 48 and 47 again, but page 2 with a cursor continues with orders 46 to 43.](/diagrams/pagination-2.svg)

### Bug 3: Sorting by a value that isn't unique

Look at the `ORDER BY created_at DESC, id DESC` above. Many AI-written queries sort by `created_at` only. But two orders can have the same `created_at`. This happens especially when you import many orders at once.

When two rows have the same sort value, the database can return them in either order. The order can change between two queries. The PostgreSQL docs say this about different `LIMIT` and `OFFSET` values without an `ORDER BY` that gives a unique order: they *"will give inconsistent results"*. A row can appear on two pages, or on none.

The fix is a **tiebreaker**: a second sort column that is unique. This is almost always the primary key `id`, the column that is different for every row. A sort by `created_at, id` is a **stable sort**: the same rows always come back in the same order.

### Bug 4: The browser chooses the page size

```js
const limit = Number(req.query.limit); // ?limit=1000000 works too
```

The page sends `?limit=20`. But anyone can change the web address or call your API directly with `?limit=1000000`. Now you have Bug 1 again. As with every input, the server decides what's allowed.

---

## What good looks like

### Fix 1: Cursor (keyset) pagination

The idea: don't "skip 40,000". Remember the **last row** that the reader saw. Then ask for the rows that come after it in the sort order.

```sql
SELECT id, customer, total, created_at
FROM orders
WHERE (created_at, id) < ($1, $2)
ORDER BY created_at DESC, id DESC
LIMIT 21;
```

In plain English:

1. **Line 3:** `$1` and `$2` are the `created_at` and `id` of the last order on the previous page. Keep only the rows that come *before* it in time. `(created_at, id) < ($1, $2)` compares the pairs from left to right, like words in a dictionary. It compares `created_at` first, and `id` only when the `created_at` values are equal.
2. **Line 4:** sort newest first, with `id` as the tiebreaker. It must match line 3, column for column.
3. **Line 5:** ask for 21 rows, but show only 20. If 21 rows come back, you know there's a next page. You show 20 and drop the extra one.

The first page is the same query without the `WHERE` line.

### Fix 2: The index that makes it fast

Keyset pagination is fast only with an index that matches the sort:

```sql
CREATE INDEX orders_created_at_id_idx ON orders (created_at, id);
```

With this index, the database jumps straight to the bookmark in the sorted list. Then it reads the next 21 entries. The PostgreSQL docs explain this case: an index matches the `ORDER BY` of a `LIMIT n` query. Then the database can read the first *n* rows *"without scanning the remainder at all"*. The database can also read the index backwards, so it works for `DESC` too.

Now page 2,001 costs about the same as page 1: about 21 rows of work, not 40,020. New orders at the top don't move anything, because the bookmark is a row, not a position.

If the list has a filter, put the filter column first. For example, a user's own orders, newest first, need an index on `(user_id, created_at, id)`. On a big production table, make it with `CREATE INDEX CONCURRENTLY`, as you saw in the indexes lesson.

### Fix 3: The route, with a maximum page size

A **route** is the code that answers one endpoint.

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

1. **Line 2:** read the page size from the request. If it's missing or not a number, use 20. Never use less than 1 and **never more than 100**, whatever the request says.
2. **Line 3:** if the browser sent a cursor, turn it back into a `created_at` and an `id`. No cursor means "first page".
3. **Line 4:** run the keyset query, and ask for one extra row.
4. **Lines 5–6:** keep the first `limit` rows. If the extra row came back, make a cursor from the last row on this page. If not, there's no next page.
5. **Line 7:** send the page and the cursor. To get the next page, the page sends `?cursor=...` back.

`encodeCursor` turns the last row's `created_at` and `id` into one short piece of text. For example, it can use JSON encoded with base64. Base64 is a way to write any data as letters and digits that are safe in a web address.

The page sends the cursor back unchanged and never builds its own. The server checks the cursor like any other input. If it doesn't decode to a valid date and ID, reply with `400 Bad Request`, the status code for a wrong request. Users can sometimes choose a sort, such as "by total". Then the cursor holds *that* sort's values plus the `id`. Each sort that you offer needs its own index.

### Fix 4: Think twice about total counts

"Page 1 of 2,500" looks friendly. But it needs a total, and a total has a cost. In PostgreSQL, `COUNT(*)` must look at every matching row.

Other changes can happen at the same moment. So the database checks row by row which rows this query can see. The PostgreSQL wiki says it *"must walk through all rows"* to do that. On 50 million rows, that's slow, and it runs on every page load.

Options, from cheapest to most exact:

- **No total.** Show "Load more" while `nextCursor` isn't empty.
- **A count with a maximum.** Count up to 1,001 rows. If you reach 1,001, show "1,000+". The cost stays low however big the table gets.
- **A cached count** that you count again every few minutes. (A cache is a saved copy of a result that you reuse.) Or an **estimate**: PostgreSQL keeps an approximate row count for each table. That's good for "about 2.3 million".

Usually nobody needs the exact number.

### Page numbers or "Load more"?

| | Page numbers (offset) | "Load more" or infinite scroll (keyset) |
|---|---|---|
| Good for | Small or medium tables, search results, admin tables where people jump around | Feeds, timelines, chat history, exports, anything large or growing |
| Cost of deep pages | Grows with the page number | Stays the same |
| Needs a total count | Usually | No |
| New rows while reading | Duplicates or gaps | Stable |
| Jump to page 37 or share a link to it | Yes | No |

Offset is fine when the table stays small. It's also fine when you limit how deep users can go. For example, offer only the first 100 pages, then ask the user to narrow the search. This also stops bots that ask for page 99,999.

### What changes when the app grows

- **Background jobs and exports** must walk a big table by keyset, in batches of a few hundred or thousand rows. A job that loads "all rows" runs out of memory, like a page does.
- **Every list endpoint** gets a default and a maximum page size. This includes admin endpoints, where this bug often hides. It also includes lists inside lists: an order with 10,000 line items needs its own limit.

> **Go deeper:** [One page, 500 database queries](/lessons/n-plus-one-queries) (Level 4) covers another way a list page gets slow: one extra query per row.

---

## Test your own app

1. **Try a huge limit.** Use your staging app, the copy of your app for testing. Add `?limit=1000000` (or the name your app uses) to a list request. You must get at most your maximum.
2. **Time a deep page.** If you use offset, fill a staging table with a million fake rows (the indexes lesson shows how). Then run `EXPLAIN ANALYZE` on page 1 and on a page near the end. This command runs the query and shows the time for each step. Compare the times.
3. **Check the sort.** Look at every paginated query. Is the last `ORDER BY` column unique? If not, add `id`.
4. **Look for drift.** Open page 1 of a list. Make a new item in another tab, then click "Next". Do you see a row again?

---

## Takeaways

**Key terms**
- **Pagination:** returning a long list in pages, not all at once
- **Page size:** rows per page. The server sets a default and a maximum.
- **Offset pagination:** "skip N rows, return the next M". Deep pages are slow and rows drift.
- **Cursor (keyset) pagination:** "return rows after this one". The last row's sort values are the bookmark.
- **Tiebreaker:** a unique column like `id` that you add to the sort, so the order is always the same
- **Total count:** the number of matching rows. Exact counts on big tables cost a lot.

**Red flags in AI-written code**
- `SELECT * FROM table` or `findMany()` with no `LIMIT` or `take` on a table that grows
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

**Mixed sort directions.** The row comparison `(created_at, id) < ($1, $2)` works only when all columns sort in the same direction. For `ORDER BY total DESC, id ASC`, write the full condition: `total < $1 OR (total = $1 AND id > $2)`. Then make an index that matches, such as `(total DESC, id ASC)`.

**NULLs in sort columns.** A sort column can be empty (`NULL`). Then comparisons with it give "unknown", and rows with `NULL` can fall out of the pagination. Make sort columns `NOT NULL`, or handle `NULL`s in your query.

**Timestamp precision.** PostgreSQL timestamps keep microseconds. JavaScript's `Date` keeps only milliseconds. Your database library can turn `created_at` into a `Date`, and you can build the cursor from that. Then the bookmark is a little wrong, and rows made in the same millisecond can be skipped. Put the exact value in the cursor (for example, also select `created_at::text`). Or paginate on a column without this problem.

**Going backwards.** For a "Previous" button with keyset pagination, reverse the comparison and the sort (`>` and `ASC`). Take the rows, then reverse their order before you show them.

**Prisma's options.** In Prisma, `skip` and `take` are offset pagination. Prisma also has a `cursor` option. You usually use it with `skip: 1`, to leave out the cursor row itself. Prisma's docs say that offset costs more as the offset grows. They suggest cursor pagination for large or growing data.

**Why the database can't jump to row 40,001.** A B-tree index (the usual kind of index) is sorted by value. It doesn't number its entries by position. It can find "the entry for this `created_at` and `id`" in a few steps. But it can't know which entry is number 40,001 without counting.

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
