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
    explanation: "localhost always means \"this same device\". On your friend's phone, it means their phone, not your laptop. Nothing runs on port 3000 there, so they get an error."

  - question: "What does the 3000 in localhost:3000 tell the computer?"
    options:
      - text: "How many people can visit the app"
      - text: "The app's version number"
      - text: "Which program on the computer should get the request"
        correct: true
      - text: "How fast the app loads"
    explanation: "One computer can run many server programs. The port number says which program the request is for, like a flat number in a big building."

  - question: "You press Ctrl+C in the terminal where your app is running. Then you reload localhost:3000 in your browser. What do you see?"
    options:
      - text: "An error, because the app's process stopped and nothing is answering on port 3000"
        correct: true
      - text: "Your app, as normal"
      - text: "The app, but with no styling"
      - text: "Your app's code, as text"
    explanation: "Ctrl+C stops the program that runs in the terminal. The process stopped, so nothing listens on port 3000, and the browser can't connect. Run the start command again to start the app."

  - question: "You deploy your app. Now it is at your-quiz.vercel.app. What did deploying do?"
    options:
      - text: "It made your laptop reachable from the internet"
      - text: "It emailed your code to your friends"
      - text: "It bought a domain name for you"
      - text: "It copied your app to a server that is always on and set up to accept visitors"
        correct: true
    explanation: "Deploying puts your app on a server that is always on, always connected and open to visitors. Your laptop is no longer part of it. The vercel.app address is a free name that the hosting platform gives you."

  - question: "The deployed app loads, but the scores list is empty. The page's code asks for data from http://localhost:3000/api/scores. Why does it fail?"
    options:
      - text: "The server is too slow"
      - text: "Each visitor's browser looks for the data on the visitor's own device, where your app isn't running"
        correct: true
      - text: "The database was deleted when you deployed"
      - text: "Port 3000 is blocked in production"
    explanation: "Code that runs in the browser runs on the visitor's device. To them, localhost means their own device. Use a relative address like /api/scores. Then the browser asks the same server that the page came from."

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
> This lesson uses words from earlier lessons.
> - **Server:** a computer that waits for requests and answers them. *([You pressed Enter. What happened in the next second?](/lessons/what-happens-when-you-open-a-website))*
> - **Domain name:** a human-friendly name for a server, like `example.com`. *([How does your browser find one computer out of billions?](/lessons/ip-addresses-and-dns))*
> - **API:** the menu of requests your server answers, like `/api/scores`. *([The hidden conversation behind every button you tap](/lessons/what-is-an-api))*
> - **Process:** a program that runs now. *([Your app restarted and all the likes vanished](/lessons/how-a-computer-runs-your-code))*

## "This site can't be reached"

You built a quiz app with your AI. You can answer questions, see your score and try again. It works.

Your browser shows the app at this address:

```text
http://localhost:3000
```

You're proud of it, so you paste the link in your group chat.

A minute later, your friend replies: *"This site can't be reached."*

But it works for you! You open it again. It still works.

If `localhost:3000` means nothing to you yet, that's normal. This lesson explains what it means and why only you can see your app. It also explains how apps get onto the internet for everyone.

> **In short:** an app that works on your laptop isn't on the internet yet. This lesson explains why, and what to do about it.

---

## The terminal: talking to your computer in text

Before we look at the address, you need one tool. People often start apps from a **terminal**.

A terminal is a window where you type text commands, instead of clicking. A **command** is one instruction for the computer, like *"show me the files in this folder"*. You type it and press Enter. Then the computer answers in text.

Your AI tool uses a terminal too. When an AI coding tool says that it "runs a command", it types into a terminal for you.

**How to open one:**

- **Mac:** open the **Terminal** app. It's in **Applications → Utilities**. You can also search for "Terminal" with Spotlight, the Mac's search tool (Cmd+Space).
- **Windows:** search for **Terminal** in the Start menu.
- **VS Code** (a popular code editor, an app for writing code): choose **View → Terminal** from the menu.

The line where you type usually ends in a symbol like `$`, `%` or `>`. It means "ready for a command".

Here are two safe commands to try. They work on Mac. They also work in PowerShell, the program that Windows Terminal opens by default:

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

Many apps made with JavaScript tools start with this command. You type it in the project's folder:

```bash
npm run dev
```

It means *"start my app in development mode"*, the mode that you use while you build. You'll learn what `npm` is in [It works on my machine, but not on yours. Blame the packages](/lessons/packages-and-dependencies).

This command starts a process: a server that runs on your own laptop. A server that you run while you build and test is called a **development server**. The terminal then shows a message like this:

```text
Local: http://localhost:3000
```

That's the address to open in your browser.

The development server is a process, so it runs only while that terminal is open. To stop it, click in the terminal and press **Ctrl+C**. On a Mac keyboard, the Ctrl key is called Control. If you close the terminal window, the server stops too.

When the server stops, reload the page. You get an error like *"localhost refused to connect"*. Nothing runs to answer the request.

> **In short:** a command like `npm run dev` starts a development server on your laptop. Ctrl+C stops it.

---

## localhost means "this computer"

Now let's read the address. First, `localhost`.

**localhost** is a special name. It always means *"this same computer"*. Computers, phones and tablets all understand it. On each device, it points to that device itself.

Think about the word "home". If you tell a taxi driver "take me home", you go to your home. If your friend says the same words, they go to *their* home. It's the same word, but a different place. The place depends on who says it.

`localhost` works in the same way. On your laptop, it means your laptop. On your friend's phone, it means your friend's phone.

So when your friend opened `localhost:3000`, their phone looked for your quiz app **on their own phone**. Your app wasn't there.

![Your laptop opens localhost:3000 and finds your quiz app on itself. Your friend's phone opens the same link, looks on itself, finds nothing and shows "This site can't be reached".](/diagrams/localhost-vs-production-1.svg)

> **In short:** localhost always means "this device". The same link points to a different device for every person who opens it.

---

## Ports: which program?

Now the `:3000` part.

One computer can run many server programs at the same time. When a request arrives, the computer must know which program it's for.

A **port** does this job. A port is a number that picks one program on a computer. Think of a big apartment building. The street address gets you to the building. The flat number gets you to the right door. The computer is the building, and the port is the flat number.

So `localhost:3000` means: *"this computer, the program that waits at port 3000."*

Here are some facts about ports:

- Port numbers go from 0 to 65535.
- Normal websites use port **443** (for `https://`) or **80** (for `http://`). Browsers add these numbers for you, so you almost never see them.
- Development servers pick other numbers, like **3000** (Next.js) or **5173** (Vite). Next.js and Vite are popular tools for building web apps.
- Only one program can use a port at a time.

That last rule explains a common error. If you start your app twice, the second one can fail with a message like this:

```text
Error: listen EADDRINUSE: address already in use :::3000
```

It means *"port 3000 is already taken"*. Usually, an older copy of your app still runs in another terminal. Stop it with Ctrl+C. Then try again.

> **In short:** a port is a number that picks which program gets a request. Only one program can use each port.

---

## Why nobody else can reach your laptop

Now say that your friend used your laptop's real internet address instead of `localhost`. It still wouldn't work, for three reasons.

1. **Your router blocks it.** Your laptop connects to the internet through your home's router (the Wi-Fi box). By default, routers don't let strangers from the internet start a connection to the devices inside. That protects you.
2. **Your laptop isn't always on.** When you close the lid, it sleeps. When you close the terminal, the app stops. Visitors would find nothing.
3. **Your laptop moves.** At school or in a café, it's on a different network with a different address.

Your laptop is a great place to build, but a bad place to serve visitors.

> **In short:** your router keeps outsiders out, and your laptop sleeps and moves. So your app needs a different home.

---

## Hosting: a computer that's always awake

Your app needs a server with these three things:

- It is always on.
- It is always connected to the internet.
- It is set up to accept visitors.

Some companies run huge numbers of computers like this in buildings called data centers. They let you put your app on these computers, often free for small apps. This service is called **hosting**. A company that offers it is a **hosting provider** or **hosting platform**.

Vercel and Netlify are two popular hosting platforms for web apps.

> **Go deeper:** [There is no cloud. It's someone else's computer](/lessons/what-is-the-cloud) (Level 1) explains where these computers come from.

> **In short:** with hosting, your app runs on someone else's always-on server, so everyone can reach it.

---

## Deploying to production

To copy your app onto a hosting server and start it there is called **deploying**. People also say "shipping" or "going live".

After you deploy, the hosting platform gives your app a real web address, with a domain name. On Vercel, for example, it looks like `your-quiz.vercel.app`. Your friend can open that link from anywhere.

The live version that real users visit is called **production**. Your laptop is where you build and test. Production is where real people use your app.

![You build and test on your laptop. When you deploy, a copy of your app goes to a hosting server that is always on. Your friend and other visitors open the production address, like your-quiz.vercel.app.](/diagrams/localhost-vs-production-2.svg)

This matters, because the two are separate copies. If you change code on your laptop, production doesn't change until you deploy again.

**What about a domain name of your own?** The free address from your hosting platform is good for a start. Later, you can buy a domain name of your own, ending in something like `.com`, from a company that sells them. Then you connect it to your app with DNS. DNS is the internet's address book from [How does your browser find one computer out of billions?](/lessons/ip-addresses-and-dns).

> **Go deeper:** [From your laptop to a real website in one push](/lessons/hosting-platforms) (Level 1) shows you a real deploy, step by step.

> **In short:** deploying copies your app to a hosting server. The live copy is production. It changes only when you deploy again.

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
- **The second version** gives only the path, `/api/scores`. Then the browser asks the same server that the page came from. On your laptop, that's your laptop. In production, that's the production server.

### Mistake 2: Settings that exist only on your laptop

Your app can need settings, like a secret key for a service. If the settings are only on your laptop, production doesn't have them, and the app breaks.

> **Go deeper:** [Your app's secrets don't belong in your code. Here's where they go](/lessons/environment-variables) (Level 1) explains how to give production its own settings.

### Mistake 3: You forgot to deploy

You fix a bug on your laptop. You tell your friend to try again. It's still broken. Production still has the old copy, because you never deployed the fix.

> **Go deeper:** [Why you should never test on your real users](/lessons/dev-staging-production) (Level 3) shows how teams test changes safely before the changes reach production.

> **In short:** look for `localhost` in your code, settings that production doesn't have, and changes that you haven't deployed yet.

---

## What good looks like

- **Use relative paths** like `/api/scores` in frontend code, not `http://localhost:3000/...`. A relative path has no server name in it.
- **Deploy early.** Put a tiny version of your app online on day one. Small problems are easier to fix than big ones.
- **Test the real link.** After each deploy, open the production address yourself.
- **Test from another device.** Turn off Wi-Fi on your phone. Then open the link. If it works on mobile data, it really is on the internet.

> **In short:** keep localhost out of your code, deploy early, and test the live link from another device.

---

## Try it yourself

### Experiment 1: Your first commands

1. Open a terminal (see the steps above).
2. Type `pwd` and press Enter. Read the folder name.
3. Type `ls` and press Enter.
4. Compare the list with the same folder in your file explorer (Finder on Mac). It's the same folder, shown in text.

### Experiment 2: Start and stop an app

Do this if you have an app project from your AI tool.

1. In the terminal, go to your project's folder. Ask your AI for the exact command. You can also type `cd`, a space and the folder's path. `cd` means "change folder".
2. Start the app (often with `npm run dev`).
3. Find the `localhost` address in the terminal's text, and open it.
4. Open the same address on your phone. It fails, because `localhost` there means your phone.
5. In the terminal, press **Ctrl+C**.
6. Reload the page on your laptop. It fails too, because the process stopped.

---

## Takeaways

**Key terms**

- **Terminal:** a window where you type text commands.
- **Development server:** a server that runs on your laptop while you build and test.
- **localhost:** a name that always means "this same device".
- **Port:** a number that picks which program on a computer gets a request.
- **Hosting:** your app runs on someone else's always-on server.
- **Deploying:** you copy your app to a hosting server and start it there.
- **Production:** the live version of your app that real users visit.

**Which step broke?**

- Your friend can't open your `localhost` link → it points to their own device. **Deploy** your app.
- `localhost` works, then suddenly refuses to connect → your app's **process** stopped. Start it again.
- "Address already in use" → another program uses that **port**. Stop the old one.
- It works on your laptop, but production is broken → look for `localhost` in the code, missing settings, or a fix that you haven't deployed.

**Ask your AI**

- *"Search my code for 'localhost'. Which of these will break when the app is deployed?"*
- *"What command starts my app, and what port does it use?"*
- *"Explain, step by step, how to deploy this app for the first time."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**localhost is an IP address too.** An internet standard (RFC 6761) reserves the name `localhost`. It points to a special address called the **loopback address**. In IPv4 and IPv6, the two kinds of IP address, it is `127.0.0.1` and `::1`. Requests to it never leave your computer.

**Testing on your phone over Wi-Fi.** A development server can listen only on localhost, or on all of the computer's network addresses. By default, Vite's development server listens only on localhost. You can change this with its `--host` option. By default, Next.js's development server listens on all addresses. Then a phone on the same Wi-Fi can open the app with your laptop's local network address. An example is `http://192.168.1.20:3000` (your number will be different). This still doesn't make the app reachable from the rest of the internet.

**Port ranges.** IANA, the organization that keeps a record of internet numbers, splits ports into three ranges. These are system ports (0–1023), user ports (1024–49151) and dynamic or private ports (49152–65535). Linux is an operating system that many servers use. On Linux, a program normally needs special permission to use a port below 1024. So development servers use higher numbers.

**Why your router blocks visitors.** Most home routers use **NAT** (Network Address Translation). All your home devices share one public internet address. When your laptop starts a connection, the router remembers it and passes the reply back. When a stranger starts a connection, the router doesn't know which device it's for, so it ignores it. **Port forwarding** is a router setting that makes an exception. You can run a public app from home in this way. But it's risky and unreliable, so people use hosting.

**Tunnels.** Some tools make a temporary public link to a server on your laptop, through a service on the internet. They're useful for quick demos. They're also useful to test webhooks, the messages that other services send to your app. But when your laptop is offline, your app is offline too.

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
