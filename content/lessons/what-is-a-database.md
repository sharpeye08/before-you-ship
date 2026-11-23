---
title: "Your app forgot everyone's messages overnight. Why?"
slug: what-is-a-database
order: 8
level: 1
levelName: Foundations
concepts: [Database, Tables, Rows, Persistence]
readTime: 12 min
quiz:
  - question: "Your app saves messages like this: read the whole JSON file, add the new message, write the whole file back. Leo and Mia post at the same moment. Both see \"sent\", but only Mia's message is saved. Why?"
    options:
      - text: "Leo's message was too long"
      - text: "Both requests read the old file. Mia's request wrote last, and her copy didn't have Leo's message in it."
        correct: true
      - text: "JSON files can only hold one message at a time"
      - text: "Leo's internet was too slow"
    explanation: "Each request worked on its own copy of the old list. The second write replaced the first one, so Leo's message was wiped out. This is called a race condition."

  - question: "Your class wall saves messages to a JSON file. It works for a week. Then you deploy a new version with a different background color, and every message is gone. What happened?"
    options:
      - text: "Changing the color deleted the messages"
      - text: "Someone hacked the app"
      - text: "The hosting company started your app from a fresh copy of your code, and the file your app wrote was thrown away"
        correct: true
      - text: "The messages are still there, but hidden"
    explanation: "Many hosting companies give your app a clean copy of its code on every deploy or restart. Files your app wrote while running are not kept. The data was not persistent."

  - question: "Which of these is fine to keep in a JSON file?"
    options:
      - text: "The 10 quiz questions that are part of your code and never change while the app runs"
        correct: true
      - text: "The messages your users post"
      - text: "The high scores from every player"
      - text: "The list of everyone who signed up"
    explanation: "Reading a JSON file that ships with your code is fine. The problems start when your app writes user data into a file while it runs."

  - question: "Your database has a table called messages. What is one row in that table?"
    options:
      - text: "One detail, like the author of every message"
      - text: "The whole database"
      - text: "One kind of thing, like all the messages"
      - text: "One message, with all its details"
        correct: true
    explanation: "A table holds one kind of thing. Each row is one item of that kind, here one message. Each column is one detail about it, like the author or the text."

  - question: "Your app restarts on its own during the night. What happens to the data in its database?"
    options:
      - text: "It is deleted, because everything restarts"
      - text: "It is still there, because the database keeps data persistent and usually runs separately from your app"
        correct: true
      - text: "It is only kept if a user is online"
      - text: "It is kept only until the next deploy"
    explanation: "Persistent data survives restarts and deploys. The database usually runs on its own computer, so restarting your app doesn't touch it."

  - question: "Your class wall has a million messages in one JSON file. You want to show only Mia's messages. What does your app have to do?"
    options:
      - text: "Nothing special. It's instant."
      - text: "Send the whole file to the browser and let it search"
      - text: "Read the whole file and check every single message, on every visit"
        correct: true
      - text: "Delete the other messages first"
    explanation: "A file has no way to find things quickly. The app has to read all of it, every time. A database is built to find things fast without checking every row."
---

# Your app forgot everyone's messages overnight. Why?

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Server:** a computer that waits for requests and answers them. *([You pressed Enter. What happened in the next second?](/lessons/what-happens-when-you-open-a-website))*
> - **Backend:** the part of your app that runs on your server. *([A player scored 999,999 points by editing the page. How?](/lessons/frontend-and-backend))*
> - **Endpoint:** one address on your server that does one job, like `POST /api/messages`. *([The hidden conversation behind every button you tap](/lessons/what-is-an-api))*
> - **JSON:** a text format for data, like `{ "author": "Mia" }`. *([The hidden conversation behind every button you tap](/lessons/what-is-an-api))*

## The messages that vanished

You build a "class wall" with an AI. Your classmates can post short messages that everyone in the class can read. It's like a group chat on a web page.

The AI saves every message in a file called `messages.json`. You test it. You post a message, reload the page, and it's still there. It works!

You share the link with your class. Then two strange things happen.

**On Monday,** Leo sends you a message: *"I posted something and it said 'sent'. Now it's gone."*

**On Tuesday,** you ask the AI to change the page's background color. You put the new version online. Every message anyone ever posted is gone.

No error message. Nothing crashed. The data disappeared.

Saving to a file is a normal first idea, and it works while you test alone. This lesson explains why it breaks with real users, and what to use instead.

---

## Where should the messages live?

Your class wall needs somewhere to keep messages, so they're still there next week. Each user's browser only has its own copy of the page, so the messages must live on the server, in the backend.

The AI's first idea is a JSON file. Here's the endpoint that saves a new message:

```js
app.post("/api/messages", async (req, res) => {
  const text = await fs.readFile("messages.json", "utf8");
  const messages = JSON.parse(text);
  messages.push({ author: req.body.author, text: req.body.text });
  await fs.writeFile("messages.json", JSON.stringify(messages));
  res.json({ ok: true });
});
```

In plain English:

1. **Line 1:** when someone posts a new message, run this code.
2. **Line 2:** read the whole `messages.json` file as text.
3. **Line 3:** turn that text into a list of messages.
4. **Line 4:** add the new message to the end of the list.
5. **Line 5:** turn the list back into text, and write it over the whole file.
6. **Line 6:** answer "OK, sent".

With one user, this is fine. Let's see what happens with a whole class.

> **In short:** your app needs a place on the server to keep data that lasts. A JSON file is the first idea most people try: read the whole file, change it, write it all back.

---

## How it goes wrong

### Problem 1: Two people at the same time

Leo and Mia post at the same moment. The file already has 2 messages. Here's what the server does, step by step:

| Step | Leo's request | Mia's request |
|---|---|---|
| 1 | Reads the file: 2 messages | |
| 2 | | Reads the file: 2 messages |
| 3 | Adds his message: now 3 | |
| 4 | | Adds her message: now 3 |
| 5 | Writes his 3 messages to the file | |
| 6 | | Writes her 3 messages to the file |

Look at step 6. Mia's list was read in step 2, before Leo's message existed. When her request writes the file, it replaces Leo's version. The file now has the 2 old messages and Mia's. **Leo's message is gone.** And both of them were told "sent".

Picture a list of names on the class whiteboard. Two students each copy the list onto paper and add their own name. Then each one wipes the board and writes their paper's list. Whoever writes second wipes out the other person's name.

This kind of bug is called a **race condition**: the result depends on which request finishes first, like a race. You never see it while testing alone, because you never post twice at the same moment.

> **Go deeper:** [A customer got charged twice. How?](/lessons/charged-twice) (Level 4) shows race conditions with real money.

> **In short:** when two requests read and write the same file at once, one can wipe out the other. This is a race condition.

### Problem 2: The file disappears

Putting a new version of your app online is called **deploying**.

> **Go deeper:** [It works on my laptop. Why can't my friend open it?](/lessons/localhost-vs-production) (Level 1) explains deploying.

On your laptop, `messages.json` stays where it is. But on the internet, your app runs on computers owned by hosting companies: companies that run apps on the internet for you. Many of them work like this:

- Every time you deploy, your app starts from a **fresh, clean copy** of your code.
- Every time your app restarts, it starts from that clean copy too. Some companies restart apps on their own from time to time.
- Files your app wrote while it was running are **thrown away**.
- Some don't let your app write files at all, except in a temporary folder that gets wiped.

So on Tuesday, when you deployed the new color, your app got a fresh copy of your code. The `messages.json` file in that copy was the one from your laptop, without your classmates' messages. All the messages your class posted were on the old copy, and the old copy was thrown away.

Data that survives restarts and deploys is called **persistent**. Your JSON file was not persistent.

> **In short:** many hosting companies start your app from a clean copy on every deploy or restart. Files your app wrote are lost. That data was not persistent.

### Problem 3: Finding one thing means reading everything

Now say your class wall becomes popular. The whole school uses it, and the file grows to a million messages.

You want a page that shows only Mia's messages. With a file, your app has to:

1. Read the **whole** file, all million messages.
2. Check them one by one: "Is this Mia's? Is this Mia's?"

And it does this every time anyone opens that page. It's like finding every mention of "volcano" in a huge book with no index at the back. With 20 messages, nobody notices. With a million, your app gets slow.

> **In short:** to find anything in a file, the app must read all of it, on every request. This gets slower as the file grows.

---

## What good looks like: a database

### What a database is

A **database** is a program whose whole job is to keep data safe and find it again quickly.

Think of a school library. You don't keep every book in your school bag. You ask the librarian, who finds the book on the right shelf using the catalogue. The library stays open even when you go home.

Your app works with a database in a similar way:

- Usually, the database runs on its **own server**, separate from your app.
- Your backend sends the database requests: "save this message", "give me Mia's messages".
- The database answers.

Here's how a database fixes each problem:

| Problem | How a database fixes it |
|---|---|
| Two people at once | Adding a new message never rewrites the others. Many requests can save at the same time. |
| The file disappears | The database lives outside your app, so it keeps its data when your app restarts or you deploy. It's also built so that a crash in the middle of saving doesn't leave half-saved data. |
| Finding one thing | The database keeps extra lists, like the index at the back of a book, so it can find things without reading everything. |

**Where this comparison stops working:** a librarian can guess what you mean. A database can't. You have to ask it in its own language, in exactly the right way.

> **Go deeper:** [Fast with 100 users, frozen at 10,000. The missing index](/lessons/database-indexes) (Level 4) explains the database's "index at the back of the book".

> **In short:** a database is a program built to store data safely and find it fast. It usually runs separately from your app, so your data is persistent.

### Tables and rows

Most databases you'll meet organize data into **tables**. A table looks a lot like a spreadsheet. Here's a table called `messages`:

| id | author | text | posted_at |
|---|---|---|---|
| 1 | Leo | Who has the maths homework? | Monday 08:15 |
| 2 | Mia | Page 42, exercises 1 to 5 | Monday 08:17 |
| 3 | Sam | Thanks Mia! | Monday 08:20 |

- A **table** holds one kind of thing. This one holds messages. Another table might hold players, or scores.
- Each **row** is one item: here, one message.
- Each column is one detail about every item: who wrote it, what it says, when.
- The `id` column holds a number the database gives each row, so it can tell them apart.

**Where this comparison stops working:** in a spreadsheet, you can type anything anywhere. Databases like PostgreSQL are strict: each column holds one kind of value. If the `id` column is for numbers, the database refuses to save the word "banana" there. This strictness protects your data from mistakes.

> **Go deeper:** [You changed your name. Half the app still shows the old one](/lessons/designing-tables) (Level 2) shows how to design tables and connect them to each other.

> **In short:** a table holds one kind of thing. Each row is one item. Each column is one detail about it.

### Talking to a database

Many databases understand a language called **SQL**. People say it as "S-Q-L" or "sequel". Here's how your backend could save Leo's message and then find Mia's:

```sql
INSERT INTO messages (author, text)
VALUES ('Leo', 'Who has the maths homework?');

SELECT * FROM messages WHERE author = 'Mia';
```

In plain English:

1. **Lines 1–2:** add a new row to the `messages` table, with Leo as the author and his question as the text. The database fills in the `id` itself. (In SQL, text goes in single quotes. In JSON, it goes in double quotes. Yes, it's confusing.)
2. **Line 4:** give me every column (`*` means "all") of every row in `messages` where the author is Mia.

There's no "read the whole file" and no "write it all back". Your app says what it wants, and the database does the careful work. Often the AI uses tools that write SQL for you, but it helps to recognize it.

> **In short:** your backend talks to the database in a language like SQL: "add this row", "find these rows".

### When a JSON file is fine

JSON files aren't bad. Reading a JSON file is fine when the data is **part of your code** and doesn't change while the app runs. For example:

- The 10 questions in your quiz game
- A list of countries for a drop-down menu
- Your app's settings

The problems start when your app **writes** to a file while it runs, especially data from users.

> **In short:** read-only data that ships with your code can live in a JSON file. Data that users create belongs in a database.

---

## Try it yourself

### Experiment 1: Play the race

You need a friend and three sheets of paper.

1. Write two names on the big sheet. This is your "file".
2. You and your friend each copy the list onto your own sheet. Do it at the same time.
3. Each of you adds your own name to your sheet.
4. You go first: cross out the big sheet and write your list on it.
5. Your friend goes second: crosses it out and writes their list.

Count the names. One is missing. That's exactly what happened to Leo.

### Experiment 2: Design a table

Pick something you'd like to build: a game leaderboard, a book club list, a list of football matches.

On paper or in any spreadsheet app, draw its table:

1. What is one **row**? (One player? One book? One match?)
2. What **columns** does each row need? Start with `id`.
3. Fill in three example rows.

You've designed your first database table.

---

## Takeaways

**Key terms**
- **Database:** a program built to store data safely and find it quickly
- **Table:** a set of rows that hold one kind of thing, like messages
- **Row:** one item in a table, like one message
- **Persistent:** data that survives restarts and deploys
- **Race condition:** a bug where the result depends on which request finishes first
- **Deploying:** putting a new version of your app online
- **SQL:** a language many databases understand

**Red flags in AI-written code**
- The app saves user data with `writeFile` or something similar, into a `.json` file
- "Read the whole file, change it, write it back" for every request
- Data that only lives in a list in the server's code, which is lost on every restart
- Everything works when you test alone, but data goes missing with real users

**Ask your AI**
- *"Where does my app save its data? Will that data survive a restart and a deploy on my hosting company?"*
- *"Does my app write user data to any files? If so, help me move it to a database."*
- *"Explain the tables in my database. What is one row in each table?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Why data in a list in your code is lost too.** If your backend keeps data in a list inside its code, the data lives in the computer's memory. Memory is wiped when the program stops. [Your app restarted and all the likes vanished](/lessons/how-a-computer-runs-your-code) explains memory and disk.

**Many copies of your app.** On many hosting platforms, several copies of your app can run at once to handle more visitors. Each copy has its own files. A message saved to a file in one copy is invisible to the others. Vercel's documentation says files written by one copy of a function can't be read by other copies, and don't survive after that copy stops.

**SQLite is a database in a file.** SQLite is a real database that keeps everything in one file on your disk. It handles crashes and many readers safely. But on hosting platforms that throw away files, its file is thrown away too. Vercel's documentation says a file-based database like SQLite can't keep your data in its functions.

**Databases don't fix every race.** Adding new rows is safe. But "read a number, add 1, write it back" can still go wrong if two requests do it at the same time, even in a database. [A customer got charged twice. How?](/lessons/charged-twice) covers transactions, the tool that fixes this.

**Don't put user text straight into SQL.** The SQL example above has the text typed in. Real code must never glue a user's text into SQL, or users can sneak in their own commands. [How one line of text can dump your whole database](/lessons/sql-injection) explains the safe way.

**Other kinds of databases.** Not every database uses tables. Some store data as JSON-like documents instead. [SQL or NoSQL? The AI chose for you. Was it right?](/lessons/sql-vs-nosql) compares them. Popular table-based databases include PostgreSQL, MySQL and SQLite. Supabase, which many AI tools use, gives every project a full PostgreSQL database.

</details>

## References

- [Dynos (App Containers)](https://devcenter.heroku.com/articles/dynos): Heroku Dev Center. Each copy of an app starts from a fresh copy of the deployed code, and files it writes are thrown away when it stops or restarts, including automatic restarts.
- [Runtimes](https://vercel.com/docs/functions/runtimes): Vercel Docs. Functions have a read-only filesystem with a writable `/tmp` that other copies can't read and that doesn't last, so a file-based database like SQLite can't keep data there.
- [Concepts](https://www.postgresql.org/docs/current/tutorial-concepts.html): PostgreSQL Documentation. Tables are made of rows, and each column has a specific data type.
- [Write-Ahead Logging (WAL)](https://www.postgresql.org/docs/current/wal-intro.html): PostgreSQL Documentation. How PostgreSQL recovers its data after a crash.
- [Atomic Commit In SQLite](https://www.sqlite.org/atomiccommit.html): SQLite. How SQLite keeps its file safe if the program crashes or the power fails in the middle of saving.
- [Database](https://supabase.com/docs/guides/database/overview): Supabase Docs. Every Supabase project gets a full Postgres database.
