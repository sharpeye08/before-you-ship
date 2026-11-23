---
title: "SQL or NoSQL? The AI chose for you. Was it right?"
slug: sql-vs-nosql
order: 59
level: 4
levelName: Reliability & scale
concepts: [Relational databases, Document databases, Schemas, Embedding vs references, JSON columns, jsonb, Trade-offs]
readTime: 14 min
quiz:
  - question: "Your app stores each user's team name inside every user's document. The team is renamed. What happens?"
    options:
      - text: "Every user document updates itself automatically"
      - text: "You must find and update every document that holds a copy, or some users keep seeing the old name"
        correct: true
      - text: "The database refuses the rename"
      - text: "Only the team's own document needs to change"
    explanation: "Embedding copies makes reads fast, but each copy must be updated when the original changes. In a relational database, the team name is stored once and every user points to it with a foreign key."
  - question: "What does \"schemaless\" really mean in a document database?"
    options:
      - text: "Your data has no structure"
      - text: "The database checks the structure for you"
      - text: "The database doesn't enforce a structure by default, so your code has to handle every shape of document that was ever saved"
        correct: true
      - text: "You can't add new fields"
    explanation: "There is still a schema: it lives in your code and in the data you happen to have saved. Old documents with old field names don't disappear. MongoDB lets you add validation rules, but it is optional."
  - question: "Your products have a few fields every product has (name, price) and many that differ by type (screen size, fabric, wattage). You use PostgreSQL. What's a good design?"
    options:
      - text: "Normal columns for the shared fields, and a jsonb column for the extra attributes"
        correct: true
      - text: "A separate database for each product type"
      - text: "One column for each possible attribute, most of them empty"
      - text: "Switch the whole app to a document database"
    explanation: "PostgreSQL's jsonb type stores flexible JSON inside a normal table, and it can be searched and indexed. You keep joins, constraints and transactions for the rest of your data."
  - question: "Why do AI tools often choose a database without asking you?"
    options:
      - text: "Because the database doesn't matter"
      - text: "Because only one database works with JavaScript"
      - text: "Because document databases are always faster"
      - text: "Because they follow the tool's built-in default or the most common tutorial, and aim for a working first demo"
        correct: true
    explanation: "App builders come with a database already connected, and AI models repeat what they saw most often. Neither knows the questions your app will need to answer next year unless you tell it."
  - question: "Which question should you ask before choosing a database?"
    options:
      - text: "Which database has the nicest logo?"
      - text: "What are the 5 most important questions my app will ask its data, and do they cross between kinds of things, like users, teams and orders?"
        correct: true
      - text: "Which database is the newest?"
      - text: "Which database uses the least disk space?"
    explanation: "If your important questions combine different kinds of things, the data is relational, and a relational database answers those questions directly with joins."
  - question: "Your app uses Firestore. A page shows 50 posts and, for each one, loads its author from another collection. How many document reads does that page cost?"
    options:
      - text: "1"
      - text: "2"
      - text: "About 100: 50 posts plus 50 author documents"
        correct: true
      - text: "0, reads are free"
    explanation: "Firestore has no joins, so your code fetches the authors separately, and Firestore bills each document read. This is why Firestore apps often store copies of the author's name inside each post."
---

# SQL or NoSQL? The AI chose for you. Was it right?

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Table, row and SQL:** a table holds one kind of thing, each row is one item, and SQL is the language for asking the database questions. *([Your app forgot everyone's messages overnight. Why?](/lessons/what-is-a-database))*
> - **Foreign key:** a column that points to a row in another table, so each fact is stored once. *([You changed your name. Half the app still shows the old one](/lessons/designing-tables))*
> - **Transaction:** a group of database changes that all happen, or none do. *([A customer got charged twice. How?](/lessons/charged-twice))*
> - **Index:** a sorted list the database keeps so it can find rows fast. *([Fast with 100 users, frozen at 10,000. The missing index](/lessons/database-indexes))*

## Two friends, two databases

You and a friend both ask an AI to build a habit tracker for teams. People join a team, add habits, and tick them off each day.

Your AI sets up **MongoDB**. Your friend's app builder connects a **PostgreSQL** database. Neither of you was asked. Both apps work on day one.

Three months later, you both need the same new page: *"For each team, show how many habits its members completed last week."*

Your friend asks the AI, and it writes one SQL query. Your AI writes a loop that reads every user, then every habit, then adds things up in your code. It's slow, and you notice that some users still show their old team's name, because each user's document holds its own copy.

Was the AI wrong to choose MongoDB? Not necessarily. But it chose without knowing what your app would need, and the choice is expensive to change later. This lesson gives you the questions the AI didn't ask.

---

## The mental model: one fact once, or everything together

There are two big families of databases you'll meet:

- A **relational database** keeps data in tables with fixed columns. Each fact is stored once, and rows point to each other with foreign keys. When you need data from several tables, the database combines them for you while it answers. That's called a **join**. You ask questions in SQL. PostgreSQL, MySQL and SQLite are relational.
- A **document database** keeps each record as a **document**: a JSON-like object that can contain lists and other objects inside it. Documents are grouped into **collections**. Data that's read together is often stored together, in one document. MongoDB and Firebase's **Firestore** are document databases. Document databases are part of a larger group called **NoSQL**, which also includes other kinds, such as the key–value store Redis.

Think of a school office. The relational way is a filing cabinet with one drawer for students, one for classes and one for teachers. A student's card says "class 7B", and you look up 7B in the class drawer. The document way is one folder per student, holding a copy of everything about them: their class, their teacher's name, their timetable.

The folder is quicker when you want everything about one student. The cabinet is better when the teacher of 7B changes: you fix one card, not thirty folders.

**Where this comparison stops working:** real databases are not this strict. Document databases can store an ID and look things up separately, and MongoDB even has a join-like step called `$lookup`. Relational databases can store whole JSON documents in a column, as you'll see below.

### The same data, two ways

Here's one user in a document database:

```json
{
  "_id": "u_17",
  "name": "Mia",
  "team": { "id": "t_3", "name": "Morning Runners" },
  "habits": [{ "title": "Run 5 km", "doneDates": ["2026-11-02", "2026-11-03"] }]
}
```

In plain English: Mia's document holds her name, a **copy** of her team's name, and her habits with the days she completed them. One read gets everything about Mia.

In a relational database, the same data lives in four tables (`users`, `teams`, `habits`, `completions`), and a join combines them:

```sql
SELECT teams.name, count(*) AS completed
FROM completions
JOIN habits ON habits.id = completions.habit_id
JOIN users ON users.id = habits.user_id
JOIN teams ON teams.id = users.team_id
WHERE completions.done_on >= current_date - 7
GROUP BY teams.name;
```

In plain English: start with every completion from the last 7 days, follow the foreign keys to its habit, its user and their team, then count completions per team. That's the "new page" from the hook, in one query, and the team name exists in exactly one place.

### The honest trade-offs

| | Relational (PostgreSQL, MySQL) | Document (MongoDB, Firestore) |
|---|---|---|
| Shape | Tables with fixed columns | Nested documents; fields can differ |
| Relationships | Foreign keys and joins | Copies inside documents, or IDs your code follows |
| Rules about the data | Enforced by the database: types, required fields, unique values, foreign keys | Mostly in your code; MongoDB's validation rules are optional |
| A new question about old data | Usually one new query, maybe an index | Can mean reading many documents, or reshaping and copying data |
| Changes across several records | Transactions across any tables | MongoDB supports multi-document transactions, but its docs say they usually cost more than single-document writes |
| Getting started | Design tables first | Save whatever JSON you have |

### Why the AI picked without asking

AI tools choose a database for reasons that have little to do with your app:

- **The tool's default.** App builders come with a database already connected. Lovable's built-in backend, for example, includes a managed PostgreSQL database and creates tables from your chat messages.
- **The most common tutorial.** AI models repeat the patterns they saw most often. Pairs like "React + Firebase" and "Node + MongoDB" appear in many tutorials, so they come out often.
- **The first demo.** A document database lets the AI save any JSON without designing tables first. The demo works sooner. The cost shows up later, when the questions change.

None of these ask: *what will your app need to know about its data in a year?*

---

## How it goes wrong

### Problem 1: Copies that drift apart

To show "Mia · Morning Runners" without a second read, the AI put a copy of the team name inside each user's document. The team gets renamed. Now 2,000 user documents hold the old name, and someone has to update every one. If the update stops halfway, half the app shows each name.

This is the "copied data" bug from [You changed your name. Half the app still shows the old one](/lessons/designing-tables). Document databases make it the normal way of working, so you need a plan for every copy: what updates it, and what happens if that update fails.

### Problem 2: The question nobody planned for

Document databases are fast at the questions their documents were shaped for: "get everything about Mia". They are much weaker at questions that cut across documents: "completions per team per week", "which habits are most popular", "users who haven't been active in 30 days".

In Firestore, there are no joins. To show 50 posts with their authors' names, your code reads 50 posts and then 50 author documents. Firestore **bills each document read**, so that one page costs about 100 reads. This is why Firestore apps store copies of author names in each post, which brings back Problem 1.

### Problem 3: "Schemaless" means the schema is in your code

A document database doesn't check what you save, unless you add rules. So over a few months:

- Old documents say `completed`, new ones say `doneDates`, because the AI renamed a field halfway through.
- One document has `"name": "Mia"`, another has `"nmae": "Leo"`, because of a typo in one version of the code.
- Dates are sometimes text and sometimes real dates.

The database accepted all of it. Now every piece of code that reads users has to handle every shape that was ever saved. In a relational database, the column types and constraints would have refused the wrong data on the first day, and changing a column would be a deliberate migration.

### Problem 4: Forcing very different things into one rigid table

The mistake goes the other way too. An online shop sells phones, sofas and lamps. Phones have a screen size, sofas a fabric, lamps a wattage. Putting every possible attribute in its own column gives you a table with 80 columns, most of them empty for any one product. Documents are genuinely a better shape for that part of the data.

The good news: in PostgreSQL, you don't have to switch databases to get it.

---

## What good looks like

### Start with PostgreSQL, unless you have a clear reason not to

Most app data is **relational**: users belong to teams, orders contain items, comments belong to posts. The questions you'll need later cross between those things. A relational database answers them with joins, keeps each fact in one place, refuses bad data with constraints, and wraps related changes in transactions.

PostgreSQL is the common default for good reasons. It's open source, mature, and offered by most hosting services, including Supabase, Neon, AWS and Google Cloud. In the 2026 Stack Overflow Developer Survey, it was the most used database, by 57.9% of respondents.

### Use jsonb for the parts that really are flexible

PostgreSQL can store JSON inside a normal table. Its documentation recommends the **`jsonb`** type for most apps: it stores JSON in a processed form that is faster to search, and it can be indexed.

```sql
CREATE TABLE products (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  price_cents integer NOT NULL,
  attributes jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX products_attributes_idx ON products USING GIN (attributes);
SELECT name FROM products WHERE attributes @> '{"color": "red"}';
```

In plain English:

1. **Lines 1–6:** fields every product has are real columns, with types and `NOT NULL` (meaning "required"). The attributes that differ by product go in one `jsonb` column.
2. **Line 7:** create a **GIN index** on the JSON. It's a special kind of index for values that contain many parts, like JSON documents.
3. **Line 8:** find products whose attributes contain `"color": "red"`. The `@>` operator means "contains", and the GIN index makes it fast.

You get flexible documents where you need them, and joins, constraints and transactions for everything else. One thing to know: `jsonb` doesn't keep the order of keys or extra spaces, and if a key appears twice, it keeps only the last value.

### When a document database is a fair choice

A document database can be the right choice when most of these are true:

- Each record is **self-contained** and usually read and written as one piece: a saved drawing, a form with a changing set of questions, a game's save file, a log of events.
- You rarely need questions that combine many kinds of records.
- You want a feature that a product is built around, such as Firestore's offline support for mobile apps, which is on by default on Android and Apple devices.
- Your team already knows the tool well.

If you choose one, use its safety features: MongoDB's schema validation rules, and in Firestore, security rules that check what each user may write.

### Ask the questions the AI skipped

Before you let the AI pick, write down:

1. **The 5 most important questions your app will ask its data.** "Show a team's weekly progress." "List a user's unpaid invoices." Do they combine different kinds of things? Then your data is relational.
2. **What must never be half-saved?** Payments, stock, credits. You want transactions you can trust.
3. **What really varies?** That part can be `jsonb`.
4. **What does your hosting or app builder already give you?** Using what's there is a fair reason, as long as it fits the answers above.

Then tell the AI: *"Use PostgreSQL with these tables. Use jsonb only for these fields."* Or, if you chose a document database, say why, and ask it to design for the questions in your list.

### If the AI already chose

Don't rewrite everything on a hunch. But check soon, because **switching gets more expensive every week**: more data to move, more queries to rewrite. If your app is still small and you see Problems 1 to 3 already, now is the cheapest time it will ever be to change.

---

## Test your own app

1. **Find out what you have.** Open `package.json`. Packages like `pg`, `postgres`, `@prisma/client`, `drizzle-orm` or `@supabase/supabase-js` usually mean SQL. `mongodb`, `mongoose` or `firebase` usually mean a document database. Ask your AI to confirm.
2. **Write your 5 questions** from the section above. For each, ask the AI: *"Show me the query for this. How many reads or queries does it need?"* Count the loops.
3. **Look for copies.** Pick one value that appears in many places, like a team name or a product price. Where is it stored? What updates the copies when it changes?
4. **Look for drift.** In a document database, open 10 old and 10 new documents from the same collection. Do they have the same fields with the same types?
5. **Check the rules.** Does the database refuse a user without an email, or a price that's text? Try it in staging.

---

## Takeaways

**Key terms**
- **Relational database:** data in tables with fixed columns, linked by foreign keys and combined with joins
- **Document database:** each record is a JSON-like document, grouped in collections
- **NoSQL:** databases that don't use the relational model, including document and key–value stores
- **Join:** combining rows from several tables while the database answers a query
- **Schemaless:** the database doesn't check the shape of the data, so your code has to
- **jsonb:** PostgreSQL's indexed, searchable JSON column type

**Red flags**
- The same name, price or status copied into many documents with no plan to update them
- Pages built from loops of reads instead of one query
- Documents in one collection with different field names for the same thing
- A database choice nobody can explain, made on the first prompt
- 50 mostly empty columns for attributes that differ by product type

**Ask your AI**
- *"Which database does my app use, and why was it chosen? What would be hard to do with it later?"*
- *"Here are the 5 most important questions my app asks its data. Write the query for each and tell me how many reads each one takes."*
- *"Where does my app store copies of the same data? What keeps them in sync?"*
- *"Design my tables in PostgreSQL. Use jsonb only where the fields really vary, and explain why for each one."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Other kinds of NoSQL.** Besides document databases, there are **key–value stores** (like Redis: one value per key, very fast), **wide-column stores** (built for huge amounts of data spread over many machines) and **graph databases** (built for networks of connections, such as "friends of friends"). Each solves a specific problem well. Many apps use one of them next to PostgreSQL, not instead of it.

**Embedding vs referencing in MongoDB.** MongoDB's own docs say that an operation on a single document is atomic, and that embedding related data in one document reduces the need for multi-document transactions. They also say transactions are no replacement for good schema design. The rule of thumb: embed what belongs only to its parent and is read with it, like the lines of one order. Reference what is shared, like a team or a product.

**MongoDB transactions.** MongoDB has supported multi-document transactions since version 4.0 for replica sets, and 4.2 for sharded clusters. Its documentation notes that a single-document write is usually cheaper.

**Scaling claims.** You'll often read that NoSQL "scales better". Some document databases were built from the start to spread data across many machines, which helps at very large sizes. But most apps never get near the limits of one well-tuned PostgreSQL server, and scaling problems usually come from missing indexes and too many queries first. [Your app went viral. Will it survive?](/lessons/scaling) covers what to fix first.

**When jsonb is the wrong tool.** If you find yourself searching, joining or updating the same JSON field all the time, it probably wants to be a real column, or its own table with a foreign key. JSON values can't have foreign keys pointing into them.

**Firestore queries cost reads, even empty ones.** Firestore's pricing page says each query costs at least one document read, even if it returns nothing, and that documents skipped with an offset are still billed. Cursor-based pagination is cheaper there, as in [Your app tried to load 50,000 rows at once](/lessons/pagination).

</details>

## References

- [JSON types](https://www.postgresql.org/docs/current/datatype-json.html): PostgreSQL documentation. The difference between `json` and `jsonb`, the recommendation to prefer `jsonb`, the `@>` containment operator and GIN indexes.
- [Transactions](https://www.mongodb.com/docs/manual/core/transactions/): MongoDB manual. Single-document atomicity, multi-document transactions (from version 4.0 for replica sets and 4.2 for sharded clusters), and their extra cost.
- [Schema validation](https://www.mongodb.com/docs/manual/core/schema-validation/): MongoDB manual. The flexible schema by default and optional validation rules.
- [Cloud Firestore data model](https://firebase.google.com/docs/firestore/data-model): Firebase. Firestore as a NoSQL, document-oriented database with collections and no tables or rows.
- [Understand Cloud Firestore billing](https://firebase.google.com/docs/firestore/pricing): Firebase. Billing per document read, the one-read minimum per query, and offsets billed as reads.
- [Configure offline persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline): Firebase. Offline persistence on by default on Android and Apple platforms, off by default on the web.
- [Stack Overflow Developer Survey 2026: Technology](https://survey.stackoverflow.co/2026/technology/): Stack Overflow. PostgreSQL as the most used database, by 57.9% of respondents.
- [Database](https://docs.lovable.dev/features/database): Lovable. The built-in backend includes a managed PostgreSQL database, with tables created from chat.
