---
title: "You renamed one column and the live app crashed"
slug: database-migrations
order: 33
level: 2
levelName: Builder
concepts: [Schema, Schema changes, Migrations, Running migrations on deploy, Expand and contract]
readTime: 13 min
quiz:
  - question: "Your AI renames the column `name` to `full_name` directly in the production database. Seconds later, every page that shows a member breaks. Why?"
    options:
      - text: "Renaming columns is not allowed in PostgreSQL"
      - text: "The app's running code still asks the database for `name`, which no longer exists"
        correct: true
      - text: "The database needs to restart after every change"
      - text: "The browser has the old column name saved"
    explanation: "The database changed instantly, but the code that is live still uses the old name. Every query that mentions `name` now fails. Code and database must stay compatible at every moment."

  - question: "The AI added a column through the database dashboard. Your laptop's database, and a new test database, don't have it. What would have prevented this?"
    options:
      - text: "Taking a screenshot of the dashboard"
      - text: "Making the same click in every database by hand"
      - text: "Asking the AI to remember the change"
      - text: "A migration file in git, applied to every database in the same order"
        correct: true
    explanation: "A migration is the change written down as a file. Because it lives in git with your code, every database can be brought to the same shape by applying the same files in the same order."

  - question: "You rename a field in your schema file. The generated migration contains `DROP COLUMN \"name\"` and `ADD COLUMN \"full_name\"`. What happens if you apply it?"
    options:
      - text: "Every member's name is deleted, and the new column starts empty"
        correct: true
      - text: "The names are moved into the new column automatically"
      - text: "Nothing, until you restart the app"
      - text: "The database asks you to confirm first"
    explanation: "DROP deletes the column and every value in it. ADD creates a new, empty column. To keep the data, the migration must use RENAME COLUMN, or copy the data before dropping anything."

  - question: "Your `members` table has 500 rows. A migration adds a new column `phone` that must never be empty (NOT NULL), with no default value. What happens?"
    options:
      - text: "The database fills it with random phone numbers"
      - text: "It works, and old members get an empty text"
      - text: "The database refuses, because the 500 existing rows would have no value"
        correct: true
      - text: "The 500 rows are deleted"
    explanation: "Existing rows have no phone number, so they would break the NOT NULL rule. Add the column as optional or with a default, fill in the values, and only then make it required."

  - question: "You want to rename `name` to `full_name` while the app is live. What is the safe order?"
    options:
      - text: "Rename the column, then deploy the new code as fast as possible"
      - text: "Deploy code that uses `full_name`, then rename the column"
      - text: "Drop `name` first, then add `full_name`"
      - text: "Add `full_name`, write to both and copy the old data, switch the code to read `full_name`, then remove `name` later"
        correct: true
    explanation: "This is expand and contract. Each step keeps both the old and the new code working. Any order that changes the database and the code in one jump leaves a moment where the live code asks for a column that doesn't exist."

  - question: "A migration that already ran in production has a mistake in it. What should you do?"
    options:
      - text: "Edit the old migration file and deploy again"
      - text: "Write a new migration that fixes the mistake"
        correct: true
      - text: "Delete the migrations folder and start over"
      - text: "Fix it by hand in the production database"
    explanation: "The database already ran the old file and records it as done, so it won't run your edited version. Every other database would then have a different history. Fix mistakes with a new migration, like a new commit in git."
---

# You renamed one column and the live app crashed

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Table and column:** a table holds one kind of thing, like members. Each column is one detail about every row, like `email`. *([Your app forgot everyone's messages overnight. Why?](/lessons/what-is-a-database))*
> - **Constraint:** a rule the database enforces, like "this column can't be empty". *([You changed your name. Half the app still shows the old one](/lessons/designing-tables))*
> - **Commit:** a save point of your project's files in git. *([The AI broke your working app. Here's your undo button](/lessons/git-as-an-undo-button))*
> - **Deploying:** putting a new version of your app online, where real users use it (called **production**). *([It works on my laptop. Why can't my friend open it?](/lessons/localhost-vs-production))*

## "Just rename the column"

Your gym booking app has been live for three months. 400 members use it. You ask your AI tool:

> *"Rename the `name` column in members to `full_name`, and add a phone number."*

Your AI tool is connected to your database, so it runs the change itself, straight on the live database. It says: *"Done!"*

Ten seconds later, the members page shows an error. So does the booking page, and the admin page. Every part of the app that mentions a member's name is broken. The code that's live still asks the database for `name`, and `name` no longer exists.

You ask the AI to fix it. It updates the code and you deploy. The app works again. But a week later, you set up a fresh test database on your laptop, and the app breaks there. That database has the old shape. Nobody wrote down what changed, so nothing can repeat it.

It could have been worse. Some tools turn "rename" into "delete the old column and create a new empty one". Then 400 members' names are gone.

Changing a database that holds real data is one of the riskiest things you will do. This lesson shows how to do it safely.

---

## The schema: your database's shape

Every database has two parts:

- **The data:** the rows. Members, bookings, classes.
- **The shape:** which tables exist, which columns each one has, what type of value each column holds, and which rules (constraints) apply.

The shape is called the **schema**. A **schema change** is any change to the shape: adding a table, adding a column, renaming one, removing one, adding a rule.

Your code depends on the schema. When your code says *"give me the member's `name`"*, it trusts that a column called `name` exists. Change the schema without changing the code, and the code breaks. Change the code without changing the schema, and it breaks too.

So there are three things that must stay in step: the code, the schema on your laptop, and the schema in production.

---

## Migrations: schema changes written down

A **migration** is one schema change, written down as a file. Instead of clicking in a dashboard or typing a command into the live database, you write the change in a file, save it with your code, and apply it the same way everywhere.

Think of the instructions for a LEGO model. Each step is numbered, and you follow them in order. Anyone with the same instructions builds the same model. You never skip step 4 or do step 9 before step 8.

**Where this comparison stops working:** LEGO instructions start from an empty table. Your production database is never empty. Every migration changes a model that people are using **while** you build. That's why some steps need extra care, as you'll see.

### The same idea in Drizzle

Most AI-built apps talk to the database through a code library such as **Drizzle** or **Prisma**. You describe the schema in your code, and the library writes the SQL. Here is a members table in Drizzle:

```ts
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"), // ← new
});
```

In plain English: a table called `members` with four columns. `id` is the primary key. `name` and `email` are text that can't be empty (`notNull`), and no two members may share an email (`unique`). The new line adds `phone`. It has no `notNull`, so it's allowed to be empty.

Changing this file does **not** change the database. Two commands in the terminal do that:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

1. **`generate`** compares your schema file with the previous migrations and writes a new migration file with the SQL needed. It doesn't touch the database.
2. **`migrate`** applies every migration the database hasn't run yet, in order. Drizzle keeps a list of the ones already applied in a table called `__drizzle_migrations`, so nothing runs twice.

The generated file contains plain SQL, something like:

```sql
ALTER TABLE "members" ADD COLUMN "phone" text;
```

In plain English: change the `members` table by adding a text column called `phone`. Existing members get an empty value.

**Read this file before you apply it.** It's usually only a few lines, and it tells you exactly what will happen to your data.

### Migrations live in git

The migrations folder (`drizzle/` by default in Drizzle, `prisma/migrations/` in Prisma, `supabase/migrations/` with the Supabase command-line tool) is part of your code. Commit it together with the code that needs it.

Now the history of your database's shape is in git, next to the history of your code. A new laptop, a new teammate or a new test database runs all the migrations in order and gets exactly the same shape as production.

---

## How it goes wrong

### Mistake 1: The AI changes the live database directly

AI tools can connect to databases. They can run SQL in Supabase's SQL editor, click in a dashboard, or use commands like `drizzle-kit push`, which changes the database to match your schema file **without** writing a migration file. Drizzle's docs describe `push` as the best approach for rapid prototyping. That means trying ideas on your own test database, not changing production.

A change made directly on the live database:

- happens instantly, on real data, with nobody reading it first
- leaves no file behind, so no other database gets it
- can't be reviewed, repeated or traced later

Supabase's own guide puts it as a golden rule: "never change the remote database directly." The remote database is the hosted one, not the copy on your laptop.

### Mistake 2: A rename that deletes data

A database can't read your mind. When a column called `name` disappears from your schema file and `full_name` appears, the tool has to guess: is this a rename, or did you delete one column and add another?

Prisma's docs say that by default, renaming a field produces a migration that drops the old column, with all its data. Drizzle asks you in the terminal whether it's a rename. Pick the wrong answer, and you get something like this:

```sql
ALTER TABLE "members" DROP COLUMN "name";
ALTER TABLE "members" ADD COLUMN "full_name" text;
```

`DROP COLUMN` deletes the column and every value in it. If you see `DROP` in a migration, stop and ask why. A rename that keeps the data looks like this instead:

```sql
ALTER TABLE "members" RENAME COLUMN "name" TO "full_name";
```

### Mistake 3: A required column on a full table

You add `phone` with `.notNull()`, meaning every member must have one. The migration runs on production, and fails. The 400 existing members have no phone number, so they would break the new rule. PostgreSQL refuses the whole change.

On your laptop it worked, because your test table was empty. That's why "it worked locally" means very little for migrations.

### Mistake 4: The deploy gap

This is the one that surprises people most. When you deploy, the database and the code don't change at the same instant.

- If the migration runs **first**, the old code is still serving users for a while. It asks for `name`, which was just renamed. Errors.
- If the new code goes live **first**, it asks for `full_name`, which doesn't exist yet. Errors.

Either way, there's a gap where the live code and the live schema don't match. It might last seconds or minutes. With real users, someone always lands in that gap.

---

## What good looks like

### The safe workflow

1. Change the schema file (or ask the AI to).
2. Generate the migration.
3. **Read the SQL.** Look for `DROP`, `RENAME` and `NOT NULL`.
4. Apply it to your own test database and try the app.
5. Commit the migration together with the code.
6. Deploy. Your deploy runs the migrations on production **once**, automatically.

For step 6, the command is usually `npx drizzle-kit migrate` (or `prisma migrate deploy` in Prisma 7), run as a step in your deploy. Prisma's docs say applying migrations to production should be part of an automated deploy process, not something you run by hand from your laptop.

> **Go deeper:** [Stop broken code before it ever goes live](/lessons/ci-cd) (Level 3) shows how to run migrations as part of an automatic deploy.

### Adding is safe. Removing and renaming need steps.

| Change | Safe in one step? | How |
|---|---|---|
| Add a table | Yes | Nothing uses it yet |
| Add an optional column | Yes | Old rows get an empty value |
| Add a required column | No | Add it with a default value, or add it as optional, fill it in, then make it required |
| Rename a column | No | Expand and contract (below) |
| Remove a column | No | First deploy code that no longer uses it. Remove it in a later migration. |

The pattern: **adding never breaks old code**, because old code doesn't know the new thing exists. Removing or renaming breaks any code that still uses the old thing.

### Expand and contract

To rename `name` to `full_name` with no broken moment, split it into small steps. Each step is its own deploy:

1. **Expand.** A migration adds `full_name` as an optional column. Deploy code that **writes to both** columns but still **reads** `name`.
2. **Copy.** A migration copies the old data across:

```sql
UPDATE "members" SET "full_name" = "name" WHERE "full_name" IS NULL;
```

In plain English: for every member who doesn't have a `full_name` yet, copy their `name` into it.

3. **Switch.** Deploy code that reads and writes only `full_name`.
4. **Contract.** Later, when nothing uses `name`, a migration removes it.

At every moment, the code that's live finds every column it needs. This pattern is called **expand and contract** (also "parallel change"). Prisma's docs recommend this pattern for renaming a field without downtime.

It's slower than one rename. For a project with no real users yet, a direct rename is fine. Once people depend on your app, the extra steps are worth it.

### Never edit a migration that already ran

Production has already run the old file and recorded it as done. If you edit it, production won't run it again, and your databases quietly end up with different shapes. Prisma's docs say you should not edit or delete a migration that has already been applied. Fix mistakes the way git does: with a **new** migration on top.

### Before anything destructive, back up

Any migration with `DROP`, or one that changes existing values, can destroy data that git can't bring back. Git saves your migration files. It doesn't save the rows.

> **Go deeper:** [The AI deleted your production database. Now what?](/lessons/backups) (Level 2) covers backups, which you need before any risky change.

---

## Test your own app

1. **Find your migrations folder.** Look for `drizzle/`, `prisma/migrations/` or `supabase/migrations/`. If there isn't one, your schema exists only inside the database. Ask your AI to create a first migration from your current database.
2. **Check it's in git.** Open your repository on GitHub and confirm the folder is there.
3. **Read your latest migration.** Find any `DROP`, `RENAME` or `NOT NULL`. Can you explain each line?
4. **Find out how production gets migrations.** Is it a step in your deploy, or does someone (or some AI) change the database by hand?
5. **Check who can change production.** Which tools and AI assistants have your production database's connection details? Each one can change your schema directly.

---

## Takeaways

**Key terms**
- **Schema:** the shape of your database: its tables, columns, types and rules
- **Schema change:** any change to that shape
- **Migration:** one schema change written down as a file, kept in git and applied in order
- **Expand and contract:** adding the new thing first, moving over, and removing the old thing last, so the live app never breaks

**Red flags**
- The AI ran `ALTER TABLE`, `DROP` or `push` against the production database
- `DROP COLUMN` in a migration that was meant to be a rename
- A new `NOT NULL` column with no default on a table that already has rows
- A migration renames or removes a column in the same deploy as the code change
- An old migration file was edited after it ran
- No migrations folder in git

**Ask your AI**
- *"Show me the SQL this migration will run, and explain what each line does to existing data."*
- *"Will this migration break the code that's currently live, during the deploy? If so, split it using expand and contract."*
- *"How do migrations reach my production database? Is it automatic, and does it run only once per deploy?"*
- *"Never run schema changes directly on my production database. Write a migration file instead."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Prisma's commands.** In Prisma ORM 7 and earlier, `prisma migrate dev` creates and applies migrations on your development database, and `prisma migrate deploy` applies pending migrations in production. Prisma's docs say `migrate dev` should never be used in production. `prisma migrate dev --create-only` creates the migration without applying it, so you can edit the SQL first, for example to turn a drop-and-add into a `RENAME COLUMN`. Prisma ORM 8, a release candidate as of writing, uses a different set of commands (such as `prisma migration plan` and `prisma db migrate`), so check the docs for the version your project uses.

**Prototyping commands.** `prisma db push` and `drizzle-kit push` change the database to match your schema without writing migration files. Prisma's docs say `db push` is best suited for prototyping in development, and refuses changes that would lose data unless you pass `--accept-data-loss`.

**Defaults are fast in modern PostgreSQL.** Adding a column with a fixed default, like `DEFAULT 'member'`, used to rewrite the whole table. PostgreSQL's docs say a non-volatile default is now stored in the table's metadata, which makes the change very fast even on large tables. A default that changes per row, like `clock_timestamp()`, still rewrites the table.

**Locks.** Most `ALTER TABLE` commands take a strong lock on the table while they run. Fast changes hold it for a moment. Slow ones, like adding `NOT NULL` to a huge table (which has to check every row), can make other queries wait. With small tables you won't notice, but it matters as you grow.

**Dropping doesn't shrink the table at once.** PostgreSQL's docs say `DROP COLUMN` hides the column instead of removing it from disk. The data is gone for your app, but the space is reclaimed only over time.

**Down migrations.** Some tools let you write an "undo" migration for every change. An undo can recreate a dropped column, but not the data that was in it. Backups are the only real undo for lost data.

**Supabase.** The Supabase command-line tool keeps migrations in `supabase/migrations`. Its guide recommends making dashboard changes only on your local database, then capturing them as a migration with `supabase db diff`.

</details>

## References

- [drizzle-kit generate](https://orm.drizzle.team/docs/drizzle-kit-generate), [drizzle-kit migrate](https://orm.drizzle.team/docs/drizzle-kit-migrate) and [drizzle-kit push](https://orm.drizzle.team/docs/drizzle-kit-push): Drizzle documentation. Generating SQL migration files (with rename prompts, in the `drizzle` folder by default), applying them once each using the `__drizzle_migrations` table, and `push` as "the best approach for rapid prototyping".
- [Customizing migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations): Prisma documentation. A renamed field becomes a drop-and-add by default, editing the SQL with `--create-only`, and expand and contract to avoid downtime.
- [Development and production](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production) and [About migration histories](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/migration-histories): Prisma documentation. `migrate dev` never in production, `migrate deploy` in an automated pipeline, committing the migrations folder, and not editing applied migrations.
- [Prototyping your schema](https://www.prisma.io/docs/orm/prisma-migrate/workflows/prototyping-your-schema) and [Prisma CLI reference (v8)](https://www.prisma.io/docs/cli/v8): Prisma documentation. `db push` for prototyping and `--accept-data-loss`; the commands in the Prisma ORM 8 release candidate, such as `migration plan` and `db migrate`.
- [Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations): Supabase documentation. "The golden rule: never change the remote database directly", the `supabase/migrations` folder and `supabase db diff`.
- [ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html): PostgreSQL documentation. Fast non-volatile defaults, table rewrites for volatile ones, `DROP COLUMN` hiding the column, strong locks, and `SET NOT NULL` scanning the table.
- [Parallel Change](https://martinfowler.com/bliki/ParallelChange.html): Danilo Sato, martinfowler.com (2014). The expand, migrate and contract pattern.
