---
title: "Can strangers read your whole database? Check in 5 minutes"
slug: never-trust-the-browser
order: 22
level: 2
levelName: Builder
concepts: [Client-side validation, Server-side validation, Schema validation, Row Level Security, Public API keys]
readTime: 14 min
quiz:
  - question: "Your sign-up form won't let anyone type more than 30 characters in the name box. Your server saves whatever name it receives. What can a user do?"
    options:
      - text: "Nothing, because the form blocks long names"
      - text: "Save a name of any length by sending the request without the form"
        correct: true
      - text: "Only save a long name if they are logged in"
      - text: "Only save a long name if they turn off JavaScript"
    explanation: "The 30-character limit lives in the user's browser, and the user controls the browser. They can remove the limit or send their own request that never touches your form. Only a check on the server protects the data."

  - question: "If checks in the browser can be skipped, why keep them at all?"
    options:
      - text: "They make the app more secure"
      - text: "The server needs them to work"
      - text: "Search engines need them"
      - text: "They give honest users instant, helpful messages"
        correct: true
    explanation: "Browser checks are about comfort, not safety. They tell honest users what's wrong right away. The server must still check everything again."

  - question: "Your app uses Supabase. Your frontend code contains the project's public (anon or publishable) key. What decides which rows a visitor can read with it?"
    options:
      - text: "Row Level Security policies on each table"
        correct: true
      - text: "Nothing, the key must be kept secret"
      - text: "Whether the visitor is using your app's pages"
      - text: "The key itself only allows reading safe data"
    explanation: "The public key is meant to be seen. Anyone can copy it from your frontend. What protects your data is Row Level Security: the rules on each table that decide which rows each user can reach."

  - question: "A table in your Supabase project has Row Level Security turned off. Your frontend reads it directly, using the public key. What can a stranger do?"
    options:
      - text: "Nothing, because they don't have a password"
      - text: "Only read rows they created themselves"
      - text: "Read, change and delete rows in that table"
        correct: true
      - text: "Only see the names of the columns"
    explanation: "Without Row Level Security there are no row rules at all. Anyone with the project address and the public key can read, change and delete rows in that table."

  - question: "The AI suggests putting Supabase's secret (service_role) key in your frontend because \"the query fails with the public key\". What should you do?"
    options:
      - text: "Accept it, because the query will work"
      - text: "Accept it, but only for logged-in users"
      - text: "Accept it, but hide the key in a different file"
      - text: "Refuse, because that key skips every Row Level Security rule"
        correct: true
    explanation: "The secret key is made for trusted server code. It bypasses every Row Level Security policy. In the frontend, anyone could copy it and do anything to your database. Fix the policy instead."

  - question: "You check the request body with a Zod object schema that lists only mood and text. A user sends an extra field, \"userId\": 99. With Zod's default settings, what happens to that field?"
    options:
      - text: "It is saved to the database"
      - text: "It is removed from the checked result"
        correct: true
      - text: "It crashes the server"
      - text: "It replaces the logged-in user's ID"
    explanation: "By default, a Zod object schema strips keys it doesn't know. If you save only the checked result, extra fields like userId never reach your database."
---

# Can strangers read your whole database? Check in 5 minutes

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Trust boundary:** the line between the browser, which the user controls, and your server, which you control. *([A player scored 999,999 points by editing the page. How?](/lessons/frontend-and-backend))*
> - **API route and request body:** an address on your server that your pages talk to, and the data the browser sends with the request. *([The hidden conversation behind every button you tap](/lessons/what-is-an-api))*
> - **Authorization:** deciding what a logged-in user is allowed to do. *([Change one number in the URL, see everyone's invoices](/lessons/logged-in-doesnt-mean-allowed))*
> - **Table and row:** a database keeps data in tables, and each row is one record, like one journal entry. *([Your app forgot everyone's messages overnight. Why?](/lessons/what-is-a-database))*

## Two emails on Monday

You built a mood journal app with AI. Each day, users pick a mood from 1 to 5 and write a short note, up to 500 characters. Entries are private. The form is careful: the mood picker only offers 1 to 5, and the note box stops you at 500 characters.

On Monday, two emails arrive.

The first says: *"Your stats page shows an average mood of 3,000. Also, someone's entry is a whole book."*

The second is worse: *"I wasn't even logged in. I opened your page's code, copied a key, and downloaded every entry from every user. You should fix that."*

Nobody guessed a password. In both cases, your app trusted something it should have checked.

This lesson is about where checks must live, so that a user's browser can't skip them.

---

## The form is a suggestion

Think of the forms at a doctor's reception. The boxes on the paper guide you: "Date of birth", "Phone number". They help you fill it in correctly. But the receptionist still reads the form before anything happens. If you write "banana" as your date of birth, the receptionist catches it.

Your app has the same two layers:

- **Checks in the browser** are the boxes on the paper. They help honest users.
- **Checks on the server** are the receptionist. They protect your data.

Checking that data is correct before you use it is called **validation**. When it happens in the browser, it's called **client-side validation**. ("Client" is another word for the browser side.) When it happens on your server, it's called **server-side validation**.

**Where this comparison stops working:** a patient can't take the receptionist's job. But in your app, if there is no server check, nobody takes the receptionist's job. The data goes straight into your database.

### Why browser checks can't protect anything

You already know that users control their own browser. With developer tools, anyone can:

- Remove the 500-character limit from the note box
- Change the mood picker to allow 3,000
- Skip your page completely and send their own request to your API route

The third one matters most. Your server receives a request. It can't tell whether the request came from your nice form or from someone typing in the browser's console. **Every request might be hand-made.**

So the rule is:

> **Browser checks are for comfort. Server checks are for safety.**

Keep the browser checks. They show helpful messages right away. But every rule that matters must be checked again on the server.

---

## How it goes wrong

### Mistake 1: The rules only live in the form

You ask your AI: *"Make a form to save a journal entry. Mood must be 1 to 5. The note can be at most 500 characters."*

The AI writes a careful form. Then it writes this API route:

```js
app.post("/api/entries", requireLogin, async (req, res) => {
  const entry = await db.entry.create({
    data: { ...req.body, userId: req.user.id },
  });
  res.status(201).json(entry);
});
```

In plain English:

1. **Line 1:** when a logged-in user sends a new entry...
2. **Lines 2–4:** ...save a new row with **everything** in the request body (that's what `...req.body` means: "copy every field"), plus the user's ID from the session.
3. **Line 5:** reply with the saved entry.

The rules you asked for (1 to 5, at most 500 characters) are nowhere in this code. They only exist in the form. Your first email came from someone who sent `"mood": 3000` and a note that was millions of characters long. The server saved both.

Notice also `...req.body`. It saves every field the browser sends, including fields you never planned for. That's the **mass assignment** bug from the previous lesson.

Broken values cause more than odd stats. A note that's millions of characters long fills your database and slows every page that shows it. A mood of `"hello"` instead of a number can crash code that expects a number.

### Mistake 2: The database is open to the browser

Many AI app builders use **Supabase**: a service that gives you a PostgreSQL database plus ready-made login. Supabase has a feature that beginners love. Your frontend can talk to the database directly, with no API route of your own in between:

```js
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

const { data } = await supabase.from("entries").select("*");
```

In plain English:

1. **Line 1:** connect to your Supabase project using its address and its **public key**.
2. **Line 3:** ask for all rows from the `entries` table.

This code runs in the browser, so the address and the public key are in your frontend. Anyone can read them with developer tools.

That's expected. Supabase designed this key to be public. Older projects call it the **anon key**. Newer projects call it the **publishable key**. Supabase's documentation says it is safe to put in a web page, **as long as Row Level Security protects your tables**.

Here is the mistake AI-built apps make:

- The table was created without **Row Level Security** (explained below), or someone turned it off because "the query wasn't working".
- So the table has no rules about who can see which rows.
- Anyone can copy the address and the public key from your page and ask for every row, from their own code, without logging in.

That was your second email. Your app's page only shows each user their own entries. But the page isn't the lock. The stranger never used your page. They asked the database directly, and the database said yes.

Supabase's own security checker calls this an error-level problem: a table with RLS turned off in the public part of the database can be read, edited and deleted by anyone with the project address.

---

## What good looks like

### Fix 1: Check every request on the server with a schema

You could write each check by hand: "is mood a number? is it at least 1?". That gets long fast, and it's easy to forget one.

Instead, describe what valid data looks like once. A description of the shape your data must have is called a **schema**. A **schema validator** is a package that compares incoming data against that description and tells you if it matches. A popular one for JavaScript and TypeScript is **Zod**.

First, the schema:

```ts
const EntrySchema = z.object({
  mood: z.number().int().min(1).max(5),
  text: z.string().min(1).max(500),
});
```

In plain English: `mood` must be a whole number from 1 to 5. `text` must be text, between 1 and 500 characters. (`z` comes from the Zod package.)

Then the API route uses it:

```ts
app.post("/api/entries", requireLogin, async (req, res) => {
  const result = EntrySchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: "Invalid entry" });
  const { mood, text } = result.data;
  await db.entry.create({ data: { userId: req.user.id, mood, text } });
  res.status(201).json({ ok: true });
});
```

In plain English:

1. **Line 2:** compare the request body against the schema. `safeParse` doesn't crash when the data is wrong. It returns a result that says whether the data passed.
2. **Line 3:** if it failed, reply **400** ("your request is wrong") and save nothing.
3. **Lines 4–5:** if it passed, take only `mood` and `text` from the checked result, and the user's ID from the session. Save those.

Two good things happen here. First, a mood of 3,000 or a book-length note is now rejected. Second, Zod removes fields it doesn't know about by default. If someone sends `"userId": 99` or `"isAdmin": true`, those fields are not in `result.data`, so they never reach your database.

**Allow what's expected, reject the rest.** Describe exactly what good data looks like. Don't try to list every bad thing a user might send. You'll always miss one.

You can use the same schema in your form too, so honest users see the same rules in the browser.

### Fix 2: Put the rules inside the database with Row Level Security

When your frontend talks to the database directly, there is no API route of yours in the middle to check anything. So the rules must live in the database itself.

**Row Level Security (RLS)** is a PostgreSQL feature that does this. When it's turned on for a table, the database checks every request, row by row, against rules you write. Each rule is called a **policy**. A row that no policy allows is invisible to that request.

Think of a building with a key card system. Before, the front door was locked, but inside, every office door was open. RLS gives every office its own lock, and it checks your card at each one.

Here is what the journal app needs. It's written in **SQL**, the language the database understands:

```sql
alter table entries enable row level security;

create policy "Users can read their own entries" on entries
  for select to authenticated using ( (select auth.uid()) = user_id );

create policy "Users can add their own entries" on entries
  for insert to authenticated with check ( (select auth.uid()) = user_id );
```

In plain English:

1. **Line 1:** turn on RLS for the `entries` table. From now on, nothing is allowed unless a policy allows it.
2. **Lines 3–4:** a policy for reading (`select`). It applies to logged-in users (`authenticated`). A row is visible only if its `user_id` matches the ID of the logged-in user. `auth.uid()` is a Supabase function that returns that ID, taken from the user's login, not from anything they typed.
3. **Lines 6–7:** a policy for adding rows (`insert`). A user can only add a row whose `user_id` is their own ID. `with check` means "check the new row before saving it".

Now, the stranger with the public key asks for every row. They aren't logged in, so no policy matches, and the database returns nothing. A logged-in user asks for every row and gets only their own. The database checks this every time.

If users also edit or delete entries, add policies for `update` and `delete` too. With RLS on, any action without a policy is blocked. That's the safe direction to fail in.

This is the same idea as the ownership check from the previous lesson, moved into the database. The difference: an ownership check in an API route only protects that route. RLS protects the table, whichever way the request arrives.

**What about validation when there's no API route?** The database can check values too. PostgreSQL lets you add rules to columns, like "mood must be between 1 and 5". Ask your AI to add these. The "Going deeper" section shows an example.

### Fix 3: Keep the secret key on the server

Supabase also gives you a second key: the **secret key** (called the **service_role key** in older projects). It is made for trusted server code, and it **skips every RLS policy**.

When a query fails because of RLS, a tempting AI "fix" is to swap in the secret key. With the older `service_role` key, the query works again, so it looks solved. (Supabase's newer secret keys refuse requests that come from a browser.) Either way, if the key is in code that runs in the browser, anyone who copies it has full control of your database.

When a query fails because of RLS, the fix is a better policy, not a stronger key.

> **Go deeper:** [Your API key leaked, and strangers are spending your money](/lessons/api-key-ended-up-public) (Level 2) shows how secret keys leak into frontend code.

---

## Test your own app in 10 minutes

**Test 1: Skip your own form (in Chrome).**

1. Open your app, log in and open developer tools (F12 on Windows, Cmd+Option+I on Mac). Click the **Network** tab.
2. Submit a form normally. A new line appears in the Network tab. Right-click it and choose **Copy → Copy as fetch**.
3. Click the **Console** tab and paste. Before pressing Enter, find the data in the `body` line and change a value to something your form would never allow: a huge number, an empty name, a note thousands of characters long.
4. Press Enter, then reload the page.

If the bad value was saved, your server isn't validating. Ask your AI to add a schema check on the server for that route.

**Test 2: Check your Supabase tables.**

1. In your Supabase dashboard, open the **Security Advisor**.
2. Look for any finding about a table with RLS disabled or a table that is publicly accessible.

Any table in that list is open to anyone with your public key. Fix it before anyone else finds it.

**Test 3: Two accounts.** Use the two-account test from the previous lesson: log in as User A in one window and User B in a private window. Check that User B can't see or change User A's data, on every page.

---

## Takeaways

**Key terms**
- **Validation:** checking that data is correct before you use it
- **Client-side validation:** checks in the browser. Helpful for users, but anyone can skip them
- **Server-side validation:** checks on your server. These are the ones that protect your data
- **Schema validator:** a package, like Zod, that checks data against a description of its shape
- **Row Level Security (RLS):** database rules that decide which rows each user can read or change
- **Policy:** one RLS rule, like "users can read their own entries"

**Red flags in AI-written code**
- Rules like "1 to 5" or "max 500 characters" appear in the form but not in the API route
- The API route saves `...req.body` or the whole request body without checking it
- A Supabase table has RLS turned off, or the AI suggests turning it off to "fix" an error
- A Supabase secret or `service_role` key appears in code that runs in the browser
- A policy that allows everything, like `using (true)`, on private data

**Ask your AI**
- *"For every API route that saves data, show me the server-side validation. Use a schema validator like Zod and allow only the fields we expect."*
- *"List every table in my Supabase project. Does each one have Row Level Security turned on, and what do its policies allow?"*
- *"Is the Supabase secret or service_role key used anywhere in code that runs in the browser?"*
- *"Could a user who is not logged in read or change any data, using only the public key in my frontend?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**TypeScript types are not validation.** A type like `{ mood: number }` helps you while you write code, but TypeScript types are removed before the code runs. They can't stop a request that contains `"mood": "hello"`. A schema validator checks the real data while the app runs. Zod can also produce a TypeScript type from a schema, so you describe the shape once. Other schema validators include Valibot and Yup.

**`parse` vs `safeParse`.** Zod's `parse` throws an error when data is invalid. `safeParse` returns `{ success, data }` or `{ success, error }` instead, which is easier to turn into a 400 reply. If you want unknown fields rejected instead of removed, Zod has `z.strictObject`.

**Validation in the database.** PostgreSQL **check constraints** reject bad values whichever way they arrive:

```sql
alter table entries
  add constraint mood_range check (mood between 1 and 5),
  add constraint text_length check (char_length(text) <= 500);
```

**`using` vs `with check`.** In a PostgreSQL policy, `using` decides which existing rows a request can see, update or delete. `with check` decides which new or changed rows are allowed. If an `update` policy has only `using`, PostgreSQL uses the same rule for both. A policy with no rule at all on a table where RLS is on means nobody can see or change any row: PostgreSQL's documentation calls this "default-deny".

**Who skips RLS.** In PostgreSQL, superusers and roles with the `BYPASSRLS` attribute always skip RLS, and table owners normally do too. So a query you run in an admin tool, connected as the table owner or an admin role, may skip RLS and doesn't show what your users would see. Test through your app or with a real user's login instead.

**Why `(select auth.uid())`.** Supabase's docs write the function inside `select` so the database runs it once per query instead of once per row. It's faster on big tables.

**RLS by default.** Supabase says tables created through its dashboard have RLS turned on by default. Tables created with SQL, including SQL written by an AI or by a migration, follow PostgreSQL's default: RLS is off until you turn it on. Supabase's docs describe an optional database trigger that turns RLS on for every new table.

**Grants.** In 2026, Supabase changed its projects so that new tables are no longer automatically reachable through its Data API: each new table needs a **grant** first (tables that already existed keep their grants). A grant decides whether a role can reach the table at all. RLS decides which rows. You still need both: once a table is granted, RLS is what keeps users apart.

**A real case.** A published vulnerability record, CVE-2025-48757, describes insufficient Row Level Security policies in sites generated by the AI app builder Lovable (through 15 April 2025). According to the record, this let attackers who were not logged in read or write database tables of those generated sites. Lovable disputes the record, saying each customer is responsible for protecting their own app's data. Either way, the lesson is the same: check your own tables.

</details>

## References

- [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html): OWASP. Validate on the server even when the browser checks the same fields, and allow what you expect instead of listing bad inputs.
- [Basic usage](https://zod.dev/basics): Zod. How `parse` throws and `safeParse` returns a success or error result.
- [Defining schemas](https://zod.dev/api?id=objects): Zod. Object schemas strip unknown keys by default, and `z.strictObject` rejects them.
- [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html): PostgreSQL documentation. Turning RLS on, default-deny, `using` vs `with check`, and which roles bypass RLS.
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): Supabase docs. Writing policies with `auth.uid()`, why it is wrapped in `select`, and the event trigger that turns RLS on for new tables.
- [API keys](https://supabase.com/docs/guides/api/api-keys): Supabase docs. The publishable key is safe in the browser only because RLS limits it; secret keys bypass RLS and must never be in the browser.
- [Advisors](https://supabase.com/docs/guides/database/database-advisors?lint=0013_rls_disabled_in_public): Supabase docs. Lint `0013_rls_disabled_in_public` is an error: anyone with the project URL can read, edit and delete a table without RLS.
- [CVE-2025-48757](https://nvd.nist.gov/vuln/detail/CVE-2025-48757): NIST National Vulnerability Database. The Lovable Row Level Security record and the vendor's dispute note.
- [Supabase Security Retro: 2025](https://supabase.com/blog/supabase-security-2025-retro): Supabase blog. RLS is on by default for tables created through the dashboard; event triggers can enforce it for tables made in other ways.
- [Breaking Change: Tables not exposed to Data and GraphQL API automatically](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically): Supabase changelog. New tables need an explicit grant before the Data API can reach them; RLS behavior is unchanged.
