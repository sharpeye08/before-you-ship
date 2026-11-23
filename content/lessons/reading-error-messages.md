---
title: "The error message is telling you what's wrong. Read it first"
slug: reading-error-messages
order: 14
level: 1
levelName: Foundations
concepts: [Errors, Stack traces, Logs, Terminal, Browser console]
readTime: 11 min
quiz:
  - question: "Your terminal shows: TypeError: Cannot read properties of undefined (reading 'name'). What went wrong?"
    options:
      - text: "Your internet connection dropped"
      - text: "The code tried to read name from something that has no value"
        correct: true
      - text: "A package called name is not installed"
      - text: "The user typed their name wrong"
    explanation: "undefined means \"no value\". The code tried to read name from something that was undefined, so the program stopped."

  - question: "A stack trace has lines pointing to node_modules/router/lib/layer.js, node:internal/process/execution, and /home/sam/quiz-app/src/scores.js. Which line should you look at first?"
    options:
      - text: "The node_modules line, because packages are usually broken"
      - text: "The node:internal line, because Node.js is the problem"
      - text: "The last line of the trace, whatever it says"
      - text: "The scores.js line, because it's the first line from your own code"
        correct: true
    explanation: "Lines with node_modules come from packages. Lines starting with node: come from Node.js itself. The first line from your own project is usually the best place to start."

  - question: "The error points to scores.js:3:36. What does the 3 mean?"
    options:
      - text: "Line 3 of scores.js"
        correct: true
      - text: "The third time the error happened"
      - text: "There are 3 errors"
      - text: "Version 3 of the file"
    explanation: "The format is file:line:column. So scores.js:3:36 means line 3 of scores.js, at character 36 of that line."

  - question: "The browser Console says: \"Failed to load resource: the server responded with a status of 500 (Internal Server Error)\". Where do you find out why?"
    options:
      - text: "Nowhere. A 500 error has no details."
      - text: "In the browser's address bar"
      - text: "In the terminal where your server is running"
        correct: true
      - text: "By reloading the page until it works"
    explanation: "A 500 means the server had a problem. The browser only knows that the request failed. The server's error, with its stack trace, appears in the terminal where the server runs."

  - question: "After one change, your terminal shows 30 errors. Which one should you read first?"
    options:
      - text: "The first one, because the others are often caused by it"
        correct: true
      - text: "The last one, because it's the newest"
      - text: "Any one. They're all the same."
      - text: "None. Paste all 30 and ask the AI to guess."
    explanation: "One problem often causes many more errors after it. The first error is usually closest to the real cause."

  - question: "Which message gives your AI the best chance of fixing the bug?"
    options:
      - text: "\"It doesn't work, please fix it\""
      - text: "A screenshot of the blank page"
      - text: "The full error text, where it appeared, what you did, and what you changed recently"
        correct: true
      - text: "Only the last line of the error"
    explanation: "With the full error and some context, the AI can see which file and line failed and why. Without them, it has to guess, and guesses often change code that wasn't broken."
---

# The error message is telling you what's wrong. Read it first

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Frontend and backend:** the part of your app that runs in the browser, and the part that runs on a server. *([A player scored 999,999 points by editing the page. How?](/lessons/frontend-and-backend))*
> - **Terminal:** a window where you type commands for your computer to run. *([It works on my laptop. Why can't my friend open it?](/lessons/localhost-vs-production))*
> - **Developer tools:** hidden browser panels that show what a page is doing. *([Take a web page apart and see what's inside](/lessons/what-a-web-page-is-made-of))*
> - **Status code:** a number in a server's response that says how it went, like 404 or 500. *([Every website is a conversation. Here's how it goes](/lessons/http-requests-and-responses))*

## "It doesn't work"

Your quiz game has a "Show winner" button. You click it, and nothing happens.

You type to your AI: "It doesn't work, please fix it." The AI guesses. It changes five files. Now two things are broken instead of one.

Meanwhile, in your terminal, there was a message that said exactly what broke. It looked like this:

```text
TypeError: Cannot read properties of undefined (reading 'name')
    at showWinner (/home/sam/quiz-app/src/scores.js:3:36)
```

It's normal if that looks like nonsense right now. By the end of this lesson, you'll read it like a sentence. It names the problem, the file and the exact line.

Reading an error takes about thirty seconds. It's one of the most useful skills for fixing bugs.

---

## An error is a message, not a disaster

When a program hits a problem it can't handle, it stops and prints an **error message**. This isn't the computer being angry with you. It's the program telling you what went wrong.

Think of a game that says "You need the blue key to open this door." The message is annoying, but it tells you exactly what's missing.

Most JavaScript errors start with a line like this one:

```text
TypeError: Cannot read properties of undefined (reading 'name')
```

It has two parts:

- **Before the colon:** the type of error. Here it's `TypeError`.
- **After the colon:** the details. Here, the code tried to read `name` from something that was **undefined**. In JavaScript, `undefined` means "no value here".

Here are some errors you'll meet often:

| Error | What it means |
|---|---|
| `ReferenceError: score is not defined` | The code uses a name that doesn't exist. Maybe a typo, or it was never created. |
| `TypeError: Cannot read properties of undefined (reading 'name')` | The code tried to read `name` from something with no value. |
| `SyntaxError: Unexpected token '}'` | The code is written incorrectly, like a missing bracket. The program can't even start. |
| `Error: Cannot find module 'express'` | A package isn't installed. Run `npm install`. |
| `Error: listen EADDRINUSE: address already in use :::3000` | Another program is already using the number 3000 in `localhost:3000`. Maybe your app is already running in another terminal. |

> **Go deeper:** [It works on my machine, but not on yours. Blame the packages](/lessons/packages-and-dependencies) (Level 1) explains the "Cannot find module" error.

> **In short:** an error message names the type of problem and gives details. It's a clue, not a punishment.

---

## The stack trace: footprints back to the problem

Here's the full error from the start of the lesson, as it appeared in the terminal:

```text
TypeError: Cannot read properties of undefined (reading 'name')
    at showWinner (/home/sam/quiz-app/src/scores.js:3:36)
    at /home/sam/quiz-app/src/server.js:5:12
    at Layer.handleRequest (/home/sam/quiz-app/node_modules/router/lib/layer.js:169:33)
    at next (/home/sam/quiz-app/node_modules/router/lib/route.js:163:13)
    at Route.dispatch (/home/sam/quiz-app/node_modules/router/lib/route.js:123:3)
```

The lines that start with `at` are called a **stack trace**. They show where the program was when it stopped, newest first.

Think of footprints in the snow. The top line is where the program fell over. Each line below it is one step back along the path that led there.

Each line has up to three parts:

- **A name**, like `showWinner`. This is the **function** that was running. A function is a named piece of code that does one job.
- **A file**, like `/home/sam/quiz-app/src/scores.js`.
- **Two numbers**, like `3:36`. The first is the line number. The second is the column: how many characters along that line.

So `scores.js:3:36` means: file `scores.js`, line 3, character 36. Here's that file:

```js
function showWinner(players) {
  const winner = players[0];
  return "The winner is " + winner.name;
}
```

In plain English:

- **Line 1:** a function called `showWinner` receives a list of players.
- **Line 2:** it takes the first player in the list and calls it `winner`.
- **Line 3:** it reads the winner's `name`.

If the list is empty, there is no first player. So `winner` is `undefined`, and reading `winner.name` on line 3 fails. The error pointed straight at it.

> **In short:** a stack trace lists where the program was when it stopped, newest first. `file:line:column` tells you exactly where to look.

---

## Find the first line from your own code

Not every line in a stack trace is about your code. Here's how to tell them apart:

| The line contains... | Whose code is it? |
|---|---|
| `node_modules` | A package someone else wrote. The bug is rarely here. |
| `node:` at the start, like `node:internal/...` | Node.js's own code. The bug is almost never here. |
| Your project folder, without `node_modules` | **Your code.** Start here. |

So read from the top, and stop at **the first line from your own code**. In our example, that's `scores.js:3`.

Now look at the next line from your code: `server.js:5`. That's the code that *called* `showWinner`. It gave it an empty list. So the real mistake might be there: why was the list empty?

This is an important idea. **The line where the program crashed is where the problem was noticed.** It isn't always where the mistake was made. Follow the footprints back one or two steps.

One more tip: if your terminal shows many errors, scroll up and read **the first one**. One problem often causes many more errors after it.

> **In short:** skip lines from `node_modules` and `node:`. Start at the first line from your own code, then look one step back.

---

## Two places errors show up

Your app runs in two places: the frontend in the browser, and the backend on a server. So errors show up in two places too.

| Where the code runs | Where its errors appear |
|---|---|
| Backend (server) | The terminal where you started your app |
| Frontend (browser) | The browser's Console |

The **Console** is a tab in the browser's developer tools. It shows messages from the page's JavaScript, and errors appear in red. In Chrome, press **F12** on Windows or **Cmd+Option+J** on Mac, then click the **Console** tab. Next to each error, there's a link with the file name and line number. Click it to see the line.

### The tricky case

Your page asks the server for the winner. The server crashes. In the Console, you only see a line like this:

```text
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

Status code 500 means "the server had a problem". The browser knows *that* the request failed, but not *why*. The why, with the full stack trace, is in the **terminal**.

So when something breaks, check both places.

### Logs

The text your server prints in the terminal is called its **logs**: messages a program writes while it runs, including errors. Programmers can add their own messages too, with `console.log("...")`.

When your app runs on the internet, there's no terminal on your laptop to look at. Your hosting service shows the logs on its website instead.

> **Go deeper:** [Your app was down for six hours and nobody noticed](/lessons/logging-and-monitoring) (Level 3) covers logs for apps with real users.

> **In short:** backend errors appear in the terminal. Frontend errors appear in the browser's Console. A 500 in the Console means: go read the terminal.

---

## How it goes wrong

These habits make the AI guess, and guessing breaks more things:

- **"It doesn't work."** The AI can't see your screen. It has to guess what "it" is.
- **Pasting only the last line**, or only the 500 from the Console. The stack trace, with the file and line, is the most useful part.
- **A cropped screenshot.** It can cut off half the stack trace. Copy the text when you can. Text can't be blurry or cut off.
- **Pasting the 30th error** instead of the first.
- **Letting the AI change many files** for one error, without knowing which line failed.
- **Pasting secrets.** Errors and logs sometimes contain passwords, keys or full database addresses. Check before you paste, and replace them with `[REMOVED]`.

> **Go deeper:** [Your app's secrets don't belong in your code. Here's where they go](/lessons/environment-variables) (Level 1) explains which values are secret.

> **In short:** vague questions and half errors make the AI guess. Secrets in errors should never be pasted.

---

## What good looks like

Before you paste, spend thirty seconds reading:

1. **What type of error is it, and what does the message say?**
2. **Which is the first line from your own code?** Open that file at that line.
3. **Where did it appear?** The terminal or the browser Console?
4. **What did you do right before it happened?**

Then give your AI the full picture. You can copy this layout:

```text
What I did: clicked "Show winner" on the results page
What I expected: the winner's name
What happened: nothing on the page
Where the error appeared: the terminal (server)
Full error: [paste the whole error, with all the "at" lines]
What changed recently: the AI added a high-score board
```

Finish with: *"Explain the cause before you change any code."* You'll learn what went wrong, and the AI has to understand the bug before it touches anything.

> **In short:** read the error type, find your first line, note where it appeared, and give the AI all of it with some context.

---

## Try it yourself

### Experiment 1: make errors in the browser

1. Open any website, like `example.com`, on a computer with Chrome.
2. Open developer tools and click the **Console** tab.
3. Type `scores.total` and press Enter. You'll see a red `ReferenceError` saying `scores` is not defined.
4. Type `let player;` and press Enter. Then type `player.name` and press Enter. You'll see the `TypeError` from this lesson.

This is safe. What you type in the Console only runs in your own tab. It disappears when you reload the page.

### Experiment 2: make an error in the terminal

You need Node.js for this. In your terminal, type:

```bash
node -e "let player; console.log(player.name)"
```

Node.js runs that tiny piece of code and stops with an error. Read it like this lesson taught you:

- Find the error type and message.
- Find the `^` symbol. It points at the exact spot in the code.
- Look at the `at` lines. The ones starting with `node:` are Node.js's own code. `[eval]` is the code you typed.

---

## Takeaways

**Key terms**
- **Error message:** a program telling you what went wrong. Type, then details.
- **undefined:** JavaScript's way of saying "no value here"
- **Stack trace:** the list of places the program was when it stopped, newest first
- **Function:** a named piece of code that does one job
- **Console:** the developer tools tab that shows the page's messages and errors
- **Logs:** messages a program writes while it runs

**Where to look**
- Server or backend broke → the terminal where your app runs
- Page or button broke → the browser Console
- Console shows a 500 → the real error is in the terminal
- Many errors → scroll up to the first one
- Long stack trace → the first line from your own code, then one step back

**Ask your AI**
- *"Here is the full error and what I did before it happened: [paste]. Explain the cause in simple words before changing any code."*
- *"Which line in this stack trace is from my own code, and what is that line doing?"*
- *"Is there anything secret in this error that I should remove before sharing it?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Python prints it the other way round.** A Python error starts with `Traceback (most recent call last):`, and the error type and message are on the **last** line. So in Python, read from the bottom up. In JavaScript, read from the top down.

**Stack traces are cut short.** Node.js and Chrome keep only the 10 most recent steps by default. You can change this with `Error.stackTraceLimit`. That's why long traces can stop before reaching the code that started everything.

**"Uncaught" in the Console.** In Chrome, errors that no code handled start with `Uncaught`, like `Uncaught ReferenceError`. Catching and handling errors is a skill of its own, covered in [Your error page showed your database details to everyone](/lessons/handling-errors).

**Strange file names in production.** Before frontend code goes live, it's usually squeezed into a few large files with short, unreadable names. Stack traces from those files are hard to read. Files called **source maps** let developer tools translate them back to your original files and lines.

**Errors with a cause.** Some errors carry another error inside them. Chrome's Console shows these with a "Caused by:" line. Read all of them.

**Where the example came from.** The stack trace at the start of this lesson came from running its code with Express 5 on Node.js 24. Only the folder name was changed.

</details>

## References

- [Errors](https://nodejs.org/api/errors.html): Node.js docs. The format of a stack trace (`Error type: message`, then `at` lines with `file:line:column`), the default limit of 10 steps, and what `EADDRINUSE` means.
- [TypeError: "x" is (not) "y"](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Unexpected_type): MDN Web Docs. The `Cannot read properties of undefined (reading '...')` message and what causes it.
- [ReferenceError: "x" is not defined](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Not_defined): MDN Web Docs. The `is not defined` message and what causes it.
- [Open Chrome DevTools](https://developer.chrome.com/docs/devtools/open): Chrome for Developers. Keyboard shortcuts for opening DevTools and the Console, including F12 and Cmd+Option+J.
- [Log messages in the Console](https://developer.chrome.com/docs/devtools/console/log): Chrome for Developers. The Console shows uncaught errors and failed network requests from the page.
- [Console features reference](https://developer.chrome.com/docs/devtools/console/reference): Chrome for Developers. Stack traces in the Console, with the newest step on top, and the "Caused by:" lines for errors with a cause.
- [Debug your original code instead of deployed with source maps](https://developer.chrome.com/docs/devtools/javascript/source-maps): Chrome for Developers. What source maps do.
- [Errors and Exceptions](https://docs.python.org/3/tutorial/errors.html): Python docs. Python's `Traceback (most recent call last):` format, with what happened on the last line.
