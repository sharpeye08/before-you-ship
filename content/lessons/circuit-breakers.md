---
title: "One slow service took your whole app down"
slug: circuit-breakers
order: 60
level: 5
levelName: Systems & architecture
concepts: [Cascading failures, Timeouts, Circuit breaker, Closed open and half-open states, Fallbacks, Graceful degradation, Bulkheads]
readTime: 14 min
quiz:
  - question: "Your product page calls a recommendations service. One evening that service gets slow: every answer takes 30 seconds. Soon checkout and login stop working too, even though they never call it. Why?"
    options:
      - text: "The recommendations service hacked the other pages"
      - text: "Waiting requests pile up and use up shared, limited things such as threads, memory or database connections, so other pages can't get them"
        correct: true
      - text: "Checkout secretly calls the recommendations service"
      - text: "Slow services always delete data"
    explanation: "When each request lasts 300 times longer, about 300 times more requests are in progress at once. They hold on to shared resources, and pages that never call the slow service run out of them too. This is a cascading failure."

  - question: "Why is a slow service often more dangerous than one that is completely down?"
    options:
      - text: "A slow service costs more money to run"
      - text: "A down service sends better error messages"
      - text: "Calls to a down service usually fail fast, but calls to a slow service hold on to your resources while they wait"
        correct: true
      - text: "There is no difference"
    explanation: "Failing fast frees your resources right away. Waiting keeps them busy, and while they're busy, new requests pile up behind them."

  - question: "A circuit breaker protecting a payment service is in the open state. A customer clicks Pay. What happens?"
    options:
      - text: "The call fails immediately, without contacting the payment service, and your code shows a clear message"
        correct: true
      - text: "The payment service is called and the customer waits as usual"
      - text: "The breaker charges the card itself"
      - text: "The call is retried until it succeeds"
    explanation: "Open means tripped. The breaker answers at once with an error (or a fallback) so your app stops waiting on a service that is failing. For payments, the honest fallback is a clear \"try again in a few minutes\" message."

  - question: "The breaker has been open for 30 seconds. It moves to half-open and lets one trial call through. The trial call times out. What happens next?"
    options:
      - text: "The breaker closes and all calls go through again"
      - text: "The breaker switches itself off for good"
      - text: "The breaker lets every waiting call through at once"
      - text: "The breaker goes back to open and starts the wait again"
        correct: true
    explanation: "Half-open is a careful test. If the trial fails, the service is still sick, so the breaker opens again and waits before the next test. This also protects a recovering service from a sudden flood."

  - question: "The recommendations breaker is open. Which fallback makes the most sense for a \"Customers also bought\" box?"
    options:
      - text: "Show an error page instead of the whole product page"
      - text: "Show a cached list of bestsellers, or hide the box"
        correct: true
      - text: "Keep calling the service in a loop until it answers"
      - text: "Make up random products and say they are personal recommendations"
    explanation: "The box is a nice extra. Showing slightly older or more general data, or hiding it, keeps the important part of the page working. This is graceful degradation."

  - question: "Your app calls three outside services. You give each one its own limit of at most 20 calls in progress at once. What does this protect you from?"
    options:
      - text: "Bugs in your own database queries"
      - text: "Users who forget their passwords"
      - text: "One slow service using up all your resources, so calls to the other two keep working"
        correct: true
      - text: "Duplicate payments"
    explanation: "This is a bulkhead. Like the walls between sections of a ship, it keeps a problem in one section from flooding the rest."
---

# One slow service took your whole app down

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Timeout and retry:** the longest you'll wait for an answer, and sending a failed request again, with growing waits. *([The payment timed out. Did it go through?](/lessons/timeouts-and-retries))*
> - **Thread:** one line of work inside a running program. Some servers use one thread per request. *([How one server handles thousands of users at once](/lessons/processes-and-threads))*
> - **Connection pool:** the limited set of open database connections your app shares. *([Your app went viral. Will it survive?](/lessons/scaling))*
> - **Cache:** a saved copy of an answer, kept somewhere faster to reach. *([Fast, but showing yesterday's data](/lessons/caching))*

## The box nobody needed

You run an online shop. Each product page has a small box at the bottom: **"Customers also bought"**. The list comes from a recommendations API, run by another company. In this lesson, a **service** means a separate program that your app talks to over the network, like that API, a payment provider or an email sender. A service your app needs is called a **dependency**.

One evening, the recommendations service doesn't crash. It gets **slow**. Answers that used to take 0.1 seconds now take 30.

Five minutes later, your product pages hang. Then checkout stops working. Then login. Your error tracker fills with timeouts from pages that never call the recommendations service at all. A box that nobody needed took the whole shop down.

This lesson explains how one slow dependency spreads its problem to everything else, and the three tools that stop it: **timeouts**, **circuit breakers** and **bulkheads**.

---

## The mental model: waiting is not free

Every request that is in progress holds on to something your app only has a limited amount of:

- On servers that use **one thread per request**, it holds a thread. A server with 200 threads can serve 200 requests at once, and request 201 waits.
- In Node.js, waiting doesn't block the main thread, but every waiting request still holds memory and an open connection.
- If your code holds a database connection or a transaction while it waits for the other service, it holds one of the few connections in your **connection pool**.
- On a serverless platform, it keeps a function running, and you may pay for the wait.

Now some arithmetic. Your product page gets 50 visits per second.

- **Normal day:** each request lasts 0.1 seconds, so about 50 × 0.1 = **5** requests are in progress at any moment.
- **Slow evening:** each request lasts 30 seconds, so about 50 × 30 = **1,500** requests are in progress at once.

Nothing about your traffic changed. Each request lives 300 times longer, so 300 times more of them exist at the same moment. A server with 200 threads runs out after about 4 seconds (200 ÷ 50). Checkout needs a thread or a database connection too, so it waits in the same line as everyone else. Users press refresh, and retries add even more requests.

This is a **cascading failure**: a failure in one part of a system spreads to parts that didn't depend on it, like a line of falling dominoes.

Here is the surprising part:

> **A slow service is often more dangerous than a dead one.**

When a service is completely down, your calls usually fail within milliseconds, and your resources are free again at once. A slow service keeps them busy.

---

## How it goes wrong

### Bug 1: No timeout

```js
const res = await fetch(`https://recs.example.com/for/${productId}`);
```

This is the code from the story. Without a timeout, `fetch` in Node.js can wait for minutes. Each product page waits as long as the recommendations service takes, and holds its resources the whole time.

### Bug 2: A timeout, but nothing else

Say you add a 2-second timeout. Now about 50 × 2 = 100 requests are in progress instead of 1,500. Much better, but every product page is 2 seconds slower for as long as the service is sick. And you keep sending 50 requests per second to a service that is already struggling, which can keep it down longer. With 3 retries per failure, it gets up to four times that.

The timeout limits the damage of each call. It doesn't stop you from making calls that are almost certain to fail.

### Bug 3: One failure takes the whole page with it

```js
const product = await getProduct(id);
const recs = await getRecommendations(id); // throws when the service fails
res.json({ product, recs });
```

When the recommendations call throws an error, the whole route fails. The product, its price and the Buy button all vanish because of a box at the bottom. The important part of the page depends on the least important part.

---

## What good looks like

### Fix 1: Timeouts first

Every call to another service gets a timeout that fits the job, as you saw in the timeouts lesson:

```js
const getRecs = (productId) =>
  fetch(`https://recs.example.com/for/${productId}`, { signal: AbortSignal.timeout(2000) })
    .then((r) => { if (!r.ok) throw new Error(`recs ${r.status}`); return r.json(); });
```

In plain English: ask for the recommendations, give up after 2 seconds, and treat any error status as a failure. A timeout is the first defense, because every other tool in this lesson needs calls to fail in a known amount of time.

### Fix 2: A circuit breaker

Your home has a box of **circuit breakers** for the electrical wiring. If too much current flows through one circuit, its breaker trips and cuts the power to that circuit, before the wires overheat. The rest of the house keeps its lights on.

A software **circuit breaker** does the same for calls to a service. It sits between your code and the service, counts recent failures, and when there are too many, it **trips**: for a while, it stops sending calls at all and fails them immediately instead.

**Where the comparison stops working:** a home breaker stays off until a person flips it back. A software breaker tests the service on its own, and closes again when the service has recovered.

A circuit breaker has three states:

| State | What happens to calls | It changes when... |
|---|---|---|
| **Closed** (normal) | Calls go through to the service. The breaker counts failures, including timeouts. | Failures pass a **threshold**, such as "half of recent calls failed". It moves to **open**. |
| **Open** (tripped) | Calls fail immediately. The service is not contacted at all. | A wait time passes, such as 30 seconds. It moves to **half-open**. |
| **Half-open** (testing) | A small number of trial calls go through. | If the trials succeed, it moves to **closed**. If one fails, it goes back to **open** and the wait starts again. |

The names come from electrical circuits, and they confuse almost everyone at first: **closed means working**, because the current can flow. **Open means stopped.**

The half-open state matters. A recovering service can often handle a little traffic, but not all of it at once. Letting a few test calls through first stops your app from knocking it straight back down.

Replay the slow evening with a breaker. After a few seconds of timeouts, the breaker opens. The recommendations call now fails instantly, so threads and connections are free again, and checkout and login keep working. The struggling service gets a break from your traffic, and every 30 seconds a trial call checks whether it's back.

For Node.js, one circuit breaker library is **opossum**. You wrap the function from Fix 1 in a breaker:

```js
const recsBreaker = new CircuitBreaker(getRecs, {
  timeout: 2000,                // a call slower than 2 s counts as a failure
  errorThresholdPercentage: 50, // open when half of recent calls fail
  resetTimeout: 30000,          // after 30 s open, let a trial call through
  volumeThreshold: 10,          // but only judge once there are 10 recent calls
});
```

In plain English:

- **`timeout`:** opossum's own timer. A call that takes longer counts as a failure. It stops opossum waiting, but it doesn't cancel the request itself, which is why `getRecs` keeps its own `AbortSignal.timeout`.
- **`errorThresholdPercentage`:** the threshold. opossum looks at the calls in a recent time window (the last 10 seconds by default) and opens when more than half failed.
- **`resetTimeout`:** how long the breaker stays open before it moves to half-open.
- **`volumeThreshold`:** the default is 0, which means a single failed call out of one can open the breaker. Requiring a minimum number of calls stops one unlucky request from tripping it.

### Choosing the numbers

There is no correct threshold for every app. These are judgment calls:

- **Too sensitive** (trips after one or two failures): the breaker opens during normal small hiccups, and users lose a feature for no reason.
- **Too relaxed** (needs hundreds of failures): the pile-up happens before the breaker reacts.
- **Wait time too short:** the breaker keeps flipping between open and half-open, and adds load to a service that hasn't recovered.
- **Wait time too long:** the feature stays off long after the service is healthy again.

Also decide which errors count. A timeout or a `503` means the service is in trouble. A `404` for a product that has no recommendations is a normal answer, not a sign of sickness. opossum has an `errorFilter` option for errors that should not count toward tripping.

### Fix 3: A fallback for every breaker

When the breaker is open, your code still has to show *something*. The answer you use instead is called a **fallback**. Choosing it is a product decision, not a technical one:

| Fallback | Example |
|---|---|
| A cached answer | Yesterday's recommendations for this product. Older, but good enough. |
| A default answer | The shop's bestsellers instead of personal recommendations |
| Hide the feature | No "Customers also bought" box today |
| Save it for later | Put the request in a queue and finish it when the service is back |
| An honest error | "Payments are temporarily unavailable. Please try again in a few minutes." |

Keeping the important parts of your app working while the less important parts are switched off or simplified is called **graceful degradation**.

Some things have no safe substitute. Never fake a success for a payment, an order or a password check. For those, the right fallback is a fast, clear error, which is still much better than a 30-second spinner.

With opossum, you register the fallback on the breaker:

```js
recsBreaker.fallback(() => cachedBestsellers); // used on failure, timeout, or when open
recsBreaker.on("open", () => logger.warn("Recommendations breaker OPEN"));

app.get("/api/products/:id/recs", async (req, res) => {
  res.json(await recsBreaker.fire(req.params.id));
});
```

In plain English:

1. **Line 1:** if a call fails, times out, or the breaker is open, return the cached bestsellers instead.
2. **Line 2:** write a log line when the breaker opens, so you can alert on it. A breaker that hides an outage silently is a breaker nobody fixes.
3. **Lines 4–6:** the route calls the service only through the breaker, with `fire`.

Also notice the route: recommendations now have **their own API route**, loaded separately by the page. If that route fails, only the box is empty. The product, price and Buy button come from a different request. That fixes Bug 3.

### Fix 4: Bulkheads

Ships are divided into sealed sections by walls called **bulkheads**. If the hull is damaged, water fills one section, and the ship stays afloat.

In software, a **bulkhead** gives each dependency its own limited share of resources, so one slow dependency can't use up everything. For example: at most 20 calls to the recommendations service may be in progress at once. Call number 21 doesn't wait. It fails immediately and gets the fallback.

opossum has this built in, as the `capacity` option: add `capacity: 20` to the options above. Other ways to build bulkheads include a separate connection pool for each service, or running an important feature as its own service with its own servers.

A circuit breaker and a bulkhead work together. The bulkhead limits **how much** damage a slow service can do while the breaker is still closed. The breaker decides **when to stop calling** altogether.

---

## Test your own app

Do this in staging, never against real users or a real outside service.

1. **List your dependencies.** Ask your AI: *"List every outside service my app calls, which routes call it, and the timeout each call uses."*
2. **Build a fake slow service.** Ask your AI for a tiny test server with one route that waits 30 seconds before answering. Point one dependency's URL at it in staging.
3. **Load the slow page and an unrelated page at the same time.** Open the page that uses the slow dependency in several tabs, then open checkout or login. Does checkout still answer quickly? It should.
4. **Watch the breaker.** Check your logs for the "breaker open" line. Does the page show the fallback within a few seconds?
5. **Switch the fake service back to fast.** Within your `resetTimeout`, the breaker should move to half-open, and then closed. The real feature should come back without a deploy.

---

## Takeaways

**Key terms**
- **Dependency:** a service your app needs to do its work
- **Cascading failure:** a failure in one part that spreads to parts that didn't depend on it
- **Circuit breaker:** a wrapper that stops calling a failing service for a while and fails fast instead
- **Closed / open / half-open:** normal / tripped, calls fail immediately / testing with a few trial calls
- **Threshold:** how many failures, or what share of recent calls, trips the breaker
- **Fallback:** the answer you use when the real call fails or the breaker is open
- **Graceful degradation:** keeping the important parts working while less important parts are switched off or simplified
- **Bulkhead:** a separate, limited share of resources for each dependency

**Red flags in AI-written code**
- A call to an outside service with no timeout
- A retry loop around a call, with no circuit breaker and no limit
- A "nice to have" call (recommendations, analytics, avatars) awaited inside the main route, so its failure fails the whole page
- A circuit breaker with no fallback, or no log or alert when it opens
- A database transaction kept open while waiting for an outside service
- `404` or `400` errors counted as failures that trip the breaker

**Which step broke?**
- Pages are slow but working → the dependency is slow, and your timeouts are too long
- Unrelated pages fail too → a cascading failure: no bulkhead, and waiting requests use shared resources
- The feature stays off after the service recovered → the breaker's wait time is too long, or half-open trials keep failing
- The breaker opens on normal days → the threshold is too sensitive, or normal errors count as failures

**Ask your AI**
- *"For each outside service my app calls, what happens to my app if that service takes 30 seconds to answer? Which unrelated pages would slow down?"*
- *"Wrap calls to [service] in a circuit breaker with opossum. Set a timeout, a sensible threshold, a fallback, and a log line when it opens."*
- *"Which features in my app could show a cached or default answer when a service is down, and which must show an error instead?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Where retries fit.** A retry says "this was probably a short hiccup, try again". A breaker says "this service is in real trouble, stop trying". Microsoft's guide suggests making calls through the breaker and stopping retries when the breaker reports that it's open. Retrying an open breaker only wastes time.

**The arithmetic has a name.** "Requests in progress = arrival rate × time each one takes" is known as Little's Law. It's why a latency problem turns into a capacity problem: if requests take 300 times longer, you need 300 times the capacity just to stand still.

**Each copy of your app has its own breaker.** opossum keeps the breaker's state in memory. If your app runs as many instances, each one learns separately that the service is sick. That's usually fine. On serverless platforms, short-lived instances may start with a fresh, closed breaker, so they each need a few failures before they trip. Some teams keep breaker state in a shared store, or let infrastructure handle it.

**Breakers outside your code.** Microsoft's pattern guide notes that service meshes often offer circuit breaking without changes to application code. A service mesh is infrastructure that sits next to each service and handles the network calls between them.

**Smarter thresholds.** Thresholds can treat error types differently, for example needing more timeouts than "connection refused" errors before tripping. If a service replies with `429` or `503` and says how long to wait, the breaker can open at once for that long.

**Fallbacks can fail too.** A fallback that calls another slow service just moves the problem. Good fallbacks are fast and local: a value in memory, a cache, or a static default.

**Load shedding.** A bulkhead protects you from a slow dependency. The same idea can protect your own server from too many users: when it's overloaded, it refuses some requests quickly with a `503` instead of accepting all of them and answering none in time.

</details>

## References

- [Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html): Martin Fowler. The original explanation of the pattern: tripping after a failure threshold, the half-open trial call, monitoring breaker state, and fallbacks such as showing stale data or queuing work for later.
- [Circuit Breaker pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker): Microsoft Azure Architecture Center. Blocked requests holding memory, threads and database connections, the closed, open and half-open states, limited trial requests in half-open, cached or default responses, combining breakers with retries, and service meshes.
- [Bulkhead pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead): Microsoft Azure Architecture Center. The ship-hull comparison, and a separate connection pool per service so one failing service can't exhaust the others.
- [opossum documentation](https://nodeshift.dev/opossum/): nodeshift. The options `timeout`, `errorThresholdPercentage`, `resetTimeout`, `volumeThreshold`, `capacity` and `errorFilter`, their defaults, the 10-second rolling window, `fire`, `fallback`, and the `open`, `halfOpen` and `close` events.
- [opossum source code (circuit.js)](https://github.com/nodeshift/opossum/blob/main/lib/circuit.js): nodeshift on GitHub. The fallback runs on failures, timeouts, open-breaker rejections and capacity rejections, and opossum's timeout only aborts the request itself if you pass an `abortController`.
- [Dispatcher](https://undici.nodejs.org/api/Dispatcher): undici documentation (the library behind `fetch` in Node.js). Default waits of 300 seconds, which is why `fetch` without a timeout can wait for minutes.
