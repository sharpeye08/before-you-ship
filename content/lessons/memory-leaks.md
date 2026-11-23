---
title: "Your server crashes every few days, like clockwork"
slug: memory-leaks
order: 52
level: 4
levelName: Reliability & scale
concepts: [Memory, Heap, Garbage collection, Memory leaks, Memory limits, Heap snapshots]
readTime: 14 min
quiz:
  - question: "JavaScript has a garbage collector. So how can a JavaScript server have a memory leak?"
    options:
      - text: "It can't. Memory leaks only happen in languages without a garbage collector"
      - text: "The garbage collector only runs when the server restarts"
      - text: "The code still holds references to data it will never use again, so the collector must keep that data"
        correct: true
      - text: "The garbage collector deletes data that is still needed"
    explanation: "The garbage collector frees only what your code can no longer reach. A Map, array or listener that keeps growing is still reachable, so everything in it stays in memory forever."

  - question: "Your hosting dashboard shows memory climbing slowly for about two days, then dropping sharply, then climbing again. What does this pattern most likely mean?"
    options:
      - text: "A memory leak: memory grows until the process crashes or restarts, then starts again from the bottom"
        correct: true
      - text: "Normal behaviour: memory always grows for two days"
      - text: "The database is slow every two days"
      - text: "The garbage collector is working perfectly"
    explanation: "A healthy server's memory goes up and down around a steady level. A line that only goes up, then drops at each crash or deploy, is the classic shape of a leak."

  - question: "Your live-updates route adds a listener to a shared EventEmitter for each visitor, but never removes it. What happens over time?"
    options:
      - text: "Nothing, because listeners are deleted when the browser tab closes"
      - text: "Every closed tab leaves a listener behind, along with everything it references, so memory grows with each visitor"
        correct: true
      - text: "The EventEmitter refuses new listeners after 10"
      - text: "The server sends each update only to the first visitor"
    explanation: "Closing the tab does not remove your listener. The shared emitter keeps a reference to it, and it keeps the response object alive. Node prints a MaxListenersExceededWarning after 10 listeners for one event, but it still lets you add more."

  - question: "Your logs show \"FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory\". A teammate suggests raising --max-old-space-size from 1 GB to 4 GB. What is the problem with that as the only fix?"
    options:
      - text: "The flag does not exist"
      - text: "It makes the garbage collector stop working"
      - text: "If there is a leak, memory keeps growing and the crash comes back later. And if the machine has less than 4 GB, the platform may kill the process first"
        correct: true
      - text: "Nothing, 4 GB is always enough"
    explanation: "A bigger limit only moves the finish line. A leak still grows without end. Find what is growing, and fix it. Only raise the limit if the app really needs more memory and the machine has it."

  - question: "You want to find what is leaking. What is the most useful way to use heap snapshots?"
    options:
      - text: "Take one snapshot right after the server starts"
      - text: "Take one snapshot after the crash"
      - text: "Take a snapshot every second in production"
      - text: "Take one snapshot, use the app for a while, take a second one, and compare them to see which objects grew"
        correct: true
    explanation: "Comparing two snapshots shows what was added between them and what keeps it alive. Be careful in production: a snapshot pauses the main thread and needs extra memory."

  - question: "Your app runs on serverless functions and has never crashed. You move it to a long-running server, and it starts crashing every 3 days. Why?"
    options:
      - text: "Serverless functions have no memory limit"
      - text: "Long-running servers have a smaller garbage collector"
      - text: "The leak was always there. Serverless environments are thrown away and replaced every few hours, which hid it"
        correct: true
      - text: "Serverless functions automatically fix memory leaks"
    explanation: "A leak needs time to grow. Serverless platforms replace environments often, so memory rarely has time to pile up. A server that runs for days gives the leak all the time it needs."
---

# Your server crashes every few days, like clockwork

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Memory (RAM):** fast, short-term storage for what a process is using right now. *([Your app restarted and all the likes vanished](/lessons/how-a-computer-runs-your-code))*
> - **Instance:** one running copy of your app, with its own memory. *([How one server handles thousands of users at once](/lessons/processes-and-threads))*
> - **Metrics and alerts:** numbers tracked over time, and messages that fire when they look wrong. *([Your app was down for six hours and nobody noticed](/lessons/logging-and-monitoring))*
> - **Serverless function:** backend code that a platform starts only when a request arrives. *([From your laptop to a real website in one push](/lessons/hosting-platforms))*

## Tuesday, Thursday, Saturday

Your app runs on one server instance with 1 GB of memory. Since launch, it has crashed on Tuesday morning, Thursday afternoon and late on Saturday. Each time, your hosting platform restarted it within a minute. Each time, a few users saw errors, and then everything was fine again.

You look at the logs right before each crash. It's the same line every time:

```text
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

It's normal if this means nothing to you yet. By the end of this lesson, you'll be able to read every word of it.

Then you open the memory graph on your hosting dashboard. It looks like a saw: a slow, steady climb for about two days, a sudden drop to the bottom, then the same slow climb again. Every drop is a crash.

No single request is to blame. Something in your server keeps a little more memory with every request and never gives it back. When the pile reaches the limit, the process dies. The crash happens "like clockwork" because it's arithmetic: the same traffic fills the same memory in about the same time.

This is a **memory leak**. This lesson explains how JavaScript can leak even though it cleans up memory for you, and how to find and fix the leaks AI-written servers most often contain.

---

## Mental model: the cleaner who keeps everything you can reach

### Where your objects live: the heap

Every object, array, string and function your JavaScript creates is stored in a part of your process's memory called the **heap**. When people say "JavaScript memory", they usually mean the heap.

### Garbage collection

In JavaScript, you never say "I'm done with this, free it". A part of the JavaScript engine called the **garbage collector** does that for you. Every so often, it:

1. Starts from the **roots**: things your program can always reach, like global variables, variables at the top of your files (module-level variables), and the functions running right now.
2. Follows every reference from those roots: this object points to that array, which holds those objects, and so on. Everything it can reach is marked as "in use".
3. Frees everything it couldn't reach.

MDN describes the rule simply: "an object is no longer needed" means "an object is unreachable".

Think of an office cleaner who throws away every paper that isn't in a folder on someone's desk. Papers in a folder stay, always, even if nobody will ever read them again.

**Where the comparison stops working:** a real cleaner might notice that a folder has grown to 10,000 pages and ask about it. The garbage collector never asks. If your code can reach it, it stays.

### So what is a leak in JavaScript?

A **memory leak** is memory that your program no longer needs but can still reach, so it's never freed. In JavaScript, a leak almost always looks the same: **something that lives as long as the process keeps collecting things, and nothing ever removes them.**

Usually it's a module-level `Map` or array, or a long-lived object holding listeners or timers. Data that belongs to one request, and is only referenced inside that request's function, is freed automatically after the request ends. That's why most code doesn't leak.

### Limits: when memory runs out

There are two ceilings, and a leak hits one of them:

- **The heap limit.** Node.js limits how big the heap can grow. You can change it with the `--max-old-space-size` option, in megabytes.
- **The instance's memory.** Your hosting plan gives you a fixed amount, like 512 MB or 1 GB, for everything in the process: the heap, plus the rest of Node.js and your libraries.

Now the error from the hook makes sense, word by word:

- **heap limit:** the heap has reached its ceiling
- **Allocation failed:** your code asked for more memory, and there was none to give
- **FATAL ERROR:** the process can't continue, so it exits

Other Node.js versions may word the start of the message differently; the ending, "JavaScript heap out of memory", is the part to search for. If the instance's memory runs out first, your platform kills the process instead, and its own logs say something like "out of memory".

### The numbers behind "clockwork"

Say your server caches each user profile it loads, and never removes any (you'll see this code in a moment). Each profile takes about 10 KB. Your app sees 2,000 new users per hour.

- Per hour: 2,000 × 10 KB = 20 MB
- Per day: about 480 MB
- Your instance has 1 GB, and your app uses about 200 MB right after it starts

So you have about 800 MB of room, filled at 480 MB per day. The crash comes after **about 40 hours**. Busy week? It comes sooner. Quiet weekend? Later. And the last hours before it are the worst: as the heap gets close to the limit, the garbage collector runs again and again, freeing almost nothing each time. The Node.js docs warn that this extra work raises CPU use and slows responses, so users feel the leak before the crash.

---

## How it goes wrong: four common leaks

### Leak 1: A cache with no limit

A **cache** is a saved copy of data, kept so you don't have to fetch it again. It's one of the first things an AI adds when you ask for "faster":

```js
const profileCache = new Map(); // lives as long as the process

app.get("/api/profile/:id", async (req, res) => {
  const id = req.params.id;
  if (!profileCache.has(id)) profileCache.set(id, await db.profile.find(id));
  res.json(profileCache.get(id));
});
```

The `Map` is created once, at the top of the file, so it's a root. Every new profile ID adds an entry. Nothing ever removes one. A cache with no size limit and no expiry is not a cache. It's a slow copy of your whole database, building up in memory.

> **Go deeper:** [Fast, but showing yesterday's data](/lessons/caching) (Level 4) covers caching properly, including where cached data should live.

### Leak 2: An array that only grows

```js
const recentErrors = []; // "for the admin dashboard"

app.use((err, req, res, next) => {
  recentErrors.push({ err, url: req.url, body: req.body, at: Date.now() });
  res.status(500).json({ error: "Something went wrong" });
});
```

This error handler keeps every error, with its full error object and the request's data, "so we can show recent errors". "Recent" was the plan, but nothing removes old entries. Watch for the same pattern in "recent searches" or "online users" lists.

### Leaks 3 and 4: Listeners never removed, timers never cleared

Imagine a live page where a shop owner sees new orders appear without refreshing. The browser keeps a request open, and your server writes to it whenever an order arrives:

```js
app.get("/api/orders/live", (req, res) => {
  const send = (order) => res.write(`data: ${JSON.stringify(order)}\n\n`);
  orderEvents.on("new-order", send);                  // add a listener
  const timer = setInterval(() => res.write(": ping\n\n"), 15000); // keep-alive
  // missing: clean-up when the visitor leaves
});
```

`orderEvents` is a shared **EventEmitter**: one object for the whole app that calls every registered **listener** function when an event happens. Here, each visitor adds a listener, and starts an **interval**, a timer that runs a function every 15 seconds.

When the visitor closes the tab, nothing removes the listener or stops the timer. The emitter still holds `send`. `send` still refers to `res`, the response object for a visitor who left. The timer still holds it too. Each visit leaves a little more behind, forever.

Node.js gives you one hint: after more than 10 listeners for the same event on one emitter, it prints a **`MaxListenersExceededWarning`** about a "possible EventEmitter memory leak". It's only a warning, and AI tools sometimes "fix" it by raising or removing the limit with `setMaxListeners()`. That hides the leak instead of fixing it.

---

## What good looks like

### Fix the code

**Give every cache a limit.** A size limit (`max`), an expiry time (`ttl`, "time to live"), or both. The popular `lru-cache` package removes the least recently used entries when it's full:

```js
const profileCache = new LRUCache({ max: 5000, ttl: 5 * 60 * 1000 }); // lru-cache
```

At most 5,000 profiles, each kept for 5 minutes. Memory now has a ceiling you chose. If several instances need the same cached data, a shared store like Redis is often better than each instance's memory.

**Give every list an end.** Keep only the last 100 errors (`if (recentErrors.length > 100) recentErrors.shift();`), or better, send errors to your logging or error-tracking tool, which is built for this.

**Clean up when a connection closes.** Pair every `on` with an `off`, and every `setInterval` with a `clearInterval`:

```js
req.on("close", () => {
  orderEvents.off("new-order", send);
  clearInterval(timer);
});
```

When the visitor's connection closes, the listener and timer are removed. Nothing refers to `res` any more, so the garbage collector can free it.

### Watch the right graph

- **Know the healthy shape.** A healthy server's memory rises and falls around a steady level. A leak is a line that only goes up between restarts.
- **Look over days, not minutes.** A leak of 20 MB per hour is invisible in a one-hour view. Set your dashboard to 7 days.
- **Alert before the crash.** Add an alert when memory stays above, say, 80% of your limit. You'll hear about the leak before your users do.
- **Don't let deploys hide it.** Every deploy restarts the process and resets memory. If you deploy daily, a 40-hour leak never crashes, until the week you go on holiday.

### Find the leak with heap snapshots

A **heap snapshot** is a file that records every object in the heap, how big it is, and what is keeping it alive. One snapshot is hard to read. Two snapshots, compared, point at the leak:

1. Start your app locally and let it settle.
2. Take a first snapshot.
3. Send it a lot of traffic, the kind you suspect.
4. Take a second snapshot.
5. Open both in Chrome DevTools (the **Memory** tab), and switch the view to **Comparison**. Look at what grew the most, and follow its **retainers**: the chain of references that keeps it alive. That chain usually ends at your `Map`, array or emitter.

To connect Chrome DevTools to Node.js, start your app with `node --inspect`. The Node.js docs list other ways too, such as the `--heapsnapshot-near-heap-limit` option, which writes a snapshot automatically when the heap gets close to its limit.

Be careful in production. The Node.js docs warn that taking a snapshot stops all other work on the main thread, possibly for more than a minute, and can need as much memory again as the heap already uses. Only take one on an instance that can crash without hurting users.

### Raise the limit only for real needs

Raising `--max-old-space-size` helps when your app really needs more memory. The Node.js docs suggest leaving room for everything else: on a machine with 2 GB, about 1.5 GB for the heap. For a leak, it only moves the crash further away.

### Serverless vs long-running servers

| | Long-running server | Serverless function |
|---|---|---|
| How long one process lives | Days or weeks, until a deploy or crash | Minutes to hours, then replaced |
| What a leak looks like | Crashes "like clockwork" | Rare, random out-of-memory errors, or none |
| Module-level variables | Shared by every request, for days | Kept between requests in a reused environment |

Serverless platforms such as AWS Lambda run your function in an **execution environment**: a small, isolated space with its own memory. They reuse each environment for many requests, one after another. AWS notes that objects created outside your handler stay in memory between requests, and that environments are replaced every few hours. So a leak still grows, but usually gets thrown away before it hits the limit. **Serverless hides leaks. It doesn't fix them.** The day you move to a long-running server, or a platform where many requests share an instance, the leak shows up.

---

## Test it yourself

**1. Log your memory.** Add this once, at the top level of your server:

```js
setInterval(() => {
  const { heapUsed, rss } = process.memoryUsage();
  console.log(`heapUsed=${Math.round(heapUsed / 1e6)}MB rss=${Math.round(rss / 1e6)}MB`);
}, 60_000);
```

Every minute, this prints two numbers. `heapUsed` is the memory your JavaScript objects use. `rss` is everything the process holds in RAM. This one interval is fine, because it's created once, not once per request.

**2. Push traffic at it, then stop.** Run your app locally and hit a route many times with different IDs:

```bash
for i in $(seq 1 5000); do curl -s "http://localhost:3000/api/profile/$i" > /dev/null; done
```

Then stop and wait a few minutes. A healthy server's `heapUsed` drops back near where it started. If it stays high, and goes even higher after each round, something is keeping data alive.

**3. Search your code.** Look for module-level `new Map()`, `new Set()` and `[]` that grow, `.on(` without a matching `.off(`, `setInterval(` without `clearInterval(`, and `setMaxListeners`.

**4. Check your dashboard.** Open your hosting platform's memory graph for the last 7 or 30 days. Saw teeth mean a leak.

---

## Takeaways

**Key terms**
- **Heap:** the part of memory where your JavaScript objects live
- **Garbage collector:** the part of the engine that frees objects your code can no longer reach
- **Memory leak:** memory your code still references but will never use again, so it's never freed
- **Heap limit:** the maximum size of the heap; reaching it crashes the process
- **Heap snapshot:** a record of every object in the heap and what keeps it alive

**Red flags**
- A `Map`, `Set` or array at the top of a file that grows with every request
- A cache with no `max` size and no expiry
- `.on(...)` or `setInterval(...)` inside a request handler, with no clean-up on close
- `setMaxListeners(0)` or a bigger limit added to silence a warning
- A memory graph shaped like a saw, or regular crashes that "fix themselves"
- "We raised the memory limit and it stopped crashing" (for now)

**Ask your AI**
- *"List every variable in my server that lives as long as the process and can grow. How big can each one get?"*
- *"Find every event listener and setInterval created per request or per connection. Is each one removed when the request ends?"*
- *"Add size limits and expiry times to every in-memory cache."*
- *"Help me take two heap snapshots locally and compare them to find what is growing."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Closures keep things alive.** A function remembers the variables around it where it was created. That's called a **closure**. The `send` function in this lesson keeps `res` alive because it uses it. A listener that refers to a huge object keeps that huge object alive, too, even if it only uses one small field of it.

**`WeakMap` and `WeakSet`.** These hold their keys "weakly": if nothing else refers to a key object, the garbage collector may free it, and its entry disappears. They're useful for attaching extra data to objects you don't own, without keeping those objects alive. They can't replace a cache with string keys, because their keys must be objects.

**Memory outside the heap.** `Buffer`s and some library data live outside the V8 heap. They show up in `rss` and `external` from `process.memoryUsage()`, but not in `heapUsed`. If `rss` grows while `heapUsed` stays flat, look at Buffers, native libraries or file handling, not at your JavaScript objects.

**Generations.** V8's garbage collector splits the heap into a young generation and an old generation. Most objects die young, so new objects are collected quickly and cheaply. Objects that survive a few collections move to the old generation, which is what `--max-old-space-size` limits. A leak fills the old generation.

**Restarting as a safety net.** Some teams restart long-running processes on a schedule, or let the platform restart them when memory passes a threshold. That's a reasonable safety net, but it is not a fix: it hides the leak, and requests that are in progress at the moment of the restart can fail.

</details>

## References

- [Memory diagnostics](https://nodejs.org/en/learn/diagnostics/memory): Node.js. Symptoms of a leak: memory that keeps growing, crashes and restarts, and more GC work making responses slower.
- [Using Heap Snapshot](https://nodejs.org/en/learn/diagnostics/memory/using-heap-snapshot): Node.js. Ways to take snapshots, comparing two snapshots, and the warnings about pausing and extra memory.
- [Command-line API](https://nodejs.org/api/cli.html): Node.js. `--max-old-space-size` (with the 2 GB / 1.5 GB example) and `--heapsnapshot-near-heap-limit`.
- [Events: EventEmitter.defaultMaxListeners](https://nodejs.org/api/events.html): Node.js. The default of 10 listeners per event and the `MaxListenersExceededWarning`.
- [Memory management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management): MDN. Garbage collection, roots, reachability and the mark-and-sweep algorithm.
- [Why do I get the error "JavaScript heap out of memory"?](https://docs.digitalocean.com/support/why-do-i-get-the-error-javascript-heap-out-of-memory-during-deployment/): DigitalOcean. The exact `FATAL ERROR: Reached heap limit ...` message.
- [Understanding the Lambda execution environment lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html): AWS. Reused environments keep objects declared outside the handler, and are replaced every few hours.
- [lru-cache](https://github.com/isaacs/node-lru-cache): isaacs (GitHub). The `LRUCache` class with `max` and `ttl` options.
