---
title: "How one server handles thousands of users at once"
slug: processes-and-threads
order: 50
level: 4
levelName: Reliability & scale
concepts: [Processes vs threads, Concurrency vs parallelism, CPU cores, Shared memory, Thread pool, Worker threads, Cluster, Instances]
readTime: 14 min
quiz:
  - question: "Your server has 2 CPU cores. 2,000 users are online, and each request spends 2 ms using the CPU and 198 ms waiting for the database. Why can one Node.js process keep up?"
    options:
      - text: "Node.js secretly creates 2,000 threads, one per user"
      - text: "Most of each request is waiting, and while one request waits, the main thread works on others"
        correct: true
      - text: "The 2 cores run 1,000 requests each at exactly the same moment"
      - text: "It can't. You need one CPU core per user"
    explanation: "This is concurrency: many requests are in progress, but only a few are using the CPU at any moment. While a request waits for the database, the main thread is free to start or finish other requests."

  - question: "What is the main difference between two processes and two threads?"
    options:
      - text: "Threads are always faster than processes"
      - text: "Processes can only run on one CPU core"
      - text: "Two processes each have their own memory. Two threads inside one process share the same memory"
        correct: true
      - text: "There is no difference, they are two names for the same thing"
    explanation: "The operating system keeps each process's memory separate. Threads live inside one process and see the same variables. Sharing makes threads cheap to talk to each other, and also makes race conditions possible."

  - question: "Your Node.js app keeps a variable let stock = 1 in memory. The /buy route checks stock > 0, then awaits a 1-second card payment, then does stock = stock - 1. Two people press Buy at the same moment. What can happen?"
    options:
      - text: "Nothing bad, because Node.js runs JavaScript on one main thread"
      - text: "The second request crashes the server"
      - text: "Node.js automatically waits for the first purchase to finish before starting the second"
      - text: "Both requests see stock = 1 before either one subtracts, so you sell 2 items when you had 1"
        correct: true
    explanation: "One main thread means two lines never run at the very same moment. But await lets other requests run in the gap. Both checks happen before either subtraction. Moving the check and the change into one database update fixes it."

  - question: "Your app runs as 3 instances on your hosting platform. It counts each user's login attempts in a JavaScript Map in memory and blocks after 5 failures. What really happens?"
    options:
      - text: "Each instance has its own Map, so an attacker can get up to 15 tries by landing on different instances"
        correct: true
      - text: "The platform copies the Map between instances automatically"
      - text: "The limit becomes 5 divided by 3"
      - text: "Nothing changes, memory is shared between instances"
    explanation: "Instances are separate processes, often on separate machines. They never see each other's memory. Anything that must be counted across all users belongs in a shared store like a database or Redis."

  - question: "Your Node.js server resizes large images in JavaScript, and every resize freezes all other requests for 2 seconds. Which tool fits best?"
    options:
      - text: "Increase the libuv thread pool size"
      - text: "Use worker threads (or a background job) so the resize runs off the main thread"
        correct: true
      - text: "Add more async/await to the resize function"
      - text: "Nothing helps; Node.js can't do CPU-heavy work"
    explanation: "Worker threads run JavaScript in parallel, off the main thread. The thread pool only runs Node's own built-in tasks like file reads and some crypto, not your JavaScript. async/await does not move CPU work anywhere."

  - question: "You use Node's cluster module to start 4 worker processes on a 4-core machine. What do you gain, and what do you NOT get?"
    options:
      - text: "You gain shared memory between the 4 workers, but lose the event loop"
      - text: "You gain nothing, because Node.js can only ever use one core"
      - text: "You gain use of all 4 cores and survive one worker crashing, but the workers do not share variables or in-memory sessions"
        correct: true
      - text: "You gain 4 times more memory per request, and sessions are copied automatically"
    explanation: "Each cluster worker is a full process with its own memory and its own main thread. That uses every core and isolates crashes, but in-memory data, like sessions or counters, is different in each worker."
---

# How one server handles thousands of users at once

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Process:** a running program, with its own space in memory. *([Your app restarted and all the likes vanished](/lessons/how-a-computer-runs-your-code))*
> - **Event loop:** the loop in Node.js that runs your JavaScript on one main thread, picking up each task when it's ready. *([One slow request froze the whole server](/lessons/event-loop))*
> - **Race condition:** a bug where the result depends on which of two requests finishes first. *([A customer got charged twice. How?](/lessons/charged-twice))*
> - **Serverless function:** backend code that a platform starts only when a request arrives. *([From your laptop to a real website in one push](/lessons/hosting-platforms))*

## 2,000 users, 2 cores

Your app gets featured in a newsletter. By lunchtime, 2,000 people have it open. About every 10 seconds, each of them clicks something, and your server answers. You open your hosting dashboard and see the machine your app runs on: **2 CPU cores** and 1 GB of memory.

A **CPU core** is one part of the CPU that can follow one list of instructions at a time. A CPU with 2 cores can really do 2 things at the very same moment, and no more.

So how do 2 cores serve 2,000 people? Nobody waits 1,000 turns for a page. Each click comes back in a fraction of a second.

And then a stranger thing happens. Your "only 1 left in stock" item sells twice. Your login limit of 5 tries lets someone try 15 times. Nothing crashed, and every test you ran alone worked.

Both puzzles have the same answer: how a server splits its work into **processes** and **threads**, running on **cores**, and which memory they share.

---

## Mental model: kitchens and cooks

The Level 1 lessons compared a computer to a kitchen. Let's grow that kitchen into a restaurant.

- A **process** is a whole kitchen. It has its own worktop (memory) and its own ingredients (data). Cooks in one kitchen cannot touch another kitchen's worktop. The operating system builds the walls between them.
- A **thread** is one cook inside a kitchen: one line of work inside a process. The main thread from the event loop lesson is one of these. One process can have several threads, and **they all share the same memory**, like cooks sharing one worktop.
- A **core** is a stove. Cooks can only cook while standing at a stove. With 2 stoves, at most 2 cooks are really cooking at any moment, however many cooks you hire.

| | Processes | Threads (in one process) |
|---|---|---|
| Memory | Each has its own | Shared by all threads |
| Talking to each other | Slow: must send messages | Fast: read the same variables |
| If one crashes | The others keep running | Often the whole process dies |
| Cost to start | Higher | Lower |

**Where the comparison stops working:** a real cook can't switch between stoves hundreds of times a second. The operating system can. It pauses one thread, saves where it was, and lets another one run on that core. This is called a **context switch**. It's fast, but not free.

### Concurrency vs parallelism

Two words that sound the same, but mean different things:

- **Concurrency:** many tasks are *in progress* at the same time. They take turns. A single cook can have 30 orders in progress: one in the oven, one waiting for sauce to cool, one being chopped right now.
- **Parallelism:** several tasks are *running at the same moment*, on different cores. Two cooks at two stoves.

You need parallelism only when the work itself keeps the CPU busy.

### Why 2 cores are enough: most requests are waiting

Here's the key fact for web servers. A typical request spends most of its time **waiting**: for the database, for a payment API, for an AI model, for a file. Waiting for data to come in or go out is called **I/O** (input/output).

Say each request takes 200 ms in total: 2 ms of real CPU work, and 198 ms of waiting for the database. While it waits, it doesn't need a core at all.

A useful formula from AWS's documentation:

```text
requests in progress = requests per second × seconds per request
```

Your 2,000 users send about 200 requests per second, and each takes 0.2 seconds. So you have about **40 requests in progress** at any moment. But each one uses the CPU for only 2 ms. In total that's 200 × 2 ms = 0.4 seconds of CPU work every second: one core, busy about **40%** of the time. The rest of the time, those 40 requests are waiting, and waiting is cheap.

So the real question for a server is: **how do you keep track of 40 (or 4,000) waiting requests without wasting memory?** There are two main answers.

---

## Two ways to serve many users

### Answer 1: one thread per request

Many servers give each request its own thread. When the thread waits for the database, the operating system parks it and runs another thread. The code stays simple, because waiting is invisible.

For example, Apache Tomcat, a popular Java server, uses a pool of request threads and by default allows at most **200** at once. Request 201 has to wait for a free thread.

The cost: each thread needs its own memory for its work, and the operating system spends time switching between them. The Node.js documentation describes this trade-off directly: fewer threads means more of the machine's time and memory goes to serving clients instead of managing threads.

### Answer 2: Node.js, one main thread plus helpers

Node.js takes the other route. As [One slow request froze the whole server](/lessons/event-loop) showed, your JavaScript runs on **one main thread**, the "waiter" of that lesson. When a request starts waiting, the main thread moves on to the next one. One thread can keep thousands of waiting requests in progress, because a waiting request is only a small note in memory, not a whole thread.

That lesson also introduced two kinds of helpers: the **worker pool** (also called the thread pool: 4 threads by default, run by libuv, for file reads, `dns.lookup()`, compression and some crypto) and **worker threads** for your own CPU-heavy JavaScript. This lesson adds a third:

- **Multiple processes.** Node's `cluster` module starts several copies of your app as separate processes that share one port. Each copy has its own main thread and its own memory, so together they use every core. If one crashes, the others keep serving.

So, which tool for which problem:

| You have... | Use | Why |
|---|---|---|
| Many slow database or API calls | Nothing extra: async code on the main thread | Waiting is cheap; one thread can juggle it |
| CPU-heavy JavaScript (image resizing, big reports) | Worker threads, or a background job | Keeps the main thread free for other requests |
| More cores than one main thread can use | More processes: `cluster`, or more instances on your platform | One main thread uses at most one core |

> **Go deeper:** [Sign-up takes 10 seconds because of one email](/lessons/background-jobs) (Level 3) shows how to move slow work out of the request entirely.

### How hosting platforms do it: instances

In production, your hosting platform usually runs several copies of your app for you. Each copy is called an **instance**: a separate process, often on a separate machine. A **load balancer** in front of them spreads incoming requests across the instances. Render, for example, lets you set a number of instances and load-balances traffic evenly between them.

Serverless platforms do something similar, automatically:

- On standard **AWS Lambda** functions, each environment that runs your function handles **one request at a time**. (Lambda Managed Instances, a newer option, can handle several at once.) Ten requests at once means ten separate environments, each with its own memory.
- On **Vercel** with Fluid compute (on by default for new projects since April 2025), several requests can **share one instance** at the same time, much like a normal Node.js server.

> **Go deeper:** [Your app went viral. Will it survive?](/lessons/scaling) (Level 4) covers instances and load balancers in depth.

---

## How it goes wrong

### Bug 1: Shared memory and the "await gap"

When threads share memory, two of them can change the same variable at once. `count = count + 1` is really three steps: read, add 1, write back. If two threads both read 5, both write 6, and one update is lost.

Node.js runs your JavaScript on one thread, so two lines never run at the very same instant. That doesn't make it safe, because of `await`:

```js
let stock = 1; // lives in this process's memory

app.post("/api/buy", async (req, res) => {
  if (stock <= 0) return res.status(409).json({ error: "Sold out" });
  await chargeCard(req.user.id, 4900); // waits about 1 second
  stock = stock - 1;
  res.json({ ok: true });
});
```

What happens when two people press Buy at the same moment:

1. Request A checks `stock`. It's 1, so it continues, and starts waiting for the card payment.
2. While A waits, the main thread is free. Request B runs, checks `stock`, and it's **still 1**.
3. Both payments succeed. Both subtract 1. You sold two items and had one. `stock` is now -1.

Any time your code **checks something, awaits, then acts on what it checked**, another request can slip into the gap. It's the race condition from [A customer got charged twice. How?](/lessons/charged-twice), in memory instead of in the database.

### Bug 2: Memory that isn't shared, but you think it is

Now the opposite problem. The code above has a second bug: `stock` lives in **one process's** memory. Run 3 instances and there are 3 different `stock` variables. Each one thinks it has 1 item to sell.

The same goes for anything an AI often puts in a variable:

- **Login attempt counters** in a `Map`: each instance counts separately, so a limit of 5 becomes up to 15.
- **Sessions in memory:** a user logs in on instance 1, their next request lands on instance 2, and they're logged out. The Node.js cluster docs warn about exactly this: don't rely on in-memory data for things like sessions and login.
- **In-memory caches:** clearing one instance's copy leaves the others showing old data.

This bug hides on your laptop, where there's always one process. It appears the day a second instance starts.

---

## What good looks like

**1. Make each instance stateless.** A **stateless** server keeps nothing important in its own memory between requests. Anything that must be shared goes in a shared store: your database, or **Redis** (a fast data store that keeps data in memory and is shared by all your instances). Then it doesn't matter which instance answers, or how many there are. Ask: *"If this request landed on a different instance, would it still work?"*

**2. Let the database do check-and-change in one step.** Instead of check, await, then change, write a single update that only succeeds if the condition is still true:

```sql
UPDATE products
SET stock = stock - 1
WHERE id = $1 AND stock > 0
RETURNING stock;
```

If no row comes back, the item was already sold out. The database runs this as one **atomic** step: no other request can change `stock` between the check and the subtraction. Charge the card *after* the update succeeds (and put the stock back if the payment fails), so you never charge for an item you can't deliver.

> **Go deeper:** [Two transactions, one wrong answer](/lessons/isolation-levels) (Level 4) explains what the database guarantees when two transactions run at once.

**3. Use every core, the simple way.** On your own server, run one Node.js process per core. `os.availableParallelism()` tells you how many that is. On a hosting platform, increase the number of instances instead. Either way, you get more main threads, and the stateless rule above keeps them correct.

**4. Move CPU-heavy work off the main thread.** Use a pool of worker threads, or a background job if the user doesn't need the answer right away.

> **Go deeper:** [Two tasks waiting for each other forever](/lessons/locks-and-deadlocks) (Level 4) shows how locks protect shared data, and how they can get stuck.

---

## Test your own app

**1. Count your cores.** In a terminal, run:

```bash
node -e "console.log(require('os').availableParallelism())"
```

This prints how many tasks your laptop can run in parallel. Your hosting plan may give you fewer.

**2. Fire two requests at the same moment.** Pick a route that checks something and then changes it: buying, redeeming a coupon, claiming a username. Open your app, log in, open the browser console (F12), and run:

```js
const send = () => fetch("/api/buy", { method: "POST" }).then((r) => r.status);
console.log(await Promise.all([send(), send(), send()]));
```

This sends three requests at once. If a test item had stock 1 and you see more than one `200`, you have the await-gap race.

**3. Check your instance count.** In your hosting dashboard, find how many instances your app runs, and whether autoscaling can add more. If it can ever be more than one, every in-memory counter, `Map` or cache is a bug waiting for traffic.

---

## Takeaways

**Key terms**
- **CPU core:** a part of the CPU that runs one list of instructions at a time
- **Process:** a running program with its own memory, walled off from other processes
- **Thread:** one line of work inside a process. Threads in a process share its memory.
- **Concurrency:** many tasks in progress at once, taking turns
- **Parallelism:** several tasks running at the same moment on different cores
- **Thread pool / worker threads:** Node's helper threads for built-in tasks / for your own CPU-heavy JavaScript
- **Instance:** one running copy of your app. Platforms run several behind a load balancer.
- **Stateless:** keeping nothing important in one instance's memory

**Red flags**
- A variable outside any function that holds counts, stock, sessions or rate limits
- Code that checks a value, then `await`s, then changes the value
- "It's safe because Node.js is single-threaded"
- An app that works with one instance but has never been tested with two

**Ask your AI**
- *"List every piece of state my server keeps in memory. Which ones break if I run 3 instances?"*
- *"Find every place where my code checks a value, awaits something, then updates that value. Rewrite each as one atomic database update."*
- *"Is any CPU-heavy work running on the main thread? Should it move to a worker thread or a background job?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Worker threads can share memory, on purpose.** Normally, workers talk by sending messages, which copies the data. The Node.js docs explain that, unlike `cluster` processes, worker threads can share memory by transferring `ArrayBuffer`s or sharing a `SharedArrayBuffer`. Once memory is truly shared, the race conditions from thread-per-request servers come back, and you need `Atomics` operations to update it safely.

**How cluster spreads connections.** By default on every platform except Windows, the primary process accepts new connections and hands them to the workers in turn, which is called **round-robin**. If a worker crashes, the others keep serving, and the primary can start a replacement.

**Changing the thread pool size.** `UV_THREADPOOL_SIZE` must be set before Node.js starts, for example in your start command or your platform's environment variables. The Node.js docs warn that setting it from inside your code with `process.env` is not guaranteed to work, because the pool is created before your code runs.

**Requests per second vs requests in progress.** The formula in this lesson works for any server, not only Lambda. AWS's example: a function that averages 200 ms and gets 5,000 requests per second has a concurrency of 1,000. On Lambda, that means 1,000 environments running at once, and the default account limit is 1,000 concurrent executions per region.

**Async is not free either.** A thread-per-request server spends memory on threads. An event-loop server spends memory on waiting requests and their data. Neither is "infinitely scalable". Both are limited by memory, by the database's connection limit, and by the slowest service you call.

</details>

## References

- [Don't Block the Event Loop (or the Worker Pool)](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop): Node.js. The event loop plus worker pool model, which tasks use the pool, and the cost of many threads.
- [Command-line API: UV_THREADPOOL_SIZE](https://nodejs.org/api/cli.html): Node.js. Default pool size of 4, the list of thread pool APIs, and the warning about slow pool tasks.
- [Worker threads](https://nodejs.org/api/worker_threads.html): Node.js. Workers for CPU-intensive work, not I/O, shared memory, and using a pool of workers.
- [Cluster](https://nodejs.org/api/cluster.html): Node.js. Multiple processes sharing a port, round-robin distribution, and the warning about in-memory sessions.
- [Understanding Lambda function scaling](https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html): AWS. One request per execution environment, the concurrency formula, and the default limit of 1,000.
- [Fluid compute](https://vercel.com/docs/fluid-compute): Vercel. Multiple invocations sharing one instance; on by default for new projects since April 23, 2025.
- [Scaling your Render services](https://render.com/docs/scaling): Render. Running multiple instances and load-balancing traffic across them.
- [Apache Tomcat HTTP Connector](https://tomcat.apache.org/tomcat-10.1-doc/config/http.html): Apache. Default `maxThreads` of 200 request threads.
