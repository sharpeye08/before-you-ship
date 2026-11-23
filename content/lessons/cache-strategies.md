---
title: "Your cache expired and the database collapsed"
slug: cache-strategies
order: 54
level: 4
levelName: Reliability & scale
concepts: [Cache-aside, Read-through, Write-through, Write-back, TTLs, TTL jitter, Cache stampedes, Request coalescing, Stale-while-revalidate]
readTime: 15 min
quiz:
  - question: "Your home page list is cached for 60 seconds and gets 3,000 requests per second. Rebuilding it takes 0.8 seconds. With plain cache-aside, what happens each time the copy expires?"
    options:
      - text: "One request rebuilds it and the rest wait for that one"
      - text: "Around 2,400 requests miss during the rebuild, and each one runs the same slow query"
        correct: true
      - text: "Redis rebuilds it automatically from the database"
      - text: "Nothing, because Redis is very fast"
    explanation: "Plain cache-aside has no coordination. Every request that arrives during the 0.8-second rebuild sees a miss and asks the database: 3,000 × 0.8 = 2,400 identical queries. This is a cache stampede."

  - question: "You use write-back caching for customer orders: orders are saved in Redis, and a background job copies them to the database every minute. What is the main risk?"
    options:
      - text: "Orders will be slower to save"
      - text: "Customers will see each other's orders"
      - text: "If Redis loses its data before the copy runs, those orders are gone"
        correct: true
      - text: "The database will run out of space"
    explanation: "With write-back, the cache holds the only copy for a while. That's acceptable for something like page view counts, but never for orders or payments."

  - question: "You give 10,000 product keys the same 5-minute TTL, all filled when the server starts. What does adding a random extra 0–60 seconds to each TTL (jitter) fix?"
    options:
      - text: "It spreads the expiry times out, so the keys don't all miss at the same moment"
        correct: true
      - text: "It makes the data always fresh"
      - text: "It stops a single very popular key from causing a stampede"
      - text: "It makes Redis use less memory"
    explanation: "Without jitter, all 10,000 keys expire in the same second and the database gets all those queries at once. Jitter spreads them out. It does not help with one hot key, which still expires at one moment."

  - question: "Which strategy for writes does this describe: every time you save to the database, you also save the new value to the cache?"
    options:
      - text: "Cache-aside"
      - text: "Write-back"
      - text: "Stale-while-revalidate"
      - text: "Write-through"
        correct: true
    explanation: "Write-through updates the cache on every write, so reads after a change see the new value. The costs are slower writes and caching data that nobody may ever read, which is why it's usually combined with a TTL."

  - question: "Your server sends Cache-Control: max-age=60, stale-while-revalidate=600, and a CDN caches the response. A request reaches the CDN 90 seconds after the copy was made. What happens?"
    options:
      - text: "The visitor waits while the CDN asks your server for a new copy"
      - text: "The visitor gets the old copy right away, and the CDN fetches a new one in the background"
        correct: true
      - text: "The CDN returns an error"
      - text: "The CDN deletes the copy and serves nothing"
    explanation: "The copy is stale after 60 seconds, but for 600 more seconds it may still be served while the cache refreshes it in the background. Visitors don't wait, and your server gets one refresh instead of a flood."

  - question: "Your app keeps a lock in Redis so only one request rebuilds a cached value. Why should the lock have its own short expiry, like 10 seconds?"
    options:
      - text: "Redis doesn't allow keys without expiry"
      - text: "So the lock is faster"
      - text: "So that every request can hold the lock at once"
      - text: "If the request holding the lock crashes, the lock frees itself and someone else can rebuild"
        correct: true
    explanation: "Without an expiry, a crash while holding the lock would block every future rebuild. The expiry is a safety net."
---

# Your cache expired and the database collapsed

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Cache hit / miss:** the saved copy was there and was used / it wasn't, so the real work had to happen. *([Fast, but showing yesterday's data](/lessons/caching))*
> - **TTL:** how many seconds a cached copy lives before it's deleted. *([Fast, but showing yesterday's data](/lessons/caching))*
> - **Cache invalidation:** making cached copies match the real data again, by waiting for expiry or removing them. *([Fast, but showing yesterday's data](/lessons/caching))*
> - **Lock:** a way to make sure only one task does something at a time. *([Two tasks waiting for each other forever](/lessons/locks-and-deadlocks))*

## A crash every 60 seconds

Your shop's home page shows "Top 20 products this week". The database query behind it adds up a week of orders, and it takes about 0.8 seconds. That's too slow for every visitor, so your server keeps the result in **Redis** (the shared in-memory store from the caching lesson) with a TTL of 60 seconds. Normally, that query runs once a minute. Everything is fast.

At 9:00 you send a newsletter to 200,000 people. Traffic jumps to 3,000 requests per second. Your monitoring shows something strange: the database is calm for 59 seconds, then shoots to 100% for a few seconds, then calms down again. Every minute, like a heartbeat. Some visitors get errors during each spike.

At 9:14, the spike doesn't end. The database is at 100% and stays there. The site is down.

Your cache didn't fail. It did exactly what you told it: it deleted the copy after 60 seconds. What happened next is called a **cache stampede**. To understand it and choose a fix, you first need the main ways a cache is filled and kept up to date.

---

## The mental model: four decisions

Every caching setup answers four questions, whether the code says so or not:

1. **Reading:** who puts data into the cache when it's missing?
2. **Writing:** when the real data changes, what happens to the cached copy?
3. **Time:** how long may a copy live? (The TTL.)
4. **Expiry:** what happens when a popular copy disappears while many people want it?

AI-written code usually answers the first question well, the second one sometimes and the last two almost never. The names below are the standard answers, used in AWS and Redis docs.

---

## Reading: cache-aside and read-through

### Cache-aside (lazy loading)

This is the pattern from the caching lesson. Your code checks the cache. On a miss, your code reads the database and saves the result in the cache. The cache sits "to the side" and knows nothing about your database. It's also called **lazy loading**, because data is only loaded into the cache when someone asks for it.

```js
async function cached(key, ttlSeconds, load) {
  const saved = await redis.get(key);
  if (saved !== null) return JSON.parse(saved); // hit
  const fresh = await load(); // miss: do the real work
  await redis.setEx(key, ttlSeconds, JSON.stringify(fresh));
  return fresh;
}
```

In plain English: `cached` takes a key, a TTL and a function that does the slow work (`load`). It returns the saved copy if there is one. Otherwise it runs `load`, saves the result for `ttlSeconds` and returns it. For the top products list, you'd call `cached("products:top", 60, loadTopProducts)`.

**Good:** only data that someone asks for gets cached. If Redis goes down or restarts empty, the app still works, only slower, because every miss falls back to the database.

**Bad:** every miss costs three trips (check the cache, read the database, write the cache). And the copy can be stale until it expires or your code deletes it.

### Read-through

Same flow, but the cache layer does the loading. Your code only asks the cache, and the cache, or a library in front of it, fetches from the database on a miss. The loading logic lives in one place. Plain Redis doesn't load from your database by itself, so in practice a shared helper like `cached`, which all your code goes through, gives you most of the same benefit.

---

## Writing: three choices

When someone changes data, you have three main options.

**1. Invalidate on write (delete the key).** Save to the database, then delete the cached copy. The next read is a miss and loads fresh data. This is the usual partner for cache-aside. Deleting is safer than writing the new value into the cache: two updates at nearly the same time could write their values to the cache in the wrong order, but two deletes can't.

**2. Write-through.** Every time you write to the database, you also write the new value to the cache. Reads right after a change get the new value from the cache.

- **Good:** the cache is rarely stale.
- **Bad:** every write does two writes, so it's slower. You also fill the cache with data nobody may read; AWS calls this **cache churn**. And if the database write succeeds but the cache write fails, the two disagree.

**3. Write-back (also called write-behind).** You write to the cache only and reply right away. A background job copies changes to the database later, often in batches.

- **Good:** very fast writes, and far fewer database writes. If a popular page gets 1,000 views per minute, you can count them in Redis and save one total per minute to the database instead of 1,000 separate writes.
- **Bad:** for a while, the cache holds the **only** copy. If Redis crashes before the copy runs, that data is lost.

| Strategy | Writes | Freshness | Risk | Good for |
|---|---|---|---|---|
| Invalidate on write | Normal speed | Fresh after the next miss | Small window of stale reads | Most apps; the safe default |
| Write-through | Slower (two writes) | Fresh right away | Cache and database can disagree if one write fails | Data that is read right after it's written |
| Write-back | Very fast | The **database** is behind | Data loss if the cache fails | Counters, view counts, analytics. Never orders or payments |

AWS's docs suggest combining lazy loading with write-through, and adding a TTL to everything as a safety net. Lazy loading with delete-on-write plus a TTL is the other common combination.

---

## Choosing a TTL

A TTL is a promise: "this data may be up to N seconds old." To pick N, ask: **What's the harm if it's old?** **How often does it really change?** **How expensive is a miss?** A 0.8-second query deserves a longer TTL than a 5 ms one. Some starting points, not rules:

| Data | TTL to start with | Plus |
|---|---|---|
| Blog posts, product descriptions | 5–60 minutes | Delete the key on edit |
| "Top products" lists, search suggestions | 30–120 seconds | Serve stale while refreshing (below) |
| Stock shown on a product page | 5–30 seconds | Check the database at checkout |
| A user's own profile | A few minutes | Delete the key on every update |
| Permissions, balances, prices at checkout | Don't cache | Read from the database when deciding |

Always set a TTL, even when you delete keys on every write. One day a code path will forget to delete, and the TTL limits how long the wrong data can live.

**Add jitter.** If you fill 10,000 keys at the same moment with the same TTL, they all expire in the same second, and your database gets 10,000 queries at once. **Jitter** means adding a small random amount to each TTL, for example 300 seconds plus 0 to 60 more. The expiries spread out over a minute instead of one second.

---

## How it goes wrong: the stampede

Back to 9:00. Here's the arithmetic of one expiry:

- The copy expires. 3,000 requests arrive every second.
- The first request misses and starts the 0.8-second query.
- During those 0.8 seconds, about 2,400 more requests arrive. Each one checks Redis, finds nothing, and starts **the same query**.

So once a minute, the database receives about 2,400 copies of its most expensive query at the same moment. While it struggles, every query gets slower. A slower rebuild means a longer gap with no copy in the cache, which means even more requests miss. At 9:14, the queries took so long that new misses arrived faster than old ones finished. The database never caught up.

This is a **cache stampede**, also called the **thundering herd** problem: many requests rush to rebuild the same missing copy at once. It's worst for keys that are both popular and slow to rebuild. With 50 visitors per minute, you'd never see it. That's why it appears for the first time on your biggest day.

Two related ways to get the same flood:

- **Many keys expire together**, as in the jitter example.
- **A cold cache.** Redis restarts or a new, empty Redis server is added. Every key misses at once. Cache-aside keeps your app working, but only if the database can survive the full load for a while.

---

## What good looks like

There are four standard fixes. Big apps often use more than one.

### Fix 1: Request coalescing

When many requests in the same server want the same missing key, let one of them do the work and make the others share its result:

```js
const inFlight = new Map(); // key → work that is already running

function coalesce(key, load) {
  if (inFlight.has(key)) return inFlight.get(key); // join the running work
  const work = load().finally(() => inFlight.delete(key));
  inFlight.set(key, work);
  return work;
}
```

In plain English: `load()` returns a **promise**, JavaScript's object for "a result that will arrive later". The first request starts the work and stores its promise in `inFlight`. Requests that arrive while it runs get the same promise, so they all wait for the one query. When it finishes, the entry is removed. You'd use it inside the miss path: `cached(key, 60, () => coalesce(key, loadTopProducts))`.

This works inside **one copy** of your app. If you run 20 copies, you get at most 20 queries instead of 2,400. That's often good enough. CDNs do the same for files: Fastly's docs call it **request collapsing**, combining many requests for the same object into one request to your server.

### Fix 2: A lock, plus serving the stale copy

To get down to one query across all copies of your app, use a lock in Redis. Combine it with keeping the old copy around a little longer, so nobody has to wait:

```js
const saved = JSON.parse(await redis.get("products:top")); // null if missing
if (saved && Date.now() < saved.freshUntil) return saved.data; // fresh hit
const gotLock = await tryLock("lock:products:top", 10); // only one request wins
if (!gotLock && saved) return saved.data; // someone else is refreshing
const data = await loadTopProducts();
const entry = { data, freshUntil: Date.now() + 60_000 }; // fresh for 60 s
await redis.setEx("products:top", 600, JSON.stringify(entry)); // kept 10 min
return data;
```

In plain English (this is the inside of a `getTopProducts` function):

1. **Lines 1–2:** Each saved copy now has *two* times: a "fresh until" time 60 seconds away, and a real Redis TTL of 600 seconds. If the copy is still fresh, use it.
2. **Line 3:** The copy is old. Try to take a lock. `tryLock` runs the Redis command `SET lock:products:top 1 NX EX 10`. `NX` means "only set this key if it doesn't exist", so only one request in your whole app gets the lock. `EX 10` makes the lock delete itself after 10 seconds, so a crash can't block refreshes forever.
3. **Line 4:** Didn't get the lock? Someone else is rebuilding. Return the old copy right away.
4. **Lines 5–8:** Got the lock. Run the slow query once, save a fresh copy and return it.

The database now sees one query per minute, no matter how much traffic you have. The trade-off: some visitors see data that's up to a minute or so older. For a "top products" list, that's fine. One gap remains: if there's no saved copy at all (a cold cache), every request still loads. Fix 1 inside each copy of your app softens that.

### Fix 3: Stale-while-revalidate in HTTP

Browsers and CDNs support the same idea with a `Cache-Control` directive:

```text
Cache-Control: public, max-age=60, stale-while-revalidate=600
```

The copy is fresh for 60 seconds. For 600 seconds after that, a cache may keep handing out the old copy *while it fetches a new one in the background*. Visitors don't wait, and your server gets one refresh instead of a crowd. Cloudflare supports this when your server sends the directive. Only use it on responses that are the same for everyone.

### Fix 4: Jitter and refreshing ahead

Add jitter to TTLs so many keys don't expire together. For your few most expensive keys, you can also refresh them on a schedule with a background job, every 50 seconds for a 60-second TTL, so they never expire while people are reading them.

> **Go deeper:** [Sign-up takes 10 seconds because of one email](/lessons/background-jobs) (Level 3) explains background jobs.

### What changes at scale

At small scale, the cache makes your app faster. At large scale, it keeps your database alive, so plan for it being empty: Redis restarts, a deploy that changes every key name. Before a big launch, ask: "If the cache were empty right now, could the database survive a minute of this traffic?" If not, fill (warm) the cache before the traffic arrives.

> **Go deeper:** [Your app went viral. Will it survive?](/lessons/scaling) (Level 4) covers adding servers and spreading load.

---

## Test your own app

Do this on your own laptop or a staging copy of your app, never on someone else's site.

1. **List your cached keys.** Ask your AI for every cache read in your code, with the key, the TTL and the rebuild time. Note any key without a TTL, and any popular key whose rebuild takes more than about 100 ms: that's a stampede risk.
2. **Make a stampede on purpose.** Run your app locally and send load to a cached page with a load testing tool, for example:

```bash
npx autocannon -c 200 -d 30 http://localhost:3000/api/products/top
```

This keeps 200 connections busy for 30 seconds. While it runs, delete the key from Redis (`DEL products:top` in `redis-cli`, the Redis command-line tool) and watch your database logs. How many times did the slow query run? Add Fix 1 or Fix 2 and repeat. The goal is one query per expiry.

3. **Test a cold cache.** Empty your local Redis (`FLUSHALL` deletes everything, so only do this locally) and run the load test again. Does the database survive?

---

## Takeaways

**Key terms**
- **Cache-aside (lazy loading):** your code checks the cache and fills it on a miss
- **Read-through:** the cache layer loads from the database on a miss
- **Write-through:** every database write also updates the cache
- **Write-back / write-behind:** writes go to the cache first and reach the database later
- **TTL jitter:** a small random extra time, so keys don't expire together
- **Cache stampede (thundering herd):** many requests rebuild the same missing copy at once
- **Request coalescing:** requests for the same missing key share one rebuild
- **Stale-while-revalidate:** serve the old copy while refreshing in the background

**Red flags in AI-written code**
- A popular, slow-to-build key with plain cache-aside and nothing to stop a stampede
- Many keys set at once with the exact same TTL
- A cache key with no TTL
- Write-back caching for orders, payments or anything you can't afford to lose
- Write-through that writes the cache *before* the database, or ignores a failed cache write
- No plan for an empty cache: "Redis is always there"

**Ask your AI**
- *"For every cached value in my app, tell me the strategy (cache-aside, read-through, write-through or write-back), the TTL, and what happens when the data changes."*
- *"Which cached keys are popular and slow to rebuild? Add request coalescing or a Redis lock with stale-while-revalidate to them."*
- *"If Redis restarted empty during peak traffic, how many database queries per second would hit my database?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Probabilistic early expiration.** Instead of a lock, each request can decide at random to refresh a copy a little *before* it expires, with the chance rising as expiry gets closer. Because the decisions are random and independent, usually only one or a few requests refresh, and no lock is needed. Search for "probabilistic cache stampede prevention" to find the research behind it.

**The cache-aside race.** Even with "delete on write", stale data can sneak back in. Reader A misses and reads the old value from the database. Before A saves it, writer B updates the database and deletes the key. Then A saves the old value. The cache now holds old data until the TTL ends. This is rare, and it's another reason always to set a TTL.

**Safer lock release.** The lock in Fix 2 simply expires. If you delete a lock yourself, store a random value in it and only delete it if the value still matches, so you never delete a lock that expired and was taken by someone else. The Redis `SET` docs show this pattern, and point to the Redlock algorithm for stronger guarantees across several Redis servers.

**Stale-while-revalidate on CDNs.** On Cloudflare, the first request after expiry triggers a background refresh and gets the stale copy with `cf-cache-status: UPDATING`. Cloudflare's docs note that some directives, including `s-maxage` and `must-revalidate`, stop stale serving when it follows your server's headers.

</details>

## References

- [Caching strategies for Memcached](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html): AWS ElastiCache docs. Lazy loading, write-through, three trips per miss, cache churn, and adding a TTL to both.
- [Cache consistency: strategies to keep data fresh](https://redis.io/blog/cache-consistency-strategies/): Redis blog. Cache-aside, write-through and write-behind trade-offs, including data loss in write-behind and the thundering herd.
- [SET](https://redis.io/docs/latest/commands/set/): Redis docs. The `NX` and `EX` options and the simple lock pattern with a self-expiring key.
- [Cache-Control header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control): MDN. How `stale-while-revalidate` works.
- [Revalidation](https://developers.cloudflare.com/cache/concepts/revalidation/): Cloudflare. Serving stale content with `UPDATING` while refreshing in the background.
- [Request collapsing](https://www.fastly.com/documentation/guides/concepts/edge-state/cache/request-collapsing/): Fastly. Combining many requests for the same object into one request to the server.
- [autocannon](https://github.com/mcollina/autocannon): GitHub. The `-c` and `-d` options of the load testing tool.
