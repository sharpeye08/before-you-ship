---
title: "How does a rate limiter count to 100?"
slug: rate-limiting-algorithms
order: 55
level: 4
levelName: Reliability & scale
concepts: [Fixed window, Window boundary bursts, Sliding window log, Sliding window counter, Token bucket, Leaky bucket, Shared counters in Redis, Atomic operations, RateLimit headers]
readTime: 15 min
quiz:
  - question: "Your limit is 100 requests per minute, using a fixed window that resets at the start of every minute. A script sends 100 requests at 10:00:59 and 100 more at 10:01:00. What happens?"
    options:
      - text: "The second 100 are all blocked"
      - text: "Only 100 of the 200 get through"
      - text: "All 200 get through, because each batch falls in a different window"
        correct: true
      - text: "The script is blocked for an hour"
    explanation: "Each window has its own counter. The first 100 fill the 10:00 window, and the counter resets at 10:01:00. So up to twice the limit can pass in a very short time around the boundary."

  - question: "You need exact counts over the last hour, with a limit of 5,000 requests per client. Which algorithm gives exact counts, and what does it cost?"
    options:
      - text: "Fixed window; it costs nothing extra"
      - text: "Sliding window log; it stores a timestamp for every request, up to 5,000 per client"
        correct: true
      - text: "Token bucket; it stores every request forever"
      - text: "Sliding window counter; it needs no storage at all"
    explanation: "The sliding window log keeps one entry per request and counts the ones in the last hour, which is exact. The price is memory that grows with the limit and the traffic."

  - question: "A token bucket holds up to 20 tokens and refills at 1 token per second. A client has been quiet for a minute, then sends 30 requests at once. What happens?"
    options:
      - text: "All 30 are allowed"
      - text: "All 30 are blocked"
      - text: "Only 1 is allowed"
      - text: "About 20 are allowed right away, and the rest are refused until tokens refill"
        correct: true
    explanation: "After a quiet minute, the bucket is full but can't hold more than 20 tokens. Each request takes one. The burst uses all 20, and then the client gets about one request per second."

  - question: "Your app runs on 5 servers. Each server keeps its own fixed-window counter in memory, with a limit of 100 per minute. Requests are spread evenly. How many requests per minute can one client really send?"
    options:
      - text: "100"
      - text: "About 500, because each server counts only the requests it sees"
        correct: true
      - text: "20"
      - text: "Unlimited"
    explanation: "Each server allows 100 before blocking, and it never sees the other servers' counts. The counter must live in shared storage, like Redis, that all servers use."

  - question: "Two servers read a client's count from Redis at the same moment. Both see 99, both decide \"under 100, allow it\", and both add 1. What is this, and what fixes it?"
    options:
      - text: "A race condition; fix it by making the check and the update one atomic step, like INCR or a Redis script"
        correct: true
      - text: "A memory leak; fix it with a TTL"
      - text: "A cache miss; fix it with a longer TTL"
      - text: "Nothing is wrong; 101 is close enough"
    explanation: "Reading, deciding and writing in separate steps leaves a gap where another server can do the same. INCR adds and returns the new count in one step, and a Redis script runs with no other commands in between."

  - question: "You call a partner's API that allows exactly 10 requests per second. Your app sometimes produces 50 requests at once. Which algorithm fits best for your outgoing requests?"
    options:
      - text: "Fixed window, so the 50 are sent together"
      - text: "Token bucket with a bucket of 50"
      - text: "Leaky bucket as a queue: requests wait in line and leave at a steady 10 per second"
        correct: true
      - text: "No limiter; the partner will handle it"
    explanation: "A leaky bucket used as a queue smooths bursts into a steady flow. Requests wait a little instead of being refused, which matches a partner that allows a strict steady rate."
---

# How does a rate limiter count to 100?

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Rate limit:** counting how many requests each client makes in a period of time, and refusing the extra ones with status code **429 Too Many Requests**. *([Bots signed up 10,000 times overnight. Now what?](/lessons/rate-limiting))*
> - **Redis:** a fast in-memory store that every copy of your app can share. *([Fast, but showing yesterday's data](/lessons/caching))*
> - **TTL:** how many seconds a Redis key lives before Redis deletes it. *([Fast, but showing yesterday's data](/lessons/caching))*
> - **Race condition:** a bug where the result depends on which of two things happens first. *([A customer got charged twice. How?](/lessons/charged-twice))*

## 200 requests in two seconds

Your app has a search API that other developers pay to use. Each search costs you money, because it calls a paid AI model. So you set a rule: **100 requests per minute per API key.** The AI added a rate limiting package, you tested it, and the 101st request got a 429. Done.

A week later, your bill is higher than expected. In the logs you find one customer's script sending 100 requests at 10:00:59 and 100 more at 10:01:00. That's 200 requests in two seconds, and your limiter allowed every one.

So you add a quick fix: a limit per second as well. Now a different customer complains. Their mobile app sends 15 requests at once when it opens, and half of them get blocked.

The limiter had no bug. The problem is that "100 per minute" is not one rule. Which minute? Starting when? Can a client save up unused requests? Where is the counter kept when you have five servers? Each **rate limiting algorithm**, a fixed recipe for counting, answers these questions differently. This lesson shows the five common ones and what each costs.

---

## The mental model: what does "recently" mean?

Every rate limiter answers one question on every request: **"Has this client made too many requests recently?"**

The algorithms differ in what "recently" means and how much they remember:

| Algorithm | What it remembers per client | "Recently" means |
|---|---|---|
| Fixed window | One counter | Since the current minute started |
| Sliding window log | Every request's time | Exactly the last 60 seconds |
| Sliding window counter | Two counters | An estimate of the last 60 seconds |
| Token bucket | Tokens left + last update time | Whatever you saved up, refilled at a steady speed |
| Leaky bucket | A queue (or a level) + last update time | Requests leave at a steady speed |

Think of it like a school library that allows 3 books per student per week. "Per week" could mean "Monday to Sunday" (a fixed window), "the last 7 days from today" (a sliding window), or "you get a new book allowance every 2 days, and can save up to 3" (a token bucket). All three sound like "3 per week". They behave very differently on a Sunday night.

---

## 1. Fixed window

Split time into fixed blocks, like 10:00:00–10:00:59, then 10:01:00–10:01:59. Keep one counter per client per block. When the block ends, a new counter starts at zero.

```js
async function allowFixedWindow(clientId, limit = 100, windowSec = 60) {
  const windowNo = Math.floor(Date.now() / 1000 / windowSec); // which minute is it?
  const key = `rl:${clientId}:${windowNo}`;
  const [count] = await redis.multi().incr(key).expire(key, windowSec).exec();
  return count <= limit; // false → reply 429
}
```

In plain English:

1. **Line 2:** Work out the number of the current window. Every request in the same minute gets the same number.
2. **Line 3:** Build a Redis key for this client and this window, like `rl:key_42:29512345`.
3. **Line 4:** In one go, add 1 to that key's counter (`INCR`) and give it a TTL (`EXPIRE`) so old windows clean themselves up. `INCR` returns the new count.
4. **Line 5:** Allow the request if the count is still within the limit.

**Good:** tiny memory (one number per client), one fast Redis call, easy to understand.

**The edge problem:** the counter resets at the boundary, so a client can use its whole limit at the end of one window and again at the start of the next:

```text
           10:00 window            |           10:01 window
 ..........................[100]   |   [100]..........................
                        10:00:59   |   10:01:00
                 200 requests in about 2 seconds, all allowed
```

So a "100 per minute" fixed window really allows up to **200 within a short moment**. For login protection, that may be fine. For an expensive API, it can double your worst-case cost. `express-rate-limit`, the package from the earlier rate limiting lesson, starts each client's window at their first request instead of on the clock minute, but it's still a fixed window with the same edge problem.

---

## 2. Sliding window log

Remember the time of every request. On each new request, forget the ones older than 60 seconds and count the rest. That's an exact answer to "how many in the last 60 seconds?".

Redis has a good tool for this: a **sorted set**, a list of items kept in order by a number called a score. Here the score is the time:

```js
const now = Date.now();
const key = `rl:log:${clientId}`;
await redis.zRemRangeByScore(key, 0, now - 60_000); // forget requests older than 60 s
const recent = await redis.zCard(key); // how many are left?
if (recent >= 100) return false; // over the limit → 429
await redis.zAdd(key, { score: now, value: `${now}:${crypto.randomUUID()}` });
await redis.expire(key, 60);
return true;
```

In plain English:

1. **Line 3:** Delete every saved request older than 60 seconds.
2. **Lines 4–5:** Count what's left. If 100 or more, refuse.
3. **Lines 6–7:** Otherwise, save this request with the current time (plus a random ID, so two requests in the same millisecond don't overwrite each other), and give the whole key a TTL.

**Good:** exact. No boundary burst.

**Bad:** memory. With a limit of 5,000 per hour, a busy client needs up to 5,000 entries. Cloudflare's engineers rejected this method for that reason. There's also a hidden bug: these are separate Redis commands, so two servers can both count 99 and both allow a request. The fix comes below.

---

## 3. Sliding window counter

This is a clever middle ground. Keep two fixed-window counters: the previous window and the current one. Then **estimate** how many requests happened in the last 60 seconds, assuming the previous window's requests were spread evenly.

Cloudflare described it in a 2017 engineering blog post with this example. The limit is 50 per minute. The current minute started 15 seconds ago, and the client has made 18 requests in it. In the previous minute, it made 42.

The last 60 seconds covers the 15 seconds of this minute, plus the last 45 seconds (75%) of the previous minute. So the estimate is:

```text
estimate = 42 × 0.75 + 18 = 49.5   → under 50, allowed
```

The two counters are stored with `INCR`, as in the fixed window. The only new work is this one line of arithmetic.

**Good:** two numbers per client, and no big burst at the boundary.

**Bad:** it's an estimate. If the previous minute's requests were bunched together, the guess is a little off. Cloudflare tested it on 400 million requests from 270,000 sources and reported that only 0.003% of requests were wrongly allowed or wrongly limited. For most apps, that's accurate enough.

---

## 4. Token bucket

Picture a bucket that holds up to 20 tokens. Tokens drip in at a steady speed, for example 100 per minute (one every 0.6 seconds). Each request takes one token. No token, no entry: reply 429.

This gives you two separate settings:

- **The refill rate** controls the average: 100 per minute over time.
- **The bucket size** controls the burst: up to 20 at once, if the client has been quiet.

That's exactly what the mobile app in the story needed: 15 requests at once on opening, then quiet.

You don't need a timer that adds tokens. Store two numbers, the tokens left and the time you last updated them, and catch up on every request:

```js
function takeToken(bucket, now, size = 20, perSec = 100 / 60) {
  const secondsPassed = (now - bucket.updatedAt) / 1000;
  bucket.tokens = Math.min(size, bucket.tokens + secondsPassed * perSec); // refill
  bucket.updatedAt = now;
  if (bucket.tokens < 1) return false; // empty → 429
  bucket.tokens -= 1;
  return true;
}
```

In plain English:

1. **Lines 2–3:** Work out how many tokens dripped in since the last request, add them, and never go above the bucket size.
2. **Line 4:** Remember when we last updated.
3. **Lines 5–7:** If there's less than one whole token, refuse. Otherwise, take one and allow.

**Good:** small memory, controlled bursts, a smooth average. It's widely used: Stripe wrote in 2017 that it uses the token bucket algorithm for its API rate limits, with the buckets kept in Redis.

**Bad:** two settings to choose instead of one, and a burst of up to the bucket size is always allowed, so set it with your costs in mind.

---

## 5. Leaky bucket

The name describes a bucket with a small hole at the bottom. Requests pour in at any speed. They leak out at a steady speed. If the bucket overflows, extra requests are refused.

The term is used in two ways:

- **As a queue:** requests really wait in line, and your server handles them at a fixed speed, like 10 per second. The output is perfectly smooth, but requests are **delayed** instead of refused, until the queue is full.
- **As a meter:** nothing waits; you only track a "water level" that drains over time and refuse requests that would overflow it. In this form, it behaves the same as a token bucket seen from the other side.

The queue version is good when the thing *behind* the limiter needs a steady flow, like a partner's API that allows exactly 10 requests per second. It's bad for user-facing requests, where waiting in a queue feels like a frozen app.

The popular web server **NGINX** uses a leaky bucket for its `limit_req` feature. Its `burst` setting is the queue size, and `nodelay` serves queued requests right away instead of spacing them out. By default, NGINX refuses extra requests with status **503**, not 429; the `limit_req_status` setting changes that.

---

## Comparing them

| | Memory per client | Bursts | Accuracy | Good for |
|---|---|---|---|---|
| Fixed window | 1 number | Up to 2× the limit at boundaries | Low at boundaries | Simple limits, login protection |
| Sliding window log | 1 entry per request | None | Exact | Low limits where exactness matters |
| Sliding window counter | 2 numbers | Small | Very close | Large public APIs |
| Token bucket | 2 numbers | Up to the bucket size, on purpose | Exact for its rules | APIs with bursty real clients |
| Leaky bucket (queue) | A queue | Smoothed out by waiting | Exact | Calling a partner with a strict rate |

---

## How it goes wrong at scale

### Counters that don't share

If each server keeps its own counter in memory, a limit of 100 across 5 servers becomes about 500, and on serverless platforms the number of copies changes with traffic. Every algorithm above needs its numbers in **shared storage** that all copies use. Redis is the common choice: it's fast and has counters, TTLs and sorted sets built in.

### Check, then write: the race

Shared storage brings a new problem. Look at this pattern:

```js
const count = Number(await redis.get(key)); // read
if (count >= 100) return false; // decide
await redis.set(key, count + 1); // write
```

Between the read and the write, another server can do the same read. Both see 99, both allow, both write 100. Under heavy traffic, this happens often, and the limit leaks.

The fix is to make the check and the update one **atomic** step: a single step that nothing else can run in the middle of.

- For counters, use `INCR`. It adds 1 and returns the new value in one step, so two servers always get different answers (100 and 101).
- For anything with several steps, like the sliding window log or the token bucket, put the logic in a small **Lua script** that runs inside Redis. Redis's docs promise that a script runs atomically: nothing else happens while it runs. Many rate limiting packages that support Redis do this for you.

### Redis is slow or down

Every request now makes a network trip to Redis, so keep Redis close to your servers. And decide in advance what happens if Redis doesn't answer. **Fail open** means allowing the request: the app stays up, but there's no limit for a while. **Fail closed** means refusing it: the limit holds, but every user is blocked. Many apps fail open for normal endpoints and closed for ones that cost real money per call. Make it a decision, not an accident, and log it.

---

## What good looks like

1. **Pick the algorithm from the behavior you want.** Bursty but well-behaved clients: token bucket. A hard ceiling with no boundary tricks: sliding window counter. A steady flow to something fragile: leaky bucket queue. Simple login protection: a fixed window is fine.
2. **Store counters in shared storage** and update them atomically.
3. **Tell clients the rules.** Send `Retry-After` with every 429. You can also send the newer `RateLimit` and `RateLimit-Policy` headers, which tell clients how much of their limit is left. These come from a draft standard at the IETF, the group that writes internet standards. As of November 2026 it is still an Internet-Draft, a work in progress, not a finished standard, so details may change. `express-rate-limit` can send them with its `standardHeaders` option (the `draft-7` or `draft-8` setting).
4. **Limit by cost, not only by count.** A search that calls an AI model might take 10 tokens from the bucket, a simple lookup only 1.

> **Go deeper:** [Your app went viral. Will it survive?](/lessons/scaling) (Level 4) covers running many servers behind a load balancer, where shared counters matter most.

---

## Test your own app

Only test apps you own, on your laptop or a staging copy.

1. **Find the algorithm.** Ask your AI: "Which rate limiting algorithm does my app use, and where are the counters stored?" If the answer is "fixed window in memory", note it.
2. **Test the boundary.** Send your full limit in a burst, wait until the window should reset, then send the full limit again right away. With a fixed window, both bursts succeed. Is that acceptable for this endpoint?
3. **Test with several copies.** Run two copies of your server on your laptop, at `localhost:3000` and `localhost:3001`, send half your requests to each, and see whether the limit still holds. If each copy allows the full limit, the counters aren't shared.
4. **Test a burst.** From the browser console, send 20 requests at the same moment (ask your AI for a `Promise.all` loop, which starts them all together). Does a normal client's burst get through? Does a much bigger one get stopped?

---

## Takeaways

**Key terms**
- **Fixed window:** one counter per time block; resets at the boundary
- **Sliding window log:** remembers every request's time; exact, but memory-heavy
- **Sliding window counter:** estimates the last minute from two counters
- **Token bucket:** tokens refill at a steady rate; the bucket size allows controlled bursts
- **Leaky bucket:** requests leave at a steady rate; as a queue, it delays instead of refusing
- **Atomic operation:** a step that nothing else can run in the middle of

**Red flags in AI-written code**
- A fixed window protecting an expensive endpoint, with nobody aware of the 2× boundary burst
- Counters in a variable or the default memory store, in an app with several servers or serverless functions
- Read the count, then write the count, as two separate Redis commands
- No decision about what happens when Redis is down
- 429 replies with no `Retry-After`
- A per-second limit so strict that one normal page load trips it

**Ask your AI**
- *"Which rate limiting algorithm does each limiter in my app use? What is the worst-case number of requests one client can get through in 2 seconds?"*
- *"Are my rate limit counters shared across all servers and updated atomically? Show me the exact Redis commands."*
- *"Switch my AI endpoint's limiter to a token bucket with a rate of 100 per minute and a burst of 20, stored in Redis, and send Retry-After on 429."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Rate limiting as a cost meter.** The IETF draft lets a server count quota in units other than requests, for example content bytes or concurrent requests, through a `qu` parameter on `RateLimit-Policy`. Even if you don't send the headers, the idea is useful: count what costs you money.

**Concurrent request limits.** Stripe's 2017 post describes a second limiter that caps how many requests a client has *in progress at once*, not per second. It protects you from a few very slow, expensive requests, which a per-second limit can't see.

**Remembering who is blocked.** Cloudflare's 2017 post describes caching the "this client is blocked" decision on each server once a limit is hit, so blocked clients don't cost a shared-storage lookup on every request.

**Redis key patterns.** The Redis `INCR` docs show two rate limiter patterns: one key per client per second with `INCR` and `EXPIRE` sent together in a `MULTI`/`EXEC` block, and a single key per client, where they point out a race condition and fix it with a Lua script.

</details>

## References

- [How we built rate limiting capable of scaling to millions of domains](https://blog.cloudflare.com/counting-things-a-lot-of-different-things/): Cloudflare blog, 2017. The sliding window counter formula, the 42 × 0.75 + 18 example, the 0.003% result on 400 million requests, and why the sliding window log was rejected.
- [RateLimit header fields for HTTP](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/): IETF Datatracker. The `RateLimit` and `RateLimit-Policy` fields and the draft's status as a working group Internet-Draft, not an RFC.
- [Scaling your API with rate limiters](https://stripe.com/blog/rate-limiters): Stripe blog, 2017. Token buckets stored in Redis, and concurrent request limiters.
- [Configuration - express-rate-limit](https://express-rate-limit.mintlify.app/reference/configuration): express-rate-limit docs. Each client's window starts at their first request, and the `standardHeaders` option (`draft-7` or `draft-8`) sends the draft `RateLimit` and `RateLimit-Policy` headers.
- [Limiting Access to Proxied HTTP Resources](https://docs.nginx.com/nginx/admin-guide/security-controls/controlling-access-proxied-http/): NGINX docs. `limit_req` as a leaky bucket, `burst`, `nodelay`, the default 503 and `limit_req_status`.
- [Leaky bucket](https://en.wikipedia.org/wiki/Leaky_bucket): Wikipedia. The meter and queue versions, and the meter's equivalence to a token bucket.
- [INCR](https://redis.io/docs/latest/commands/incr/): Redis docs. Atomic counters and the rate limiter patterns, including the race condition.
- [Scripting with Lua](https://redis.io/docs/latest/develop/programmability/eval-intro/): Redis docs. Scripts run atomically, with all other server activity blocked while they run.
