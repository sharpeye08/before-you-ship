---
title: "How does your browser find one computer out of billions?"
slug: ip-addresses-and-dns
order: 2
level: 1
levelName: Foundations
concepts: [URL, Domain name, IP address, DNS]
readTime: 11 min
quiz:
  - question: "In the web address https://www.example.com/games, which part is the domain name?"
    options:
      - text: "https://"
      - text: "www.example.com"
        correct: true
      - text: "/games"
      - text: "The whole thing"
    explanation: "The domain name is the website's name: www.example.com. The https:// part says which rules to use for talking, and /games is the path: which page you want on that website."

  - question: "Why does your browser need DNS before it can open a website?"
    options:
      - text: "Computers find each other using IP addresses, so the browser must turn the name into a number first"
        correct: true
      - text: "DNS downloads the website's pictures"
      - text: "DNS checks that your password is correct"
      - text: "DNS makes the website load faster by making it smaller"
    explanation: "People use names, but computers use numbers called IP addresses. DNS works like a contacts app: you give it a name, and it gives you back the number."

  - question: "You type youtube.com, then open it again a minute later. What usually happens the second time?"
    options:
      - text: "Your browser asks DNS servers all over the world again"
      - text: "The website has to be downloaded from scratch with a new name"
      - text: "Your browser or computer still remembers the IP address from last time, so it skips most of the lookup"
        correct: true
      - text: "DNS is not needed after the first visit, ever again"
    explanation: "Your browser and computer keep a cache: a short-term memory of recent DNS answers. Each answer has a timer called a TTL. Until the timer runs out, the remembered answer is used."

  - question: "A website owner changes the IP address in their DNS record. Some people still reach the old server for a while. Why?"
    options:
      - text: "DNS records can never be changed"
      - text: "Those people typed the name wrong"
      - text: "The new server is switched off"
      - text: "Their computers, or DNS servers along the way, still remember the old answer until its TTL timer runs out"
        correct: true
    explanation: "DNS answers are cached in many places. A change only reaches everyone after the old remembered answers expire. That's why DNS changes can take minutes or hours to show up everywhere."

  - question: "You look up a made-up name on dns.google and get \"Status\": 3 with no \"Answer\". What does it mean?"
    options:
      - text: "The website's server is broken"
      - text: "DNS says that name does not exist, so there is no IP address for it"
        correct: true
      - text: "The page at that address was deleted"
      - text: "Your internet connection is off"
    explanation: "Status 3 is the DNS answer called NXDOMAIN, short for \"non-existent domain\". The website's server was never contacted, because there was no address to contact."

  - question: "Which of these is a real-looking IP address?"
    options:
      - text: "www.example.com"
      - text: "https://example.com/home"
      - text: "203.0.113.10"
        correct: true
      - text: "example@mail.com"
    explanation: "An IP address like this one is four numbers from 0 to 255, separated by dots. The other options are a domain name, a full URL and an email address."
---

# How does your browser find one computer out of billions?

> **Before you start**
> This lesson uses a few words from [You pressed Enter. What happened in the next second?](/lessons/what-happens-when-you-open-a-website):
> - **Server:** a computer that waits for requests and answers them.
> - **Client:** the device doing the asking, like your phone or laptop.
> - **Browser:** the app you use to open websites, like Chrome or Safari.
> - **Request:** a message your browser sends to a server, asking for something.

## One computer out of billions

You type `youtube.com` and press Enter. About a second later, videos appear.

In the last lesson, you learned that the page comes from a server. But billions of devices are connected to the internet. How does your browser find the one right computer so fast?

Think about sending a birthday card by post. Writing "To Grandma" on the envelope isn't enough. The post office needs her full address: street, house number, city. Without it, the card goes nowhere.

The internet works the same way. A request needs an exact address, or it can't be delivered.

The last lesson said your browser looks up the address in "the internet's address book". This lesson opens that book.

> **In short:** before your browser can ask a server for anything, it has to find that server's exact address.

---

## What's inside a web address

Let's look closely at a web address:

```text
https://www.example.com/games
```

A full web address like this is called a **URL**. It has three main parts:

| Part | In our example | What it means |
|------|----------------|---------------|
| Start | `https://` | Which rules the browser should use to talk to the server. The next lesson covers these rules. |
| Name | `www.example.com` | The name of the website. |
| Path | `/games` | Which page you want on that website. |

The last part is called the **path**. It works like a room number inside a building. The name gets you to the building. The path gets you to the right room.

If a URL has no path, like `https://www.example.com`, you get the website's main page.

> **Go deeper:** [What the padlock icon really protects, and what it doesn't](/lessons/https-and-certificates) (Level 2) explains what the "s" in `https` does.

> **In short:** a URL is a full web address. It says which rules to use, which website, and which page on that website (the path).

---

## Domain names: names for people

The middle part of the URL, `www.example.com`, is called the **domain name**. It's the website's name, made for people to read and remember.

A domain name is made of parts separated by dots. Read it from right to left, from the biggest part to the smallest:

```text
 www . example . com
  ▲       ▲       ▲
  │       │       └── the ending
  │       └────────── the main name
  └────────────────── an extra part added by the owner
```

The ending on the right is called the **top-level domain**. Some you've probably seen:

- `.com`, `.org` and `.net`, used all over the world
- Country endings, like `.in` for India, `.uk` for the United Kingdom and `.jp` for Japan

The main name sits right before the ending, like `example` or `youtube`. Website owners rent their main name for one or more years at a time, and pay again to keep it.

The owner can then add extra parts on the left. That's how `en.wikipedia.org` and `de.wikipedia.org` can be different parts of the same website.

> **In short:** a domain name is a website's name for people, like `example.com`. Read it from right to left. The ending on the right is the top-level domain.

---

## IP addresses: numbers for computers

Here's the surprise. Computers don't use domain names to find each other. They use numbers.

Every server on the internet has a number that works as its address. It's called an **IP address**. ("IP" stands for Internet Protocol, the rules for sending messages across the internet.)

An IP address looks like this:

```text
203.0.113.10
```

That's four numbers separated by dots. Each number is between 0 and 255. This style gives about 4.3 billion different addresses.

That sounds like a lot. But the world has more phones, laptops, game consoles and servers than that. So there is also a newer, much longer style of IP address. It looks like this:

```text
2001:db8::10
```

You'll see both styles. They do the same job.

The addresses above are special: they're reserved for examples in lessons and guides, so they never belong to a real computer. Real ones look the same, with different numbers.

**Where the "home address" idea stops working:** a big website like YouTube doesn't live in one house. It has many servers, so its name can lead to many IP addresses. And the opposite happens too: one server can hold many small websites at the same IP address.

> **In short:** computers find each other using numbers called IP addresses, like `203.0.113.10`. Domain names are for people. IP addresses are for computers.

---

## DNS: the internet's contacts app

So your browser has a name, `www.example.com`, but needs a number. How does it get one?

It asks a system called **DNS**, short for **Domain Name System**.

DNS works like the contacts app on your phone. You don't remember your friends' phone numbers. You tap a name, and the phone finds the number for you. Nobody remembers IP addresses either. DNS finds them for you.

Here's what happens when you type `www.example.com`:

```text
 Your browser                              DNS server
┌────────────┐  "What's the IP address    ┌────────────┐
│            │   of www.example.com?" ───▶│            │
│            │                            │            │
│            │◀─── "It's 203.0.113.10" ───│            │
└────────────┘                            └────────────┘
       │
       ▼
 Now the browser can send its request to 203.0.113.10
```

The computers that answer these questions are called **DNS servers**. Answering "what's the number for this name?" is their whole job. Your internet company usually runs one for you. There are also free public ones, run by companies such as Google and Cloudflare.

**Where the contacts comparison stops working:** your contacts app lives on your phone, and you typed the numbers in yourself. DNS is shared by the whole world. Millions of DNS servers work together, and no single one knows every answer. If a DNS server doesn't know an answer, it asks other DNS servers until it finds the one in charge of that name.

> **In short:** DNS turns domain names into IP addresses, like a contacts app for the internet. The computers that answer these questions are called DNS servers.

---

## Who writes the entries?

In your contacts app, you add each entry yourself. In DNS, each website's owner adds the entries for their own name.

An entry in DNS is called a **DNS record**. A simple one says:

```text
www.example.com  →  203.0.113.10
```

That means: "If anyone asks for `www.example.com`, send them to `203.0.113.10`."

Owners manage their records on the website of the company where they rent their domain name.

One day you may build an app and give it its own name. Connecting that name to your app means adding DNS records like this one. If a record is missing, or points to the wrong number, people can't reach your app, even if your app works perfectly.

> **In short:** a DNS record is an entry that connects a name to an address. The owner of the domain name creates and changes these records.

---

## Remembering answers

Asking DNS servers every single time would be slow. And the answer rarely changes between visits.

So your browser and your computer remember recent answers for a while. Keeping a copy of an answer to reuse later is called a **cache**. ("Cache" is pronounced like "cash".)

The next time you open the same site, the answer comes from the cache. No question needs to travel anywhere.

But an answer can't be remembered forever. What if the owner moves the website to a new server with a new IP address? So every DNS answer comes with a timer. It says how many seconds the answer may be remembered. This timer is called the **TTL**, short for "time to live".

When the timer runs out, the remembered answer is thrown away. The next visit asks DNS again and gets a fresh answer.

This has one side effect. When an owner changes a DNS record, some people still have the old answer remembered. They keep using it until their timer runs out. That's why DNS changes can take minutes, or even hours, to reach everyone.

> **In short:** your browser and computer keep a cache of recent DNS answers to save time. Each answer has a TTL timer. Until it runs out, an old answer can still be used.

---

## How it goes wrong

Every part of this lesson can break. When it does, the browser never even reaches a server.

**A typo in the name.** You type `youtub.com` instead of `youtube.com`. DNS either has no answer for that name, or the name belongs to a completely different website. Always check the spelling first.

**The name has no records.** The name exists, but nobody added a record pointing to a server. DNS has no number to give back, so the browser shows an error such as "This site can't be reached".

**The record points to the wrong number.** Maybe someone typed `203.0.113.11` instead of `203.0.113.10`. Now the browser reaches the wrong computer, or no computer at all.

**The record changed, but the old answer is still remembered.** You fixed a record five minutes ago. It works on your friend's phone, but not on your laptop. Your laptop is still using the old answer from its cache.

All of these have one thing in common: **the problem isn't in any code.** It's in the name or its DNS records. Rewriting the app won't fix it.

> **Go deeper:** ["This site can't be reached": what broke, and where?](/lessons/website-errors) (Level 1) shows the exact error messages for these problems.

> **In short:** DNS problems happen before your browser reaches any server. Typos, missing records, wrong numbers and old remembered answers are the usual causes.

---

## What good looks like

When a website can't be found, a good detective checks the name before anything else:

1. **Check the spelling.** Look at every letter in the domain name.
2. **Ask DNS directly.** Use a lookup tool (you'll try one below). Does the name have an answer? Is it the IP address you expected?
3. **Check the records.** If the name belongs to your app, look at its DNS records where you manage the domain.
4. **Give it time.** If you changed a record recently, old answers may still be remembered. Try again later, or from another device, like your phone on mobile data instead of Wi-Fi.

When you ask an AI for help, say which step is failing. *"DNS can't find my domain"* tells it to look at DNS records, not to rewrite your code.

> **In short:** for "can't find the website" problems, check the spelling, ask DNS directly, check the records, and remember that changes take time.

---

## Try it yourself

### Experiment 1: Ask DNS a question

Google runs a free DNS service with a website where you can ask questions yourself.

1. Go to `dns.google`.
2. Type `example.com` into the box and press Enter.
3. Look at the result. Find the lines called `"data"`.

Each `"data"` line is an IP address that DNS gave back for `example.com`. You might see more than one. That's the "one name, many servers" idea from earlier.

Next to each one, find `"TTL"`. That's the timer: how many seconds this answer may be remembered.

### Experiment 2: Ask about a name that doesn't exist

1. On `dns.google`, look up a made-up name, like `my-cat-club.invalid`. (Names ending in `.invalid` are reserved so they can never exist.)
2. Look at the result.

You'll see `"Status": 3` and no `"Answer"` section. Status 3 is DNS saying "that name doesn't exist". Its official name is **NXDOMAIN**, short for "non-existent domain". Remember this word. You'll meet it again in the lesson on errors.

### Experiment 3: Find a website's IP address in your browser

You need a laptop or desktop computer with Chrome for this one.

1. Open any website.
2. Open developer tools: press **F12** on Windows, or **Cmd+Option+I** on Mac.
3. Click the **Network** tab, then reload the page.
4. Click the first row in the list. Then click the **Headers** tab.
5. In the **General** section, find **Remote address**.

That's the IP address your browser connected to. DNS found it a moment before the page loaded.

---

## Takeaways

**Key terms**
- **URL:** a full web address, like `https://www.example.com/games`
- **Path:** the part of a URL that says which page you want, like `/games`
- **Domain name:** a website's name for people, like `example.com`
- **Top-level domain:** the ending of a domain name, like `.com` or `.in`
- **IP address:** the number computers use to find each other, like `203.0.113.10`
- **DNS:** the system that turns domain names into IP addresses
- **DNS server:** a computer whose job is answering DNS questions
- **DNS record:** an entry that connects a name to an address
- **Cache:** a remembered copy of an answer, kept to save time
- **TTL:** how long a DNS answer may be remembered

**Which part broke?**
- The name is spelled wrong → fix the spelling
- DNS says the name doesn't exist (NXDOMAIN) → the name has no records, or was never set up
- DNS gives back the wrong IP address → the record points to the wrong place
- It works on one device but not another, right after a change → an old answer is still cached. Wait, or test from another device.

**Ask your AI**
- *"Explain step by step what happens when my browser looks up a domain name, in simple words."*
- *"I looked up [your domain] on dns.google and got [paste the result]. What does this tell me?"*
- *"I changed a DNS record [how long] ago, and some devices still show the old site. Why, and how long might it take?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**IPv4 and IPv6.** The two styles of IP address have names. The short style, like `203.0.113.10`, is **IPv4**. It uses 32 bits, which allows 2³², or about 4.3 billion, addresses. The long style, like `2001:db8::10`, is **IPv6**. It uses 128 bits, written as groups of hexadecimal digits separated by colons. `::` is a shortcut for a run of zero groups.

**Example addresses.** `203.0.113.0/24` is one of three IPv4 ranges reserved for documentation (RFC 5737). `2001:db8::/32` is reserved for documentation in IPv6 (RFC 3849). Names ending in `.example`, `.test` and `.invalid` are reserved too (RFC 2606, RFC 6761), and `example.com` is set aside for examples.

**Your home network.** Devices at home usually have private addresses, such as `192.168.1.20`, that only work inside your home network (RFC 1918). Your router has one public IP address and shares it with all your devices, translating between private and public addresses. This sharing is called **NAT** (network address translation). It's one reason the world didn't run out of IPv4 addresses sooner.

**localhost.** The name `localhost` always means "this same computer". It points to the special address `127.0.0.1` (or `::1` in IPv6). You'll use it when you run apps on your own laptop.

**The full lookup.** If no cache has the answer, your computer asks a **recursive resolver**: a DNS server run by your internet company, or a public one such as Cloudflare's `1.1.1.1` or Google's `8.8.8.8`. If the resolver doesn't have the answer cached either, it asks, in order:
1. A **root server**, which says where to find the servers for `.com`
2. A **TLD server** for `.com`, which says which servers are in charge of `example.com`
3. The **authoritative nameserver** for `example.com`, which gives the final answer

**Common record types.**
- **A record:** name → IPv4 address
- **AAAA record:** name → IPv6 address
- **CNAME record:** name → another name (for example, `www.example.com` → `example.com`)

**Ports.** One server can run many programs. A connection also needs a **port** number to say which program it's for. HTTPS uses port 443 by default, and plain HTTP uses port 80, so you rarely see ports in web addresses. On your laptop you'll see them often, as in `localhost:3000`.

</details>

## References

- [What is a domain name?](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_domain_name): MDN Web Docs. How domain names are built, read from right to left, and rented for one or more years.
- [What is DNS?](https://aws.amazon.com/route53/what-is-dns/): Amazon Web Services. How a lookup goes from a resolver to root, TLD and authoritative servers, and how answers are cached for their TTL.
- [RFC 1035: Domain Names, Implementation and Specification](https://www.rfc-editor.org/rfc/rfc1035.html): IETF. DNS records, the TTL field, and response code 3 ("Name Error").
- [RFC 2308: Negative Caching of DNS Queries](https://www.rfc-editor.org/rfc/rfc2308.html): IETF. NXDOMAIN is the name for the "Name Error" response: the name doesn't exist.
- [RFC 5737: IPv4 Address Blocks Reserved for Documentation](https://www.rfc-editor.org/rfc/rfc5737.html): IETF. `203.0.113.0/24` is reserved for examples.
- [RFC 3849: IPv6 Address Prefix Reserved for Documentation](https://www.rfc-editor.org/rfc/rfc3849.html): IETF. `2001:db8::/32` is reserved for examples.
- [RFC 6761: Special-Use Domain Names](https://www.rfc-editor.org/rfc/rfc6761.html): IETF. Names ending in `.example` and `.invalid` are reserved, and `localhost` points to the loopback address.
- [RFC 1918: Address Allocation for Private Internets](https://www.rfc-editor.org/rfc/rfc1918.html): IETF. Private address ranges such as `192.168.0.0/16` used inside home networks.
- [JSON API for DNS over HTTPS (DoH)](https://developers.google.com/speed/public-dns/docs/doh/json): Google for Developers. The `Status`, `Answer`, `TTL` and `data` fields you see on `dns.google`.
- [Get Started, Public DNS](https://developers.google.com/speed/public-dns/docs/using): Google for Developers. Google's free public DNS servers at `8.8.8.8`.
- [1.1.1.1 (DNS Resolver)](https://developers.cloudflare.com/1.1.1.1/): Cloudflare. Cloudflare's free public DNS resolver at `1.1.1.1`.
- [RequestHeadersView.ts](https://chromium.googlesource.com/devtools/devtools-frontend/+/refs/heads/main/front_end/panels/network/RequestHeadersView.ts): Chrome DevTools source code. The "Remote address" label in the General section of the Headers tab.
