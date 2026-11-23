---
title: "It works on my laptop. Why can't my friend open it?"
slug: localhost-vs-production
order: 10
level: 1
levelName: Foundations
concepts: [Localhost, Hosting, Deploying, Domains]
readTime: 12 min
quiz:
  - question: "Your app works at localhost:3000 on your laptop. You send that link to a friend. What happens when they open it on their phone?"
    options:
      - text: "They see your app, because the link is the same"
      - text: "Their phone looks for an app on itself, finds nothing, and shows an error"
        correct: true
      - text: "They see your app, but only if you are on the same street"
      - text: "Their phone downloads your app from your laptop"
    explanation: "localhost always means \"this same device\". On your friend's phone, it means their phone, not your laptop. Nothing is running on port 3000 there, so they get an error."

  - question: "What does the 3000 in localhost:3000 tell the computer?"
    options:
      - text: "How many people can visit the app"
      - text: "The app's version number"
      - text: "Which program on the computer should get the request"
        correct: true
      - text: "How fast the app loads"
    explanation: "One computer can run many server programs. The port number says which one the request is for, like a flat number in a big building."

  - question: "You press Ctrl+C in the terminal where your app is running. Then you reload localhost:3000 in your browser. What do you see?"
    options:
      - text: "An error, because the app's process stopped and nothing is answering on port 3000"
        correct: true
      - text: "Your app, as normal"
      - text: "The app, but with no styling"
      - text: "Your app's code, as text"
    explanation: "Ctrl+C stops the program running in the terminal. With the process stopped, nothing is listening on port 3000, so the browser can't connect. Run the start command again to bring it back."

  - question: "You deploy your app. Now it is at your-quiz.vercel.app. What did deploying do?"
    options:
      - text: "It made your laptop reachable from the internet"
      - text: "It emailed your code to your friends"
      - text: "It bought a domain name for you"
      - text: "It copied your app to a server that is always on and set up to accept visitors"
        correct: true
    explanation: "Deploying means putting your app on a server that is always on, always connected and open to visitors. Your laptop is no longer involved. The vercel.app address is a free name the hosting platform gives you."

  - question: "The deployed app loads, but the scores list is empty. The page's code asks for data from http://localhost:3000/api/scores. Why does it fail?"
    options:
      - text: "The server is too slow"
      - text: "Each visitor's browser looks for the data on the visitor's own device, where your app isn't running"
        correct: true
      - text: "The database was deleted when you deployed"
      - text: "Port 3000 is blocked in production"
    explanation: "Code that runs in the browser runs on the visitor's device. To them, localhost means their own device. Use a relative address like /api/scores, so the browser asks the same server the page came from."

  - question: "What is \"production\"?"
    options:
      - text: "The version of your app on your laptop"
      - text: "The command that starts your app"
      - text: "The live version of your app that real users visit"
        correct: true
      - text: "A paid plan on a hosting platform"
    explanation: "Production is the real, live version of your app. Your laptop is where you build and test. Production is where real users are, so mistakes there affect them."
---

# It works on my laptop. Why can't my friend open it?

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Server:** a computer that waits for requests and answers them. *([You pressed Enter. What happened in the next second?](/lessons/what-happens-when-you-open-a-website))*
> - **Domain name:** a human-friendly name for a server, like `example.com`. *([How does your browser find one computer out of billions?](/lessons/ip-addresses-and-dns))*
> - **API:** the addresses your app's pages use to ask your server for data, like `/api/scores`. *([The hidden conversation behind every button you tap](/lessons/what-is-an-api))*
> - **Process:** a program that is running right now. *([Your app restarted and all the likes vanished](/lessons/how-a-computer-runs-your-code))*

## "This site can't be reached"

You built a quiz app with your AI. You can answer questions, see your score, and try again. It works.

Your browser shows the app at this address:

```text
http://localhost:3000
```

You're proud of it, so you paste the link in your group chat.

A minute later, your friend replies: *"This site can't be reached."*

But it works for you! You open it again. Still works.

If `localhost:3000` means nothing to you yet, that's normal. This lesson explains what it means, why only you can see your app, and how apps get onto the internet for everyone.

> **In short:** an app that works on your laptop isn't on the internet yet. This lesson explains why, and what to do about it.

---

## The terminal: talking to your computer in text

Before we look at the address, we need one tool. Many apps are started from a **terminal**.

A terminal is a window where you type text commands instead of clicking. A **command** is one instruction for the computer, like *"show me the files in this folder"*. You type it, press Enter, and the computer answers in text.

Your AI tool uses it too. When an AI coding tool says it is "running a command", it's typing into a terminal for you.

**How to open one:**

- **Mac:** open the **Terminal** app. It's in **Applications → Utilities**, or search for "Terminal" with Spotlight (Cmd+Space).
- **Windows:** search for **Terminal** in the Start menu.
- **VS Code** (a popular code editor): choose **View → Terminal** from the menu.

The line where you type usually ends in a symbol like `$`, `%` or `>`. It means "ready for a command".

Two safe commands to try. They work on Mac, and in PowerShell, which Windows Terminal opens by default:

```bash
pwd
ls
```

In plain English:

- **`pwd`** asks *"which folder am I in?"* The terminal is always "inside" one folder.
- **`ls`** asks *"what's in this folder?"* It lists the files and folders there.

> **In short:** a terminal is a window where you type commands. Your AI uses it too, often to start your app.

---

## Starting your app on your laptop

Many apps made with JavaScript tools start with this command, typed in the project's folder:

```bash
npm run dev
```

It means *"start my app in development mode"*. You'll learn what `npm` is in [It works on my machine, but not on yours. Blame the packages](/lessons/packages-and-dependencies).

This command starts a process: a server, running on your own laptop. A server you run while you build and test is called a **development server**. The terminal then shows a message like this:

```text
Local: http://localhost:3000
```

That's the address to open in your browser.

The development server is a process, so it keeps running only while that terminal is open. To stop it, click in the terminal and press **Ctrl+C** (on a Mac keyboard, the key is called Control). Closing the terminal window stops it too.

When it stops, reload the page. You'll get an error like *"localhost refused to connect"*. Nothing is running to answer.

> **In short:** a command like `npm run dev` starts a development server on your laptop. Ctrl+C stops it.

---

## localhost means "this computer"

Now let's read the address. First, `localhost`.

**localhost** is a special name. It always means *"this same computer"*. Computers, phones and tablets all understand it, and on each one it points to itself.

Think about the word "home". If you tell a taxi driver "take me home", you go to your home. If your friend says the exact same words, they go to *their* home. Same word, different place, depending on who says it.

`localhost` works the same way. On your laptop, it means your laptop. On your friend's phone, it means your friend's phone.

So when your friend opened `localhost:3000`, their phone looked for your quiz app **on their own phone**. Of course it wasn't there.

> **In short:** localhost always means "this device". The same link points to a different device for every person who opens it.

---

## Ports: which program?

Now the `:3000` part.

One computer can run many server programs at the same time. When a request arrives, the computer needs to know which program it's for.

That's the job of a **port**: a number that picks one program on a computer. Think of a big apartment building. The street address gets you to the building. The flat number gets you to the right door. The computer is the building. The port is the flat number.

So `localhost:3000` means: *"this computer, the program waiting at port 3000."*

A few facts about ports:

- Port numbers go from 0 to 65535.
- Normal websites use port **443** (for `https://`) or **80** (for `http://`). Browsers add these for you, so you almost never see them.
- Development servers pick other numbers, like **3000** (Next.js) or **5173** (Vite). Next.js and Vite are popular tools for building web apps.
- Only one program can use a port at a time.

That last rule explains a common error. If you start your app twice, the second one may fail with a message like this:

```text
Error: listen EADDRINUSE: address already in use :::3000
```

It means *"port 3000 is already taken"*. Usually, an older copy of your app is still running in another terminal. Stop it with Ctrl+C, then try again.

> **In short:** a port is a number that picks which program gets a request. Only one program can use each port.

---

## Why nobody else can reach your laptop

Let's say your friend used your laptop's real internet address instead of `localhost`. It still wouldn't work, for three reasons.

1. **Your router blocks it.** Your laptop connects to the internet through your home's router (the Wi-Fi box). By default, routers don't let strangers from the internet start a connection to the devices inside. That protects you.
2. **Your laptop isn't always on.** When you close the lid, it sleeps. When you close the terminal, the app stops. Visitors would find nothing.
3. **Your laptop moves.** At school or in a café, it's on a different network with a different address.

Your laptop is a great place to build, but a bad place to serve visitors.

> **In short:** your router keeps outsiders out, and your laptop sleeps and moves. So your app needs a different home.

---

## Hosting: a computer that's always awake

Your app needs a server that is:

- Always on
- Always connected to the internet
- Set up to accept visitors

Companies run huge numbers of computers like this in data centers. They let you put your app on them, often free for small apps. This service is called **hosting**. A company that offers it is a **hosting provider** or **hosting platform**.

Vercel and Netlify are two popular hosting platforms for web apps.

> **Go deeper:** [There is no cloud. It's someone else's computer](/lessons/what-is-the-cloud) (Level 1) explains where these computers come from.

> **In short:** hosting means your app runs on someone else's always-on server, so everyone can reach it.

---

## Deploying to production

Copying your app onto a hosting server, and starting it there, is called **deploying**. People also say "shipping" or "going live".

After you deploy, the hosting platform gives your app a real web address, with a domain name. On Vercel, for example, it looks like `your-quiz.vercel.app`. Your friend can open that link from anywhere.

The live version that real users visit is called **production**. Your laptop is where you build and test. Production is where real people use your app.

This matters because the two are separate copies. If you change code on your laptop, production doesn't change until you deploy again.

**What about a domain name of your own?** The free address from your hosting platform works well to start. Later, you can buy a domain name of your own, ending in something like `.com`, from a company that sells them. Then you connect it to your app using DNS, the internet's address book from [How does your browser find one computer out of billions?](/lessons/ip-addresses-and-dns).

> **Go deeper:** [From your laptop to a real website in one push](/lessons/hosting-platforms) (Level 1) walks you through a real deploy.

> **In short:** deploying copies your app to a hosting server. The live copy is production. It only changes when you deploy again.

---

## How it goes wrong

Your laptop and production are different computers. Something that works on one can break on the other.

### Mistake 1: localhost written into the code

AI tools sometimes write the full laptop address into your app's code. This is common in code that runs in the browser (the **frontend**):

```js
// Works only on your laptop
await fetch("http://localhost:3000/api/scores");

// Works everywhere
await fetch("/api/scores");
```

In plain English:

- `fetch` asks a server for data. Here, it asks for the list of scores.
- **The first version** asks `localhost:3000`. Frontend code runs on each visitor's device. So for your friend, `localhost` means their phone again. The scores never load.
- **The second version** gives only the path, `/api/scores`. The browser then asks the same server the page came from. On your laptop, that's your laptop. In production, that's the production server.

### Mistake 2: Settings that only exist on your laptop

Your app may need settings, like a secret key for a service. If they are only on your laptop, production doesn't have them, and the app breaks.

> **Go deeper:** [Your app's secrets don't belong in your code. Here's where they go](/lessons/environment-variables) (Level 1) explains how to give production its own settings.

### Mistake 3: Forgetting to deploy

You fix a bug on your laptop. You tell your friend to try again. It's still broken. Production still has the old copy, because you never deployed the fix.

> **Go deeper:** [Why you should never test on your real users](/lessons/dev-staging-production) (Level 3) shows how teams test changes safely before they reach production.

> **In short:** watch for `localhost` in your code, settings missing in production, and changes you haven't deployed yet.

---

## What good looks like

- **Use relative paths** like `/api/scores` in frontend code, not `http://localhost:3000/...`.
- **Deploy early.** Put a tiny version of your app online on day one. Small problems are easier to fix than big ones.
- **Test the real link.** After each deploy, open the production address yourself.
- **Test from another device.** Open the link on your phone, with Wi-Fi turned off. If it works on mobile data, it really is on the internet.

> **In short:** avoid localhost in code, deploy early, and test the live link from another device.

---

## Try it yourself

### Experiment 1: Your first commands

1. Open a terminal (see the steps above).
2. Type `pwd` and press Enter. Read the folder name.
3. Type `ls` and press Enter. Compare the list with the same folder in your file explorer (Finder on Mac). It's the same folder, shown in text.

### Experiment 2: Start and stop an app

If you have an app project from your AI tool:

1. In the terminal, go to your project's folder. Ask your AI for the exact command, or type `cd` followed by a space and the folder's path. `cd` means "change folder".
2. Start the app (often `npm run dev`). Find the `localhost` address in the output and open it.
3. Open the same address on your phone. It fails, because `localhost` there means your phone.
4. Back in the terminal, press **Ctrl+C**. Reload the page on your laptop. It fails too, because the process stopped.

---

## Takeaways

**Key terms**
- **Terminal:** a window where you type text commands
- **Development server:** a server running on your laptop while you build and test
- **localhost:** a name that always means "this same device"
- **Port:** a number that picks which program on a computer gets a request
- **Hosting:** running your app on someone else's always-on server
- **Deploying:** copying your app to a hosting server and starting it there
- **Production:** the live version of your app that real users visit

**Which step broke?**
- Friend can't open your `localhost` link → it points to their own device. **Deploy** your app.
- `localhost` works, then suddenly refuses to connect → your app's **process** stopped. Start it again.
- "Address already in use" → another program is using that **port**. Stop the old one.
- Works on your laptop, broken in production → look for `localhost` in the code, missing settings, or a fix you haven't deployed.

**Ask your AI**
- *"Search my code for 'localhost'. Which of these will break when the app is deployed?"*
- *"What command starts my app, and what port does it use?"*
- *"Walk me through deploying this app for the first time, step by step."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**localhost is an IP address too.** The name `localhost` is reserved by an internet standard (RFC 6761). It points to a special address called the **loopback address**: `127.0.0.1` in IPv4 and `::1` in IPv6. Requests to it never leave your computer.

**Testing on your phone over Wi-Fi.** A development server can listen only on localhost, or on all of the computer's network addresses. Vite's development server listens only on localhost by default; you can change this with its `--host` option. Next.js's development server listens on all addresses by default. If it does, a phone on the same Wi-Fi can open the app using your laptop's local network address, for example `http://192.168.1.20:3000` (your number will differ). This still doesn't make the app reachable from the wider internet.

**Port ranges.** IANA, the organization that keeps track of internet numbers, splits ports into three ranges: system ports (0–1023), user ports (1024–49151) and dynamic or private ports (49152–65535). On Linux, a program normally needs special permission to use a port below 1024, so development servers use higher numbers.

**Why your router blocks visitors.** Most home routers use **NAT** (Network Address Translation). All your home devices share one public internet address. When your laptop starts a connection, the router remembers it and passes the reply back. When a stranger starts a connection, the router doesn't know which device it's for, so it drops it. **Port forwarding** is a router setting that makes an exception. Running a public app from home this way is possible, but it's risky and unreliable, which is why people use hosting.

**Tunnels.** Some tools create a temporary public link to a server running on your laptop, through a service on the internet. They're useful for quick demos and for testing webhooks, but your app is still offline when your laptop is.

**Changing the port.** Next.js accepts `-p`: `next dev -p 4000` starts on port 4000. If its port is busy, Vite tries the next free port automatically.

</details>

## References

- [RFC 6761: Special-Use Domain Names](https://www.rfc-editor.org/rfc/rfc6761.html): IETF. The name `localhost` is reserved and always points to the loopback address.
- [Port](https://developer.mozilla.org/en-US/docs/Glossary/Port): MDN Web Docs. What a port is, and the default ports 80 for HTTP and 443 for HTTPS.
- [Service Name and Transport Protocol Port Number Registry](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml): IANA. The three port ranges: 0–1023, 1024–49151 and 49152–65535.
- [next CLI](https://nextjs.org/docs/app/api-reference/cli/next): Next.js. `next dev` uses port 3000 and hostname `0.0.0.0` by default, and `-p` changes the port.
- [Server Options](https://vite.dev/config/server-options): Vite. Vite's development server uses port 5173 and listens on `localhost` by default, and tries the next free port if 5173 is taken.
- [Errors](https://nodejs.org/api/errors.html): Node.js Documentation. `EADDRINUSE` means a program tried to use an address and port that is already in use.
- [Accessing Deployments through Generated URLs](https://vercel.com/docs/deployments/generated-urls): Vercel Docs. Vercel automatically gives each deployment a `vercel.app` address.
- [Open or quit Terminal on Mac](https://support.apple.com/guide/terminal/apd5265185d-f365-44cb-8b09-71a064a42125/mac): Apple Support. Terminal is in the /Applications/Utilities folder.
- [capabilities(7)](https://man7.org/linux/man-pages/man7/capabilities.7.html): Linux manual pages. Using a port below 1024 needs a special permission called `CAP_NET_BIND_SERVICE`.
- [Get started with domains](https://docs.netlify.com/manage/domains/get-started-with-domains/): Netlify Docs. Each site has a default `netlify.app` address.
