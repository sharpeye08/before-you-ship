---
title: "How one line of text can dump your whole database"
slug: sql-injection
order: 23
level: 2
levelName: Builder
concepts: [SQL injection, Parameterized queries, ORMs, Raw queries, Allowlists]
readTime: 13 min
quiz:
  - question: "Your code builds a query like this: \"SELECT * FROM orders WHERE code = '\" + code + \"'\". What is the real problem?"
    options:
      - text: "The query is too slow"
      - text: "The user's text becomes part of the SQL command itself"
        correct: true
      - text: "The code must use double quotes, not single quotes"
      - text: "SELECT queries can't be used for searches"
    explanation: "When you glue user text into the query, the database cannot tell where your command ends and the user's text starts. A user can type SQL that changes what the command does. That is SQL injection."

  - question: "Your app uses a parameterized query. A user types ' OR '1'='1 into the order code box. What does the database do?"
    options:
      - text: "It runs the OR part and returns every order"
      - text: "It crashes with an error"
      - text: "It looks for an order whose code is exactly that strange text, and finds none"
        correct: true
      - text: "It deletes the orders table"
    explanation: "In a parameterized query, the value goes to the database separately from the command. The database treats it only as data: a strange order code that matches nothing."

  - question: "Your app uses an ORM like Prisma. The AI writes prisma.$queryRawUnsafe(\"SELECT * FROM users WHERE name = '\" + name + \"'\"). Is it safe because it uses an ORM?"
    options:
      - text: "Yes, ORMs always protect you"
      - text: "Yes, because the method name starts with $"
      - text: "Only if the user is logged in"
      - text: "No, this raw query glues user text into SQL, so it can be injected"
        correct: true
    explanation: "ORMs protect their normal query methods. Some raw-query methods accept a finished SQL text, like $queryRawUnsafe. These are as dangerous as text that you glue together yourself."

  - question: "Users can sort a product list by a column that they choose. You cannot send column names as query parameters. What is the safe approach?"
    options:
      - text: "Put the user's text into the query, but remove all quotes first"
      - text: "Check the user's choice against a fixed list of allowed columns"
        correct: true
      - text: "Only allow logged-in users to sort"
      - text: "Hide the sort menu from most users"
    explanation: "When a value cannot be a parameter, compare it with a short list that you wrote yourself, like \"name\", \"price\" or \"date\". The code rejects everything else. So only your own text gets to the query."

  - question: "You type a single apostrophe (') into your own app's search box. The page shows a server error. What can this mean?"
    options:
      - text: "The search box needs a bigger font"
      - text: "Apostrophes are banned on the internet"
      - text: "Your database is full"
      - text: "Your text may be glued into a SQL query, and it broke the query"
        correct: true
    explanation: "An apostrophe ends a piece of text in SQL. If one apostrophe breaks your query, your text is probably glued into the command. Check that code for SQL injection."

  - question: "The AI suggests that you block apostrophes in every form to stop SQL injection. What is wrong with that?"
    options:
      - text: "Real names like O'Brien break, and the query still isn't parameterized"
        correct: true
      - text: "Nothing, it fully prevents SQL injection"
      - text: "Apostrophes are needed for passwords"
      - text: "It makes the database slower"
    explanation: "Blocked characters reject real users, and attackers often find other ways in. The real fix is a parameterized query. It keeps data and commands apart, whatever the text contains."
---

# How one line of text can dump your whole database

> **Before you start**
> Words from earlier lessons:
> - **SQL:** the language that many databases understand. *([Your app forgot everyone's messages overnight. Why?](/lessons/what-is-a-database))*
> - **API route:** a server address that your pages send requests to, like `/api/orders`. *([The hidden conversation behind every button you tap](/lessons/what-is-an-api))*
> - **Trust boundary:** the user can change anything that comes from the browser. *([A player scored 999,999 points by editing the page. How?](/lessons/frontend-and-backend))*
> - **Server-side validation:** a check of data on your server before you use it. *([Can strangers read your whole database? Check in 5 minutes](/lessons/never-trust-the-browser))*

## Every order, from one text box

You built a small online shop with AI. Customers do not need an account. After they buy something, they get an **order code**, like `K7Q2M`. To check on an order, they open a "Find my order" page. They type their email and their code, and they see their order.

One evening, a customer writes to you:

> "I typed something strange into the order code box, and your site showed me a list of **every** order. Names, addresses, everything."

They did not guess anyone's code. They did not need a password. They typed a few characters, including some apostrophes, into a normal text box.

How can text in a box show someone else's data? The answer is one of the oldest and best-known security bugs on the web. In this lesson, you learn how it works and how to find it in AI-written code. You also learn how to fix it with one small change.

---

## Commands and data

Your **server** is the computer that runs your app's code. When it talks to the database, it sends a **query**: a command written in SQL. A query to find one order looks like this:

```sql
SELECT * FROM orders WHERE email = 'mia@example.com' AND code = 'K7Q2M';
```

In plain English: "From the `orders` table, give me every column of the rows with the email `mia@example.com` and the code `K7Q2M`". In SQL, a piece of text goes between single quotes (`'...'`). The first quote starts the text, and the next quote ends it.

This query has two kinds of parts:

- **Command parts** that you wrote: `SELECT`, `FROM orders`, `WHERE`, `AND`.
- **Data parts** that came from the user: the email and the code.

The database must be able to tell these parts apart. If it cannot, a user can type something that the database reads as a command.

### A fill-in-the-blank note

A teacher has a pile of notes that say:

> "Please give \_\_\_\_\_\_ a gold star."

Each student writes their name in the blank. The teacher reads the note aloud and does what it says. One student writes this in the blank:

> "Sam a gold star, and give everyone else no homework this week. Also give Sam"

The teacher reads: *"Please give Sam a gold star, and give everyone else no homework this week. Also give Sam a gold star."* The teacher cannot see where the blank ended. So the student's words became part of the instructions.

That is **SQL injection**: user input that the database reads as part of a SQL command.

**Where this comparison stops working:** a teacher can notice the trick. A database never does. It follows the exact text that it gets, every time.

---

## How it goes wrong

You ask your AI: *"Make an API route that finds an order by email and order code."* It can write this:

```js
app.post("/api/find-order", async (req, res) => {
  const { email, code } = req.body;
  const result = await pool.query(
    `SELECT * FROM orders WHERE email = '${email}' AND code = '${code}'`
  );
  res.json(result.rows);
});
```

In plain English:

1. **Line 2:** the code takes the email and code from the **request body**. The request body is the data that the browser sends, here what the user typed.
2. **Lines 3–5:** the code builds a SQL query as one piece of text. It glues the user's email and code into the gaps. The backticks and `${...}` mean "put this value into the text here". Then it sends the whole text to the database. (`pool` is the app's connection to a PostgreSQL database.)
3. **Line 6:** the server sends back the rows that the database found.

With honest input, the query is exactly the one that you saw above. It works when you test it.

Now the attacker types any email, and this text in the code box:

```text
' OR '1'='1
```

The server glues it in. The database gets this query:

```sql
SELECT * FROM orders WHERE email = 'x@example.com' AND code = '' OR '1'='1'
```

Read it slowly:

1. `code = ''`: the attacker's first apostrophe **closed** the text early. Now the code is empty.
2. `OR '1'='1'`: this is no longer data. It is a new part of the command: "...or if 1 equals 1".
3. `'1'='1'` is always true. So the condition is true for every row, and the database returns **every order**.

![With honest input, the order code stays inside its quotes as data. With the attack text, the first apostrophe closes the quotes early, and OR '1'='1' becomes part of the command, so the database returns every order.](/diagrams/sql-injection-1.svg)

The attacker's text broke out of its blank and became part of the command. That is the "strange thing" that your customer typed.

### It can get worse

It is bad when an attacker can read every order. But an injected command can also change or delete data. This depends on the database and the code. OWASP is a nonprofit security organization, and its guides are an industry standard. It lists what a successful SQL injection can do:

- Read sensitive data.
- Change it (insert, update, delete).
- In some cases, run admin operations on the database.

### Why AI writes this

- **It looks natural**. JavaScript code builds every other kind of text with `${...}`. You cannot see the bug unless you know to look for it.
- **It works when you test it**. You type normal emails and codes, and it works perfectly.
- **It uses "escape hatches"**. Sometimes a query is too complex for the AI's usual tools. Then the AI often writes raw SQL by hand and glues values into it.

---

## What good looks like

### Fix: Send the data separately with a parameterized query

The fix: never put user text inside the SQL text. Put a **placeholder** where each value goes, and send the values separately. This is called a **parameterized query**. (A parameter is a value that fills a placeholder.)

```js
app.post("/api/find-order", async (req, res) => {
  const { email, code } = req.body;
  const result = await pool.query(
    "SELECT * FROM orders WHERE email = $1 AND code = $2",
    [email, code]
  );
  res.json(result.rows);
});
```

In plain English:

1. **Line 4:** the query text has `$1` and `$2` where the values go. It has no user text in it, so it is the same every time.
2. **Line 5:** the values go separately, in a list. `$1` means "the first value", and `$2` means "the second value".
3. The database gets the command and the values as two different things. It fills the placeholders itself, and it treats the values only as data.

Now the attacker types `' OR '1'='1` again. The database looks for an order whose code is, letter for letter, `' OR '1'='1`. There is no such order, so it returns nothing. The apostrophes are only characters in a strange code.

![When you glue text, the user's text and your command arrive as one text, so the attack becomes part of the command and returns every order. With a parameterized query, the command and the values arrive separately, so the attack is only a strange code that matches nothing.](/diagrams/sql-injection-2.svg)

In the note example, the blank is now a sealed box. The student can write anything inside it, but the teacher reads it only as a name.

OWASP's advice is clear: **use parameterized queries for any value that comes from outside your code**. Different code packages use different placeholders (`$1`, `?`, `:email`), but the idea is the same.

### ORMs help, but check the escape hatches

Most AI-built apps do not write SQL by hand. They use an **ORM** (Object-Relational Mapper). An ORM is a code package that lets you work with the database with normal code, not SQL. Prisma and Drizzle are popular ORMs for JavaScript and TypeScript.

```js
const order = await prisma.order.findFirst({
  where: { email, code },
});
```

This is the ORM version of the same search. The ORM builds a parameterized query for you. So normal ORM methods like this one are protected.

But every ORM also has a way to run raw SQL, for queries that its normal methods cannot do. Some of these ways are safe, and some are not. They can look almost the same:

| Library | Safe | Unsafe with user input |
|---|---|---|
| Prisma | `prisma.$queryRaw` with a backtick template | `prisma.$queryRawUnsafe(...)`, and `Prisma.raw(...)` |
| Drizzle | the `sql` backtick template | `sql.raw(...)` |

Here is the difference in Prisma:

```js
// Safe: Prisma turns ${code} into a parameter
await prisma.$queryRaw`SELECT * FROM orders WHERE code = ${code}`;

// UNSAFE: the user's text is glued into the SQL text
await prisma.$queryRawUnsafe(`SELECT * FROM orders WHERE code = '${code}'`);
```

In plain English:

1. **Line 2:** the backtick text comes directly after `$queryRaw`, with no brackets. This special form is called a **tagged template**. It gives Prisma the SQL pieces and the values separately. Prisma's documentation says that it turns them into prepared statements (parameterized queries) that are safe from SQL injection.
2. **Line 5:** `$queryRawUnsafe` gets one finished piece of text. When Prisma sees it, the user's input is already glued in. Prisma's documentation warns that this method has a significant risk of SQL injection.

So the same `${code}` is safe in one line and dangerous in the other. Drizzle works in the same way. Its `sql` template turns values into parameters. But its documentation says that `sql.raw()` adds text with no processing or escaping.

**The rule:** look carefully at any method named "raw" or "unsafe". **Never pass user input into it.**

### When a value cannot be a parameter

Placeholders work for **values**, like an email or a code. They do not work for parts of the command itself. Examples are a column name, or the words `ASC` and `DESC` (sort up or down).

Say that your shop lets users sort products by "name", "price" or "date". The AI can glue the user's choice into the query: `ORDER BY ${sortBy}`. Then an attacker can inject SQL again.

The fix is an **allowlist**: a fixed list of values that you wrote yourself.

```js
const SORT_COLUMNS = new Map([["name", "name"], ["price", "price"], ["date", "created_at"]]);
const column = SORT_COLUMNS.get(req.query.sort) ?? "created_at";
```

In plain English:

1. **Line 1:** you write the only columns that users can sort by.
2. **Line 2:** the code looks up the user's choice in that list. If the choice is not there, it uses `created_at`. In both cases, you wrote the text that gets to the query, not the user.

### What does not fix it

- **Blocked apostrophes or "bad words"**. Real people have names like O'Brien. OWASP also warns: do not try to recognize every dangerous string. Attackers find strings that you did not list.
- **Escaping by hand**. Escaping means that you add backslashes before quotes yourself. It is easy to get wrong. OWASP calls manual escaping error-prone and strongly discouraged.
- **Validation alone**. Server-side validation is still good: an order code must be 5 letters and digits. But it is an extra layer. The parameterized query is the fix.

---

## Test your own app in 10 minutes

**Test 1: Search your code.** Ask your AI, or search your project, for these:

- `$queryRawUnsafe`, `$executeRawUnsafe` or `Prisma.raw` (Prisma).
- `sql.raw` (Drizzle).
- Any `query(` call where the SQL text contains `${` or uses `+` to join text with a variable.

For each one, check where the values come from. If any part came from the request, it is probably an injection bug.

**Test 2: The apostrophe test.** Do this test **only in your own app**.

1. Type a single apostrophe (`'`) into a search box or form field.
2. Submit the form.
3. Do this for each search box and form field.

Here is what the result means:

- If you see a normal "nothing found" result, good.
- If you see a server error (500) or a database error message, your text can break a SQL query. Show that route's code to your AI. Ask if an attacker can inject SQL into it.

**Test only apps that you own.** This test on other people's websites can be illegal.

---

## Takeaways

**Key terms**

- **Query:** a command, written in SQL, that your code sends to the database.
- **SQL injection:** user input that the database reads as part of a SQL command.
- **Parameterized query:** a query with placeholders. The values go separately, and the database treats them only as data.
- **ORM:** a package that lets your code use the database without hand-written SQL.
- **Allowlist:** a fixed list of accepted values, written by you.

**Red flags in AI-written code**

- SQL text built with `${...}` or `+` that includes anything from `req.body`, `req.query` or `req.params`.
- `$queryRawUnsafe`, `$executeRawUnsafe`, `Prisma.raw` or `sql.raw` with user input anywhere near it.
- A column name or sort order that comes directly from the request.
- Someone says "I escaped the quotes, so it's safe" or "I blocked special characters".

**Ask your AI**

- *"Find every place in my app where SQL text is built from variables. Is any value from the request glued into the text instead of passed as a parameter?"*
- *"List every raw query in my project (queryRaw, queryRawUnsafe, sql.raw). Is each one safe from SQL injection?"*
- *"Where does my app let users choose a column or sort order? Is it checked against an allowlist?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Where it ranks.** The OWASP Top 10 is the industry's standard list of web application security risks. In the 2025 edition, "Injection" is A05. In 2021, it was in third place. The category includes SQL injection and cross-site scripting. OWASP reports that it tested every application in its data for some form of injection.

**Prepared statements.** You also hear the term "prepared statement". It is a closely related idea. The database gets the shape of the query first and the values later. Most code packages use the two terms loosely. The important thing is that values never become part of the SQL text.

**Stored procedures are not automatically safe.** A **stored procedure** is a piece of SQL that is saved inside the database. OWASP says that a parameterized call to a procedure protects the call. But it does not protect SQL that the procedure builds from text inside itself.

**Least privilege.** Give your app's database account only the permissions that it needs. If the app never deletes tables, its account must not be able to delete them. OWASP recommends that you never give an app's account admin access. Then even a successful injection can do less damage.

**Not only SQL.** The same pattern happens anywhere that code glues data into a command. Examples are shell commands (commands for the computer's terminal), search engines and other query languages. The fix is the same each time: keep the data separate from the command. [A comment that runs code in every visitor's browser](/lessons/cross-site-scripting) shows the same bug in HTML.

**A famous joke.** The comic xkcd #327, "Exploits of a Mom", shows a school that lost its student records. A student's name was `Robert'); DROP TABLE Students;--`. Developers still call him "Little Bobby Tables".

</details>

## References

- [SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html): OWASP. Parameterized queries as the main defense, allowlists for column names and sort order, why manual escaping is discouraged, stored procedures and least privilege.
- [SQL Injection](https://community.owasp.org/attacks/SQL_Injection): OWASP. What a successful attack can do: read, change or delete data and run admin operations.
- [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html): OWASP. Why trying to block every dangerous string doesn't work.
- [A05:2025 Injection](https://top10.owasp.org/2025/A05_2025-Injection): OWASP Top 10:2025. Injection fell from #3 to #5, includes SQL injection and cross-site scripting, and every tested application was tested for it.
- [Queries](https://node-postgres.com/features/queries): node-postgres. Parameterized queries with `$1`, `$2` and a list of values.
- [Raw queries](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries): Prisma docs. `$queryRaw` tagged templates create prepared statements; `$queryRawUnsafe` and `Prisma.raw` risk SQL injection.
- [Magic sql operator](https://orm.drizzle.team/docs/sql): Drizzle ORM docs. The `sql` template sends values as parameters; `sql.raw()` adds text without escaping.
- [Exploits of a Mom](https://xkcd.com/327/): xkcd #327. The "Little Bobby Tables" comic.
