---
title: "A player scored 999,999 points by editing the page. How?"
slug: frontend-and-backend
order: 6
level: 1
levelName: Foundations
concepts: [Frontend, Backend, Trust boundary]
readTime: 11 min
quiz:
  - question: "Your quiz game counts the score of each player in the browser. At the end, the browser sends the final score to the server, and the server saves it. What can a player do?"
    options:
      - text: "Nothing. Nobody can change code in the browser."
      - text: "Change the score before the browser sends it, and the server will save it"
        correct: true
      - text: "Change the score only if they know the password of the server"
      - text: "Change the score on their own screen, but the server will always fix it"
    explanation: "The score lives in the browser, and the user controls the browser. The server saves whatever number arrives. To be safe, the server must count the score itself."

  - question: "Where should your quiz game check whether an answer is correct?"
    options:
      - text: "In the browser, because it is faster"
      - text: "In a hidden part of the page, where players can't see it"
      - text: "On the server, in the backend"
        correct: true
      - text: "It doesn't matter where"
    explanation: "If the correct answers are in the frontend, every player can read them. The backend keeps the answer key where no player can see it or change it."

  - question: "You put a secret key inside the JavaScript of your app that runs in the browser. Who can see it?"
    options:
      - text: "Anyone who opens your app"
        correct: true
      - text: "Only you, because you wrote the code"
      - text: "Only people who log in"
      - text: "Nobody, because JavaScript files are hidden"
    explanation: "Everything the browser runs came to the browser. Anyone can read it with developer tools or \"View page source\". Secrets belong on the backend."

  - question: "The AI hides the \"Delete all scores\" button for everyone except you. Is your app safe now?"
    options:
      - text: "Yes, because nobody else can see the button"
      - text: "Yes, if the code of the button is in a separate file"
      - text: "Yes, because nobody can click a hidden button"
      - text: "No. Anyone can still send the delete request. The server must check who is asking."
        correct: true
    explanation: "A hidden button only changes what the page shows. The server still answers the request if someone sends it. The backend must decide who can delete."

  - question: "You use developer tools to change the headline on a news website. What happened?"
    options:
      - text: "You changed the headline for every visitor"
      - text: "You changed only the copy of the page in your own browser"
        correct: true
      - text: "You hacked the server of the news website"
      - text: "Nothing changed at all"
    explanation: "The page in your browser is your own copy. You can change it as you like, but this doesn't change the server or the page for other visitors. Reload the page and the real headline comes back."

  - question: "Your sign-up page checks that the name box isn't empty before it sends the form. Does the server still need to check?"
    options:
      - text: "No. The browser already checked."
      - text: "No. Checks only work in the browser."
      - text: "Yes. The browser check is nice for users, but anyone can skip it."
        correct: true
      - text: "Only if the user is logged in"
    explanation: "Checks in the browser give a quick message to the user, so they are still useful. But a user can turn them off, or send a request without your page. The server must check again."
---

# A player scored 999,999 points by editing the page. How?

> **Before you start**
> This lesson uses words from earlier lessons.
> - **Server:** a computer that waits for requests. It answers them. (From [You pressed Enter. What happened in the next second?](/lessons/what-happens-when-you-open-a-website))
> - **Request and response:** your browser asks for something. The server answers. (From [Every website is a conversation. Here's how it goes](/lessons/http-requests-and-responses))
> - **JavaScript:** the code that makes a web page do things. For example, it reacts when you click a button. (From [Take a web page apart and see what's inside](/lessons/what-a-web-page-is-made-of))
> - **Developer tools:** hidden panels in your browser. They show what your browser does. (From the same lesson.)

## 999,999 points

You build a quiz game for your class with an AI. It has 10 questions about space. At the end, each player sees their score. The best scores go on a **leaderboard**: a list of the top players that everyone can see.

You share the link in your class group chat. Everyone plays.

The next morning, you check the leaderboard. At the top:

> **Sam: 999,999 points**

The quiz has 10 questions. How is that possible?

Sam didn't break into anything. Sam didn't guess a password. Sam used tools that come with every browser. And your app believed what Sam's browser told it.

This lesson explains why. It's one of the most important ideas in building apps: **your app runs in two places, and you only control one of them.**

---

## Two places your code runs

In earlier lessons, you saw that a website has two sides. There's your browser, and there's the server.

Your app has code on both sides.

**Code that runs in the browser.** The server sends HTML, CSS and JavaScript to the browser of the player. The browser runs it. This part draws the quiz, shows the questions and reacts when the player taps an answer. This part of your app is called the **frontend**.

**Code that runs on the server.** This code never leaves your server. It answers requests. It also saves things that must last, like the scores on the leaderboard. This part of your app is called the **backend**.

| | Frontend | Backend |
|---|---|---|
| Where it runs | In the browser of each user | On your server |
| What it does | Shows the page and reacts to taps and clicks | Answers requests and saves data |
| Who controls the computer | The user | You |

The last row is the important one. Remember it for the rest of this lesson.

> **In short:** the frontend is the part of your app that runs in the browser of the user. The backend is the part that runs on your server.

---

## Everything you send can be read

Here's a fact that surprises many beginners: **the code of the frontend is not secret.**

To run your JavaScript, the browser needs a copy of it. So your server sends the whole file to every visitor. When the file is on their computer, they can read every line.

Say the AI wrote the quiz like this:

```js
const correctAnswers = ["Mars", "Jupiter", "8", "The Sun"];
const SECRET_PRIZE_CODE = "SPACE-CHAMP";
```

In plain English:

1. **Line 1:** a list of the correct answers to the quiz. The page uses it to check each answer.

2. **Line 2:** a secret code. The page shows it to players who get every answer right.

This code is in the frontend, so every player gets a copy. Anyone can open developer tools and find the file. Then they can read the answers and the "secret" code. No hacking needed.

The same is true for anything else in the frontend:

- Text that the page hides, but that is still in the HTML

- Notes that the AI left inside the code

- **Secret keys:** long passwords that let your app use other services, like an AI service. These services often charge you each time someone uses your key. If your key is in the frontend, anyone can copy it and use it, and you pay.

> **Go deeper:** [Your API key leaked, and strangers are spending your money](/lessons/api-key-ended-up-public) (Level 2) shows how secret keys leak and how to keep them safe.

> **In short:** the browser needs a copy of the frontend to run it, so every visitor can read it. Never put answers, passwords or secret keys in the frontend.

---

## Everything in the browser can be changed

Users can do more than read. They can also **change** what runs in their browser.

Developer tools let anyone do these things:

- Change the text, pictures and buttons on the page

- Turn a greyed-out button back on

- Pause your JavaScript while it runs and change its numbers

- Run their own JavaScript on your page

This is not hacking. These are normal browser features. Developers use them to test their own pages. Anyone can open them.

Now back to Sam. The AI built the game so that the browser counts the score:

```js
let score = 0;
if (playerAnswer === correctAnswers[0]) {
  score = score + 1;
}
```

In plain English:

1. **Line 1:** start with a score of 0.

2. **Lines 2–4:** if the answer of the player matches the first correct answer, add 1 to the score.

At the end of the game, the browser sends a request to the server. The request says: *"Save this score: 7."* Then the server saves the number on the leaderboard.

But Sam's browser counted the score. Sam paused the game with developer tools and changed `score` to 999999. The browser sent *"Save this score: 999999."* The server had no way to know that the number was fake, so it saved it.

![Unsafe: the browser counts the score, Sam changes it to 999999, and the server saves it. Safe: the browser sends only the answers, and the server checks them against the answer key, counts the score and saves it.](/diagrams/frontend-and-backend-1.svg)

Sam didn't even need to play. A user can skip your page completely. They can send their own request to your server, with any message they like.

> **Go deeper:** [The hidden conversation behind every button you tap](/lessons/what-is-an-api) (Level 1) shows what these requests look like.

> **In short:** users can change anything that runs in their browser, and they can send any request they want. Your frontend can't stop them.

---

## The trust boundary

So what can you do?

Think about a test at school. Your answer sheet is in your hands. You can write anything on it, and even change an answer at the last second. But your mark doesn't come from your sheet alone. The teacher checks it against the answer key in the staff room. You never see the key, and you can't change it.

Your app works the same way:

- The **frontend** is the answer sheet. The user holds it and can write anything.

- The **backend** is the staff room. Only you can get in.

The line between the two is called the **trust boundary**. On the side of the server, you are in control. On the side of the browser, the user is in control. Anything that crosses the line from the browser to the server might have changed on the way.

![The trust boundary is a line between two sides. On the left, the user controls the browser and the frontend. On the right, you control the server and the backend. Every request that crosses the line from the browser must be checked by the server.](/diagrams/frontend-and-backend-2.svg)

So the rule is:

> **The browser can ask. Only the server decides.**

**Where this comparison stops working:** in a real school, the answer key never leaves the staff room. In an app, you can send the answer key to the browser by mistake, like the list of correct answers above. Also, a teacher knows which student handed in which sheet. Your server must find that out itself. And it can't believe what the browser says about it.

> **In short:** the trust boundary is the line between the browser (the user controls it) and the server (you control it). The server must check everything that comes from the browser.

---

## How it goes wrong

AI tools often put important decisions in the frontend. The app still works when you test it, because you don't try to cheat your own app. Look for these three patterns.

**1. The browser decides something that matters.**
The browser counts the score, calculates a price or decides if an answer is right. Then it tells the server the result. The server believes it.

**2. A secret is in the frontend.**
A secret key, a password or a list of answers is inside code that runs in the browser. It looks hidden because it's not on the screen. It isn't hidden.

**3. A hidden button is the only protection.**
Say the AI adds a **"Delete all scores"** button for the **admin**. The admin is the person in charge of the app (you). The AI hides the button for everyone else. But a hidden button only changes what the page shows. The request to delete the scores still works for anyone who sends it.

> **Go deeper:** [Change one number in the URL, see everyone's invoices](/lessons/logged-in-doesnt-mean-allowed) (Level 2) shows how this mistake lets users change the data of others.

> **In short:** look for three things. The browser decides things, secrets are in frontend code, and hidden buttons are the only protection.

---

## What good looks like

Move every important decision to the backend.

**For the quiz game:**

1. The browser sends only the **answers** of the player: "Mars, Saturn, 8, The Sun."

2. The backend checks them against the answer key. The answer key lives only on the server.

3. The backend counts the score and saves it.

Sam can still change things in their browser. But the worst that Sam can do is send wrong answers. The server counts the score, and Sam can't reach it.

**For secrets:** keep secret keys on the backend. Sometimes the frontend needs something from another service. Then it asks your backend, and your backend uses the key.

**For buttons:** you can hide the admin button, so other players aren't confused. But the backend must also check who is asking before it deletes anything.

**Checks in the browser are still useful.** Say your sign-up form shows "Please type your name" when the name box is empty. That's helpful, because the user sees the message instantly. Keep it. But the server must check again, because anyone can skip the check in the browser.

> **Go deeper:** [Can strangers read your whole database? Check in 5 minutes](/lessons/never-trust-the-browser) (Level 2) covers checks on the server in detail.

> **In short:** the frontend shows things and collects what the user types. The backend checks it and makes every decision that matters.

---

## Try it yourself

You need a laptop or desktop computer with Chrome.

### Experiment 1: Change a website

1. Open any news website or a Wikipedia article.
2. Right-click the big headline and choose **Inspect**.
3. Developer tools open, on a tab called **Elements**. It shows the HTML of the page, with the line of the headline highlighted.
4. In that panel, double-click the text of the headline.
5. Type something new and press Enter.

The headline on the page changes. You "rewrote" the news!

Now reload the page. The real headline is back.

What happened? You changed only **your copy** of the page, inside your own browser. The server and every other visitor didn't notice. Users can do the same to your frontend.

### Experiment 2: Read the code of a website

1. On any website, press **Ctrl+U** on Windows, or **Cmd+Option+U** on Mac.
2. A new tab opens with the HTML of the page.

Everything in that tab came to your browser. Any visitor can read it. Before you put something in your frontend, ask yourself: *"Am I OK with every visitor reading this?"*

---

## Takeaways

**Key terms**

| Term | Meaning |
|---|---|
| **Frontend** | The part of your app that runs in the browser of the user (HTML, CSS and JavaScript) |
| **Backend** | The part of your app that runs on your server |
| **Trust boundary** | The line between the browser, which the user controls, and the server, which you control |
| **Secret key** | A long password that lets your app use another service |

**Red flags in AI-written code**

- The browser calculates a score, a price or "is this answer right?". Then it sends the result to the server.

- Answers, passwords or secret keys are in code that runs in the browser.

- The page hides a button from some users, but nothing on the server checks who is asking.

- Someone says "It's safe, nobody can see that part".

**Ask your AI**

- *"Which parts of my app run in the browser, and which run on the server?"*

- *"Is there any secret key, password or answer in my frontend code?"*

- *"List every decision my app makes in the browser. Which ones should the server make instead?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**The line is about where code runs, not which folder it's in.** Next.js is a tool for building web apps. Tools like it let you write frontend and backend code in the same project, sometimes in the same file. Some code even runs on the server first and then again in the browser. To know which side a piece of code is on, ask "where does this run?". Don't ask "which folder is it in?". If you're not sure, ask your AI.

**Some settings go to the browser on purpose.** In Next.js, some setting names start with `NEXT_PUBLIC_`. Next.js copies these settings into the JavaScript that goes to the browser. Settings without that start stay on the server. Never put a secret in a `NEXT_PUBLIC_` setting. Other tools have similar name starts. [Your app's secrets don't belong in your code. Here's where they go](/lessons/environment-variables) covers this.

**Squashed code is still readable.** Before people use your app online, its frontend code is usually squashed into fewer, shorter files. This makes it load faster. It also makes it harder for people to read, but not secret. Developer tools can lay it out again, and secrets inside it are still plain text.

**The name of the mistake.** Security lists call this mistake "Client-Side Enforcement of Server-Side Security" (CWE-602). It means the server depends on the browser to protect the server.

</details>

## References

- [Get started with viewing and changing the DOM](https://developer.chrome.com/docs/devtools/dom): Chrome for Developers. Editing a page's content in the Elements panel.
- [JavaScript debugging reference](https://developer.chrome.com/docs/devtools/javascript/reference): Chrome for Developers. Pausing code, editing variable values while paused, and making squashed (minified) files readable.
- [How to use environment variables in Next.js](https://nextjs.org/docs/app/guides/environment-variables): Next.js. Variables starting with `NEXT_PUBLIC_` are put into the JavaScript sent to the browser; others stay on the server.
- [CWE-602: Client-Side Enforcement of Server-Side Security](https://cwe.mitre.org/data/definitions/602.html): MITRE. The name of the mistake where a server relies on the browser to protect it.
- [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html): OWASP. Checks in the browser can be bypassed, so the server must check again.
- [Chrome keyboard shortcuts](https://support.google.com/chrome/answer/157179): Google Chrome Help. Ctrl+U (Windows) or Cmd+Option+U (Mac) shows the HTML source of a page.
