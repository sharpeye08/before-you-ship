---
title: "Fast in the US, painfully slow in India"
slug: latency-and-cdns
order: 56
level: 4
levelName: Reliability & scale
concepts: [Latency, Bandwidth, Round trips, CDNs, Regions, Server and database in the same region]
readTime: 14 min
quiz:
  - question: "Users in India say your app is slow. Your server logs show every request finishes in 40 milliseconds. One user upgrades to a much faster internet plan. What happens?"
    options:
      - text: "The app becomes fast, because the problem was the user's internet speed"
      - text: "Very little changes, because the delay comes from distance and the number of round trips, not from how much data the connection can carry"
        correct: true
      - text: "The app becomes slower"
      - text: "The server logs will start showing longer times"
    explanation: "A faster plan raises bandwidth: how much data arrives per second. It does not shorten the trip to a server on the other side of the world. That delay, latency, is limited by the speed of light in fiber."
  - question: "A round trip between your user and your server takes 200 ms. Before the page can appear, the browser must wait for 5 trips, one after another. About how long does the user wait for the network alone?"
    options:
      - text: "About 200 ms, because the trips overlap"
      - text: "About 40 ms"
      - text: "About 1 second"
        correct: true
      - text: "It depends only on the size of the page"
    explanation: "When each step waits for the one before, the round trips add up: 5 × 200 ms = 1,000 ms. That is why reducing the number of trips in a row matters as much as shortening each trip."
  - question: "To help your users in India, you create your database in Mumbai. Your Vercel functions still run in the default region, Washington, D.C. One page runs 6 database queries, one after another. What happens?"
    options:
      - text: "The page gets much faster, because the data is now close to the users"
      - text: "Nothing changes"
      - text: "Only the first visit is slower"
      - text: "The page gets slower, because each of the 6 queries now crosses between the US and India"
        correct: true
    explanation: "The function talks to the database once per query. With an ocean between them, each query costs about 200 ms instead of a few milliseconds. Keep the function and the database in the same region, then choose that region based on your users."
  - question: "Which of these can a CDN safely keep a shared copy of and serve to everyone?"
    options:
      - text: "Your logo, CSS and JavaScript files, and a public list of popular recipes"
        correct: true
      - text: "Each user's account page"
      - text: "The list of a user's saved payment cards"
      - text: "Anything, as long as the user is logged in"
    explanation: "A CDN hands the same copy to many visitors. That is perfect for files and data that are the same for everyone. Personal data must never be stored in a shared cache."
  - question: "Your route runs three database queries that don't depend on each other, each with its own await. The database is 50 ms away. What is the simplest fix that saves time?"
    options:
      - text: "Add more memory to the server"
      - text: "Start all three queries at once with Promise.all, so you wait about 50 ms instead of about 150 ms"
        correct: true
      - text: "Put the database behind the CDN"
      - text: "Make the queries return less data"
    explanation: "Each await on its own waits for a full round trip. Starting independent queries together means you wait about one round trip in total."
  - question: "Most of your users are in Europe. Your function and your database are both in Washington, D.C. What is the best first step?"
    options:
      - text: "Move only the functions to Frankfurt"
      - text: "Move only the database to Frankfurt"
      - text: "Make sure static files and public pages come from the CDN, and consider moving the function and database together to a European region"
        correct: true
      - text: "Nothing can be done, because the speed of light is fixed"
    explanation: "The CDN removes most of the distance for files and public data. For the rest, the function and the database should move together, so they stay close to each other."
---

# Fast in the US, painfully slow in India

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Request and response:** the browser asks a server for something, and the server answers. *([Every website is a conversation. Here's how it goes](/lessons/http-requests-and-responses))*
> - **Handshake:** the start of a secure HTTPS connection, where both sides agree on how to talk before any page is sent. *([What the padlock icon really protects, and what it doesn't](/lessons/https-and-certificates))*
> - **CDN:** servers in many countries that keep copies of your files close to visitors. *([From your laptop to a real website in one push](/lessons/hosting-platforms))*
> - **Cache-Control:** the header that tells browsers and CDNs whether, and for how long, they may keep a copy of a response. *([Fast, but showing yesterday's data](/lessons/caching))*

## "It takes four seconds to open"

You live in New York. You built a recipe app with AI: a Next.js app on Vercel and a Postgres database on Supabase. On your laptop, every page appears almost at once.

You share it on a forum, and hundreds of people sign up. Many of them are in India. Within a day, the messages arrive:

> "The home page takes about four seconds. Every click feels sticky."

You check your logs. Every request finishes in about 40 **milliseconds** (thousandths of a second). No errors. From New York, the app is still fast.

Nothing is broken. Your server isn't slow. It's **far away**. Every message between a phone in Bengaluru and a server near Washington, D.C. has to cross half the planet, and a single page needs many of those messages, one after another.

This lesson explains where those four seconds come from, and the three tools that win most of them back: CDNs, the right region, and fewer trips.

---

## The mental model: distance costs time, on every trip

Two different words describe how "fast" a connection is:

- **Latency** is the time a message takes to travel from one place to another. The time to get there *and* get the answer back is the **round-trip time**, often shortened to **RTT**.
- **Bandwidth** is how much data the connection can carry per second. Internet plans advertise this: "100 megabits per second".

Think of delivery vans driving between two cities. Bandwidth is how big the vans are. Latency is how long the drive takes. Buying bigger vans helps when you have a lot to move, but it never makes the drive shorter.

**Where this comparison stops working:** a van can drive faster on an empty road. Internet signals can't. They already travel through glass fiber cables at close to the speed of light, and nothing makes them go faster. The only ways to save time are a **shorter distance** or **fewer trips**.

### The speed-of-light limit

Light in a vacuum travels about 300,000 km per second. Inside a glass fiber, it slows to about two-thirds of that: roughly **200,000 km per second**. A useful rule of thumb from that number:

> Every 1,000 km of cable adds about **10 ms** to a round trip.

Washington, D.C. to Mumbai is about 12,850 km in a straight line. Even through a perfectly straight cable, a round trip would take about 130 ms (25,700 km at 200,000 km per second). Real cables don't go straight. They follow roads, railways and sea routes that avoid fishing grounds and earthquake zones, and every router along the way adds a little delay.

Microsoft publishes the measured round-trip times between its own data centers. Approximate typical values from its 2026 data:

| Between | Typical round trip |
|---|---|
| Two data centers in the same area (East US and East US 2) | about 8 ms |
| East US and West US | about 67 ms |
| East US and Western Europe | about 83 ms |
| Central India and South India | about 20 ms |
| East US and Central India | about 200 ms |

These are fast, private networks. A phone on mobile data or home Wi-Fi adds more on top, so for a user in India and a server in the eastern US, **200 ms per round trip is optimistic**.

So a faster internet plan in India changes almost nothing. Bandwidth was never the problem.

### One page, many round trips

200 ms doesn't sound like much. But a page needs many round trips, and many must happen **in order**, each waiting for the last.

Here's a first visit to your app over HTTPS:

1. **Open a connection** (called TCP): 1 round trip.
2. **The HTTPS handshake:** 1 more round trip with modern TLS 1.3. The older TLS 1.2 needs 2.
3. **Ask for the page:** 1 round trip. The HTML arrives.
4. The HTML mentions CSS and JavaScript files. The browser didn't know about them until now, so it asks: **another round trip**.
5. The JavaScript runs and asks your API for the recipes: **another round trip**.
6. Your API answers, and the page shows the images in the recipes: **another round trip**.

That's at least six trips in a row. At 200 ms each, that's **1.2 seconds** of pure waiting before the time to download anything or run any code. In New York, the same six trips take maybe 20 ms each: about 0.1 seconds. Same app, same server, ten times slower.

A chain of requests where each one waits for the last is called a **waterfall**: in your browser's developer tools, each bar starts where the one above it ends. The formula to remember:

> **Waiting time ≈ round-trip time × number of round trips in a row**

---

## How it goes wrong

### Problem 1: Everything comes from one faraway place

If one server in one city sends everything, every file costs round trips to that city. A user in India waits 200 ms per trip for a logo that never changes.

Hosting platforms like Vercel and Netlify put the files your build creates on their CDN automatically. But AI-written apps often load files from somewhere else, such as images straight from a storage bucket in one region, or a font from another website. Those skip the CDN.

### Problem 2: The function and the database are far apart

You read that distance is the problem. So you create a new Supabase project in Mumbai, close to your users, and move your data there.

The app gets **slower**.

Here's why. Your Vercel functions still run in Vercel's default region, **`iad1`: Washington, D.C.** Vercel picked that default because most databases that apps connect to are on the US East Coast. Now, every time your function asks the database something, the question crosses the ocean and back.

Look at a typical route the AI might write:

```js
export async function GET(request) {
  const user = await getUser(request);                        // 1 trip
  const recipes = await db.recipe.findMany({ where: { authorId: user.id } }); // 2
  const saved = await db.save.count({ where: { userId: user.id } });         // 3
  const tags = await db.tag.findMany();                       // 4
  return Response.json({ user, recipes, saved, tags });
}
```

In plain English:

1. **Lines 2–5:** four database queries. Each `await` means "stop here until the answer comes back", so each one is a full round trip to the database.
2. **Line 6:** send everything back to the browser.

With the function and the database in the same region, each query's round trip is about a millisecond. Four queries cost a few milliseconds. With the function in Washington and the database in Mumbai, each costs about 200 ms. The same four lines now take **800 ms**, on every request, for every user, wherever they are.

This is a common slowdown in AI-built apps: the AI created the database in one region, the hosting platform used its default region for the code, and nobody compared the two.

### Problem 3: Many small trips in a row

Even in the right place, too many trips in a row add up. Two common shapes:

- **In the browser:** the page fetches `/api/user`, waits, then fetches `/api/recipes`, waits, then fetches `/api/saved`. Three round trips from India, one after another.
- **On the server:** a loop that runs one database query per item. A list of 50 recipes becomes 50 trips to the database.

> **Go deeper:** [One page, 500 database queries](/lessons/n-plus-one-queries) (Level 4) covers the "one query per item" problem and how to fix it.

---

## What good looks like

### Step 1: Serve every file from a CDN

A CDN's server locations are called **points of presence** (PoPs). Vercel, for example, has more than 100. When a user in Bengaluru asks for your logo, a server in or near India answers, in a small fraction of the 200 ms. Your build's files are already there. Check the rest:

- **Images users upload:** serve them through a CDN, not straight from the storage bucket's own address.
- **Fonts and scripts from other websites:** host them yourself where you can, so they come from your own CDN.

### Step 2: Let the CDN keep public API answers too

A CDN can also keep copies of answers from your functions, but only when you say so, and only for data that is **the same for everyone**. On Vercel, you do this with a `Cache-Control` header that includes `s-maxage`:

```js
export async function GET() {
  const recipes = await getPopularRecipes();
  return Response.json(recipes, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
```

In plain English:

1. **Line 2:** get the list of popular recipes. It's the same for every visitor.
2. **Line 4:** tell the CDN it may keep this answer for 60 seconds (`s-maxage=60`). After that, it may keep handing out the old copy for up to 300 more seconds while it fetches a fresh one in the background (`stale-while-revalidate=300`).

Now users in India get the popular recipes from a nearby CDN server, and your function runs about once a minute per location instead of once per visitor. Never do this for personal data: a CDN hands the same copy to everyone.

> **Go deeper:** [Your cache expired and the database collapsed](/lessons/cache-strategies) (Level 4) explains `stale-while-revalidate` and choosing how long to keep copies.

### Step 3: Keep the function and the database together, then choose where

Big providers group their data centers into **regions**: areas like "US East", "Mumbai" or "Frankfurt". When you create a database or configure your functions, you choose a region.

Follow two rules, in this order:

1. **The function and the database must be in the same region**, or as close as possible. Vercel's own documentation says this.
2. **Then put that region near most of your users.**

| Your users | A good choice |
|---|---|
| Mostly in India | Function and database both in Mumbai (Vercel `bom1`, Supabase or AWS `ap-south-1`) |
| Mostly in Europe | Both in Frankfurt, London or Paris |
| All over the world | Both in one central region, often US East, with a CDN in front of everything public |

On Vercel, you set the function region in your project settings or in `vercel.json`:

```json
{
  "regions": ["bom1"]
}
```

This tells Vercel to run your functions in Mumbai. The free Hobby plan allows one region, which is all most apps need.

Moving a database later is harder than moving code. Supabase, for example, can't change a project's region in place: you create a new project and move your data. So choose the database region on purpose, on day one, and if the AI creates the database, ask which region it used.

If your users are split between India and the US, one region can't be close to all of them. With a CDN in front, files and public pages are still fast for everyone, and only personal API calls travel to your one region. For most apps, that's a good trade.

### Step 4: Fewer trips in a row

Look for trips that don't need to wait for each other. In the route from Problem 2, the recipes, the saved count and the tags don't depend on each other. Start them all at once:

```js
const [recipes, saved, tags] = await Promise.all([
  db.recipe.findMany({ where: { authorId: user.id } }),
  db.save.count({ where: { userId: user.id } }),
  db.tag.findMany(),
]);
```

In plain English:

1. **Lines 2–4:** start all three queries at the same time. Each one returns a **Promise**: JavaScript's placeholder for an answer that will arrive later.
2. **Line 1:** `Promise.all` waits until all three answers are back, then gives them to you in the same order.

Three waits become one. If the database is 50 ms away, you save about 100 ms on every request.

The same idea works in the browser: instead of three API calls in a row, make one route that returns everything the page needs.

> **Go deeper:** [One slow request froze the whole server](/lessons/event-loop) (Level 4) explains `await` and Promises in more detail.

---

## Test your own app

1. **Find your two regions.** In Vercel, open your project's **Settings → Functions** and look at the function region. In your database dashboard (Supabase: project settings), find the database region. Are they the same? If not, that's your first fix.
2. **See where a request ran.** On Vercel, open developer tools, click the **Network** tab, reload, and click a request to one of your API routes. The `x-vercel-id` response header lists the Vercel regions the request passed through, including where the function ran.
3. **Read the waterfall.** In the same Network tab, look at the **Waterfall** column. Bars that start only when another one ends are trips in a row. Count how many your page needs before the main content appears.
4. **Pretend to be far away.** In Chrome's developer tools settings, under **Throttling**, add a custom network profile with a latency of 200 ms, select it in the Network tab and reload. It's only an imitation, but it shows which pages suffer most from many trips.
5. **Check what the CDN keeps.** On Vercel, the `x-vercel-cache` response header says `HIT` when the CDN answered from its copy and `MISS` when your function ran. Reload a public route twice and check.

---

## Takeaways

**Key terms**
- **Latency:** how long a message takes to travel. Limited by distance and the speed of light.
- **Round-trip time (RTT):** the time to get there and back. About 10 ms per 1,000 km of cable, plus extra along the way.
- **Bandwidth:** how much data per second a connection can carry. It doesn't shorten the trip.
- **Waterfall:** requests that each wait for the one before. Their round trips add up.
- **Region:** a group of data centers in one area. You choose one for your functions and one for your database.
- **Point of presence (PoP):** one of a CDN's server locations, close to users.

**Red flags**
- The function region and the database region are different, or nobody knows what they are
- A route with many `await`ed database queries in a row that don't depend on each other
- Images or fonts loaded from a single faraway server instead of a CDN
- A page that makes API call after API call, each waiting for the last
- Personal data with a `public` or `s-maxage` cache header

**Ask your AI**
- *"Which region do my functions run in, and which region is my database in? Show me where each is configured."*
- *"In this route, which database queries are independent of each other? Rewrite it so they run at the same time."*
- *"List every request this page makes before the main content appears, in order. Which ones wait for an earlier one, and can any be combined?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Fewer handshake trips.** TLS 1.3 needs one round trip for its handshake, compared with two for TLS 1.2. When a browser reconnects to a server it visited recently, TLS 1.3 can even send the first request with no handshake round trip at all, a feature called **0-RTT**. HTTP/3 goes further by combining the connection setup and the TLS handshake. None of these make a round trip shorter. They only reduce how many you need.

**Connections that stay open.** Browsers keep connections open and reuse them for the next requests to the same server, so the setup trips are paid once, not per file. Your server should do the same with its database: opening a new database connection costs several round trips of its own. [Your app went viral. Will it survive?](/lessons/scaling) covers connection pooling.

**Where the CDN meets the region.** On Vercel, the nearest point of presence receives the request and forwards it over Vercel's private network to the region where your function runs. The connection to the nearby server is fast, but the trip to the function region still happens for anything the CDN can't answer from its cache.

**Median isn't everything.** Microsoft's numbers are medians (the "P50"): half of the measured trips were faster, half were slower. Real users also see the slow half. When you measure your own app, look at the slower requests too, often called P95 or P99: the time that 95% or 99% of requests stay under.

**Read replicas.** Some apps keep the main database in one region and add read-only copies, called **read replicas**, in other regions. Reads come from the nearby copy. Writes still travel to the main database, and the copies can be slightly behind. This helps read-heavy apps with users on several continents, but it adds cost and the "slightly old data" problem from caching.

**Functions near the user, database far away.** Some platforms can run code in many cities at once, right next to each user. That's great for work that doesn't touch your database, like redirects or checking a cookie. For anything that queries the database, it brings back Problem 2: each query travels from the user's city to the database's region.

</details>

## References

- [Azure network round-trip latency statistics](https://learn.microsoft.com/en-us/azure/networking/azure-network-latency): Microsoft Learn. Measured median round-trip times between data center regions (East US to Central India about 200 ms, and the other values in the table).
- [It's Time to Learn About Latency](https://resources.telegeography.com/its-time-to-learn-about-latency): TeleGeography. Light in fiber at roughly 203,000 km per second, about 10 ms of round trip per 1,000 km, and why real cable routes are longer.
- [Introducing 0-RTT](https://blog.cloudflare.com/introducing-0-rtt/): Cloudflare. Round trips for a new HTTPS connection: one for TCP, one for the TLS 1.3 handshake (two for TLS 1.2), and 0-RTT for returning visitors.
- [Global network and regions](https://vercel.com/docs/regions): Vercel. Points of presence, region codes such as `iad1` and `bom1`, functions defaulting to `iad1`, and running functions in the same region as the database.
- [Choosing deployment regions](https://vercel.com/kb/guide/choosing-deployment-regions): Vercel. Why `iad1` is the default and how distance between a function and its data source affects response times.
- [Cache-Control headers](https://vercel.com/docs/caching/cache-control-headers): Vercel. Caching function responses on the CDN with `s-maxage` and `stale-while-revalidate`.
- [Change project region](https://supabase.com/docs/guides/troubleshooting/change-project-region-eWJo5Z): Supabase. A project's region can't be changed in place; you create a new project and migrate.
- [Response headers](https://vercel.com/docs/headers/response-headers): Vercel. The `x-vercel-id` header (regions a request passed through and where the function ran) and the `x-vercel-cache` values `HIT` and `MISS`.
