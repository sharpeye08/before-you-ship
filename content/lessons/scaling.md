---
title: "Your app went viral. Will it survive?"
slug: scaling
order: 58
level: 4
levelName: Reliability & scale
concepts: [Vertical scaling, Horizontal scaling, Load balancers, Stateless servers, Database connections, Connection pooling, Premature scaling]
readTime: 14 min
quiz:
  - question: "Your app runs on serverless functions that scale automatically. A big spike arrives, and the logs fill with \"sorry, too many clients already\". What ran out?"
    options:
      - text: "The hosting platform's functions"
      - text: "The database's connection slots"
        correct: true
      - text: "The users' internet bandwidth"
      - text: "The CDN's storage space"
    explanation: "This is PostgreSQL's error when every connection slot is in use. The functions scaled up, and each new instance opened its own connections, until the database's limit was reached."
  - question: "A query takes 2 seconds because it has no index. It runs 50 times per second. About how many database connections does it keep busy?"
    options:
      - text: "About 2"
      - text: "About 25"
      - text: "About 100"
        correct: true
      - text: "Exactly 1, because queries share a connection"
    explanation: "Connections in use ≈ requests per second × seconds each one holds a connection: 50 × 2 = 100. With an index, the same query might take 20 ms: 50 × 0.02 = 1 connection. Making queries faster is a scaling fix."
  - question: "Your app keeps logged-in sessions in a variable in the server's memory. You go from 1 instance to 3 behind a load balancer. What do users notice?"
    options:
      - text: "Nothing, the load balancer copies memory between instances"
      - text: "Everything gets three times faster"
      - text: "They seem to be logged out at random, whenever a request lands on an instance that doesn't have their session"
        correct: true
      - text: "They can only log in once a day"
    explanation: "Each instance has its own memory. To scale horizontally, servers must be stateless: sessions, caches and counters belong in a shared store such as the database or Redis."
  - question: "What is the main job of a connection pooler like Supabase's pooler or PgBouncer?"
    options:
      - text: "It lets many app instances share a small number of real database connections"
        correct: true
      - text: "It makes each SQL query run faster"
      - text: "It backs up the database"
      - text: "It adds more CPU to the database"
    explanation: "Each real PostgreSQL connection is a separate process on the database server, and there is a limit. A pooler keeps a few real connections open and lends them to whichever instance needs one."
  - question: "Your app has 40 users. The AI suggests splitting it into 8 microservices on Kubernetes with a database in three regions \"so it can scale\". What's the best response?"
    options:
      - text: "Do it now, it will be harder later"
      - text: "Do it, because more servers always means more reliable"
      - text: "Keep one app and one database, fix slow queries and measure, and scale when the numbers show a real limit"
        correct: true
      - text: "Move to a bigger laptop"
    explanation: "Scaling too early costs money, time and reliability: more parts means more things to break and debug. Measure first, and scale the part that is actually the limit."
  - question: "Which of these is usually the right first move when your database is overloaded?"
    options:
      - text: "Split the data across several databases"
      - text: "Add more app instances"
      - text: "Move to a different database product"
      - text: "Find and fix the slowest queries, add missing indexes and cache repeated reads"
        correct: true
    explanation: "More app instances add even more load to the same database. Making each request cheaper helps every user at once, costs little, and often removes the problem entirely."
---

# Your app went viral. Will it survive?

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Instance and load balancer:** an instance is one running copy of your app. A load balancer spreads incoming requests across the instances. *([How one server handles thousands of users at once](/lessons/processes-and-threads))*
> - **Index:** a sorted list the database keeps so it can find rows without reading the whole table. *([Fast with 100 users, frozen at 10,000. The missing index](/lessons/database-indexes))*
> - **Cache:** a saved copy of an answer, so the real work doesn't have to happen again. *([Fast, but showing yesterday's data](/lessons/caching))*
> - **Background job:** slow work done outside the user's request, using a queue and a worker. *([Sign-up takes 10 seconds because of one email](/lessons/background-jobs))*

## Ten minutes on the front page

Your recipe app normally has about 50 people using it at once. On Tuesday morning, someone posts it on a big news site. Within twenty minutes, 5,000 people are trying to open it.

You're not worried at first. Your app runs on serverless functions, and your hosting platform's docs say functions scale automatically based on demand. More visitors, more instances. That part works.

Then the error alerts start. The home page shows "Something went wrong". Your logs fill with one line, over and over:

```text
sorry, too many clients already
```

That's an error from your PostgreSQL database. The functions scaled. The database didn't. Every new instance tried to open its own connection to it, and the database ran out of room.

An hour later, the post drops off the front page, traffic falls, and everything works again. Most of those 5,000 people saw an error and never came back.

This lesson explains what "scaling" really means, why the database usually breaks first, and what to fix **before** the spike. It also covers the opposite mistake, which costs many more apps than spikes do: building for millions of users when you have forty.

---

## The mental model: one pantry, many kitchens

Picture a restaurant that suddenly gets ten times more customers. There are two ways to cook more food:

1. **Make the kitchen bigger:** a bigger stove, a faster cook. This is **vertical scaling**, also called "scaling up": a bigger machine, with more CPU and more memory.
2. **Open more kitchens:** several identical kitchens, each with its own cook. This is **horizontal scaling**, or "scaling out": more instances of your app. A host at the door sends each new customer to a kitchen with room. That host is the **load balancer**.

**Where this comparison stops working:** in our restaurant, every kitchen fetches its ingredients from **one shared pantry**. That pantry is your database. Opening more kitchens doesn't make the pantry bigger. It puts more cooks in front of the same door. That's exactly what happened on Tuesday.

### Vertical vs horizontal

| | Vertical (bigger machine) | Horizontal (more machines) |
|---|---|---|
| Code changes needed | None | The app must be stateless (see below) |
| Limit | The biggest machine you can rent | Very high for app servers |
| If one machine dies | Everything is down | The others keep serving |
| Changing size | Often needs a restart | Add or remove instances while running |
| Best for | Databases, especially at first | App servers and functions |

Serverless platforms scale your functions horizontally for you. That's why the functions survived the spike. But your database is usually **one** machine, scaled vertically. All the extra instances end up waiting at its door.

### What a load balancer does

A load balancer receives every request and passes it to one of your instances. It can take turns (called **round-robin**) or pick the least busy one. It also runs **health checks**: every few seconds, it asks each instance something like "are you OK?" and stops sending traffic to any instance that doesn't answer properly.

Hosting platforms and serverless providers include a load balancer. You rarely build one. But you do have to write your app so that it **doesn't matter which instance gets a request**.

### Stateless servers

An app is **stateless** when nothing important lives only in one instance's memory. Any instance can handle any request, because everything it needs is in a shared place.

You saw why in [How one server handles thousands of users at once](/lessons/processes-and-threads): with three instances, a session, a counter or a cache stored in a variable exists three times, with three different values. Users get logged out at random, rate limits triple, and caches disagree.

| Data | Not in an instance's memory. Put it here instead: |
|---|---|
| Sessions | The database, Redis, or a signed cookie |
| Caches | Redis, or the CDN |
| Rate-limit counters | Redis |
| Uploaded files | File storage, such as S3 or R2 |
| Slow work | A queue, handled by a background job |

Some load balancers offer **sticky sessions**: they send each user to the same instance every time. It hides the problem, but only until that instance restarts or is removed. Fix the state instead.

---

## How it goes wrong

### Problem 1: The database runs out of connections

Your app talks to PostgreSQL over a **connection**: an open line between your code and the database. Connections are expensive:

- Opening one takes several network round trips, plus a login check.
- PostgreSQL starts a **separate process** on the database server for each connection. Each one uses memory.

So every database has a limit. PostgreSQL's setting is called `max_connections`, and its default is typically **100**. Managed databases set their own limit, usually based on the size of the plan.

Now look at what the AI often writes for a serverless function:

```js
export async function GET() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect(); // a brand-new connection on every request
  const { rows } = await client.query("SELECT id, title FROM recipes LIMIT 20");
  return Response.json(rows); // ...and it is never closed
}
```

In plain English:

1. **Lines 2–3:** create and open a new database connection, every single time this route runs.
2. **Line 4:** run one quick query.
3. **Line 5:** reply, without closing the connection. It stays open until the instance is stopped or the database drops it.

With 50 visitors, nobody notices. With 5,000, the platform starts hundreds of instances, each request opens another connection, and the database hits its limit. From then on, new requests fail with "sorry, too many clients already".

Even good code can fall into this trap. A connection pool of 10 inside each instance sounds modest. Multiplied by 50 instances, it's 500 connections.

### Problem 2: Slow queries become a traffic jam

Here's a rule worth remembering:

> **Connections in use ≈ requests per second × seconds each request holds a connection**

A query that takes 20 ms, running 50 times per second, keeps about **1** connection busy (50 × 0.02). The same query without an index might take 2 seconds. Now it keeps about **100** connections busy (50 × 2), and your whole limit is gone because of one slow query.

When the connections run out, every request waits in line, including the fast ones. Requests start to time out. Users click again, which adds more requests. This is how a slightly slow page turns into a full outage under load.

That's why **making queries faster is a scaling fix**. Missing indexes, N+1 queries and loading too many rows at once all hold connections longer than needed.

### Problem 3: State hiding in memory

The app ran on one instance for months. During the spike, the platform runs twenty. Suddenly:

- Users are logged out between clicks, because sessions lived in memory.
- The login rate limit of 5 attempts becomes up to 100, because each instance counts on its own.
- An admin updates a price, but most visitors still see the old one, because only one instance's in-memory cache was cleared.

None of these bugs existed with one instance. None of them show up in testing on your laptop.

### Problem 4: Scaling too early

Now the opposite mistake. You ask the AI to "make it scalable", and it suggests splitting your app into eight separate services, running them on Kubernetes (a system for running and managing many programs across a group of machines), and copying your database to three continents. You have 40 users.

This is **premature scaling**, and it has real costs:

- **Money:** clusters, extra databases and always-on servers cost money every month, whether anyone uses them or not.
- **Time:** every hour spent on infrastructure is an hour not spent on the product your 40 users want.
- **Reliability:** more parts means more things that can break, more places to look when something goes wrong, and more settings the AI can get wrong.

Most apps that fail don't fail because they couldn't handle the traffic. They fail because nobody came. Build for the load you have, prepare for the next 10×, and measure before you add complexity.

---

## What good looks like

### Step 1: Make each request cheaper

Before adding anything, make every request do less work. This helps every user at once, costs little, and is often enough on its own:

- **Add missing indexes**, so queries take milliseconds instead of seconds.
- **Fix N+1 queries**, so one page runs a few queries instead of hundreds. *([One page, 500 database queries](/lessons/n-plus-one-queries))*
- **Paginate**, so no request loads thousands of rows. *([Your app tried to load 50,000 rows at once](/lessons/pagination))*
- **Cache** data that many people read and few change, in Redis or at the CDN.
- **Move slow work to background jobs**, so requests don't hold connections while waiting for email or AI services.

### Step 2: Pool connections, and use a pooler with serverless

A **connection pool** keeps a few connections open and lends them to requests, instead of opening a new one each time. Create it **once per instance**, outside the request handler:

```js
const pool = new Pool({ connectionString: process.env.DATABASE_URL }); // once per instance
attachDatabasePool(pool); // Vercel helper: closes idle connections before the instance sleeps

export async function GET() {
  const { rows } = await pool.query("SELECT id, title FROM recipes LIMIT 20");
  return Response.json(rows);
}
```

In plain English:

1. **Line 1:** create the pool when the instance starts, not on every request.
2. **Line 2:** on Vercel, `attachDatabasePool` from `@vercel/functions` closes idle connections before an instance is paused, so they don't pile up.
3. **Lines 4–7:** each request borrows a connection, runs its query, and gives the connection back.

That fixes one instance. With hundreds of serverless instances, you also need a **connection pooler**: a separate service between your app and the database. It accepts thousands of connections from your instances, but uses only a small number of real database connections, lending one out for each transaction.

Supabase includes one. Two of the connection options its docs list:

| Connection | Port | Use it for |
|---|---|---|
| Direct connection | 5432 | Always-on servers, such as a virtual machine or a long-running container. It uses IPv6, unless you add Supabase's IPv4 add-on |
| Pooler, transaction mode | 6543 | Serverless and edge functions, which open many short-lived connections |

Transaction mode has one catch: Supabase's shared pooler doesn't support **prepared statements** in this mode (queries the database saves and reuses on one connection), so you turn them off in your database library's settings. Outside Supabase, **PgBouncer** is a widely used standalone pooler.

### Step 3: Keep instances stateless

Go through the table from the mental model. Sessions, caches, counters, files and slow work all belong in shared places. Then any instance can be added, removed or restarted at any moment without anyone noticing.

### Step 4: Scale the database up, then out

When the database itself is busy, even after Step 1:

1. **Scale up first.** Move to a bigger database plan. It needs no code changes, and it's usually the right move for a database for a long time.
2. **Add read replicas.** A **read replica** is a read-only copy of the database that follows the main one. Send heavy reads, like reports and search, to the replica. All writes still go to the main database, and a replica can be slightly behind.
3. **Split the data, last.** **Sharding** means splitting your data across several databases, for example by customer. It's powerful, but it makes every query, migration and backup harder. Very few apps need it.

### Step 5: Protect yourself during a spike

- **Rate limits** stop one bot or one bug from using all your capacity. *([Bots signed up 10,000 times overnight. Now what?](/lessons/rate-limiting))*
- **CDN caching** for public pages means a spike on your home page never reaches your database. *([Fast in the US, painfully slow in India](/lessons/latency-and-cdns))*
- **Spending limits** keep automatic scaling from turning into a surprise bill. *([You woke up to a $10,000 cloud bill. What happened?](/lessons/surprise-cloud-bill))*

> **Go deeper:** [One slow service took your whole app down](/lessons/circuit-breakers) (Level 5) shows how to fail gracefully when a part of your system is overloaded.

---

## Test your own app

1. **Know your limit.** In your database's SQL editor, run the query below. The first line shows the connection limit. The second shows how many connections are open right now.

   ```sql
   SHOW max_connections;
   SELECT count(*) FROM pg_stat_activity;
   ```

2. **Check your connection string.** If your app runs on serverless functions and uses Supabase, does `DATABASE_URL` use the pooler on port 6543? Check in your hosting platform's environment variables, not only in your `.env` file.
3. **Find connections created per request.** Ask your AI: *"Find every place where a database client or pool is created. Is any of them inside a request handler?"*
4. **Load test, but not in production.** Use a load-testing tool such as k6 against your staging environment. Raise the number of simulated users step by step. Watch the number of database connections and the slowest queries. Find your breaking point before your users do.
5. **The restart test.** Restart your app, or run two instances, and use it normally. Do you get logged out? Do counters reset? Then some state lives in memory.

---

## Takeaways

**Key terms**
- **Vertical scaling:** a bigger machine
- **Horizontal scaling:** more machines or instances behind a load balancer
- **Health check:** the load balancer's regular "are you OK?" request to each instance
- **Stateless:** nothing important lives only in one instance's memory
- **Connection pool / pooler:** reusing a few database connections instead of opening new ones, inside one instance / across many instances
- **Read replica:** a read-only copy of the database for spreading out reads
- **Premature scaling:** building for load you don't have, and paying for it now

**Red flags in AI-written code**
- A database client or pool created **inside** a request handler
- Serverless functions connecting straight to the database's direct port instead of a pooler
- Sessions, caches, counters or files kept in variables or on the instance's own disk
- "Scale" plans with microservices, Kubernetes or sharding for an app with few users
- No idea what the connection limit is, or how many connections are in use

**Ask your AI**
- *"Where does my app create database connections? Show me how many connections it could open with 100 instances running."*
- *"List everything my app keeps in memory or on local disk that would break with more than one instance."*
- *"Find my three slowest queries and suggest indexes or caching for each."*
- *"My app has [N] users. What's the simplest setup that would handle 10 times that? Don't suggest anything I don't need yet."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Little's law.** The "connections in use" rule is a form of Little's law from queueing theory: the average number of items in a system equals the arrival rate times the average time each item spends inside. It works for connections, open requests, and people in a shop.

**Why PostgreSQL connections are heavy.** PostgreSQL's documentation describes a supervisor process that starts ("forks") a new server process for each connection. That's why raising `max_connections` isn't free: PostgreSQL also sizes some of its shared memory based on it. Raising the limit is a short-term patch. A pooler is the real fix.

**Pooler modes.** In **session mode**, a client keeps one real connection for as long as it's connected. In **transaction mode**, it borrows one only for the length of each transaction, so a few real connections serve many clients. Supabase's docs note that features which depend on one connection's memory, such as prepared statements and temporary tables, don't work across transactions in transaction mode.

**Read-your-own-writes.** With read replicas, a user can save a comment and then not see it, because the page read from a replica that hasn't caught up yet. A common fix is to send a user's reads to the main database for a few seconds after they write something.

**Autoscaling isn't instant.** New instances take time to start, which is called a **cold start**. Platforms also limit how fast they add capacity. A sudden spike can see slow responses or errors for a short while before new instances are ready. Keeping each request fast helps here too.

**Other shared limits.** The database is the most common bottleneck, but not the only one. Email services, payment providers and AI APIs all have their own rate limits, and a spike can hit them too. Background jobs with a concurrency limit protect both you and them.

</details>

## References

- [Connections and authentication: max_connections](https://www.postgresql.org/docs/current/runtime-config-connection.html): PostgreSQL documentation. The default limit of 100 connections and its effect on shared memory.
- [Architectural fundamentals](https://www.postgresql.org/docs/current/tutorial-arch.html): PostgreSQL documentation. A new server process is started for each connection.
- [ERROR 53300: Too many connections](https://www.bytebase.com/reference/postgres/error/53300-too-many-connections/): Bytebase. The "sorry, too many clients already" error and its common causes.
- [Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres): Supabase. Direct connections on port 5432 (IPv6 unless you add the IPv4 add-on), the transaction-mode pooler on port 6543 for serverless functions, and turning off prepared statements.
- [Connection pooling with Vercel Functions](https://vercel.com/kb/guide/connection-pooling-with-functions): Vercel. Serverless instances hitting connection limits, creating the pool once, and `attachDatabasePool`.
- [Vercel Functions limits](https://vercel.com/docs/functions/limitations): Vercel. Functions scale automatically based on demand.
