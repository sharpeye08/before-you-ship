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
    explanation: "The garbage collector frees only what your code can no longer reach. A Map, array or listener that keeps growing can still be reached, so everything in it stays in memory forever."

  - question: "Your hosting dashboard shows memory that climbs slowly for about two days, then drops sharply, then climbs again. What does this pattern most likely mean?"
    options:
      - text: "A memory leak: memory grows until the process crashes or restarts, then starts again from the bottom"
        correct: true
      - text: "Normal behaviour: memory always grows for two days"
      - text: "The database is slow every two days"
      - text: "The garbage collector works perfectly"
    explanation: "The memory of a healthy server goes up and down around a steady level. A line that only goes up, then drops at each crash or deploy, is the usual shape of a leak."

  - question: "Your live-updates route adds a listener to a shared EventEmitter for each visitor, but never removes it. What happens over time?"
    options:
      - text: "Nothing, because the browser deletes listeners when the tab closes"
      - text: "Every closed tab leaves a listener behind, with everything it refers to, so memory grows with each visitor"
        correct: true
      - text: "The EventEmitter refuses new listeners after 10"
      - text: "The server sends each update only to the first visitor"
    explanation: "When the visitor closes the tab, your listener stays. The shared emitter keeps a reference to it, and the listener keeps the response object alive. Node prints a MaxListenersExceededWarning after 10 listeners for one event, but it still lets you add more."

  - question: "Your logs show \"FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory\". A teammate suggests that you raise --max-old-space-size from 1 GB to 4 GB. What is the problem with that as the only fix?"
    options:
      - text: "The flag does not exist"
      - text: "It makes the garbage collector stop working"
      - text: "If there is a leak, memory keeps growing and the crash comes back later. And if the machine has less than 4 GB, the platform may kill the process first"
        correct: true
      - text: "Nothing, 4 GB is always enough"
    explanation: "A bigger limit only moves the crash further away. A leak still grows without end. Find what grows, and fix it. Only raise the limit if the app really needs more memory and the machine has it."

  - question: "You want to find what leaks. What is the most useful way to use heap snapshots?"
    options:
      - text: "Take one snapshot right after the server starts"
      - text: "Take one snapshot after the crash"
      - text: "Take a snapshot every second in production"
      - text: "Take one snapshot, use the app for a while, take a second one, and compare them to see which objects grew"
        correct: true
    explanation: "A comparison of two snapshots shows what was added between them and what keeps it alive. Be careful in production: a snapshot pauses the main thread and needs extra memory."

  - question: "Your app runs on serverless functions and has never crashed. You move it to a long-running server, and it starts to crash every 3 days. Why?"
    options:
      - text: "Serverless functions have no memory limit"
      - text: "Long-running servers have a smaller garbage collector"
      - text: "The leak was always there. The platform replaces serverless environments every few hours, and that hid the leak"
        correct: true
      - text: "Serverless functions automatically fix memory leaks"
    explanation: "A leak needs time to grow. Serverless platforms replace environments often, so memory rarely has time to grow. A server that runs for days gives the leak all the time it needs."
---

# Your server crashes every few days, like clockwork

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Memory (RAM):** fast, short-term storage for what a process is using right now. *([Your app restarted and all the likes vanished](/lessons/how-a-computer-runs-your-code))*
> - **Instance:** one running copy of your app, with its own memory. *([How one server handles thousands of users at once](/lessons/processes-and-threads))*
> - **Metrics and alerts:** numbers tracked over time, and messages that fire when they look wrong. *([Your app was down for six hours and nobody noticed](/lessons/logging-and-monitoring))*
> - **Serverless function:** backend code that a platform starts only when a request arrives. *([From your laptop to a real website in one push](/lessons/hosting-platforms))*

## Tuesday, Thursday, Saturday

Your app runs on one server instance with 1 GB of memory. Since launch, it crashed on Tuesday morning, Thursday afternoon and late on Saturday. Each time, your hosting platform restarted it within a minute. Each time, a few users saw errors, and then everything was fine again.

You look at the logs (the messages your app writes as it runs) right before each crash. Each time, you see the same line:

```text
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

If this means nothing to you yet, that is normal. Soon you will understand every word.

Then you open the memory graph on your hosting dashboard. It looks like a saw. Memory climbs slowly and steadily for about two days. Then it drops suddenly to the bottom, and the same slow climb starts again. Every drop is a crash.

![A memory graph shaped like a saw: memory climbs slowly for about two days to the 1 GB limit, the process crashes and memory drops, then the climb starts again.](/diagrams/memory-leaks-1.svg)

The problem is not one request. Something in your server keeps a little more memory with every request and never gives it back. When the total reaches the limit, the process (the running program) stops. The crash comes at regular times because of simple arithmetic: the same traffic fills the same memory in about the same time.

This is a **memory leak**. JavaScript cleans up memory for you, but it can still leak. This lesson explains how, and how to find and fix the most common leaks in AI-written servers.

---

## Mental model: the cleaner who keeps everything you can reach

### Where your objects live: the heap

Your JavaScript creates objects, arrays, strings and functions. It stores all of them in a part of the process memory called the **heap**. When people say "JavaScript memory", they usually mean the heap.

### Garbage collection

In JavaScript, you never say "I'm done with this, free it". A part of the JavaScript engine (the program inside Node.js that runs your code) does that for you. It is called the **garbage collector**. From time to time, it does these steps:

1. It starts from the **roots**: things that your program can always reach. Examples are global variables, variables at the top of your files (module-level variables) and the functions that run now.
2. It follows every **reference** (a link from one piece of data to another) from those roots. This object points to that array, which holds those objects, and so on. It marks everything it can reach as "in use".
3. It frees everything it could not reach.

MDN describes the rule simply: "an object is no longer needed" means "an object is unreachable".

Think of an office cleaner who throws away every paper that is not in a folder on a desk. Papers in a folder always stay, even if nobody will ever read them again.

**Where the comparison stops working:** a real cleaner can see that a folder has 10,000 pages and ask about it. The garbage collector never asks. If your code can reach something, it stays.

### So what is a leak in JavaScript?

A **memory leak** is memory that your program no longer needs but can still reach. So the garbage collector never frees it. In JavaScript, a leak almost always looks the same: **something that lives as long as the process collects things, and nothing ever removes them.**

![Top: the roots point to a cache Map that never removes entries, so old profiles stay forever. Bottom: request data with no path from a root goes to the garbage collector and is freed.](/diagrams/memory-leaks-2.svg)

Usually it is a module-level `Map` or array, or a long-lived object that holds listeners or timers. Some data belongs to one request, and only that request's function refers to it. JavaScript frees that data automatically after the request ends. That's why most code does not leak.

### Limits: when memory runs out

There are two limits, and a leak reaches one of them:

- **The heap limit.** Node.js limits how big the heap can grow. You can change it with the `--max-old-space-size` option, in megabytes.
- **The instance's memory.** Your hosting plan gives you a fixed amount, like 512 MB or 1 GB. This is for everything in the process: the heap, plus the rest of Node.js and your libraries (ready-made code that you install).

Now the error from the start of this lesson makes sense, word by word:

- **heap limit:** the heap has reached its maximum size
- **Allocation failed:** your code asked for more memory, and there was none to give
- **FATAL ERROR:** the process can't continue, so it exits

Other Node.js versions can use different words at the start of the message. Search for the end of the message, "JavaScript heap out of memory". If the instance runs out of memory first, your platform stops the process instead. The platform's own logs then show a message like "out of memory".

### The numbers behind "clockwork"

Imagine that your server caches each user profile it loads, and never removes any. (You will see this code soon.) Each profile takes about 10 KB. Your app sees 2,000 new users per hour.

- Per hour: 2,000 × 10 KB = 20 MB
- Per day: about 480 MB
- Your instance has 1 GB, and your app uses about 200 MB right after it starts

So you have about 800 MB of free space, and the leak fills 480 MB per day. The crash comes after **about 40 hours**. In a busy week, it comes sooner. On a quiet weekend, it comes later.

The last hours before the crash are the worst. When the heap gets close to the limit, the garbage collector runs again and again, but it frees almost nothing each time. The Node.js docs warn that this extra work increases CPU use and makes responses slower. So users feel the leak before the crash.

---

## How it goes wrong: four common leaks

### Leak 1: A cache with no limit

A **cache** is a saved copy of data. You keep it so that you don't have to get the data again. When you ask an AI for "faster", a cache is often one of the first things it adds:

```js
const profileCache = new Map(); // lives as long as the process

app.get("/api/profile/:id", async (req, res) => {
  const id = req.params.id;
  if (!profileCache.has(id)) profileCache.set(id, await db.profile.find(id));
  res.json(profileCache.get(id));
});
```

The code creates the `Map` once, at the top of the file, so a root holds it. Every new profile ID adds an entry. Nothing ever removes an entry. A cache with no size limit and no expiry is not really a cache. It is a slow copy of your whole database that grows in memory.

> **Go deeper:** [Fast, but showing yesterday's data](/lessons/caching) (Level 4) covers caching properly, including where to keep cached data.

### Leak 2: An array that only grows

```js
const recentErrors = []; // "for the admin dashboard"

app.use((err, req, res, next) => {
  recentErrors.push({ err, url: req.url, body: req.body, at: Date.now() });
  res.status(500).json({ error: "Something went wrong" });
});
```

This error handler (the function that runs when a request fails) keeps every error. It keeps the full error object and the request's data, "so we can show recent errors". The plan was "recent", but nothing removes old entries. Look for the same pattern in lists of "recent searches" or "online users".

### Leaks 3 and 4: Listeners never removed, timers never cleared

Imagine a live page where a shop owner sees new orders appear with no page refresh. The browser keeps a request open, and your server writes to it each time an order arrives:

```js
app.get("/api/orders/live", (req, res) => {
  const send = (order) => res.write(`data: ${JSON.stringify(order)}\n\n`);
  orderEvents.on("new-order", send);                  // add a listener
  const timer = setInterval(() => res.write(": ping\n\n"), 15000); // keep-alive
  // missing: clean-up when the visitor leaves
});
```

`orderEvents` is a shared **EventEmitter**. It is one object for the whole app. When an event happens, it calls every registered **listener** function. Here, each visitor adds a listener. Each visitor also starts an **interval**, a timer that runs a function every 15 seconds.

When the visitor closes the tab, nothing removes the listener or stops the timer. The emitter still holds `send`. `send` still refers to `res`, the response object for a visitor who left. The timer also still holds `res`. Each visit leaves a little more memory behind, forever.

![The shared orderEvents emitter holds the send listener, which refers to res for a visitor who left. The interval timer also refers to res, so each visit leaves one more chain in memory.](/diagrams/memory-leaks-3.svg)

Node.js gives you one hint. When one emitter has more than 10 listeners for the same event, it prints a **`MaxListenersExceededWarning`** about a "possible EventEmitter memory leak". It is only a warning. AI tools sometimes "fix" it: they raise or remove the limit with `setMaxListeners()`. That hides the leak but does not fix it.

---

## What good looks like

### Fix the code

**Give every cache a limit.** Use a size limit (`max`), an expiry time (`ttl`, "time to live"), or both. When the popular `lru-cache` package is full, it removes the least recently used entries:

```js
const profileCache = new LRUCache({ max: 5000, ttl: 5 * 60 * 1000 }); // lru-cache
```

This cache keeps at most 5,000 profiles, each for 5 minutes. Now memory has a limit that you chose. Sometimes several instances need the same cached data. Then a shared store like Redis (a fast data store that keeps data in memory) is often better than the memory of each instance.

**Give every list an end.** Keep only the last 100 errors (`if (recentErrors.length > 100) recentErrors.shift();`). A better choice: send errors to your logging or error-tracking tool, which is made for this.

**Clean up when a connection closes.** Pair every `on` with an `off`, and every `setInterval` with a `clearInterval`:

```js
req.on("close", () => {
  orderEvents.off("new-order", send);
  clearInterval(timer);
});
```

When the visitor's connection closes, this code removes the listener and stops the timer. Nothing refers to `res` any more, so the garbage collector can free it.

### Watch the right graph

- **Know the healthy shape.** The memory of a healthy server goes up and down around a steady level. A leak is a line that only goes up between restarts.
- **Look over days, not minutes.** You can't see a leak of 20 MB per hour in a one-hour view. Set your dashboard to 7 days.
- **Alert before the crash.** Add an alert for when memory stays above a level, for example 80% of your limit. Then you learn about the leak before your users do.
- **Don't let deploys hide it.** Every deploy (each time you put a new version live) restarts the process and resets memory. If you deploy every day, a 40-hour leak never crashes. Then you go on holiday for a week, and it crashes.

### Find the leak with heap snapshots

A **heap snapshot** is a file that records every object in the heap. It shows how big each object is and what keeps it alive. One snapshot is hard to read. A comparison of two snapshots points to the leak:

1. Start your app on your own computer and wait until memory is steady.
2. Take a first snapshot.
3. Send it a lot of traffic, of the kind you suspect.
4. Take a second snapshot.
5. Open both in Chrome DevTools (the developer tools in the Chrome browser), in the **Memory** tab.
6. Change the view to **Comparison**, and find what grew the most.
7. Follow its **retainers**: the chain of references that keeps it alive. That chain usually ends at your `Map`, array or emitter.

To connect Chrome DevTools to Node.js, start your app with `node --inspect`. The Node.js docs list other ways too. For example, the `--heapsnapshot-near-heap-limit` option writes a snapshot automatically when the heap gets close to its limit.

Be careful in production (the live app that real users use). The Node.js docs warn that a snapshot stops all other work on the main thread, possibly for more than a minute. A snapshot can also need as much memory again as the heap already uses. Only take one on an instance that can crash without harm to users.

### Raise the limit only for real needs

A higher `--max-old-space-size` helps when your app really needs more memory. The Node.js docs suggest that you leave space for everything else: on a machine with 2 GB, use about 1.5 GB for the heap. For a leak, a higher limit only moves the crash further away.

### Serverless vs long-running servers

| | Long-running server | Serverless function |
|---|---|---|
| How long one process lives | Days or weeks, until a deploy or crash | Minutes to hours, then replaced |
| What a leak looks like | Crashes "like clockwork" | Rare, random out-of-memory errors, or none |
| Module-level variables | Shared by every request, for days | Kept between requests in a reused environment |

Serverless platforms such as AWS Lambda run your function in an **execution environment**: a small, separate space with its own memory. The platform uses each environment again for many requests, one after another. AWS says that objects created outside your handler (the function that receives each request) stay in memory between requests. AWS also says that it replaces environments every few hours.

So a leak still grows, but the platform usually removes the environment before the leak reaches the limit. **Serverless hides leaks. It doesn't fix them.** You will see the leak when you move to a long-running server, or to a platform where many requests share an instance.

---

## Test it yourself

**1. Log your memory.** Add this once, at the top level of your server:

```js
setInterval(() => {
  const { heapUsed, rss } = process.memoryUsage();
  console.log(`heapUsed=${Math.round(heapUsed / 1e6)}MB rss=${Math.round(rss / 1e6)}MB`);
}, 60_000);
```

Every minute, this prints two numbers. `heapUsed` is the memory that your JavaScript objects use. `rss` is all the RAM that the process holds. This one interval is safe, because the code creates it once, not once per request.

**2. Send a lot of traffic, then stop.** Run your app on your own computer. Then send many requests to one route, each with a different ID. This command uses `curl`, a command-line tool that sends requests:

```bash
for i in $(seq 1 5000); do curl -s "http://localhost:3000/api/profile/$i" > /dev/null; done
```

Then stop and wait a few minutes. On a healthy server, `heapUsed` goes back down near its start value. If it stays high, and goes higher after each round, something keeps data alive.

**3. Search your code.** Look for these patterns:
- module-level `new Map()`, `new Set()` and `[]` that grow
- `.on(` without a matching `.off(`
- `setInterval(` without `clearInterval(`
- `setMaxListeners`

**4. Check your dashboard.** Open the memory graph of your hosting platform for the last 7 or 30 days. A saw shape means a leak.

---

## Takeaways

**Key terms**
- **Heap:** the part of memory where your JavaScript objects live
- **Garbage collector:** the part of the engine that frees objects your code can no longer reach
- **Memory leak:** memory that your code still refers to but will never use again, so it's never freed
- **Heap limit:** the maximum size of the heap; when the heap reaches it, the process crashes
- **Heap snapshot:** a record of every object in the heap and what keeps it alive

**Red flags**
- A `Map`, `Set` or array at the top of a file that grows with every request
- A cache with no `max` size and no expiry
- `.on(...)` or `setInterval(...)` inside a request handler, with no clean-up on close
- `setMaxListeners(0)` or a bigger limit, added to stop a warning
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

**Closures keep things alive.** A function remembers the variables around the place where it was created. This is called a **closure**. The `send` function in this lesson keeps `res` alive because it uses `res`. A listener that refers to a very large object keeps that object alive too, even if it only uses one small field of it.

**`WeakMap` and `WeakSet`.** These hold their keys "weakly". If nothing else refers to a key object, the garbage collector can free it, and its entry disappears. Use them to attach extra data to objects that you don't own, without keeping those objects alive. They can't replace a cache with string keys, because their keys must be objects.

**Memory outside the heap.** `Buffer`s and some library data live outside the V8 heap (V8 is the JavaScript engine in Node.js). They show in `rss` and `external` from `process.memoryUsage()`, but not in `heapUsed`. Sometimes `rss` grows while `heapUsed` stays flat. Then look at Buffers, native libraries or file handling, not at your JavaScript objects.

**Generations.** The V8 garbage collector divides the heap into a young generation and an old generation. Most objects die young, so V8 collects new objects quickly and cheaply. Objects that stay alive after a few collections move to the old generation. `--max-old-space-size` limits the old generation. A leak fills the old generation.

**Restarts as a backup measure.** Some teams restart long-running processes on a schedule. Others let the platform restart them when memory goes above a set level. This is a reasonable backup measure, but it is not a fix. It hides the leak, and requests that are in progress at the moment of the restart can fail.

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
