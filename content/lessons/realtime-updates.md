---
title: "How chat apps update without you refreshing"
slug: realtime-updates
order: 57
level: 4
levelName: Reliability & scale
concepts: [Polling, Long polling, Server-Sent Events, WebSockets, Managed realtime services, Reconnecting]
readTime: 14 min
quiz:
  - question: "In normal HTTP, why can't your server send a new chat message to a browser on its own?"
    options:
      - text: "Because servers are too slow"
      - text: "Because the browser always speaks first: the server can only answer a request"
        correct: true
      - text: "Because chat messages are too large"
      - text: "Because HTTPS blocks it"
    explanation: "HTTP is a request-and-response conversation started by the browser. To get updates, the browser must keep asking (polling), keep a response open (Server-Sent Events), or switch to a two-way connection (WebSockets)."
  - question: "Your page asks the server \"anything new?\" every 3 seconds. 1,000 people leave it open all day. Roughly how many requests is that per day?"
    options:
      - text: "About 1,000"
      - text: "About 333"
      - text: "About 86,400"
      - text: "About 29 million"
        correct: true
    explanation: "1,000 tabs ÷ 3 seconds ≈ 333 requests per second. A day has 86,400 seconds, so that's about 28.8 million requests, and almost all of them answer \"nothing new\"."
  - question: "Your app streams an AI model's answer to the browser, word by word. The browser doesn't need to send anything while it streams. Which tool fits best?"
    options:
      - text: "Server-Sent Events"
        correct: true
      - text: "Polling every 100 milliseconds"
      - text: "Refreshing the page"
      - text: "A WebSocket, because it is always better"
    explanation: "Server-Sent Events are built for one-way streams from server to browser over normal HTTP. AI APIs commonly stream their answers this way. A WebSocket would work but adds complexity you don't need."
  - question: "Your chat app uses WebSockets on serverless functions. Mia's connection is handled by one function instance and Leo's by another. The code sends each new message to all connections it keeps in memory. What happens when Mia sends a message?"
    options:
      - text: "Leo gets it instantly"
      - text: "Leo gets it twice"
      - text: "Leo may never get it, because the other instance's memory doesn't know about his connection"
        correct: true
      - text: "The message is saved twice in the database"
    explanation: "Each instance only knows its own connections. Messages must go through something all instances share, such as Redis or a managed realtime service."
  - question: "Leo's laptop sleeps for 10 minutes. When it wakes, the WebSocket reconnects. What should your app do so he doesn't miss messages?"
    options:
      - text: "Nothing, WebSockets never lose messages"
      - text: "Ask the user to refresh the page"
      - text: "Send the whole chat history again to every user"
      - text: "After reconnecting, load the messages saved in the database since the last one Leo saw"
        correct: true
    explanation: "Messages sent while a connection is down are not delivered to it. The database is the source of truth: on reconnect, catch up from it, then keep listening."
  - question: "Your page shows the status of a video conversion that takes about two minutes. What is the simplest good option?"
    options:
      - text: "Build a WebSocket server"
      - text: "Poll the status every few seconds, and stop when it's done"
        correct: true
      - text: "Ask the user to refresh every few seconds"
      - text: "Keep the upload request open for two minutes"
    explanation: "For one slow-changing value that only matters for a short time, polling every few seconds is simple and cheap. Realtime connections are worth it when updates are frequent or must be instant."
---

# How chat apps update without you refreshing

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Request and response:** the browser asks a server for something, and the server answers. *([Every website is a conversation. Here's how it goes](/lessons/http-requests-and-responses))*
> - **Serverless function:** backend code the hosting platform starts when a request arrives. Each one has a maximum duration. *([Sign-up takes 10 seconds because of one email](/lessons/background-jobs))*
> - **Background job:** slow work done outside the user's request, with a status like `processing` or `done`. *([Sign-up takes 10 seconds because of one email](/lessons/background-jobs))*
> - **Authorization:** checking that the logged-in user is allowed to see or change this data. *([Change one number in the URL, see everyone's invoices](/lessons/logged-in-doesnt-mean-allowed))*

## The message that only appears after a refresh

You build a group chat for your study group with AI. It works. Messages are saved in the database, and the page shows them.

Then you try it with a friend. Mia types "Who has the notes?" and presses Enter. On Leo's screen, nothing happens. He waits. Still nothing. He refreshes the page, and there it is.

Real chat apps don't work like that. A message appears on your friend's screen within a second, without anyone refreshing. How?

The problem is the way the web talks. In HTTP, **the browser always speaks first**. It sends a request, and the server answers. The server can't start a conversation. It has no way to call Leo's browser and say "Mia just wrote something".

This lesson shows the four ways around that rule, what each one costs, and why "add WebSockets" is harder on serverless platforms than the AI makes it sound.

---

## The mental model: four ways to hear about something new

Imagine you're waiting for a parcel.

1. **Polling:** you walk to the front door every 5 minutes to check. Most trips, there's nothing there.
2. **Long polling:** you go to the door and wait there until the parcel comes, or until you get tired. Then you go back to the door and wait again.
3. **Server-Sent Events (SSE):** you turn on the radio. The station talks whenever it has news. You can listen, but you can't talk back through the radio.
4. **WebSockets:** you're on a phone call. Either side can talk at any time.

**Where this comparison stops working:** waiting by a door or staying on a call costs you nothing. On a server, every open connection uses memory and sometimes money, and with thousands of users, that adds up.

Here's what each one looks like on the web.

| | How it works | Direction | Delay |
|---|---|---|---|
| **Polling** | The browser asks "anything new?" every few seconds | Browser asks | Up to one interval |
| **Long polling** | The browser asks, and the server holds the request open until something happens, then the browser asks again | Browser asks | Short |
| **Server-Sent Events** | One response that never ends: the server keeps writing events into it | Server → browser | Very short |
| **WebSockets** | The connection switches from HTTP to a two-way channel | Both ways | Very short |

### Polling

Polling is the simplest. Here's what the AI often writes:

```js
setInterval(async () => {
  const res = await fetch(`/api/rooms/study/messages?after=${lastId}`);
  const newMessages = await res.json();
  if (newMessages.length > 0) showMessages(newMessages);
}, 3000);
```

In plain English:

1. **Line 1 and line 5:** run this code every 3,000 milliseconds (3 seconds).
2. **Line 2:** ask the server for messages newer than the last one we have.
3. **Lines 3–4:** if any came back, show them.

It works everywhere, needs nothing special on the server, and it's easy to understand. But look at the numbers. If 1,000 people leave the chat open, that's about 333 requests every second, or about **28.8 million requests a day**. Almost every answer is "nothing new". On a serverless platform, each one starts a function and runs a database query, and you pay for both. And a message can still take up to 3 seconds to appear.

Polling is a good choice for slow, short-lived things: checking whether a background job is finished, or refreshing a dashboard once a minute.

### Long polling

Long polling is a smarter version. The browser asks "anything new?", and if there's nothing yet, the server **doesn't answer straight away**. It holds the request open for a while. As soon as a message arrives, it answers. The browser shows it and asks again immediately.

Messages arrive fast, and there are far fewer empty answers. But each waiting browser keeps a request open on your server, and on a serverless platform, a function that sits waiting is a function you may pay for. Today, long polling is mostly used as a fallback. Socket.IO, a popular realtime library, starts with long polling by default.

### Server-Sent Events

With **Server-Sent Events** (SSE), the browser makes one normal request, and the server answers with a special content type, `text/event-stream`. Then it simply never finishes the response. Whenever there's news, it writes another event into it:

```text
data: {"author":"Mia","text":"Who has the notes?"}

data: {"author":"Sam","text":"Page 42"}
```

Each event is a line starting with `data:`, followed by an empty line. The browser has a built-in tool to read this stream, called `EventSource`:

```js
const events = new EventSource("/api/rooms/study/stream");
events.onmessage = (event) => {
  showMessages([JSON.parse(event.data)]);
};
```

In plain English:

1. **Line 1:** open the stream.
2. **Lines 2–4:** every time an event arrives, turn its text into data and show it.

If the connection drops, `EventSource` **reconnects automatically**. SSE is one-way: to send a message, the browser still makes a normal `POST` request. That's fine for many features. In fact, when an AI chat app shows an answer appearing word by word, it's often SSE: AI APIs, such as Anthropic's, stream their responses as server-sent events.

### WebSockets

A **WebSocket** starts as a normal HTTP request with a header that says `Upgrade: websocket`. If the server agrees, it answers with status `101 Switching Protocols`. From then on, the connection is no longer HTTP. It's an open, two-way channel, and either side can send a message at any moment.

```js
const socket = new WebSocket("wss://example.com/chat");
socket.onopen = () => {
  socket.send(JSON.stringify({ room: "study", text: "Who has the notes?" }));
};
socket.onmessage = (event) => showMessages([JSON.parse(event.data)]);
```

In plain English:

1. **Line 1:** open a WebSocket. `wss://` means a WebSocket over an encrypted connection, like `https://`.
2. **Lines 2–4:** once it's open, send a message.
3. **Line 5:** whenever the server sends something, show it.

WebSockets are the right tool for things that go both ways, often and fast: chat with "Leo is typing…", multiplayer games, live cursors in a shared document.

---

## How it goes wrong

### Problem 1: Polling that never rests

The AI sets polling to every second "so it feels instant". Each poll returns **all** messages, not only new ones. And it keeps polling in tabs that nobody is looking at.

Each of those multiplies your costs. Fixes that keep polling cheap:

- Ask only for what's new (`?after=lastId`), so most answers are tiny.
- Poll as slowly as the feature allows: every few seconds for a job status, once a minute for a dashboard.
- Pause when the tab is hidden. The browser tells you with the `visibilitychange` event and `document.hidden`.
- Stop polling when the job is `done` or `failed`.

### Problem 2: The WebSocket server that only works on your laptop

You ask the AI for realtime chat. It writes a small WebSocket server: `node server.js`, which keeps every connection in a list in memory, and sends each new message to everyone in the list. On your laptop, it's perfect.

Then you deploy to a serverless platform, and it falls apart. A traditional server runs all the time, so it can hold connections for hours. Serverless functions were built to answer one request and stop.

Vercel now supports WebSockets in its functions (it became generally available in October 2026), but its documentation lists exactly the limits you'd expect:

- **Connections end when the function reaches its maximum duration**, which is 5 minutes by default at the time of writing. Every client needs code to reconnect.
- **Each connection is pinned to one instance**: one running copy of your function on one machine. Busy apps run many instances at once.
- **Instances don't share memory.** If Mia is connected to instance A and Leo to instance B, the list of connections in A's memory doesn't include Leo. Mia's message never reaches him.

Vercel's advice is to keep rooms, who's online and messages in a shared store such as Redis (the fast shared data store from [Fast, but showing yesterday's data](/lessons/caching)), so every instance can pass messages to the others. Other platforms have their own rules and limits for long connections. Check your platform's docs before choosing.

> **Go deeper:** [Your app went viral. Will it survive?](/lessons/scaling) (Level 4) explains why "keep it in memory" breaks as soon as you have more than one server.

### Problem 3: Forgetting that connections drop

Connections drop all the time. A phone moves from Wi-Fi to mobile data. A laptop sleeps. You deploy a new version. The function hits its time limit.

Messages sent while Leo was disconnected are **not** waiting for him somewhere. If your app only listens to the live connection, he silently misses them. Nobody notices until someone says "I never saw your message".

### Problem 4: Anyone can listen to any room

The AI adds a WebSocket that lets the browser say "subscribe me to room 42". It never checks whether the user is a member of room 42. Anyone who changes the number can read someone else's private chat as it happens.

This is the same bug as changing an ID in a web address, just over a different kind of connection. Realtime connections need the same authorization checks as every other route.

---

## What good looks like

### Pick the simplest tool that fits

| What you need | A good choice |
|---|---|
| A job's status, updates every few seconds are fine | Polling, stopped when the job is done |
| One-way updates: AI answers, notifications, live scores | Server-Sent Events |
| Frequent messages both ways: chat, games, live cursors | WebSockets, usually through a managed service |

Most apps need fewer WebSockets than the AI suggests.

### Let a managed service hold the connections

Holding thousands of open connections, passing messages between servers, reconnecting and tracking who's online is a whole product. Companies sell it as a **managed realtime service**. Examples include **Supabase Realtime**, **Pusher** and **Ably**. Vercel's own guide also lists others, such as Liveblocks, PubNub and Firebase Realtime Database.

Supabase Realtime, for example, offers three features: **Broadcast** (send messages between connected users), **Presence** (track who's online) and **Postgres Changes** (get told when rows in your database change).

The usual shape: your server saves the message, then asks the service to deliver it.

```js
app.post("/api/rooms/:id/messages", requireLogin, async (req, res) => {
  // ...check that req.user is a member of this room
  const message = await db.message.create({
    data: { roomId: req.params.id, userId: req.user.id, text: req.body.text },
  });
  await realtime.publish(`room:${req.params.id}`, message);
  res.json(message);
});
```

In plain English:

1. **Line 2:** authorization first. Only members may post.
2. **Lines 3–5:** save the message in the database.
3. **Line 6:** tell the realtime service to send it to everyone listening to this room. `realtime.publish` is a placeholder name; each service has its own.
4. **Line 7:** reply to the sender.

The service holds the connections, so your functions stay short and simple.

### Rules that keep realtime correct

- **The database is the truth. The live connection is a doorbell.** Save first, then announce. Never keep messages only in the realtime channel.
- **On every (re)connect, catch up.** Load the messages after the last one the user saw, then keep listening.
- **Reconnect with growing pauses:** wait 1 second, then 2, then 4, up to a limit like 30 seconds, so thousands of users don't all reconnect in the same instant after an outage.
- **Check permissions when a user subscribes**, not only when they post. Managed services have their own way to do this: use it.

---

## Test your own app

1. **Two windows.** Open your app in a normal window and a private window, logged in as two users. Send a message in one. How long until it appears in the other?
2. **Find out what the AI built.** Open developer tools, then the **Network** tab. If the same request repeats every few seconds, it's polling: count how many per minute. If you see a connection under the **WS** filter, it's a WebSocket. Click it to see the messages.
3. **Break the connection.** In one window, turn off your Wi-Fi for 30 seconds. Send a message from the other window. Turn the Wi-Fi back on. Does the missed message appear without a refresh?
4. **Leave it running.** Open the app in a background tab for 10 minutes. Check your hosting platform's logs or usage page: how many requests did one idle tab make?
5. **Listen where you shouldn't.** Ask your AI: *"Show me where a user's permission to join a room is checked for realtime subscriptions."* Then try joining another user's room from the second window.

---

## Takeaways

**Key terms**
- **Polling:** the browser asks "anything new?" on a timer
- **Long polling:** the server holds each request open until there is news
- **Server-Sent Events (SSE):** one long response that the server keeps writing events into. Server to browser only
- **WebSocket:** a connection that switches from HTTP to a two-way channel
- **Instance:** one running copy of your function or server. Instances don't share memory
- **Managed realtime service:** a company that holds the open connections and delivers messages for you

**Red flags in AI-written code**
- `setInterval` polling every second, returning everything instead of only what's new
- Polling that never stops, even in hidden tabs or after the job is done
- A WebSocket server that keeps connections in a list in memory, deployed to serverless or more than one server
- No reconnect code, or reconnecting without loading missed messages
- Messages that are only sent live and never saved to the database
- Subscribing to a room or channel without any permission check

**Ask your AI**
- *"How does my app get new data without a refresh: polling, SSE or WebSockets? Where does it run, and what happens on my hosting platform when there are many instances?"*
- *"What happens to messages sent while a user's connection is down? Show me the code that catches up after a reconnect."*
- *"Could this feature use Server-Sent Events or polling instead of WebSockets? Compare the cost and complexity."*
- *"Where is a user's permission to subscribe to a room checked?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**The SSE connection limit.** Over older HTTP/1.1 connections, browsers allow only 6 open connections per website, across all tabs. Each SSE stream uses one, so a user with 7 tabs open can block their own app. Over HTTP/2, which many hosting platforms support, the limit is negotiated and usually much higher (100 by default).

**Catching up with SSE.** Each SSE event can carry an `id:` line. When `EventSource` reconnects, the browser sends the last ID it saw in a `Last-Event-ID` header, so the server knows where to continue. The `retry:` line tells the browser how long to wait before reconnecting.

**Keeping connections alive.** Some network equipment closes connections that stay silent for too long. The WebSocket protocol has small **ping** and **pong** messages for this: one side pings, the other answers, and both know the connection is still alive. SSE servers often send a comment line (starting with `:`) every so often for the same reason.

**Fan-out.** When a room has 10,000 listeners, one message means 10,000 sends. Vercel's guide points out that a self-built relay must make one send per connection, and recommends a managed provider when this "fan-out" gets large. This is a big part of what managed services are paid for.

**Paying for open connections.** On Vercel, CPU time for a WebSocket is billed only while your code processes messages, but the function instance's memory is billed for as long as the connection stays open. An idle connection is not free. Check how your platform bills long connections before you build on them.

**Socket.IO is not plain WebSockets.** Socket.IO adds its own protocol on top: rooms, automatic reconnects, and the long-polling fallback. A Socket.IO client can only talk to a Socket.IO server. Vercel's docs show it configured to use only the WebSocket transport.

**Collaborative editing is harder still.** Live cursors are easy. Two people typing in the same paragraph at the same time is a different problem: whose change wins? [Two people typed in the same document at once. Who wins?](/lessons/collaborative-editing) covers it.

</details>

## References

- [RFC 6455: The WebSocket Protocol](https://rfc-editor.org/rfc/rfc6455): IETF. The opening handshake with `Upgrade: websocket` and `101 Switching Protocols`, two-way messages, and ping and pong frames.
- [Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming): Anthropic. An AI API that streams its responses as server-sent events.
- [Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events): MDN. The `text/event-stream` format, `data:` and `retry:` lines, automatic reconnection, and the 6-connection limit without HTTP/2.
- [Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html): WHATWG HTML Standard. The `id:` field and the `Last-Event-ID` header sent when `EventSource` reconnects.
- [WebSockets](https://vercel.com/docs/functions/websockets): Vercel. Connections pinned to one instance, closing at the maximum duration, reconnect logic, shared state in Redis, and Socket.IO's long-polling default.
- [WebSocket support is now generally available](https://vercel.com/changelog/websocket-support-is-now-generally-available): Vercel. WebSockets in Vercel Functions became generally available in October 2026.
- [Do Vercel Functions support WebSocket connections?](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections): Vercel. The 300-second default maximum duration and how open connections are billed.
- [Publish and subscribe to realtime data on Vercel](https://vercel.com/kb/guide/publish-and-subscribe-to-realtime-data-on-vercel): Vercel. Fan-out, when a managed provider fits, and the list of providers including Ably, Pusher, Supabase Realtime, Liveblocks and PubNub.
- [Realtime](https://supabase.com/docs/guides/realtime): Supabase. Broadcast, Presence and Postgres Changes.
