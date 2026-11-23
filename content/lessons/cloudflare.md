---
title: "One company went down, and a big chunk of the internet went with it"
slug: cloudflare
order: 27
level: 2
levelName: Builder
concepts: [Reverse proxy, Origin server, DNS, CDN, DDoS protection, Web application firewall, SSL/TLS modes, Workers, Pages, R2]
readTime: 14 min
quiz:
  - question: "Your domain uses Cloudflare, and your website's DNS record has the orange cloud (Proxied) turned on. You look up your domain on dns.google. Which IP address do you see?"
    options:
      - text: "Your own server's IP address"
      - text: "Cloudflare's IP addresses, because visitors must reach Cloudflare first"
        correct: true
      - text: "No IP address at all"
      - text: "Your laptop's IP address"
    explanation: "With the orange cloud on, Cloudflare's DNS answers with Cloudflare's own addresses. Visitors connect to Cloudflare, and Cloudflare passes their requests on to your real server. Your server's address stays hidden."

  - question: "You put your site behind Cloudflare. Now the browser says the page \"redirected you too many times\". Your SSL/TLS mode is Flexible, and your server redirects every HTTP request to HTTPS. What's going on?"
    options:
      - text: "Cloudflare is under attack"
      - text: "Your certificate has expired"
      - text: "Visitors' browsers need to clear their history"
      - text: "Cloudflare talks to your server over HTTP, your server redirects to HTTPS, and this repeats forever"
        correct: true
    explanation: "In Flexible mode, Cloudflare connects to your server over plain HTTP. Your server answers \"use HTTPS\", the visitor comes back over HTTPS, Cloudflare connects over HTTP again, and so on. Switch to Full (strict), so Cloudflare connects to your server over HTTPS."

  - question: "You deploy a new design. Your HTML changes, but visitors still see the old styles. Cloudflare is in front of your site. What is the most likely reason?"
    options:
      - text: "Cloudflare kept a cached copy of your old CSS file"
        correct: true
      - text: "Your deploy failed without telling you"
      - text: "CSS can't be changed after the first deploy"
      - text: "Cloudflare blocked your new CSS as an attack"
    explanation: "Cloudflare caches files like CSS, JavaScript and images by default. If the new file has the same name as the old one, visitors can get the old copy until it expires. Purge the cache, or use a build tool that gives each new version a new file name."

  - question: "An attacker finds your server's real IP address in an old DNS record and floods it with traffic directly. What went wrong?"
    options:
      - text: "Nothing, Cloudflare still protects every IP address"
      - text: "The free plan doesn't include DDoS protection"
      - text: "Your server accepts connections from anyone, so the attacker walked around Cloudflare"
        correct: true
      - text: "The orange cloud was turned on"
    explanation: "Cloudflare only protects traffic that goes through Cloudflare. If your server accepts connections from anywhere, someone who knows its address can skip the guard. Allow only Cloudflare's IP addresses, or use Cloudflare Tunnel, and move to a new IP address if the old one leaked."

  - question: "On 18 November 2025, X, ChatGPT and many other websites showed errors at the same time. Why?"
    options:
      - text: "They were all hit by the same hacker on the same day"
      - text: "They all used Cloudflare, and a fault inside Cloudflare's network stopped it from passing requests on"
        correct: true
      - text: "The internet's DNS was switched off"
      - text: "They all deployed broken code at the same time"
    explanation: "Cloudflare said the outage was caused by a database permissions change that made a configuration file twice as big, which made its traffic-handling software fail. It was not an attack. Every site behind Cloudflare was affected at once, because every visitor had to go through Cloudflare first."

  - question: "After you put Cloudflare in front of your server, your rate limiter sees every request coming from a small group of IP addresses. Why?"
    options:
      - text: "Only a few people use your app"
      - text: "Cloudflare changes every visitor's IP address permanently"
      - text: "Your rate limiter is broken and must be removed"
      - text: "The requests now arrive from Cloudflare's servers, so you need to read the visitor's real IP from the header Cloudflare adds"
        correct: true
    explanation: "Your server's direct connection is now with Cloudflare, not with the visitor. Cloudflare adds the visitor's real IP address in a header called CF-Connecting-IP. Configure your app to read it, and only trust it when the request really came from Cloudflare."
---

# One company went down, and a big chunk of the internet went with it

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **DNS record:** an entry in the internet's address book that says where a domain name points. *([From your laptop to a real website in one push](/lessons/hosting-platforms))*
> - **CDN:** servers in many countries that keep copies of your files close to visitors. *([From your laptop to a real website in one push](/lessons/hosting-platforms))*
> - **Redirect:** a response that sends the browser to a different address. *([Every website is a conversation. Here's how it goes](/lessons/http-requests-and-responses))*
> - **HTTPS and certificates:** the locked connection between browser and server, and the file that proves a server's identity. *([What the padlock icon really protects, and what it doesn't](/lessons/https-and-certificates))*

## The day many websites broke at once

On 18 November 2025, people around the world opened X, ChatGPT and many other websites and apps, and saw error pages instead. These companies don't share code. They don't share servers. Yet they broke at the same moment.

What they did share was a company most visitors had never thought about: **Cloudflare**.

That day, Cloudflare changed the permissions on one of its database systems. The change caused a configuration file, used by Cloudflare's system for detecting bots, to roughly double in size. The software that handles traffic in Cloudflare's network had a size limit, and the bigger file went over it. The software failed. Visitors got error pages with status codes starting with 5, which mean "something went wrong on the server's side".

According to Cloudflare's own report, the problems started at about 11:20 UTC. Most traffic was flowing normally again by 14:30, and everything was fixed by 17:06. It was not an attack. Cloudflare called it its worst outage since 2019.

How can one company's mistake take down websites it doesn't own? Because Cloudflare stands in front of a huge number of websites. By its own count, about one in five. To understand why, you need to know what "in front of" means.

---

## A guard at the front door

Normally, a visit to a website works like this:

```text
Visitor ──▶ DNS: "where is example.com?" ──▶ "203.0.113.10"
Visitor ──▶ your server at 203.0.113.10
```

With Cloudflare, it changes:

```text
Visitor ──▶ DNS: "where is example.com?" ──▶ a Cloudflare address
Visitor ──▶ the nearest Cloudflare data center
               │  checks the request, answers from its cache if it can
               ▼
            your server at 203.0.113.10 (only when needed)
```

Cloudflare runs **data centers** (buildings full of servers) in more than 300 cities. When your site is "behind" Cloudflare, visitors never talk to your server directly. They talk to Cloudflare, and Cloudflare passes their requests on to your server and brings back the answers.

A server that sits in front of other servers like this, receiving requests on their behalf, is called a **reverse proxy**. ("Proxy" means "someone who acts for someone else.") Your real server, the one behind the proxy, is called the **origin server**, or just the **origin**.

> Careful: this "origin" is not the same as the "origin" in ["Blocked by CORS policy": why the browser said no](/lessons/cors), which meant scheme + host + port. Same word, different meaning. In Cloudflare's dashboard and docs, "origin" means your own server.

Think of a security guard at the front desk of an office building. Visitors talk to the guard. The guard checks who they are, turns away troublemakers, hands out leaflets from a stack at the desk, and only sends people upstairs when they really need to go.

**Where this comparison stops working:** a building usually has one front desk. Cloudflare has hundreds, one in each city, and every visitor goes to the nearest one. And in a real building, people can't walk around the guard. On the internet, they can, if they know your server's address. More on that later.

---

## How your site gets behind Cloudflare

You add your domain to a Cloudflare account. Then, on the website of the company where you bought your domain (called the **registrar**), you change your domain's **nameservers** to the two that Cloudflare gives you. Nameservers are the DNS servers that hold the official records for your domain. After this change, Cloudflare answers every DNS question about your domain. It can take some time to take effect.

Your DNS records now live in Cloudflare's dashboard. Each website record has a little cloud icon next to it.

### The orange cloud

| Cloud | Setting | What DNS answers | Traffic goes through Cloudflare? |
|---|---|---|---|
| Orange | **Proxied** | Cloudflare's own IP addresses | Yes. You get the CDN, protection and other features. |
| Grey | **DNS only** | Your server's real IP address | No. Cloudflare only answers the DNS question. |

Only records that point to websites (types `A`, `AAAA` and `CNAME`) can be orange. Email records are always grey.


This one icon is the most important setting in the whole dashboard. Orange means the guard is on duty. Grey means visitors go straight to your server, and they can see its real address.

---

## What the guard does

Standing between every visitor and your server, Cloudflare can do a lot. Everything in this section is included in the free plan.

**DNS.** Cloudflare answers the "which IP address?" question for your domain, as you just saw.

**CDN.** Cloudflare keeps copies of your files in its data centers, so visitors get them from a nearby city. Keeping these copies is called **caching**, and a stored copy is a **cached** copy. By default, Cloudflare caches files like images, CSS and JavaScript. It does **not** cache HTML pages or JSON by default.

**HTTPS.** Cloudflare gives your domain a free certificate, so visitors get a secure connection to Cloudflare without you setting anything up.

**DDoS protection.** A **DDoS attack** (distributed denial of service) floods a website with fake traffic from thousands of computers at once, often hacked devices, until the real server can't answer real visitors. Cloudflare's network is so large that it can absorb these floods before they reach you. On the free plan, this protection is "unmetered": you don't pay more when an attack is bigger.

**Firewall.** A **web application firewall** (WAF) looks at each request and blocks ones that match known attack patterns, such as common SQL injection attempts. The free plan includes a small set of these rules, called the Free Managed Ruleset, maintained by Cloudflare.

A WAF is a helpful extra layer, but it doesn't fix your code. It blocks *known* patterns. Attackers try new ones. Your app still needs parameterized queries, escaped output and permission checks.

> **Go deeper:** [Bots signed up 10,000 times overnight. Now what?](/lessons/rate-limiting) (Level 2) covers limiting how many requests one visitor can send.

---

## Cloudflare's own hosting

Cloudflare doesn't only stand in front of other people's servers. It also rents out its own network, competing with Vercel, Netlify and AWS:

- **Workers:** your backend code runs on Cloudflare's servers, close to each visitor, and only when a request arrives. It's serverless, like the functions from the hosting platforms lesson. Workers can also serve whole websites. The free plan includes 100,000 requests a day.
- **Pages:** hosts websites straight from your GitHub repository, with preview links, like Vercel and Netlify. Pages is still supported, but since 2025 Cloudflare recommends starting new projects on Workers, where its new features go.
- **R2:** stores files such as images, videos and backups, like AWS S3. Cloudflare doesn't charge for the data visitors download from it.

When your app runs on Workers, you don't need a separate origin server at all. Cloudflare is both the guard and the building.

---

## How it goes wrong

### Problem 1: "Redirected you too many times"

This is the classic Cloudflare problem. Your site worked. You turn on the orange cloud. Now every visitor sees an error saying the page "redirected you too many times" (in Chrome, `ERR_TOO_MANY_REDIRECTS`).

The cause is a setting called the **SSL/TLS encryption mode**. It decides how Cloudflare connects to your origin. There are two halves to every visit now: visitor → Cloudflare, and Cloudflare → your server.

| Mode | Visitor → Cloudflare | Cloudflare → your server |
|---|---|---|
| Flexible | HTTPS | plain HTTP |
| Full | HTTPS | HTTPS, but Cloudflare doesn't check the certificate |
| Full (strict) | HTTPS | HTTPS, and Cloudflare checks the certificate |

Now follow a visit in **Flexible** mode, when your server redirects all HTTP traffic to HTTPS (most servers and hosting platforms do):

```text
1. Visitor → Cloudflare:      GET https://example.com
2. Cloudflare → your server:  GET http://example.com    (Flexible = HTTP)
3. Your server → visitor:     "Redirect to https://example.com"
4. Visitor → Cloudflare:      GET https://example.com   (back to step 1)
```

Your server only ever sees HTTP, so it keeps saying "use HTTPS". The visitor keeps obeying. The browser gives up after many rounds.

**The fix:** set the mode to **Full (strict)**. Cloudflare then connects to your server over HTTPS, your server sees HTTPS, and it stops redirecting. Your server needs a valid certificate for this, which hosting platforms already have.

Flexible has a second problem. Visitors see a secure connection in the address bar, but half of the trip, from Cloudflare to your server, travels as a readable postcard. Cloudflare itself strongly recommends Full or Full (strict).

### Problem 2: Old files after an update

You deploy a new design. Some visitors see the new HTML with the old CSS, and the page looks broken. Cloudflare served its cached copy of `styles.css`, because the file name didn't change.

**Fixes:**
- Most build tools (Next.js, Vite and others) add a code to each file name that changes with every build, like `styles.3f8a1c.css`. A new name means a new cache entry. Check that yours does.
- In the Cloudflare dashboard, you can **purge** (empty) the cache. Purging everything at once sends every request to your server until the cache fills again. That's fine for a small site, but a big spike for a busy one.

### Problem 3: The back door is open

Cloudflare only protects traffic that passes through Cloudflare. If someone learns your origin's real IP address, they can send requests straight to it and skip the guard: no DDoS protection, no firewall.

Common ways the address leaks:
- old DNS records from before you joined Cloudflare, which history websites keep
- grey-cloud (DNS only) records that point to the same server
- emails sent from the same server

**Fixes:** set your server's firewall to accept web traffic only from Cloudflare's IP addresses (Cloudflare publishes the list at `cloudflare.com/ips`). Or use **Cloudflare Tunnel**, where your server makes an outgoing connection to Cloudflare and needs no public address at all. If your address leaked, move to a new one.

### Problem 4: Everyone has the same IP address

Your server's direct connection is now with Cloudflare, not with the visitor. Logs, rate limiters and anything else that looks at the visitor's IP address suddenly see Cloudflare's addresses. Cloudflare adds the real visitor address in a header called `CF-Connecting-IP`. Configure your app to read it, and only trust it on requests that really came from Cloudflare. Anyone can send that header to an open back door.

### Problem 5: Two guards in a row

You host on Vercel, and you also turn on Cloudflare's orange cloud in front of it. Now there are two CDNs and two caches, and Vercel sees Cloudflare's address instead of the visitor's. A common setup is to keep your DNS at Cloudflare but leave the record for your Vercel site grey (DNS only). If you do want both, read your platform's guide first.

### Problem 6: When Cloudflare goes down, you go down

That's the price of having one guard for every door. On 18 November 2025, most users couldn't log in to Cloudflare's dashboard, so many site owners couldn't even change their settings.

For most small apps, Cloudflare is far more reliable than anything you'd build yourself, so this is a good trade. But know it's a trade. Bookmark Cloudflare's status page (`cloudflarestatus.com`). When your site and many others break at once, check it before you start changing your own code.

---

## What good looks like

- Website records are **orange** (Proxied), unless your hosting platform recommends otherwise.
- SSL/TLS mode is **Full (strict)**, never Flexible.
- **Always Use HTTPS** is on, so Cloudflare sends HTTP visitors to HTTPS. Then let Cloudflare handle that redirect rather than your server.
- Your origin accepts web traffic **only from Cloudflare**, or uses Cloudflare Tunnel.
- Your app reads the visitor's IP from `CF-Connecting-IP`, and only for Cloudflare's requests.
- Your build gives changed files new names, and you know where the **Purge cache** button is.
- You treat the WAF as an extra layer, not as a replacement for fixing bugs in your code.

---

## Test your own site

**1. Is the guard on duty?** Go to `dns.google`, as in [How does your browser find one computer out of billions?](/lessons/ip-addresses-and-dns), and look up your domain. Compare the IP addresses with Cloudflare's list at `cloudflare.com/ips`. If they're in Cloudflare's ranges, the orange cloud is working. If you see your server's real address, it isn't.

**2. Read the guard's stamp.** Open your site in Chrome, open developer tools (F12 on Windows, Cmd+Option+I on Mac), click the **Network** tab and reload. Click the first row, then **Headers**. In the response headers, look for:

- `server: cloudflare`: the answer came through Cloudflare.
- `cf-ray`: Cloudflare's ID for this request. The three letters at the end name the data center that answered.
- `cf-cache-status` on images, CSS or JavaScript: `HIT` means Cloudflare answered from its cache. `MISS` means it had to ask your server. `DYNAMIC` means it wasn't allowed to cache this.

**3. Try the back door.** If you know your origin's IP address, try opening it directly in a browser, or ask your hosting provider how to test it. If your site loads without going through Cloudflare, Problem 3 applies to you.

**4. Check two settings.** In the Cloudflare dashboard, open **SSL/TLS** and check the encryption mode. Then check that **Always Use HTTPS** is on.

---

## Takeaways

**Key terms**
- **Reverse proxy:** a server that stands in front of yours and receives requests on its behalf
- **Origin server:** your real server, behind the proxy
- **Nameservers:** the DNS servers that hold the official records for your domain
- **Proxied (orange cloud):** traffic goes through Cloudflare; **DNS only (grey cloud):** it doesn't
- **DDoS attack:** a flood of fake traffic from many computers, meant to knock a site offline
- **WAF:** a firewall that blocks requests matching known attack patterns
- **SSL/TLS mode:** how Cloudflare connects to your origin: Flexible, Full or Full (strict)
- **Purge:** empty the cache so visitors get fresh copies

**Which step broke?**
- "Redirected you too many times" right after turning on the orange cloud → SSL/TLS mode is Flexible. Switch to Full (strict).
- New HTML, old styles → cached files. Check file names, then purge.
- Error page with Cloudflare's name on it, and other big sites are down too → check `cloudflarestatus.com`.
- Error page with Cloudflare's name, only your site → Cloudflare can't reach your origin. Check that your server is running and accepts Cloudflare's connections.
- Every visitor has the same IP → read `CF-Connecting-IP`.

**Ask your AI**
- *"My site is behind Cloudflare. Here are my SSL/TLS mode and my server's redirect settings: [paste]. Could they cause a redirect loop?"*
- *"Does my server accept connections from anyone, or only from Cloudflare? How do I limit it?"*
- *"Where does my app read the visitor's IP address, and is it correct behind Cloudflare?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**More SSL/TLS modes.** Besides Flexible, Full and Full (strict), there's **Off** (no HTTPS at all) and **Strict (SSL-Only Origin Pull)**, which always connects to your origin over HTTPS, even when the visitor used HTTP. Cloudflare also has an **Automatic SSL/TLS** option that picks the most secure mode your origin supports and never lowers it.

**Other redirect loops.** Flexible mode isn't the only cause. Loops also happen when your origin redirects HTTPS back to HTTP, when Always Use HTTPS fights an HTTP redirect on your server, or when two redirect rules send requests to each other.

**Origin certificates.** For Full (strict), your origin needs a certificate Cloudflare trusts. That can be a normal public certificate, such as one from Let's Encrypt, or a free **Origin CA certificate** from Cloudflare. Origin CA certificates are trusted only by Cloudflare, not by browsers, so they work only behind the orange cloud.

**One address, many places.** Cloudflare answers proxied records with **anycast** addresses: the same addresses are shared by its data centers, and the internet's routing delivers each visitor to a nearby one. That's how "the nearest Cloudflare data center" happens without any extra work from the visitor.

**Why the outage spread so widely.** The faulty file was a "feature file" for Cloudflare's Bot Management system, refreshed every few minutes and sent to every machine in the network. A database query started returning duplicate rows after the permissions change, which roughly doubled the file. The proxy software had a limit of 200 machine learning features (about 60 were in use) and failed when the limit was exceeded. Other affected services included Workers KV, Turnstile, Access and the dashboard login.

**What else is in the free plan.** Cloudflare's plans page also lists basic "Simple bots" protection. Limits and features change, so check the plans page.

**Workers limits, as of writing.** The Workers free plan includes 100,000 requests per day and 10 milliseconds of CPU time per request. Serving static files from Workers is free. R2's free tier includes 10 GB of storage per month, and data transfer out to the internet is free.

</details>

## References

- [Cloudflare outage on November 18, 2025](https://blog.cloudflare.com/18-november-2025-outage/): Cloudflare blog. The cause (a permissions change that doubled the Bot Management feature file), the 200-feature limit, the timeline, the dashboard login failure, "worst outage since 2019" and that it was not an attack.
- [Worldwide Cloudflare outage disrupts X, ChatGPT, PayPal, Uber, and other sites](https://www.pcworld.com/article/2976097/worldwide-cloudflare-outage-disrupts-x-chatgpt-paypal-uber-and-other-sites.html): PCWorld, 18 November 2025. Which well-known sites were affected.
- [The Cloudflare network](https://www.cloudflare.com/network/): Cloudflare. "1 in 5 sites on the Internet" and the number of cities with data centers.
- [Encryption modes](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/): Cloudflare docs. Off, Flexible, Full, Full (strict), Strict and Automatic SSL/TLS, and the recommendation to use Full or Full (strict).
- [ERR_TOO_MANY_REDIRECTS](https://developers.cloudflare.com/ssl/troubleshooting/too-many-redirects/): Cloudflare docs. Redirect loops caused by Flexible mode, Always Use HTTPS and conflicting redirect rules.
- [Cloudflare cache responses](https://developers.cloudflare.com/cache/concepts/cache-responses/): Cloudflare docs. The `cf-cache-status` values `HIT`, `MISS` and `DYNAMIC`, and that HTML and JSON aren't among the file types cached by default.
- [Protect your origin server](https://developers.cloudflare.com/fundamentals/security/protect-your-origin-server/): Cloudflare docs. How origin IP addresses leak (old DNS records, DNS-only records, email), allowing only Cloudflare's IPs, and Cloudflare Tunnel.
- [Cloudflare HTTP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/): Cloudflare docs. `CF-Connecting-IP` carries the visitor's IP to your origin, and `CF-Ray` names the data center.
- [Pricing](https://www.cloudflare.com/plans/): Cloudflare. What the Free plan includes: DNS, CDN, Universal SSL, unmetered DDoS protection, the WAF with the Free Managed Ruleset, and "Simple bots" protection; the Workers free tier (100,000 requests a day, 10 ms CPU) and R2's free tier (10 GB) with no egress fees.
- [Proxy status](https://developers.cloudflare.com/dns/proxy-status/): Cloudflare docs. Proxied records return Cloudflare anycast IPs, only `A`, `AAAA` and `CNAME` records can be proxied, and email records stay DNS only.
- [Cloudflare origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/): Cloudflare docs. Origin CA certificates only protect the connection between Cloudflare and your server; visitors see certificate errors if traffic stops going through Cloudflare.
- [Your frontend, backend, and database — now in one Cloudflare Worker](https://blog.cloudflare.com/full-stack-development-on-cloudflare-workers/): Cloudflare blog, April 2025. New projects should start with Workers; Pages stays supported, but new feature work goes to Workers; static assets are served for free.
