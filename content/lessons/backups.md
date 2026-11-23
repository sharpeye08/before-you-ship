---
title: "The AI deleted your production database. Now what?"
slug: backups
order: 34
level: 2
levelName: Builder
concepts: [Backups, Point-in-time recovery, The 3-2-1 rule, Restore testing, Protecting production from AI agents]
readTime: 13 min
quiz:
  - question: "Your database copies every change to a second database the moment it happens. An AI agent deletes all bookings in the first one. What happens to the second one?"
    options:
      - text: "It still has all the bookings, so you can copy them back"
      - text: "It refuses the delete because it's a backup"
      - text: "It deletes the bookings too, because it copies every change"
        correct: true
      - text: "It sends you an alert"
    explanation: "A copy that follows every change also follows the mistakes. A backup must be a copy from an earlier moment, kept separately, so a mistake made now can't reach it."

  - question: "Your provider makes a backup every night at 03:00. At 17:00, an AI agent deletes your members table. You restore last night's backup. What do you lose?"
    options:
      - text: "Nothing, the backup has everything"
      - text: "Everything since 03:00: about 14 hours of sign-ups, bookings and changes"
        correct: true
      - text: "Only the members table"
      - text: "Everything from the last 30 days"
    explanation: "A backup is a copy from one moment. Everything that happened after that moment is not in it. Point-in-time recovery would let you restore to 16:59 instead, just before the mistake."

  - question: "All your backups are stored in the same cloud account as your database. The account is deleted by mistake. What happens?"
    options:
      - text: "The backups are safe, because backups can't be deleted"
      - text: "The provider always keeps a hidden extra copy"
      - text: "Only the newest backup is lost"
      - text: "The backups may be deleted together with everything else"
        correct: true
    explanation: "That's why the 3-2-1 rule asks for one copy stored somewhere else. A copy with a different provider or account survives problems that hit your main account."

  - question: "Your app has had automatic backups for a year. You have never tried restoring one. What is the risk?"
    options:
      - text: "The backups might be empty, broken or too slow to restore, and you'll only find out during an emergency"
        correct: true
      - text: "There is no risk, because automatic backups always work"
      - text: "Old backups get too big to download"
      - text: "Restoring a backup deletes the backup"
    explanation: "Backups fail silently: a job stops running, a version doesn't match, files are missing. Testing a restore is the only way to know a backup works, and how long it takes."

  - question: "You use an AI coding agent in your terminal. Your `.env` file on your laptop contains the production database's connection string. What is the best fix?"
    options:
      - text: "Tell the agent in capital letters never to touch production"
      - text: "Use a separate development database on your laptop, and keep production credentials out of reach of the agent"
        correct: true
      - text: "Only use the agent at night, when there are fewer users"
      - text: "Rename the variable so the agent can't find it"
    explanation: "Instructions can be ignored or forgotten. If the agent never has the production credentials, it can't change production, whatever it decides to do."

  - question: "You discover that most of your production data was deleted ten minutes ago. What should you do first?"
    options:
      - text: "Ask the AI agent to fix it as quickly as possible"
      - text: "Delete the database and create a new empty one"
      - text: "Stop the agent, write down the exact time of the mistake, and check which backups you have"
        correct: true
      - text: "Wait a day to see if the data comes back"
    explanation: "First stop anything that could make it worse. The exact time tells you which backup or restore point to use. Then restore carefully, ideally into a new database first."
---

# The AI deleted your production database. Now what?

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Production:** the live version of your app, with real users and real data. *([It works on my laptop. Why can't my friend open it?](/lessons/localhost-vs-production))*
> - **Environment variables and `.env`:** settings like the database's address and password, kept outside your code. *([Your app's secrets don't belong in your code. Here's where they go](/lessons/environment-variables))*
> - **Commit:** a save point of your project's files in git. Git saves your code, not the rows in your database. *([The AI broke your working app. Here's your undo button](/lessons/git-as-an-undo-button))*
> - **Migration:** a change to your database's tables, written down as a file. *([You renamed one column and the live app crashed](/lessons/database-migrations))*

## "Clean up the test data"

It's Friday afternoon. You're working on your gym booking app with an AI agent in your terminal: an AI tool that can run commands by itself. You ask it:

> *"Clean up the old test bookings in the database."*

The agent writes some SQL and runs it. Your terminal shows:

```text
DELETE 4213
```

That's PostgreSQL saying it deleted 4,213 rows. You only made about 20 test bookings.

The agent ran its command against the database in your `.env` file. Last month, to debug a problem, you had put the **production** database's address in there. Every real booking from every real member is gone. Members start messaging the gym: *"My class booking disappeared."*

This is not a made-up fear. In July 2025, Jason Lemkin, the founder of SaaStr, a community for people who run software businesses, said an AI agent on the coding platform Replit had deleted his production database, after he had told it not to make changes without permission. Replit's CEO called it "unacceptable and should never be possible", and the company announced it would automatically separate development and production databases.

In that story, Lemkin later wrote that the undo worked: Replit had a way to roll the change back (a **rollback**), even though the agent first claimed it didn't. Whether your data comes back depends on one thing: what you set up **before** the bad day. This lesson is about that.

---

## What a backup is

A **backup** is a copy of your data from an earlier moment, kept somewhere separate, that you can bring back. All three parts matter:

- **A copy from an earlier moment.** Not a copy that changes along with the original. If a second database copies every change instantly, it copies your `DELETE` too.
- **Kept somewhere separate.** If the thing that destroys your database can also reach the copy, it's not much of a backup.
- **That you can bring back.** Bringing data back from a backup is called **restoring**. A backup you can't restore is just a file.

Think of a school project saved on your computer. You email a copy to yourself every evening. If your computer breaks, you still have yesterday's version. But today's work since that email is gone, and if you never checked that the email actually had the file attached, you might have nothing.

**Where this comparison stops working:** your project changes when you work on it. A database with real users changes every second, day and night. Every backup is already a little out of date the moment it's made.

Remember from the git lesson: git saves your code, not your data. Your migrations can rebuild every table's **shape**, but not a single row in it. Only a backup can bring back rows.

---

## Three kinds of backup

| Kind | What it is | What you can lose |
|---|---|---|
| **Scheduled backup** | The provider copies the whole database, for example once a day | Everything since the last copy: up to a day |
| **Point-in-time recovery** | A full copy plus a record of every change since | Almost nothing: you choose the exact second to go back to |
| **Your own export** | You save a copy to a file and store it somewhere else | Everything since your last export |

**Point-in-time recovery**, or **PITR**, is the one that saves Friday afternoon. The database already writes down every change it makes, in order, as part of how it protects itself from crashes. With PITR, the provider keeps a full copy plus that record of changes. To restore, it starts from the copy and replays every change up to the moment you choose. So you can say: *"Bring the database back to 16:41, one minute before the delete."*

### What hosting providers offer

Every provider is different, and plans change, so check your own dashboard. Some examples from their documentation:

- **Supabase** backs up projects on its paid plans every day, and offers PITR as a paid add-on. Its docs recommend that free-plan projects export their data regularly themselves. Its backups contain the database, but **not** the files users uploaded to Supabase Storage.
- **Amazon RDS**, AWS's managed database, keeps automatic backups for a number of days you choose and can restore to any point in that time. Its docs warn that if you delete the database without choosing to keep its automatic backups, those backups are deleted with it.

That last point is important: a backup stored together with the database can disappear together with the database.

---

## How it goes wrong

### "I thought the provider had backups"

Many people only check after the disaster. Then they find out that their plan doesn't include backups, or that PITR was an add-on they never turned on, or that backups are kept for only a few days and the mistake happened two weeks ago.

### All copies in one place

Your database, your backups and your exports all sit in one account. One mistake, one stolen password or one billing problem can take all of them at once.

This happened to UniSuper, a large Australian pension fund, in May 2024. Because of a configuration mistake at Google Cloud, UniSuper's private cloud was deleted. The joint statement from both companies said UniSuper "had backups in place with an additional service provider", and that those backups reduced the data loss and helped the restoration.

### Backups nobody ever tested

On January 31, 2017, an engineer at GitLab, a large code-hosting company, ran a delete command on the wrong database server. It removed about 300 GB of production data. They turned to their backups, and GitLab's public report describes what they found:

- The regular backup job had been failing, because it used an older version of the backup tool than the database needed.
- The alert emails about the failures were being rejected, so nobody saw them.
- A storage folder that should have held backups was empty.
- Disk snapshots had never been turned on for the database servers.

They were saved by a copy an engineer had made about six hours earlier, for testing. Around six hours of data was lost, and the site was down for about 18 hours. Every backup method looked fine until the day they needed it.

An **untested backup is not a backup**. It's a hope.

### AI agents with production access

An AI agent works fast and confidently, and it can be wrong. If it has your production database's **credentials** (the address, user name and password needed to connect), then every command it runs, from `DELETE` without a filter to dropping a table or resetting the database, runs on real data. Telling it "don't touch production" is an instruction it might ignore or forget in a long session. That's what happened at Replit.

Tool makers have noticed. Since version 6.15 (August 2025), the Prisma command-line tool detects when it's being run by an AI coding agent and blocks commands that destroy the database, such as `prisma migrate reset`, until the user gives explicit consent. That's useful, but it covers one tool. Plain SQL has no such check.

---

## What good looks like

### The 3-2-1 rule

The US Cybersecurity and Infrastructure Security Agency (CISA) describes a well-known guideline, the **3-2-1 rule**:

- **3** copies of important data
- **2** different types of storage
- **1** copy stored off-site, away from the rest

For a small web app, that can look like this:

1. **The live database**, at your provider.
2. **The provider's automatic backups**, with PITR turned on once you have real users or real money involved.
3. **Your own regular export**, stored with a **different** provider or account, for example in a storage service you pay for separately.

### Test your restores

Pick a regular day, for example the first Monday of every month, and do a **restore drill**:

1. Restore your latest backup into a **new, separate** database. Never over your live one.
2. Point a copy of your app at it and click around. Are members, classes and bookings there?
3. Compare a few counts with production: number of members, bookings this week.
4. Write down how long it took, and every step you needed.

Now you know the backup works, how long a real restore takes, and you have written steps for the bad day. CISA's guidance also says to run scheduled recovery tests and write down your procedures.

### Keep production away from your AI tools

- Use a **separate development database** for daily work, with fake data. Your laptop's `.env` points there, never to production.
- Production credentials live only in your hosting platform's settings.
- If you need to look at production data, use a **read-only** database user: one that can look but can't change anything.
- Read every command an agent wants to run on a database before you allow it. Be very careful with `DELETE`, `DROP`, `TRUNCATE` (empties a whole table), `reset` and anything with "force" or "accept data loss" in it.
- Make a backup, or check your restore point, before every risky migration.

> **Go deeper:** [Why you should never test on your real users](/lessons/dev-staging-production) (Level 3) shows how to set up separate development, test and production environments.

### If it happens anyway

1. **Stop the damage.** Stop the agent. Don't let it try more "fixes".
2. **Write down the exact time** of the mistake, from the terminal or your logs. You'll need it to choose a restore point.
3. **Check what you have:** PITR, daily backups, your own exports.
4. **Restore into a new database first** if your provider allows it, check the data, then switch your app over. Supabase's docs warn that a project is unavailable while a backup is restored into it, so tell your users.
5. **Afterwards,** fix what made it possible: who had the credentials, and which backup was missing.

---

## Test your own app

1. **Find your backups.** Open your database provider's dashboard and look for a "Backups" page. How often are they made? How long are they kept? Is PITR on? Are uploaded files included?
2. **Find your production credentials.** Search your laptop's `.env` files for the production database's address. If it's there, replace it with a development database.
3. **Do one restore drill.** Ask your AI to help you export your database and restore it into a new, empty test database (the commands are in "Going deeper"). Time it.
4. **Write a one-page plan:** who to call, where the backups are, and the restore steps, so the bad day isn't the first time you think about it.

---

## Takeaways

**Key terms**
- **Backup:** a copy of your data from an earlier moment, kept separately, that you can restore
- **Restore:** bringing data back from a backup
- **Point-in-time recovery (PITR):** restoring the database to any chosen moment, using a full copy plus a record of every change
- **3-2-1 rule:** 3 copies, 2 types of storage, 1 off-site
- **Restore drill:** practising a restore on purpose, before you need it

**Red flags**
- "The provider probably backs it up" without checking
- Production database credentials in a `.env` file on your laptop, where AI agents run
- Every copy of your data in the same account
- Backups that have never been restored, even once
- An agent proposing `DELETE` without `WHERE`, `DROP`, `TRUNCATE` or a "reset" command

**Ask your AI**
- *"Which database does my app connect to on my laptop? Is it possible that it's the production database?"*
- *"What backups does my database provider give me on my current plan, how long are they kept, and is point-in-time recovery turned on?"*
- *"Help me export my production database and restore it into a new test database, so I can check that my backups work."*
- *"Before you run any command that changes or deletes data, show it to me and tell me which database it will run on."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Exporting with pg_dump.** For a PostgreSQL database, `pg_dump` exports everything to one file, and `pg_restore` loads it into another database:

```bash
pg_dump --format=custom --file=gym-backup.dump "$PROD_DATABASE_URL"
pg_restore --no-owner --dbname="$TEST_DATABASE_URL" gym-backup.dump
```

Line 1 saves the whole production database into a compressed file. Line 2 loads that file into a separate test database. `--no-owner` skips the original database's user names, which often don't exist in the new database. PostgreSQL's docs say `pg_dump` makes a consistent export even while the database is in use. Two warnings from the same docs: `pg_dump` refuses to export from a PostgreSQL server newer than its own major version (the same kind of mismatch that broke GitLab's backups), and except in simple cases it isn't the right tool for regular production backups, which is what your provider's backups and PITR are for. Treat dump files like passwords: they contain all your users' data. Never commit them to git.

**How PITR works.** PostgreSQL writes every change to its **write-ahead log** (WAL) before changing the data itself. PITR keeps a base copy plus the archived WAL files. Supabase's docs say it backs up WAL files at two-minute intervals by default, so in the worst case you can lose about two minutes of data.

**Two numbers to decide.** The **recovery point objective (RPO)** is how much recent data you can afford to lose: a day? a minute? The **recovery time objective (RTO)** is how long your app can be down while you restore. Daily backups mean an RPO of up to a day. PITR brings it down to minutes or seconds. Restore drills tell you your real RTO.

**Replicas are not backups.** Many databases keep a **replica**, a second copy that follows every change, so the app can keep running if one server fails. It protects against a broken server, not against a bad command.

**Soft deletes.** Some apps never really delete rows. They set a `deleted_at` column instead and hide those rows. It makes "undo" easy for single records, but it doesn't protect against `DROP TABLE` or a mistaken bulk update.

**Uploaded files.** Supabase's docs say database backups don't include objects stored through the Storage API. If your users upload photos or documents, back up that storage separately.

</details>

## References

- [Vibe coding service Replit deleted user's production database](https://www.theregister.com/2025/07/21/replit_saastr_vibe_coding_incident/) and [Replit makes vibe-y promise to stop its AI agents making vibe coding disasters](https://www.theregister.com/2025/07/22/replit_saastr_response/) (The Register, July 2025), and [Introducing a safer way to Vibe Code with Replit Databases](https://replit.com/blog/introducing-a-safer-way-to-vibe-code-with-replit-databases) (Replit, July 21, 2025). Jason Lemkin's account of the deleted database and the rollback that worked, Amjad Masad's "unacceptable and should never be possible", and Replit's own announcement of automatically separate development and production databases.
- [Postmortem of database outage of January 31](https://about.gitlab.com/blog/2017/02/10/postmortem-of-database-outage-of-january-31/): GitLab (2017). About 300 GB removed, the failing `pg_dump` 9.2 backups, rejected alert emails, the empty S3 bucket, disk snapshots never enabled, the six-hour-old copy and about 18 hours of downtime.
- [A joint statement from UniSuper CEO Peter Chun, and Google Cloud CEO, Thomas Kurian](https://unisuper.com.au/about-us/media-centre/2024/a-joint-statement-from-unisuper-and-google-cloud): UniSuper and Google Cloud, May 8, 2024. The deleted private cloud and the backups "with an additional service provider".
- [Database Backups](https://supabase.com/docs/guides/platform/backups): Supabase documentation. Daily backups on paid plans, PITR as an add-on, regular exports for free projects, Storage objects not included, downtime during a restore, and WAL backed up every two minutes.
- [Introduction to backups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html): AWS documentation. Amazon RDS retention periods, point-in-time restore, and automated backups deleted with the database unless you choose to keep them.
- [ORM 6.15.0, AI Safety Guardrails for Destructive Commands](https://www.prisma.io/blog/orm-6-15-0-ai-safety-guardrails-for-destructive-commands-and-more): Prisma, August 27, 2025. The CLI detecting AI agents and asking for explicit consent before `prisma migrate reset`.
- [Back Up Business Data](https://www.cisa.gov/audiences/small-and-medium-businesses/secure-your-business/back-up-business-data): CISA. The 3-2-1 rule, scheduled recovery tests and written-down recovery procedures.
- [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html): PostgreSQL documentation. Consistent exports while the database is in use, refusing to dump from a newer server version, and not being the right tool for regular production backups except in simple cases.
