---
title: "One slow request froze the whole server"
slug: event-loop
order: 49
level: 4
levelName: Reliability & scale
concepts: [Event loop, Single thread, async and await, Blocking the event loop, Worker threads, Offloading to background jobs]
readTime: 14 min
quiz:
  - question: "An admin clicks \"Export all orders\". The route spends 8 seconds building a CSV file in JavaScript. During those 8 seconds, what happens to other users' requests to the same Node.js server?"
    options:
      - text: "They run normally, because each request gets its own thread"
      - text: "They wait until the export finishes, because the JavaScript thread is busy"
        correct: true
      - text: "They are sent to the database instead"
      - text: "Node.js cancels the export automatically after 1 second"
    explanation: "Node.js runs your JavaScript on one main thread. While it is busy building the CSV, it can't run any other request's code. Every user waits."

  - question: "Which line in a route lets other requests run while this one waits?"
    options:
      - text: "const csv = toCsv(orders);"
      - text: "for (const order of orders) { total += order.price; }"
      - text: "const orders = await db.order.findMany();"
        correct: true
      - text: "const data = JSON.parse(hugeText);"
    explanation: "While the route waits for the database, the thread goes back to the event loop and runs other work. The other three lines are your own JavaScript doing work on the thread, and nothing else can run until they finish."

  - question: "The AI \"fixes\" a slow function by adding the async keyword to it. The function loops over 2 million rows. Does this stop it from blocking the server?"
    options:
      - text: "Yes, async functions always run in the background"
      - text: "Yes, but only on Node.js 20 or newer"
      - text: "No, async only matters at an await. The loop still runs on the main thread until it finishes"
        correct: true
      - text: "No, because async functions are slower"
    explanation: "async and await help while you wait for something outside your code, like a database. They don't move work to another thread. A long loop inside an async function blocks just the same."

  - question: "Your server hashes passwords with crypto.pbkdf2Sync at sign-up. During a busy launch, the whole app becomes slow. What's the best first fix?"
    options:
      - text: "Use the asynchronous version, crypto.pbkdf2, so the hashing runs in Node's worker pool instead of the main thread"
        correct: true
      - text: "Stop hashing passwords"
      - text: "Add more RAM to the server"
      - text: "Call pbkdf2Sync inside a setTimeout"
    explanation: "Functions ending in Sync do their work on the main thread and block everything. The asynchronous version hands the work to a pool of helper threads, so the main thread stays free for other requests."

  - question: "A user can request a report that takes 2 minutes of CPU work. The user doesn't need it immediately. What's the most robust design?"
    options:
      - text: "Run it inside the request and increase the timeout"
      - text: "Add a background job to a queue, let a separate worker build the report, and notify the user when it's ready"
        correct: true
      - text: "Run it with a while loop that checks the time"
      - text: "Split it across many API routes"
    explanation: "Work the user doesn't need right away belongs in a background job. A separate worker process does the heavy work, so your web server stays free and the job can be retried if it fails."

  - question: "Your health check endpoint only returns \"ok\", yet it sometimes takes 6 seconds to answer. What does that suggest?"
    options:
      - text: "The health check code is too complex"
      - text: "The network is always slow"
      - text: "The database is missing an index"
      - text: "Something else is blocking the event loop, so even tiny requests have to wait"
        correct: true
    explanation: "A route that does almost nothing should answer in milliseconds. If it waits seconds, the thread was busy with someone else's work. Measuring event loop delay confirms it."
---

# One slow request froze the whole server

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **CPU:** the chip that follows your program's instructions, one small step at a time. *([Your app restarted and all the likes vanished](/lessons/how-a-computer-runs-your-code))*
> - **Process:** a program that is running right now, with its own memory. *([Your app restarted and all the likes vanished](/lessons/how-a-computer-runs-your-code))*
> - **Background job, queue and worker:** work done outside the user's request; a stored list of jobs; and separate code that does them. *([Sign-up takes 10 seconds because of one email](/lessons/background-jobs))*
> - **Hashing a password:** turning it into a scrambled value that can be checked but not reversed. It's slow on purpose. *([Never store a password. Here's what to store instead](/lessons/how-login-works))*

## Eight seconds of silence

Your shop's admin page has a button: **Export all orders as CSV**. The AI wrote it in a few minutes. It works.

One morning, your colleague clicks it. For the next 8 seconds, something strange happens to **everyone else** using your app:

- Customers on the homepage see a spinner.
- People trying to log in wait, then get a timeout.
- Your hosting platform's health check, a tiny route that only answers "ok", gets no answer. The platform decides the server is broken and restarts it.

Then everything works again, as if nothing happened. Your logs show no errors. Only a restart.

One request made the whole server stop answering, not because of heavy traffic, but because of how Node.js runs your code. This lesson explains that model and the one rule you must not break.

---

## The mental model: one waiter, many tables

In the background jobs lesson, you met the restaurant where the waiter takes orders and the cooks cook. Node.js takes that idea further: for your JavaScript, **there is only one waiter.**

A **thread** is one line of work inside a process: a list of instructions the CPU follows, one after another. A process can have several threads. Node.js runs all of your JavaScript on **one main thread**.

How can one thread serve thousands of users? Because most of a web request is **waiting**: for the database, for a payment service, for a file. The waiter never stands at a table waiting for the kitchen. He takes an order, hands it to the kitchen, and goes to the next table. When a dish is ready, he gets a signal and brings it out.

In Node.js, that loop is the **event loop**:

1. Pick the next piece of work that's ready to run: a new request, or a database answer that just arrived.
2. Run that piece of JavaScript **until it finishes**.
3. Go back to step 1.

While a request is waiting for the database, the thread isn't involved. The waiting happens elsewhere, in the operating system or in helper threads. The thread is free to run other users' code. That's why the Node.js docs say Node scales well: it uses a small number of threads to handle many clients.

**Where the comparison stops working:** a real waiter can drop what he's doing if the restaurant catches fire. The event loop can't. Once a piece of JavaScript starts, it runs to the end. Nothing can interrupt it to serve someone else.

That gives the Node.js docs' rule of thumb:

> **Node.js is fast when the work associated with each client at any given time is small.**

### What `async` and `await` really do

You've seen `await` in almost every route. Here's what it means for the event loop:

```js
app.get("/api/export", async (req, res) => {
  const orders = await db.order.findMany(); // waiting: others can run
  const csv = toCsv(orders);                // working: everyone waits
  res.send(csv);
});
```

In plain English:

1. **Line 2:** ask the database for every order. At `await`, this function **pauses**, and the thread goes back to the event loop to serve other requests. When the orders arrive, the function continues.
2. **Line 3:** turn 200,000 orders into CSV text. This is your own JavaScript doing work. There's no `await`, so nothing pauses. The thread is busy until it's done.
3. **Line 4:** send the file.

`await` is a place where your function *lets go* of the thread. The code between two `await`s runs without a break. And here's the common misunderstanding: **the `async` keyword doesn't move work into the background.** It only lets you use `await`. A long loop inside an `async` function blocks the thread exactly like one outside it.

### The numbers

Two kinds of time matter in a request:

| | Waiting (I/O) | Working (CPU) |
|---|---|---|
| Examples | Database queries, calling an API, reading a file the async way | Loops over big lists, building files, parsing huge JSON, hashing with `...Sync` |
| Uses the main thread? | No | Yes |
| What others feel | Nothing | They wait |

("I/O" means input and output: talking to anything outside your program.)

The working time sets a hard limit. If every request needs 5 ms of JavaScript work, one thread can finish at most about 200 requests per second (1,000 ms ÷ 5 ms), no matter how fast your database is. If one request needs 8 seconds of work, then for those 8 seconds the limit is **zero**.

Big work arrives faster than you'd think. In the Node.js docs' own example, turning a 50 MB string back into an object with `JSON.parse` took 1.3 seconds.

---

## How it goes wrong

### Bug 1: Heavy work inside a route

The export above is the classic case. Others look the same: building a PDF, resizing images in pure JavaScript, sorting or filtering a huge list in memory, or `JSON.parse` on a large upload. Each one works fine in testing, with 50 orders and one user. With 200,000 orders, it's seconds.

### Bug 2: Functions that end in `Sync`

Node.js has two versions of many functions. The `Sync` versions do the work on the main thread and block it:

```js
const hash = crypto.pbkdf2Sync(password, salt, 600000, 64, "sha256"); // blocks
const file = fs.readFileSync("big-report.csv");                       // blocks
```

In plain English: hash a password, then read a file, each time stopping the whole server until it finishes.

Password hashing is slow **on purpose**, to make guessing passwords expensive. That's good for security and bad for the main thread. During a busy launch, with many sign-ups and logins each blocking for a moment, the whole app crawls. The Node.js docs list the `Sync` functions in `crypto`, `zlib` (compression), `fs` (files) and `child_process` as ones a server shouldn't use. Some password libraries also offer `hashSync`: avoid it in a server for the same reason.

### Bug 3: Input that makes your code slow on purpose

Some code is fast for normal input and very slow for special input. The Node.js docs warn about complex **regular expressions** (patterns for matching text, like checking an email address) on user input: certain inputs can make them run for seconds or longer. The docs call this a security problem, not only a speed one. If one request can block your server, an attacker can send it again and again. That's a **denial of service** attack: making your app unavailable to everyone else.

### Bug 4: A "fix" that changes nothing

Ask the AI to "make the export non-blocking", and you might get this:

```js
const csv = await new Promise((resolve) => resolve(toCsv(orders)));
```

In plain English: wrap the CSV work in a promise and `await` it. It *looks* asynchronous. But the function you pass to `new Promise` runs immediately, so `toCsv(orders)` still runs right there, on the main thread, before `await` is even reached. The server freezes exactly as before. Wrapping work doesn't move it.

### How to recognize it

- **Everything is slow at the same moment**, including routes that do almost nothing, like a health check.
- **One CPU core is at 100%** while the others are idle. One busy thread can only use one core.
- **No errors in the logs**, only timeouts and maybe restarts.

---

## What good looks like

Remember the Node.js docs' advice: the event loop should *coordinate* requests, not do the heavy work itself. You have four ways to keep it free, from smallest to biggest.

### Fix 1: Use the asynchronous versions

```js
const hash = await util.promisify(crypto.pbkdf2)(password, salt, 600000, 64, "sha256");
const file = await fs.promises.readFile("big-report.csv");
```

In plain English: the same two jobs, but now the main thread only *starts* them and moves on. `util.promisify` turns an older function that reports back through a callback (a function you hand over to be called later) into one you can `await`.

Where does the work go? Node.js has a small **worker pool**: helper threads, run by a library called libuv, for tasks like file reading, some `crypto` functions and compression. By default, the pool has **4 threads**. That's worth knowing at scale: if 50 sign-ups arrive at once, 4 hashes run at a time and the rest queue up, and file reads share the same 4 threads. Your server keeps answering other requests while they wait.

### Fix 2: Worker threads for heavy JavaScript

For your own CPU-heavy JavaScript, like the CSV export, Node.js lets you start extra threads with the `worker_threads` module:

```js
const { Worker } = require("node:worker_threads");
const csv = await new Promise((resolve, reject) => {
  const worker = new Worker("./csv-worker.js", { workerData: orders });
  worker.once("message", resolve);
  worker.once("error", reject);
});
```

In plain English:

1. **Line 3:** start a new thread that runs the file `csv-worker.js`, and give it the orders.
2. **Lines 4–5:** when the worker sends back a message (the finished CSV), use it. If it fails, report the error.

The worker file does the heavy part:

```js
const { parentPort, workerData } = require("node:worker_threads");
parentPort.postMessage(toCsv(workerData));
```

In plain English: build the CSV from the data you were given, and send it back to the main thread.

The main thread stays free. The trade-offs:

- **Copying costs time.** The orders are copied into the worker, and the CSV is copied back. For huge data, the copying itself takes a while.
- **Starting a worker isn't free.** The Node.js docs advise using a **pool** of workers that are reused, rather than one new worker per task. Libraries such as Piscina manage a pool for you.
- **Threads share the CPU cores.** On a server with 2 cores, only about 2 heavy tasks can truly run at the same time.

The Node.js docs also say worker threads don't help much with I/O. Waiting for a database is already handled well by the event loop.

> **Go deeper:** [How one server handles thousands of users at once](/lessons/processes-and-threads) (Level 4) compares processes and threads, and [Two tasks waiting for each other forever](/lessons/locks-and-deadlocks) (Level 4) covers what can go wrong when threads share data.

### Fix 3: Move it out of the request completely

Does the user need the result before the next screen? For an export of 200,000 orders, no. Add a background job to a queue, reply "We're preparing your export", and let a separate worker process build the file and email a link.

This is the strongest fix for big work. The web server never touches the heavy part, so no amount of exports can freeze it. The job can be retried if it fails, and it isn't limited by the time limit of a web request.

> **Go deeper:** [Sign-up takes 10 seconds because of one email](/lessons/background-jobs) (Level 3) shows how to set up queues and workers.

### Fix 4: Limit and split the work

- **Limit input.** Set a maximum size for request bodies and uploads. Prefer simple string checks over complex regular expressions on user input.
- **Load data in pages** instead of all at once, so no single request handles 200,000 rows.
- **Split long work into chunks.** The Node.js docs describe doing a little work, letting the event loop run with `setImmediate`, then continuing. It works, but a worker thread or a background job is usually clearer.

> **Go deeper:** [Your app tried to load 50,000 rows at once](/lessons/pagination) (Level 4) covers loading data in pages.

---

## Test it yourself

### Experiment 1: Freeze a server on purpose

On your laptop, add these two routes to a small Express app:

```js
app.get("/slow", (req, res) => {
  const end = Date.now() + 5000;
  while (Date.now() < end) {} // keep the CPU busy for 5 seconds
  res.send("done");
});
app.get("/health", (req, res) => res.send("ok"));
```

In plain English: `/slow` does nothing useful for 5 seconds, but keeps the thread busy the whole time. `/health` answers at once.

Open `/health` in a browser tab: instant. Now open `/slow` in one tab and, right away, `/health` in another. The health check waits until `/slow` finishes. You've frozen your own server with one request.

### Experiment 2: Measure the event loop in your app

Node.js can measure how late the event loop is running. Add this to your server:

```js
const { monitorEventLoopDelay } = require("node:perf_hooks");
const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();
setInterval(() => {
  console.log("event loop delay, p99 (ms):", h.percentile(99) / 1e6);
  h.reset();
}, 10000);
```

In plain English: every 10 seconds, log how late the event loop was in the worst 1% of moments (the 99th percentile), then start counting again. The values come in nanoseconds, so dividing by 1,000,000 gives milliseconds. A healthy server shows small numbers. Numbers in the hundreds or thousands mean something is blocking.

### Experiment 3: Search your code

Ask your AI: *"Find every function ending in Sync, every loop over data loaded from the database, and every JSON.parse of user input in my server code."* Look at each one and ask: how big can this get?

---

## Takeaways

**Key terms**
- **Thread:** one line of work inside a process. Node.js runs your JavaScript on one main thread.
- **Event loop:** Node's loop that picks the next ready piece of work and runs it to the end
- **Blocking:** keeping the main thread busy, so no other request can run
- **`await`:** a point where a function pauses and lets the thread serve others
- **Worker pool:** Node's helper threads for files, some crypto and compression (4 by default)
- **Worker threads:** extra threads you start yourself for heavy JavaScript
- **Denial of service:** making an app unavailable to everyone, for example with input that blocks the server

**Red flags in AI-written code**
- `readFileSync`, `pbkdf2Sync`, `hashSync`, `execSync` or other `...Sync` calls inside a route
- Building a CSV, PDF or big JSON from thousands of rows inside a request
- `JSON.parse` or a complex regular expression on large or unchecked user input
- Work wrapped in `new Promise(...)` or marked `async` "to make it non-blocking"
- One new `Worker` started for every request, with no pool

**Ask your AI**
- *"Which routes in my server do heavy CPU work instead of waiting? For each one, should it use an async API, a worker thread or a background job?"*
- *"Add event loop delay monitoring to my Node.js server, and log a warning when the 99th percentile goes above 100 ms."*
- *"Is any regular expression in my code run on user input? Could any input make it very slow?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Where the waiting happens.** The Node.js docs explain that the event loop hands I/O to the operating system whenever possible. Modern operating systems can handle many such operations in the background, and tell Node.js when each one finishes. Work the operating system can't do that way, such as file system calls, `dns.lookup()`, and some `crypto` and `zlib` functions, goes to libuv's worker pool instead.

**Changing the pool size.** You can set the `UV_THREADPOOL_SIZE` environment variable when the process starts. libuv's docs say the default is 4 and the maximum is 1024. A bigger pool doesn't create more CPU cores, so it helps most when the pool is busy waiting, not computing.

**Serverless platforms.** On standard AWS Lambda functions, each copy of your function (an "execution environment") is busy with one request at a time, so a blocked thread mostly hurts that one request, plus your bill and your time limit. Some platforms now let one instance handle several requests at once: Vercel's Fluid compute, the default for new projects since April 2025, does this for Node.js. There, a blocked event loop slows every request sharing that instance, just like on your own server.

**More processes.** Running several Node.js processes, one per CPU core, lets one server use all its cores. A blocking request then freezes only the users on its process. It's a useful safety margin, not a fix.

**Small tasks can block too.** Code scheduled with `process.nextTick` runs before the event loop moves on. The Node.js docs warn that calling it again and again from inside itself can starve I/O, just like a long loop.

</details>

## References

- [Don't Block the Event Loop (or the Worker Pool)](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop): Node.js documentation. The rule that Node is fast when each client's work is small, the worker pool and which APIs use it, the Sync APIs to avoid, the JSON.parse timing, regular expressions and denial of service, partitioning and offloading.
- [The Node.js Event Loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick): Node.js documentation. The event loop, a single JavaScript thread, and handing I/O to the operating system.
- [Worker threads](https://nodejs.org/api/worker_threads.html): Node.js API documentation. Workers for CPU-heavy JavaScript, not I/O, and using a pool of workers.
- [Performance measurement APIs: monitorEventLoopDelay](https://nodejs.org/api/perf_hooks.html): Node.js API documentation. Measuring event loop delay, reported in nanoseconds.
- [Thread pool work scheduling](https://docs.libuv.org/en/v1.x/threadpool.html): libuv documentation. The default pool size of 4 and the `UV_THREADPOOL_SIZE` maximum of 1024.
- [Fluid compute is now the default for new projects](https://vercel.com/changelog/fluid-compute-is-now-the-default-for-new-projects): Vercel changelog. Fluid compute as the default for new projects.
- [Understanding Lambda function scaling](https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html): AWS documentation. One request per execution environment at a time.
