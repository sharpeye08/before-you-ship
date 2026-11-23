---
title: "Your app restarted and all the likes vanished"
slug: how-a-computer-runs-your-code
order: 9
level: 1
levelName: Foundations
concepts: [CPU, Memory, Disk, Process]
readTime: 11 min
quiz:
  - question: "You play a game for an hour without saving. The battery dies. When you turn the laptop on again, the game is still there, but your progress is gone. Why?"
    options:
      - text: "The game deleted your progress on purpose"
      - text: "The game is stored on the disk, but your unsaved progress was only in memory, and memory forgets when the power goes off"
        correct: true
      - text: "The CPU keeps your progress, and a dead battery breaks the CPU"
      - text: "Progress is always stored on the game company's server"
    explanation: "The game itself is a file on the disk, which keeps things without power. Your progress was only in memory until you saved it. Memory is wiped when the power goes off."

  - question: "Your server keeps the number of likes in a variable: let likes = 0. You get 50 likes, then you restart the server. How many likes does it show now?"
    options:
      - text: "50, because the server remembers"
      - text: "51"
      - text: "0, because the variable lived in memory and the process started again from the beginning"
        correct: true
      - text: "It depends on how fast the CPU is"
    explanation: "A variable lives in the process's memory. When the process stops, that memory is cleared. The new process runs let likes = 0 again. Data you need later belongs in a database."

  - question: "You start the same game twice, and the operating system makes a separate running copy each time. What is running on your computer now?"
    options:
      - text: "Two processes made from one program"
        correct: true
      - text: "One process, because a program can only run once"
      - text: "Two copies of the game file on the disk"
      - text: "Nothing new, because the game was already installed"
    explanation: "A program is the set of instructions stored on the disk. Each time you start it, the operating system creates a new process: a running copy with its own space in memory."

  - question: "Task Manager shows one app using almost 100% CPU, and your computer feels slow. What is that app most likely doing?"
    options:
      - text: "Saving lots of files to the disk"
      - text: "Waiting for you to click something"
      - text: "Using up all the space on the disk"
      - text: "Keeping the CPU busy with instructions nonstop, for example stuck repeating the same steps"
        correct: true
    explanation: "The CPU column shows how much of the CPU's time a process is using. Near 100% means it is keeping the CPU busy without a break. One common cause is code stuck repeating the same steps forever. Other processes have to wait for their turn."

  - question: "Your app was running. You closed the window that started it. Now the app's page won't load. What happened?"
    options:
      - text: "The app's code was deleted from the disk"
      - text: "Closing the window stopped the app's process, so nothing is running to answer requests"
        correct: true
      - text: "Your memory is full"
      - text: "The CPU turned itself off"
    explanation: "Your code is still safe on the disk. But a program only does something while it runs as a process. Closing the window that started it usually stops the process. Start it again and the page will load."

  - question: "Your app has a list of users' high scores. Where should it keep them so they survive a restart?"
    options:
      - text: "In a variable, because memory is fastest"
      - text: "In the CPU"
      - text: "In a database, which saves them to a disk"
        correct: true
      - text: "In the window that started the app"
    explanation: "Memory is fast, but it is cleared when the process stops. A database saves data on a disk, so it survives restarts and power cuts."
---

# Your app restarted and all the likes vanished

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Server:** a computer that waits for requests and answers them. *([You pressed Enter. What happened in the next second?](/lessons/what-happens-when-you-open-a-website))*
> - **Backend:** the part of your app that runs on the server, where users can't see or change it. *([A player scored 999,999 points by editing the page. How?](/lessons/frontend-and-backend))*
> - **Database:** a program that stores your app's data safely, so it is still there tomorrow. *([Your app forgot everyone's messages overnight. Why?](/lessons/what-is-a-database))*

## Where did my progress go?

You're playing a game on a laptop. You've played for an hour. You haven't saved.

Then the battery dies.

You plug in the charger and turn the laptop back on. The game is still there. You can open it. But the last hour of progress is gone.

Why did the computer keep the game, but lose your progress?

The answer is about the parts inside your computer. Every computer has them: your laptop, your phone, and the servers that run websites. When you build an app with AI, these parts explain some confusing problems:

- Data that disappears when your app restarts
- An app that stops working when you close a window
- A computer that suddenly gets slow

This lesson explains the three main parts, and what happens when you press **Run**.

> **In short:** a computer keeps some things and forgets others. Knowing which part does what explains why apps lose data or stop working.

---

## A computer is like a kitchen

We'll use a kitchen to explain the parts. Picture a cook making pancakes in a kitchen.

The kitchen has a cook who follows recipes. It has a worktop, where the cook does the work. And it has a cupboard, where food is kept for later.

A computer has a part for each of these. The next sections explain them one at a time.

> **In short:** we'll compare the computer to a kitchen with a cook, a worktop, a cupboard and recipes.

---

## The cook: the CPU

A recipe is a list of steps: *"crack two eggs, add milk, stir."* A recipe does nothing on its own. Somebody has to follow it.

In a computer, that somebody is the **CPU**. CPU is short for **Central Processing Unit**. It's a small chip inside your computer.

A program is also a list of steps, called **instructions**. The CPU reads one instruction and does it. Then it does the next one. Each instruction is tiny, like *"add these two numbers"* or *"copy this number over there"*.

So how can tiny steps make a game or a video call? Speed. A modern CPU does **billions** of tiny steps every second. Lots of tiny steps, done very fast, add up to everything your computer does.

The code your AI writes doesn't go straight to the CPU. First, it is turned into instructions the CPU understands. Tools do this for you.

> **In short:** the CPU is the chip that follows a program's instructions, one tiny step at a time, billions of times per second.

---

## The worktop: memory

The cook doesn't work inside the cupboard. They take out what they need and put it on the worktop. The worktop is close, so everything on it is quick to reach.

The computer's worktop is called **memory**. You'll also hear it called **RAM** (short for *Random Access Memory*). When people say "memory" about computers, they usually mean RAM.

Memory holds everything that's in use right now:

- The game you're playing
- Your progress since your last save
- The tabs open in your browser

The CPU can read memory very fast. That's why programs work there.

But memory has one big weakness. **It forgets everything when the power goes off.** That's what happened to your game progress. It was only in memory.

> **In short:** memory (RAM) is the fast workspace for things in use right now. When the power goes off, it is wiped clean.

---

## The cupboard: the disk

The cupboard keeps food for days, even when nobody is cooking. The computer's cupboard is the **disk**, also called **storage**.

The disk keeps things when the power is off. Your photos, your apps and your games all live on the disk, as **files**. That's why the game was still there after the battery died.

The disk is slower than memory, but it is usually much bigger. That's why computers use both: the disk to keep things, memory to work on them.

So what does **saving** mean? It means copying something from memory to the disk. Before you saved, your progress lived only in memory. After saving, a copy is safe on the disk.

Now the puzzle from the start is solved. The game is a file on the disk, so it survived. Your progress was only in memory, so it didn't.

> **In short:** the disk keeps files even without power, but it's slower than memory. Saving means copying something from memory to the disk.

---

## Pressing Run: a process starts

A recipe in a book is not the same as a pancake being cooked. One is instructions. The other is something happening right now.

Programs work the same way. A program on the disk is a file of instructions. It does nothing until you start it.

When you double-click an app, or press **Run**, this happens:

1. The program's instructions are copied from the disk into memory.
2. The program gets its own space in memory to work in.
3. The CPU starts following its instructions.

A program that is running is called a **process**.

Who organizes all this? The **operating system**. It's the main program that runs your computer, like Windows, macOS, Android or iOS. It's like the kitchen manager. It starts processes, gives each one its own space in memory, and decides which one the CPU works on next.

One program can become many processes. If you start the same game twice, the operating system can make two processes from it, each with its own memory. (Some apps, like most web browsers, notice they're already running and open a new window in the process they already have.)

When a process stops, the operating system clears its space in memory. Everything the process was holding is gone.

> **In short:** a process is a running program. The operating system starts it, gives it memory, and clears that memory when it stops.

---

## Where the kitchen idea stops working

Here is the whole kitchen in one table:

| In the kitchen | In the computer |
|---|---|
| The cook | The CPU |
| The worktop | Memory (RAM) |
| The cupboard | Disk |
| A recipe | A program |
| Cooking a recipe right now | A process |
| The kitchen manager | The operating system |

The kitchen helps, but it isn't perfect:

- **The worktop is wiped instantly.** In a real kitchen, food on the worktop stays there if the lights go out. Memory loses everything the moment the power stops.
- **The cook switches dishes very fast.** Your computer runs many processes, but the CPU can only work on a few at any moment. So it switches between processes many times every second. It's so fast that they all seem to run at once.
- **Each dish gets its own locked area.** In a kitchen, the cook can grab anything on the worktop. In a computer, the operating system stops a process from touching another process's memory.

> **In short:** memory is wiped instantly, the CPU takes turns between processes very fast, and each process's memory is kept apart.

---

## How it goes wrong

Your app's backend is a process too, running on a server. So everything above applies to it.

### Problem 1: Data kept only in memory

Here's a small piece of backend code, the kind an AI might write for a "like" button:

```js
let likes = 0;

function addLike() {
  likes = likes + 1;
  return likes;
}
```

In plain English:

1. **Line 1:** Make a **variable** called `likes` and set it to 0. A variable is a named box that holds a value. It lives in the process's memory.
2. **Lines 2–5:** Each time someone likes something, add 1 to `likes` and send back the new number.

It works. You get 50 likes. Then the server restarts.

Now the process starts again from the beginning. Line 1 runs again, and `likes` is back to 0. Your 50 likes are gone, like the unsaved game.

Servers restart more often than you'd think. They restart when you update your app, when it crashes and when the server itself is updated. **So memory is never a safe place for data you need later.** That's the job of a database, which saves data to a disk.

### Problem 2: The process stopped

You ask your AI to start your app. It works. Later you close a window, and now the app won't load.

Often, the window you closed was the one running your app's process. Close it, and the process stops. Your code is still safe on the disk. But code on a disk doesn't answer anyone. Only a running process does.

That window is usually a **terminal**: a window where you type text commands. [It works on my laptop. Why can't my friend open it?](/lessons/localhost-vs-production) explains how to use one.

### Problem 3: The computer gets slow

Two common reasons:

- **The CPU is too busy.** A process might be stuck repeating the same steps forever. It keeps the CPU working nonstop, and other processes have to wait.
- **Memory is full.** A process keeps adding things to memory and never lets them go. The computer slows down, and the process may crash.

> **Go deeper:** [Your server crashes every few days, like clockwork](/lessons/memory-leaks) (Level 4) explains how apps fill up memory, and how to stop it.

> **In short:** memory is cleared when a process stops, an app works only while its process runs, and a busy CPU or full memory makes everything slow.

---

## What good looks like

- **Keep important data in a database.** Use memory only for things you can lose, like a value you're working with right now.
- **Expect restarts.** Ask yourself: "If this process restarted right now, what would be lost?" The answer should be "nothing important".
- **Know which process is your app.** Know which window started it, how to stop it, and how to start it again.
- **When things get slow, look before you guess.** Check which process is using the CPU or memory (see below).

> **In short:** save what matters in a database, plan for restarts, and know where your app's process is running.

---

## Try it yourself

### Experiment 1: See your processes

Every computer has a tool that lists its processes.

- **Windows:** press **Ctrl+Shift+Esc** to open **Task Manager**. The **Processes** tab is the list.
- **Mac:** open **Activity Monitor**. It's in **Applications → Utilities**, or search for it with Spotlight (Cmd+Space).

Look at the columns:

- **CPU:** how much of the CPU's time each process is using right now
- **Memory:** how much memory each process is using. **MB** and **GB** are units of size for data, like grams and kilograms.

Scroll through the list. You'll find many processes you never started yourself. The operating system runs lots of them in the background.

### Experiment 2: Watch processes start and stop

1. Keep Task Manager or Activity Monitor open.
2. Open an app you don't have open yet, like a calculator. Watch a new process appear.
3. Close the app. Watch the process disappear.

**Bonus:** look for your browser. Chrome and some other browsers split themselves into many processes. They do this so that if one website crashes, it doesn't take the whole browser down with it.

---

## Takeaways

**Key terms**
- **CPU:** the chip that follows a program's instructions, billions of tiny steps per second
- **Memory (RAM):** the fast workspace for things in use right now. Wiped when the power goes off.
- **Disk (storage):** where files are kept, even without power. Slower than memory, but bigger.
- **Program:** a file of instructions on the disk
- **Process:** a program that is running right now
- **Operating system:** the main program that runs the computer and manages processes

**Which part is it?**
- Data disappeared after a restart → it was only in **memory**
- The app stopped answering after you closed a window → its **process** stopped
- Everything is slow and one app shows a high CPU number → the **CPU** is too busy
- Everything is slow and memory is almost full → **memory** is full

**Ask your AI**
- *"Does my app keep any important data only in memory, like in a variable? What would be lost if the server restarted?"*
- *"How do I start and stop my app's process? Which window is it running in?"*
- *"My computer is slow while my app runs. How do I check whether it's using too much CPU or memory?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**More than one cook.** Most CPUs today contain several **cores**. Each core can follow its own list of instructions, so a CPU with 8 cores can really do 8 things at the same moment. The operating system still switches between processes on each core, because there are usually far more processes than cores.

**Clock speed.** CPU speed is often shown in **GHz** (gigahertz). Intel explains that a 3.2 GHz CPU goes through 3.2 billion cycles per second. A cycle is one tick of the CPU's internal clock. Clock speed alone doesn't tell you which CPU is faster, because CPUs differ in how much work they do per cycle.

**From your code to CPU instructions.** CPUs understand only **machine code**: instructions written as numbers. JavaScript is turned into machine code while it runs. In Node.js and Chrome, a part called the V8 engine does this.

**When memory is full.** If processes need more memory than the computer has, the operating system can move some of it to the disk for a while. This is called **swap** or **virtual memory**. It keeps things running, but the disk is much slower than memory, so everything slows down.

**Processes have ID numbers.** The operating system gives each process a number called a **PID** (process ID). Task Manager and Activity Monitor can show it. In Node.js, a process can read its own PID from `process.pid`.

**Threads.** A process can split its work into **threads**, which take turns on the CPU (or run on different cores) while sharing the same memory. [One slow request froze the whole server](/lessons/event-loop) (Level 4) explains how Node.js handles this.

</details>

## References

- [What Is CPU Clock Speed?](https://www.intel.com/content/www/us/en/gaming/resources/cpu-clock-speed.html): Intel. A 3.2 GHz CPU goes through 3.2 billion cycles per second, and clock speed isn't the only thing that decides speed.
- [Multi-process Architecture](https://www.chromium.org/developers/design-documents/multi-process-architecture/): The Chromium Projects. Chrome uses many processes so that a bug in one part doesn't bring down the whole browser.
- [Process Models](https://www.chromium.org/developers/design-documents/process-models/): The Chromium Projects. How Chrome splits websites into separate processes.
- [V8 JavaScript engine](https://v8.dev/): V8. The engine that runs JavaScript in Chrome and Node.js.
- [process.pid](https://nodejs.org/api/process.html): Node.js Documentation. A Node.js process can read its own process ID.
- [Keyboard shortcuts in Windows](https://support.microsoft.com/en-us/windows/keyboard-shortcuts-in-windows-dcc61a57-8ff0-cffe-9796-cb9706c75eec): Microsoft Support. Ctrl+Shift+Esc opens Task Manager.
- [View information about Mac processes in Activity Monitor](https://support.apple.com/guide/activity-monitor/actmntr1001/mac): Apple Support. Processes are programs running on a Mac, and Activity Monitor shows how much memory and CPU time each one uses.
