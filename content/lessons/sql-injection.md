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
      - text: "The code should use double quotes instead of single quotes"
      - text: "SELECT queries can't be used for searching"
    explanation: "Gluing user text into the query means the database can't tell where your command ends and the user's text begins. A user can type SQL that changes what the command does. That's SQL injection."

  - question: "With a parameterized query, a user types ' OR '1'='1 into the order code box. What does the database do?"
    options:
      - text: "Runs the OR part and returns every order"
      - text: "Crashes with an error"
      - text: "Looks for an order whose code is exactly that strange text, and finds none"
        correct: true
      - text: "Deletes the orders table"
    explanation: "In a parameterized query, the value travels separately from the command. The database treats it only as data: a strange order code that matches nothing."

  - question: "Your app uses an ORM like Prisma. The AI writes prisma.$queryRawUnsafe(\"SELECT * FROM users WHERE name = '\" + name + \"'\"). Is it safe because it uses an ORM?"
    options:
      - text: "Yes, ORMs always protect you"
      - text: "Yes, because the method name starts with $"
      - text: "Only if the user is logged in"
      - text: "No, this raw query glues user text into SQL, so it can be injected"
        correct: true
    explanation: "ORMs protect their normal query methods. Raw-query escape hatches that accept a finished SQL string, like $queryRawUnsafe, are as dangerous as gluing strings yourself."

  - question: "Users can sort a product list by a column they choose. Column names can't be sent as query parameters. What's the safe approach?"
    options:
      - text: "Put the user's text into the query, but remove all quotes first"
      - text: "Check the user's choice against a fixed list of allowed columns"
        correct: true
      - text: "Only allow logged-in users to sort"
      - text: "Hide the sort menu from most users"
    explanation: "When a value can't be a parameter, compare it with a short list you wrote yourself, like \"name\", \"price\" or \"date\". Anything else is rejected, so only your own text ever reaches the query."

  - question: "You type a single apostrophe (') into your own app's search box, and the page shows a server error. What might this mean?"
    options:
      - text: "The search box needs a bigger font"
      - text: "Apostrophes are banned on the internet"
      - text: "Your database is full"
      - text: "Your text may be glued into a SQL query, which broke it"
        correct: true
    explanation: "An apostrophe ends a piece of text in SQL. If one apostrophe breaks your query, your text is probably being glued into the command. Check that code for SQL injection."

  - question: "The AI suggests blocking apostrophes in every form to stop SQL injection. What's wrong with that?"
    options:
      - text: "Real names like O'Brien break, and the query still isn't parameterized"
        correct: true
      - text: "Nothing, it fully prevents SQL injection"
      - text: "Apostrophes are needed for passwords"
      - text: "It makes the database slower"
    explanation: "Blocking characters rejects real users and attackers often find other ways in. The real fix is a parameterized query, which keeps data and commands apart no matter what the text contains."
---

# How one line of text can dump your whole database

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **SQL:** the language many databases understand, with commands like "find these rows". *([Your app forgot everyone's messages overnight. Why?](/lessons/what-is-a-database))*
> - **API route:** an address on your server that your pages talk to, like `/api/orders`. *([The hidden conversation behind every button you tap](/lessons/what-is-an-api))*
> - **Trust boundary:** anything that comes from the browser might have been changed by the user. *([A player scored 999,999 points by editing the page. How?](/lessons/frontend-and-backend))*
> - **Server-side validation:** checking data on your server before you use it. *([Can strangers read your whole database? Check in 5 minutes](/lessons/never-trust-the-browser))*

## Every order, from one text box

You built a small online shop with AI. Customers don't need an account. After they buy something, they get an **order code**, like `K7Q2M`. To check on an order, they open a "Find my order" page, type their email and their code, and see their order.

One evening, a customer writes to you:

> "I typed something strange into the order code box, and your site showed me a list of **every** order. Names, addresses, everything."

They didn't guess anyone's code. They didn't need a password. They typed a few characters, including some apostrophes, into a normal text box.

How can typing in a box show someone else's data? The answer is one of the oldest and best-known security bugs on the web. By the end of this lesson, you'll know how it works, how to spot it in AI-written code and how to fix it with one small change.

---

## Commands and data

When your server talks to the database, it sends a **query**: a command written in SQL. A query to find one order looks like this:

```sql
SELECT * FROM orders WHERE email = 'mia@example.com' AND code = 'K7Q2M';
```

In plain English: "From the `orders` table, give me every column of the rows where the email is `mia@example.com` and the code is `K7Q2M`." In SQL, a piece of text goes between single quotes (`'...'`). The first quote starts the text, and the next quote ends it.

This query has two kinds of parts:

- **Command parts** that you wrote: `SELECT`, `FROM orders`, `WHERE`, `AND`.
- **Data parts** that came from the user: the email and the code.

The database must be able to tell these apart. If it can't, a user can type something that the database reads as a command.

### A fill-in-the-blank note

Imagine a teacher has a pile of notes that say:

> "Please give \_\_\_\_\_\_ a gold star."

Each student writes their name in the blank, and the teacher reads the note aloud and does what it says. A student writes in the blank:

> "Sam a gold star, and give everyone else no homework this week. Also give Sam"

The teacher reads: *"Please give Sam a gold star, and give everyone else no homework this week. Also give Sam a gold star."* The teacher can't see where the blank ended. So the student's words became part of the instructions.

That's **SQL injection**: user input that ends up being read as part of a SQL command.

**Where this comparison stops working:** a teacher might notice the trick. A database never does. It follows the exact text it receives, every time.

---

## How it goes wrong

You ask your AI: *"Make an API route that finds an order by email and order code."* It might write this:

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

1. **Line 2:** take the email and code from the request body (what the user typed).
2. **Lines 3–5:** build a SQL query as one piece of text, gluing the user's email and code into the gaps. The backticks and `${...}` mean "put this value into the text here". Then send the whole text to the database. (`pool` is the app's connection to a PostgreSQL database.)
3. **Line 6:** send back whatever rows the database found.

With honest input, the query is exactly the one you saw above. It works when you test it.

Now the attacker types any email, and this in the code box:

```text
' OR '1'='1
```

The server glues it in. The database receives:

```sql
SELECT * FROM orders WHERE email = 'x@example.com' AND code = '' OR '1'='1'
```

Read it slowly:

1. `code = ''`: the attacker's first apostrophe **closed** the text early. Now the code is empty.
2. `OR '1'='1'`: this is no longer data. It's a new part of the command: "...or if 1 equals 1".
3. `'1'='1'` is always true. So the condition is true for every row, and the database returns **every order**.

The attacker's text broke out of its blank and became part of the command. That's the "strange thing" your customer typed.

### It can get worse

Reading every order is bad enough. But depending on the database and the code, an injected command can also change or delete data. OWASP, a nonprofit security organization whose guides are an industry standard, lists what a successful SQL injection can do: read sensitive data, modify it (insert, update, delete), and in some cases run admin operations on the database.

### Why AI writes this

- **It looks natural.** Building text with `${...}` is how JavaScript code builds every other kind of text. The bug is invisible unless you know to look for it.
- **It works when you test it.** You type normal emails and codes, and it behaves perfectly.
- **"Escape hatches".** When a query is too complex for the AI's usual tools, it often falls back to writing raw SQL by hand, and gluing values into it.

---

## What good looks like

### Fix: Send the data separately with a parameterized query

The fix is to never put user text inside the SQL text. Instead, you put a **placeholder** where each value goes, and send the values separately. This is called a **parameterized query**. (A parameter is a value that fills a placeholder.)

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

1. **Line 4:** the query text has `$1` and `$2` where the values go. No user text is in it. It's the same every time.
2. **Line 5:** the values travel separately, in a list. `$1` means "the first value", `$2` "the second".
3. The database receives the command and the values as two different things. It fills the placeholders itself, and it treats the values only as data.

Now when the attacker types `' OR '1'='1`, the database looks for an order whose code is, letter for letter, `' OR '1'='1`. There's no such order, so it returns nothing. The apostrophes are just characters in a strange code.

In the note analogy, the blank is now a sealed box. Whatever the student writes inside it, the teacher reads it only as a name.

OWASP's guidance is clear: use parameterized queries for any value that comes from outside your code. Different libraries use different placeholders (`$1`, `?`, `:email`), but the idea is the same.

### ORMs help, but check the escape hatches

Most AI-built apps don't write SQL by hand. They use an **ORM** (Object-Relational Mapper): a package that lets you work with the database using normal code instead of SQL. Prisma and Drizzle are popular ones for JavaScript and TypeScript.

```js
const order = await prisma.order.findFirst({
  where: { email, code },
});
```

This is the ORM version of the same search. The ORM builds a parameterized query for you, so normal ORM methods like this are protected.

But every ORM also has a way to run raw SQL, for queries that its normal methods can't express. Some of these are safe, and some are not. They can look almost the same:

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

1. **Line 2:** the backtick text comes right after `$queryRaw`, with no brackets. This special form, called a **tagged template**, hands Prisma the SQL pieces and the values separately. Prisma's documentation says it turns them into prepared statements that are safe from SQL injection.
2. **Line 5:** `$queryRawUnsafe` receives one finished piece of text. By the time Prisma sees it, the user's input is already glued in. Prisma's documentation warns that this is at significant risk of SQL injection.

So the same-looking `${code}` is safe in one line and dangerous in the other. Drizzle works the same way: its `sql` template turns values into parameters, while its documentation says `sql.raw()` adds text without any processing or escaping.

**The rule:** any method named "raw" or "unsafe" deserves a careful look. Never pass user input into it.

### When a value can't be a parameter

Placeholders work for **values**, like an email or a code. They don't work for parts of the command itself, like a column name or the words `ASC` and `DESC` (sort up or down).

Say your shop lets users sort products by "name", "price" or "date". The AI might glue the user's choice into the query: `ORDER BY ${sortBy}`. That's injectable again.

The fix is an **allowlist**: a fixed list of values you wrote yourself.

```js
const SORT_COLUMNS = new Map([["name", "name"], ["price", "price"], ["date", "created_at"]]);
const column = SORT_COLUMNS.get(req.query.sort) ?? "created_at";
```

In plain English:

1. **Line 1:** the only columns users may sort by, written by you.
2. **Line 2:** look up the user's choice in that list. If it's not there, use `created_at`. Either way, the text that reaches the query was written by you, never by the user.

### What doesn't fix it

- **Blocking apostrophes or "bad words".** Real people are called O'Brien. And OWASP warns against trying to recognize every dangerous string: attackers find ones you didn't list.
- **Escaping by hand.** Adding backslashes before quotes yourself is easy to get wrong. OWASP calls manual escaping error-prone and strongly discouraged.
- **Validation alone.** Server-side validation is still good: an order code should be 5 letters and digits. But it's an extra layer. The parameterized query is the fix.

---

## Test your own app in 10 minutes

**Test 1: Search your code.** Ask your AI, or search your project, for these:

- `$queryRawUnsafe`, `$executeRawUnsafe` or `Prisma.raw` (Prisma)
- `sql.raw` (Drizzle)
- Any `query(` call where the SQL text contains `${` or uses `+` to join text with a variable

For each one, check where the values come from. If any part came from the request, it's a likely injection.

**Test 2: The apostrophe test.** In **your own app only**, type a single apostrophe (`'`) into each search box and form field, and submit.

- If you see a normal "nothing found" result, good.
- If you see a server error (500) or a database error message, your text may be breaking a SQL query. Show that route's code to your AI and ask whether it's injectable.

Only test apps you own. Trying this on other people's websites can be illegal.

---

## Takeaways

**Key terms**
- **Query:** a command sent to the database, written in SQL
- **SQL injection:** user input that ends up being read as part of a SQL command
- **Parameterized query:** a query with placeholders, where values are sent separately and treated only as data
- **ORM:** a package that lets your code use the database without writing SQL by hand
- **Allowlist:** a fixed list of accepted values, written by you

**Red flags in AI-written code**
- SQL text built with `${...}` or `+` that includes anything from `req.body`, `req.query` or `req.params`
- `$queryRawUnsafe`, `$executeRawUnsafe`, `Prisma.raw` or `sql.raw` with user input anywhere nearby
- A column name or sort order taken straight from the request
- "I escaped the quotes, so it's safe" or "I blocked special characters"

**Ask your AI**
- *"Find every place in my app where SQL text is built from variables. Is any value from the request glued into the text instead of passed as a parameter?"*
- *"List every raw query in my project (queryRaw, queryRawUnsafe, sql.raw). Is each one safe from SQL injection?"*
- *"Where does my app let users choose a column or sort order? Is it checked against an allowlist?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Where it ranks.** The OWASP Top 10 is the industry's standard list of web application security risks. In the 2025 edition, "Injection" is A05, down from third place in 2021. The category includes SQL injection and cross-site scripting. OWASP reports that every application it tested was tested for some form of injection.

**Prepared statements.** You'll also hear "prepared statement". It's a closely related idea: the database receives the query shape first and the values later. Most libraries use the terms loosely. What matters is that values never become part of the SQL text.

**Stored procedures aren't automatically safe.** A **stored procedure** is a piece of SQL saved inside the database. OWASP notes that parameterizing the call to a procedure protects the call, but not any SQL the procedure builds from text inside itself.

**Least privilege.** Give your app's database account only the permissions it needs. If the app never deletes tables, its account shouldn't be able to. OWASP recommends never giving an application's account admin access. Then even a successful injection can do less damage.

**Not only SQL.** The same pattern appears anywhere data gets glued into a command: shell commands, search engines and other query languages. The fix has the same shape each time: keep the data separate from the command. [A comment that runs code in every visitor's browser](/lessons/cross-site-scripting) shows the same bug in HTML.

**A famous joke.** The comic xkcd #327, "Exploits of a Mom", shows a school whose student records were deleted because a student's name was `Robert'); DROP TABLE Students;--`. Developers still call him "Little Bobby Tables".

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
