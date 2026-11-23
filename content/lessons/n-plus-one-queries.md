---
title: "One page, 500 database queries"
slug: n-plus-one-queries
order: 45
level: 4
levelName: Reliability & scale
concepts: [N+1 queries, Round trips, Eager loading with include, Batching, DataLoader]
readTime: 13 min
quiz:
  - question: "Your page loads 20 posts with one query, then runs one more query per post to get its author. How many queries does the page run when it shows 200 posts?"
    options:
      - text: "2"
      - text: "21"
      - text: "201"
        correct: true
      - text: "200"
    explanation: "One query for the list, plus one per post: 1 + 200 = 201. That's the N+1 pattern. The number of queries grows with the number of items on the page."

  - question: "You turn on query logging and load your homepage. Which pattern in the log points to an N+1 problem?"
    options:
      - text: "One long query with a JOIN"
      - text: "The same query repeated many times, with only the ID changing"
        correct: true
      - text: "A query that takes 2 milliseconds"
      - text: "A query that uses LIMIT"
    explanation: "N+1 queries look like a run of nearly identical queries, such as SELECT ... FROM User WHERE id = $1, one for each item. Each one is fast, but together they add up."

  - question: "The AI \"fixes\" an N+1 loop by wrapping the per-post queries in Promise.all, so all 100 run at the same time. What is still wrong?"
    options:
      - text: "Nothing, the problem is completely solved"
      - text: "Promise.all makes the queries run one after another"
      - text: "Promise.all only works with SQL, not with an ORM"
      - text: "The database still receives 100 queries per page, and they compete for a limited number of database connections"
        correct: true
    explanation: "Running the queries at the same time can make the page faster, but the database does the same amount of work, and 100 queries now fight over the connection pool. Under real traffic, that can slow down everyone. The real fix is to load all the data in one or two queries."

  - question: "Each query from your app to the database takes about 50 ms there and back, because your app runs in a different region than your database. A page runs 401 queries one after another. Roughly how long does the page spend waiting?"
    options:
      - text: "About 50 ms"
      - text: "About 2 seconds"
      - text: "About 20 seconds"
        correct: true
      - text: "About 400 ms"
    explanation: "401 × 50 ms is about 20 seconds. Each round trip adds the full delay, so many small queries can be much slower than one bigger query."

  - question: "You use DataLoader to batch user lookups. Why should you create a new DataLoader for each request instead of one shared for the whole server?"
    options:
      - text: "DataLoader caches what it loads, so a shared one could serve old data, or one user's data to another"
        correct: true
      - text: "DataLoader can only be used once"
      - text: "A shared DataLoader makes more database queries"
      - text: "Node.js doesn't allow shared objects between requests"
    explanation: "DataLoader remembers the results it has loaded. A loader that lives for one request keeps that memory short and private. DataLoader's own docs say loaders are usually created when a request begins."

  - question: "With 10 test posts, your page runs 11 queries and feels fast. What's the best way to check for N+1 before launch?"
    options:
      - text: "Nothing to check, 11 queries is fine"
      - text: "Load the page with 10 posts and again with 100, and compare the number of queries"
        correct: true
      - text: "Add an index to every column"
      - text: "Check that the page loads in under one second on your laptop"
    explanation: "If the number of queries grows when the page shows more items, you have an N+1. A healthy page runs about the same number of queries for 10 items or 100."
---

# One page, 500 database queries

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Query and join:** a query is a request to the database. A join combines rows from two tables in one query. *([You changed your name. Half the app still shows the old one](/lessons/designing-tables))*
> - **ORM:** a package, such as Prisma, that lets your code use the database without writing SQL by hand. *([How one line of text can dump your whole database](/lessons/sql-injection))*
> - **Index:** a sorted list that lets the database find rows without reading the whole table. *([Fast with 100 users, frozen at 10,000. The missing index](/lessons/database-indexes))*
> - **Logs:** lines of text your app writes about what it's doing, so you can read them later. *([The error message is telling you what's wrong. Read it first](/lessons/reading-error-messages))*

## The homepage that got slower every day

You built a recipe-sharing site with AI. The homepage shows the latest recipes. Each card has a title, the author's name, how many likes and comments it has, and its tags.

When you built it, there were 10 test recipes, and the page was instant. Now the homepage shows 100 recipes, and it takes four seconds to load. Your database provider's dashboard says the database is busy all day, even though you only have a few hundred visitors.

You ask your AI to log every database query for one visit to the homepage. You count them: **401 queries.** For one page, for one visitor.

Every single query is fast, about a millisecond on its own. That's why nothing looks wrong in the code. The problem is how many there are. This lesson explains where the 401 came from, how to spot the pattern in any app, and how to bring it down to one or two.

---

## The mental model: one trip per item

Imagine you're cooking dinner and need 20 ingredients. You could walk to the shop, buy the onion, walk home. Walk back, buy the garlic, walk home. Twenty trips. Or you could write a list and go once.

Every query your app sends is a trip. The trip has a cost even when the shopping is quick: the message has to travel to the database, the database has to read and plan the query, and the answer has to travel back. The time for one trip there and back is called a **round trip**.

Here's what the homepage does:

1. **1 query** to get the list of 100 recipes.
2. **Then, for each recipe**, 1 query for the author, 1 for the like count, 1 for the comment count and 1 for the tags. That's 4 × 100 = **400 queries**.

1 + 400 = 401. This pattern is called the **N+1 query problem**: one query for a list of N items, then one more query for each item. (Here it's really 4N+1, but the name is the same.)

**Where the comparison stops working:** in real life, a longer list makes the one trip a bit slower. A database is very good at long lists. Finding 100 authors in one query costs only a little more than finding one.

### Why it hides

The number of queries grows with the number of items on the page. With 10 test recipes, the page runs 41 queries, which feels instant on your laptop. Nothing in the code looks slow, and every query on its own is fast. The cost appears only as data grows.

### What it costs, in numbers

The page runs its queries one after another, so the waiting adds up:

| Time for one round trip | 41 queries (10 recipes) | 401 queries (100 recipes) |
|---|---|---|
| 1 ms (app and database in the same data center) | 0.04 seconds | 0.4 seconds |
| 10 ms | 0.4 seconds | 4 seconds |
| 50 ms (app and database in different regions) | 2 seconds | 20 seconds |

These are simple multiplications, not measurements, but they show the shape: the slower each trip, the more N+1 hurts. A common cause of slow trips is a hosting platform running your functions in one region while your database lives in another.

The database feels it too. If 20 people open the homepage every second, that's about 8,000 queries per second, for a page that needs maybe 40 with the right code.

> **Go deeper:** [Fast in the US, painfully slow in India](/lessons/latency-and-cdns) (Level 4) explains why distance makes every round trip slower.

---

## How it goes wrong

### Bug 1: A query inside a loop

Here's the kind of code the AI writes for the homepage:

```js
const recipes = await prisma.recipe.findMany({ take: 100 });
for (const recipe of recipes) {
  recipe.author = await prisma.user.findUnique({ where: { id: recipe.authorId } });
  recipe.likes = await prisma.like.count({ where: { recipeId: recipe.id } });
  // ... same for comments and tags
}
```

In plain English:

1. **Line 1:** get 100 recipes. One query.
2. **Lines 2–5:** for each recipe, ask the database for its author, then its like count, and so on. Each `await` waits for one round trip before the next one starts.

It's easy to read and correct. It's also 401 trips.

### Bug 2: The loop is hidden

Often there's no visible loop. The page shows a list of `RecipeCard` pieces, and each card loads its own author. Or a helper function such as `getLikeCount(recipe)` runs a query, and someone calls it for every item in a list. Each piece looks fine alone. Together, they make an N+1.

In some ORMs, and in frameworks in other languages, it's even quieter: reading `recipe.author` can run a query by itself, the first time you read it. This is called **lazy loading**. The code doesn't look like it talks to the database at all.

### Bug 3: "Fixing" it with Promise.all

Ask the AI to speed up Bug 1, and it may suggest running all the queries at the same time:

```js
await Promise.all(recipes.map(async (recipe) => {
  recipe.likes = await prisma.like.count({ where: { recipeId: recipe.id } });
}));
```

In plain English: start one like-count query for every recipe at once, and wait until all of them finish.

The page may get faster, because the queries no longer wait for each other. But the database still receives 100 queries per page. And your app can only talk to the database through a limited number of open connections, kept ready in a **connection pool**. 100 queries at once from one page can use up the pool, and other visitors' queries wait in line. Under real traffic, this can make the whole app slower.

---

## How to spot it

### In your logs

Turn on query logging. With Prisma, it's one option:

```js
const prisma = new PrismaClient({ log: ["query"] });
```

Load the page once, and read the log. An N+1 looks like this (shortened):

```text
prisma:query SELECT ... FROM "public"."Recipe" ... LIMIT $1
prisma:query SELECT ... FROM "public"."User" WHERE ... "id" = $1 ...
prisma:query SELECT COUNT(*) ... FROM "public"."Like" WHERE ... "recipeId" = $1 ...
prisma:query SELECT ... FROM "public"."User" WHERE ... "id" = $1 ...
prisma:query SELECT COUNT(*) ... FROM "public"."Like" WHERE ... "recipeId" = $1 ...
... the same lines again, about 100 times
```

The signs:

- **The same query shape, again and again.** Only the value of `$1` changes.
- **The count grows with the page.** Show 10 items, then 100. If the number of queries grows too, you've found one.

Leave this logging on in development only. In production, it writes a line for every query.

### In your monitoring

- If your database keeps query statistics (on Supabase, the **Query Performance** report), look for a fast query with a huge number of calls.
- Performance tools such as Sentry can detect N+1 queries automatically when similar queries run one after another, and show which page caused them.

> **Go deeper:** [Your app was down for six hours and nobody noticed](/lessons/logging-and-monitoring) (Level 3) covers monitoring tools.

---

## What good looks like

The goal: **the number of queries should not depend on the number of items.** A page with 10 recipes and a page with 100 should run about the same number of queries.

### Fix 1: Ask for related data up front with `include`

In Prisma, you ask for the related data in the same call, with `include`:

```js
const recipes = await prisma.recipe.findMany({
  take: 100,
  include: {
    author: { select: { name: true } },
    _count: { select: { likes: true, comments: true } },
  },
});
```

In plain English: get 100 recipes, and with them, each author's name and how many likes and comments each recipe has.

Prisma now loads all of it with a small, fixed number of queries. Depending on your Prisma version and settings, it uses one query with a join, or one query per table. Either way, 100 recipes no longer means 400 extra trips.

Two details matter at scale:

- **`select` only what you show.** `author: true` loads every column of each user, maybe including things the page never uses. `select: { name: true }` loads only the name.
- **Count, don't load.** `_count` asks the database to count likes. Loading every like row and counting them in JavaScript would move thousands of rows for one number.

### Fix 2: One query with a join

If you write SQL yourself, a join gets recipes and their authors in a single trip:

```sql
SELECT recipes.id, recipes.title, users.name AS author_name
FROM recipes
JOIN users ON users.id = recipes.author_id
ORDER BY recipes.created_at DESC
LIMIT 100;
```

In plain English: take the newest 100 recipes, and for each one, find the user whose `id` matches its `author_id`. Return the recipe's title with the author's name. One query, one round trip.

### Fix 3: Batch with a list of IDs

Sometimes you can't use a join: the data lives in another service, or the code that needs it is far away from the code that loaded the list. Then collect the IDs and fetch them all at once:

```js
const ids = [...new Set(recipes.map((r) => r.authorId))];
const authors = await prisma.user.findMany({ where: { id: { in: ids } } });
const byId = new Map(authors.map((a) => [a.id, a]));
for (const recipe of recipes) recipe.author = byId.get(recipe.authorId);
```

In plain English:

1. **Line 1:** make a list of the author IDs, without repeats. (A `Set` keeps only unique values.)
2. **Line 2:** one query: "give me every user whose ID is in this list". In SQL, that's `WHERE id IN (...)`.
3. **Line 3:** put the authors in a `Map`, a lookup table from ID to author.
4. **Line 4:** give each recipe its author from the `Map`, with no more queries.

Two queries in total, whether the page shows 10 recipes or 1,000.

### Fix 4: DataLoader, when the loop is spread out

In some apps, the code that needs each author is scattered: many components, or many small functions in a GraphQL API, each asking for "user 7", "user 12", "user 7" again. You can't easily rewrite them all into one query.

**DataLoader** is a small library made for this. Each piece of code still asks for one item. DataLoader collects all the requests made at the same moment and turns them into one batch:

```js
const userLoader = new DataLoader(async (ids) => {
  const users = await prisma.user.findMany({ where: { id: { in: ids } } });
  const byId = new Map(users.map((u) => [u.id, u]));
  return ids.map((id) => byId.get(id));
});
// anywhere in this request:
const author = await userLoader.load(recipe.authorId);
```

In plain English:

1. **Lines 1–5:** tell DataLoader how to load *many* users at once: one `IN` query. DataLoader's rule is that you must return the results in the same order as the IDs it gave you, and the same number of them. Line 4 does that.
2. **Line 7:** each piece of code asks for one user. DataLoader waits until the current piece of work is done, then sends all the IDs it collected in a single batch. It also skips repeats: "user 7" is loaded once.

DataLoader also remembers what it loaded. Its docs say to create a new loader when each request begins. A shared loader could hand out old data, or one user's data to another.

> **Go deeper:** [One slow request froze the whole server](/lessons/event-loop) (Level 4) explains what "the same moment" means in Node.js.

### Don't forget the index

The batched queries search by `author_id` or `recipe_id`. On a big table, those columns need indexes, or each of your two queries becomes a full table scan.

> **Go deeper:** [Your app tried to load 50,000 rows at once](/lessons/pagination) (Level 4) covers the other half of this page: not loading every recipe at once.

---

## Test your own app

1. **Turn on query logging** in development, as shown above, or ask your AI how to do it for your ORM.
2. **Load each important page once** and count the queries: homepage, dashboards, any list or feed.
3. **Change the number of items.** Create 10 test items, count the queries. Create 100, count again. If the count grew, find the loop.
4. **Check the slowest page in production.** Look at your monitoring tool or your database's query report for a fast query with a very high number of calls.

---

## Takeaways

**Key terms**
- **Round trip:** one query's journey to the database and back
- **N+1 query problem:** one query for a list, then one more query for every item in it
- **Lazy loading:** an ORM running a query by itself when you first read a related field
- **Connection pool:** the limited set of open database connections your app shares
- **Batching:** collecting many small requests into one, such as one `IN (...)` query
- **DataLoader:** a library that batches and de-duplicates lookups made at the same moment

**Red flags in AI-written code**
- `await prisma...` or `db.query(...)` inside a `for` loop, `.map()` or `.forEach()`
- A component or helper that loads its own data, used inside a list
- `Promise.all` around one query per item, presented as a fix
- `include: { comments: true }` on a list page that only shows a comment count
- The number of queries in the log grows with the number of items on the page

**Ask your AI**
- *"For this page, list every database query it runs, and say which ones run once per item."*
- *"Rewrite this code so it loads all the related data in one or two queries, no matter how many items there are."*
- *"Search my code for database queries inside loops, .map() or .forEach(), including in helper functions called from loops."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Prisma's built-in batching.** Prisma's docs say it automatically batches `findUnique()` queries that happen in the same tick (the same moment of the event loop) and have the same parameters and selection. So `Promise.all` over `findUnique` calls may become one query. This batching is for `findUnique()`: the docs say it doesn't batch `findMany()`, and it can't batch queries in a loop that `await`s each one before starting the next, like Bug 1. Don't rely on it: write the query you mean.

**Join or separate queries.** Prisma's `relationLoadStrategy` option chooses between `"join"` (one query, using a join in the database) and `"query"` (one query per table, combined in your app). Check your version's docs for which is the default and whether the option needs a preview flag. A single join isn't always faster: joining several one-to-many relations at once repeats each recipe once per comment and once per tag, so the result can grow very large.

**Over-fetching.** The opposite mistake to N+1 is loading too much: `include` on every relation, every column, for every item. Watch the size of the data, not only the number of queries.

**Other languages.** Frameworks in other languages have the same problem and the same fixes. Loading related data up front is often called **eager loading**, the opposite of lazy loading.

**GraphQL.** GraphQL APIs are especially prone to N+1, because each field is resolved by its own small function. DataLoader is the usual fix there.

</details>

## References

- [Query optimization](https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance): Prisma documentation. N+1 examples, fixing them with `include` and the `in` filter, and Prisma batching `findUnique()` in the same tick but not `findMany()`.
- [Relation queries](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries): Prisma documentation. `include` and the `relationLoadStrategy` option (`join` or `query`).
- [Aggregation, grouping, and summarizing](https://www.prisma.io/docs/orm/prisma-client/queries/aggregation-grouping-summarizing): Prisma documentation. Counting related rows with `_count`.
- [Logging](https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/logging): Prisma documentation. Turning on query logging with `log: ["query"]`.
- [DataLoader](https://github.com/graphql/dataloader): GraphQL Foundation on GitHub. Batching loads made in one frame of execution, the same-length and same-order rule for the batch function, and creating a new loader per request.
- [N+1 Queries](https://docs.sentry.io/product/issues/issue-details/performance-issues/n-one-queries/): Sentry documentation. How Sentry detects repeated, sequential database queries.
