---
title: "You pressed Enter. What happened in the next second?"
slug: what-happens-when-you-open-a-website
order: 1
level: 1
levelName: Foundations
concepts: [Network, Internet, Server, Client, Browser, Request, Response]
readTime: 11 min
quiz:
  - question: "Before you open YouTube, where is the YouTube home page stored?"
    options:
      - text: "Inside your phone or laptop, all the time"
      - text: "On YouTube's servers, far away from you"
        correct: true
      - text: "Inside your Wi-Fi router"
      - text: "Nowhere. The browser makes it up."
    explanation: "Websites live on other computers called servers. Your device asks for the page when you open it, and the server sends it to you."

  - question: "What is a server?"
    options:
      - text: "A computer that waits for requests and answers them"
        correct: true
      - text: "A special cable that connects countries"
      - text: "The app you use to open websites"
      - text: "A person who fixes websites"
    explanation: "A server is a computer whose job is to wait for requests and send back answers. Servers are usually kept in big buildings called data centers."

  - question: "What does your browser (like Chrome or Safari) do?"
    options:
      - text: "Stores every website in the world"
      - text: "Connects your house to the internet"
      - text: "Sends requests to servers and turns their answers into pages you can see"
        correct: true
      - text: "Turns Wi-Fi on and off"
    explanation: "The browser is your messenger. It sends your request, receives the server's response, and shows the result on your screen."

  - question: "You tap \"like\" on a video. What happens?"
    options:
      - text: "Nothing leaves your device. The like is only saved on your phone."
      - text: "The video's creator gets a text message from your phone"
      - text: "Your phone restarts the app"
      - text: "Your device sends a request to the server, and the server saves the like and sends back a response"
        correct: true
    explanation: "Almost everything you do online is a request and a response. A like is a request that says \"save this like\". The server saves it and answers \"done\"."

  - question: "You turn off Wi-Fi and mobile data, then reload a web page. Why doesn't it load?"
    options:
      - text: "The website was deleted"
      - text: "Your device can't send the request, so it can't reach the server"
        correct: true
      - text: "The server is broken"
      - text: "Your browser forgot the website's name"
    explanation: "Without a connection to the internet, your request never leaves your device. The server never hears from you, so nothing comes back."

  - question: "You open a page and see \"404 Not Found\". What does it tell you?"
    options:
      - text: "Your internet is off"
      - text: "The server could not be found"
      - text: "The server got your request and answered, but it doesn't have that page"
        correct: true
      - text: "Your device is too old"
    explanation: "To send you a 404, the server had to receive your request and reply. Its reply was: \"I don't have that page\". So the journey worked, but the page doesn't exist at that address."
---

# You pressed Enter. What happened in the next second?

> **Before you start**
> Nothing. This is the very first lesson. If you've ever watched a video on YouTube, you're ready.

## One second, a lot of work

Open YouTube. Within about a second, you see a page full of videos.

But here's a question most people never ask: **where was that page before you opened it?**

It wasn't inside your phone or laptop. You didn't download it earlier. A second ago, it was somewhere else, maybe in another country. Then it traveled to you.

This lesson explains that trip, in simple steps. It matters because one day you'll build your own website or app, maybe with an AI helping you. When something goes wrong, the error messages will talk about this trip: *"server not found"*, *"request failed"*, *"404"*. Don't worry if those mean nothing to you yet. By the end of this lesson, they'll start to make sense.

This lesson gives you the big picture. The next four lessons zoom in on each part.

---

## Computers can talk to each other

Let's start with something you already use: Wi-Fi.

At home, your phone, laptop and maybe your TV all connect to the same Wi-Fi. Because they're connected, they can send messages to each other. That's how you can send a video from your phone to the TV.

When devices are connected so they can send messages to each other, that's called a **network**. (A **device** is any phone, laptop, tablet or computer.)

Your home Wi-Fi comes from a small box, usually with blinking lights. That box is called a **router**. It connects all your home devices together.

But your router does one more thing. It connects your home network to your internet company's network. That network connects to other networks, which connect to more networks, all around the world.

That giant network of networks is the **internet**. Billions of devices are connected to it. Any one of them can send a message to any other, as long as it knows where to send it.

> **In short:** a network is devices connected so they can send messages. The internet is a huge network of networks that connects the whole world.

---

## Websites live on other computers

So where is YouTube?

YouTube's pages and videos are stored on computers owned by YouTube. Those computers are kept in huge buildings full of computers, called **data centers**. Big websites have data centers in many countries.

These computers are different from your laptop. They usually have no screen and no keyboard, and nobody sits in front of them. They have one job:

**Wait for someone to ask for something. Then send it.**

A computer that does this job is called a **server**. It *serves* things to others, like a waiter serves food.

Think of a shop counter. You walk up and ask, "Can I have a bottle of water?" The shopkeeper gets it and hands it to you. You're the one asking. The shopkeeper is the one who serves. On the internet, the server is the shopkeeper.

The device doing the asking (your phone or laptop) is called the **client**. Clients ask. Servers answer.

> **In short:** websites are stored on servers, which are computers in data centers. Your device is the client. Clients ask, and servers answer.

---

## The browser: your messenger

You don't talk to servers yourself. An app does it for you: your **browser**.

A browser is the app you use to open websites. Chrome, Safari, Firefox and Edge are all browsers.

The browser has three jobs:

1. **Ask:** send your message to the right server.
2. **Receive:** get the server's answer.
3. **Show:** turn that answer into a page you can see, with text, pictures and buttons.

The answer the server sends isn't a picture of a page. It's more like a set of instructions: *"put this title at the top, this video here, this button there."* The browser reads the instructions and builds the page on your screen.

> **Go deeper:** [Take a web page apart and see what's inside](/lessons/what-a-web-page-is-made-of) (Level 1) shows what these instructions look like.

> **In short:** the browser sends your questions to servers, receives their answers, and builds the page you see.

---

## Asking and answering

Every conversation between your browser and a server follows the same pattern.

1. Your browser sends a message that asks for something. This message is called a **request**.
2. The server sends back a message with its answer. This is called a **response**.

For example:

| | Message |
|---|---|
| **Request** (from your browser) | "Please send me YouTube's home page." |
| **Response** (from the server) | "Here it is." *(plus the page)* |

Or sometimes:

| | Message |
|---|---|
| **Request** | "Please send me the page called *secret-page*." |
| **Response** | "Sorry, I don't have a page with that name." |

This ask-and-answer pattern is the heart of the web. Almost everything you do online works this way:

- **Watching a video:** a request for the video, a response with the video.
- **Liking a post:** a request that says "save this like", a response that says "done".
- **Sending a message in a group chat:** a request that says "deliver this", a response that says "delivered".

> **In short:** your browser sends a request, and the server sends back a response. Almost everything online is requests and responses.

---

## The whole trip, step by step

Now let's put it all together. Here's what happens when you type `youtube.com` into your browser and press Enter:

```
 YOU                                                   YOUTUBE
┌────────────┐                                     ┌────────────┐
│  Browser   │ ── 1. Request: "send me the page" ─▶│   Server   │
│ (client)   │                                     │            │
│            │ ◀── 2. Response: "here it is" ───── │            │
└────────────┘                                     └────────────┘
       │
       ▼
 3. Browser builds the page on your screen
```

In a bit more detail:

**Step 1: You type the address.** `youtube.com` is the website's address. A web address is called a **URL**.

**Step 2: The browser finds the right server.** There are millions of servers on the internet. Your browser has to find out which one has YouTube. It looks this up using the internet's address book, called **DNS**.

> **Go deeper:** [How does your browser find one computer out of billions?](/lessons/ip-addresses-and-dns) (Level 1) explains how DNS works.

**Step 3: The browser sends a request.** "Please send me the home page."

**Step 4: The server sends a response.** "Here it is", along with the instructions for building the page.

**Step 5: The browser builds the page.** It reads the instructions and shows you the videos.

One surprise: a page usually needs many separate requests. One for the page itself. Then one for each picture and each video thumbnail. Then more for the files that describe the page's design, like its colors and fonts. A typical web page needs around 70 requests. Your browser sends them all very fast, so it feels like one.

> **In short:** you type an address, the browser finds the server, sends a request, gets a response, and builds the page. Usually many times over for one page.

---

## When the trip goes wrong

Each step of the trip can go wrong in its own way. The error message tells you which step broke. Here are two you've probably seen:

**"No internet"** (in Chrome, it comes with a little dinosaur game)
The trip failed at the very start. Your device isn't connected to the internet, so your request never left your device. The server never even heard from you.

**"404 Not Found"**
This one is different. The request *did* reach the server, and the server *did* answer. Its answer was: *"I don't have a page at that address."* The trip worked. The page doesn't exist, maybe because of a typo in the address.

See the difference? In the first case, nothing reached the server. In the second, the server got your request and replied with an error. These need different fixes.

When you build your own app, you'll see more errors like these. If you can say *which step* broke, you can fix it much faster. And if you're building with an AI, you can tell it exactly what's wrong instead of "it doesn't work".

> **Go deeper:** ["This site can't be reached": what broke, and where?](/lessons/website-errors) (Level 1) goes through the common errors one by one.

> **In short:** each step fails in its own way. If nothing reached the server, it's a connection problem. If the server answered with an error, the problem is on the server's side.

---

## Try it yourself

### Experiment 1: Break the trip

1. Open any website.
2. Turn off Wi-Fi and mobile data.
3. Reload the page.

You'll see an error, because your request can't leave your device. Turn your connection back on and reload. The trip works again.

### Experiment 2: Watch the requests

You need a laptop or desktop computer with Chrome for this one.

Every browser has hidden panels called **developer tools**. They show what the browser is doing behind the scenes.

1. Open any website, like `wikipedia.org`.
2. Open developer tools: press **F12** on Windows, or **Cmd+Option+I** on Mac.
3. Click the **Network** tab at the top of the panel.
4. Reload the page.

Watch the list fill up. **Every row is one request** your browser sent. At the bottom, you can see how many requests the page needed in total. That's how many times your browser asked and a server answered to show you one page.

Don't worry about the other columns yet. [Take a web page apart and see what's inside](/lessons/what-a-web-page-is-made-of) explains them.

---

## Takeaways

**Key terms**
- **Network:** devices connected so they can send messages to each other
- **Internet:** a giant network of networks connecting the whole world
- **Server:** a computer that waits for requests and answers them
- **Data center:** a building full of servers
- **Client:** the device doing the asking, like your phone or laptop
- **Browser:** the app that sends requests and shows you the answers as pages
- **Request:** a message asking a server for something
- **Response:** the server's answer

**The trip in one line**
You type an address → the browser finds the server → sends a request → gets a response → builds the page.

**Ask your AI**
Try these with any AI chat tool to practice:
- *"Explain what happens step by step when I open youtube.com, in simple words."*
- *"I see this error: [paste it]. Did my request reach the server, or did it fail before that?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for curious readers)</summary>

**Messages travel in small pieces.** Big messages, like a video, aren't sent in one go. They're cut into many small pieces called **packets**. Each packet travels across the internet on its own, possibly by a different route, and your device puts them back together in the right order.

**The internet has cables under the sea.** Wi-Fi only covers the last few meters to your device. Most of the internet runs through cables, and most data between continents travels through cables laid on the ocean floor.

**Big websites keep copies close to you.** Popular websites store copies of their pages and videos on servers in many countries. When you open them, you usually get the copy from a server near you, which is faster than one on the other side of the world.

**Any computer can be a server.** A server isn't a special kind of machine. It's any computer running a program that answers requests. When you build an app, your own laptop will act as a server while you test it. [It works on my laptop. Why can't my friend open it?](/lessons/localhost-vs-production) explains this.

</details>

## References

- [Page Weight, Web Almanac 2024](https://almanac.httparchive.org/en/2024/page-weight): HTTP Archive. The median page makes 71 requests on desktop and 66 on mobile.
- [How the web works](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works): MDN Web Docs. Clients and servers, DNS as an address book, requests and responses, and data sent in packets.
- [404 Not Found](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/404): MDN Web Docs. What a 404 response means: the server was reached but has nothing at that address.
- [error_page_strings.grdp](https://chromium.googlesource.com/chromium/src/+/main/components/error_page_strings.grdp): Chromium source code. Chrome's "No internet" error page and its dinosaur game.
- [Open Chrome DevTools](https://developer.chrome.com/docs/devtools/open): Chrome for Developers. The F12 and Cmd+Option+I shortcuts.
- [Inspect network activity](https://developer.chrome.com/docs/devtools/network): Chrome for Developers. Using the Network panel to see every request a page makes.
- [Submarine Cable FAQs](https://www2.telegeography.com/submarine-cable-faqs-frequently-asked-questions): TeleGeography. Satellites carry only a very small share of international data, and cables carry far more data than satellites.
- [CDN](https://developer.mozilla.org/en-US/docs/Glossary/CDN): MDN Web Docs. Big websites keep copies of their data on servers in many places and answer from the one closest to you.
