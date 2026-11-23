---
title: "There is no cloud. It's someone else's computer"
slug: what-is-the-cloud
order: 15
level: 1
levelName: Foundations
concepts: [Cloud providers, AWS, Google Cloud, Azure, Pay-as-you-go, EC2, S3, RDS, Lambda, Serverless]
readTime: 10 min
quiz:
  - question: "Your game says your progress is \"saved to the cloud\". Where is your save file really?"
    options:
      - text: "Floating in the sky, sent by satellite"
      - text: "On a server in a data center that the game company rents or owns"
        correct: true
      - text: "Only inside your console or phone"
      - text: "Inside your Wi-Fi router"
    explanation: "\"The cloud\" means computers in data centers that you reach over the internet. Your save file is stored on one of those servers, so you can load it from another device."

  - question: "You rent an EC2 computer on AWS for a school project. When the project ends, you forget about it for a month. What happens?"
    options:
      - text: "Nothing. AWS turns it off when you stop using it."
      - text: "AWS deletes it after one day"
      - text: "It stops charging because nobody visited your app"
      - text: "It keeps running, and you keep paying for every second it runs"
        correct: true
    explanation: "An EC2 computer runs all the time until you stop it, and pay-as-you-go means you pay for that time, even if nobody uses your app. The cloud provider doesn't know you forgot."

  - question: "Your app lets people upload profile pictures. Which AWS building block is made for storing files like these?"
    options:
      - text: "S3"
        correct: true
      - text: "Lambda"
      - text: "RDS"
      - text: "EC2"
    explanation: "S3 is AWS's giant storage room for files: images, videos, backups. RDS is for database rows, Lambda runs code, and EC2 is a whole computer."

  - question: "What does \"serverless\" really mean?"
    options:
      - text: "No computers are involved at all"
      - text: "The code runs inside the visitor's browser"
      - text: "Your code still runs on servers, but the cloud provider manages them and runs your code only when it's needed"
        correct: true
      - text: "The code runs on your own laptop"
    explanation: "The name is confusing. There are still servers. You never set them up or look after them, and your code only runs (and costs money) when a request arrives."

  - question: "Why do most beginners put their first app on a hosting platform instead of setting up AWS directly?"
    options:
      - text: "AWS doesn't allow small apps"
      - text: "AWS gives you raw parts with hundreds of settings, so it's more likely you set something up wrong and pay for mistakes"
        correct: true
      - text: "AWS can't run JavaScript"
      - text: "Hosting platforms don't use data centers"
    explanation: "AWS is like buying ingredients instead of a ready meal. You get great control, but you have to make every choice yourself, and pay-as-you-go means a wrong choice can cost real money."

  - question: "Your app has a contact form that people use about five times a day. Which fits better?"
    options:
      - text: "An EC2 computer that runs all day and night"
      - text: "Buying your own server and keeping it at home"
      - text: "Three EC2 computers, in case one breaks"
      - text: "A Lambda function that runs only when someone sends the form"
        correct: true
    explanation: "The form is used for a few seconds a day. With Lambda you pay only while your code runs. An EC2 computer would cost money all day while doing almost nothing."
---

# There is no cloud. It's someone else's computer

> **Before you start**
> - **Server:** a computer that waits for requests and answers them, usually kept in a building called a data center. [You pressed Enter. What happened in the next second?](/lessons/what-happens-when-you-open-a-website)
> - **Backend:** the part of your app that runs on a server, where secrets and rules are safe. [A player scored 999,999 points by editing the page. How?](/lessons/frontend-and-backend)
> - **Database:** a program that stores your app's data safely, in tables and rows. [Your app forgot everyone's messages overnight. Why?](/lessons/what-is-a-database)
> - **Hosting and deploying:** putting your app on a computer that's always on the internet, so anyone can open it. [It works on my laptop. Why can't my friend open it?](/lessons/localhost-vs-production)

## There is no cloud

Your photos are "backed up to the cloud". Your game progress is "saved in the cloud". People say apps "run in the cloud".

It sounds like your stuff floats somewhere in the sky. It doesn't.

Here's the secret: **the cloud is computers.** Real ones, in big buildings, owned by big companies. When something is "in the cloud", it's stored on one of those computers. You reach it over the internet.

You already know these computers. In the first lesson, you met servers and data centers. The cloud is the same idea, with one new twist: **you can rent them.**

This lesson explains who rents them out, how you pay, and what you can rent. It matters because when you put your own app online, it will live on rented computers like these.

> **In short:** "the cloud" means servers in data centers that you reach over the internet. Nothing floats in the sky.

---

## Renting instead of buying

Say you want to ride a bike this weekend. You could buy one. Then you have to store it, pump the tyres and fix it when it breaks. Or you could rent a bike for two hours, ride it, and give it back.

Running an app has the same choice.

**Buying:** you buy your own servers. You find a room for them. You pay for electricity and cooling. You replace broken parts. If your app gets popular overnight, you need more servers, and buying them takes weeks.

**Renting:** a company that already has huge data centers lets you use some of its computers. You ask for a computer, and a few minutes later it's ready. When you don't need it anymore, you give it back.

A company that rents out computers, storage and other services over the internet is called a **cloud provider**.

Where the bike analogy stops: you never see or touch the rented computer. You control it from a website or with commands, from anywhere in the world.

> **In short:** a cloud provider rents you computers in its data centers. You don't buy, store or repair anything yourself.

---

## You pay for what you use

A bike rental shop charges by the hour. Cloud providers charge in a similar way, but in much smaller pieces.

Depending on what you rent, you pay:

- **by time:** for a rented computer, often counted by the second
- **by size:** for storage, by how many gigabytes you keep
- **by use:** for some services, by how many times your code runs and for how long

This is called **pay-as-you-go**: no big payment up front, and a bill at the end of the month for what you used.

Pay-as-you-go is great for small projects. A tiny app with few visitors can cost very little. But it cuts both ways. If you use more, you pay more. And if you forget to give something back, the meter keeps running.

> **Go deeper:** [You woke up to a $10,000 cloud bill. What happened?](/lessons/surprise-cloud-bill) (Level 3) shows how bills grow and how to set limits.

> **In short:** pay-as-you-go means you pay for exactly what you use, measured in seconds, gigabytes or requests. Use more, pay more.

---

## The big three

Many companies rent out computers. Three of them are much bigger than the rest:

| Cloud provider | Run by |
|---|---|
| **AWS** (Amazon Web Services) | Amazon |
| **Google Cloud** | Google |
| **Microsoft Azure** | Microsoft |

AWS started in 2006 and is the biggest. Google Cloud and Azure offer very similar things under different names.

All three rent out more than computers. They offer storage, databases, tools for sending emails, tools for AI, and much more. AWS alone says it has over 200 services. Each one is a separate building block. You pick the blocks your app needs and connect them yourself.

The rest of this lesson uses AWS as the example, because its names are the ones you'll hear most. Google Cloud and Azure have a matching block for each one.

> **In short:** the three biggest cloud providers are AWS, Google Cloud and Microsoft Azure. Each offers hundreds of building blocks you can rent.

---

## Two building blocks: a computer and a storage room

Four AWS building blocks come up again and again. Here are the first two.

### EC2: rent a whole computer

**EC2** lets you rent a computer that runs all the time. You choose how powerful it is: how fast its CPU is and how much memory it has. Then you install whatever you want on it, like your app's backend.

Think of renting a gaming PC at a gaming café. While you pay, it's yours. You can install anything. But you also have to set it up, keep it updated and switch it off when you leave. And you pay for every minute you sit there, even if you're not playing.

### S3: a giant storage room for files

**S3** is a place to keep files: pictures, videos, music, backups. You put files in, and you can get them back later with a web address.

Think of a storage locker that grows as you fill it. You never run out of shelves. You pay for how much you keep in it.

Your app would use S3 for things like profile pictures that users upload. Files in S3 are private unless you choose to share them.

> **In short:** EC2 is a rented computer that's always on. S3 is a storage room for files that grows as you add more.

---

## Two more: a looked-after database and code that wakes up

### RDS: a database AWS looks after

In an earlier lesson, you learned that your app's data belongs in a database. You could install a database yourself on an EC2 computer. Then you'd have to update it, make backups and fix it if it crashes.

**RDS** is a database that AWS runs for you. AWS installs it, updates it and takes the backups. You use it from your app.

Think of the difference between keeping a pet fish yourself and paying a pet shop to look after it in their tank. It's still your fish. Someone else cleans the tank.

### Lambda: code that runs only when it's needed

An EC2 computer runs all day, even when nobody is using your app. That's wasteful for code that runs only now and then, like code that sends a "thanks for signing up" email.

**Lambda** runs a piece of your code only when something asks for it, like a request from your app. When the code finishes, it stops. You pay only while it runs. AWS calls each piece of code like this a **Lambda function**.

Think of a light with a motion sensor. It switches on when someone walks past and off again when they leave. You don't pay for light in an empty hallway.

This way of running code is called **serverless**. The name is confusing: there are still servers. You never set them up, update them or switch them off. The cloud provider does all of that.

> **In short:** RDS is a database that AWS looks after for you. Lambda runs your code only when needed, and that's called serverless.

---

## How it goes wrong: raw parts and real bills

If the cloud is so useful, why don't beginners start on AWS?

Because AWS gives you **raw parts**. It's like buying flour, eggs and sugar instead of buying a cake. You can make anything, but you have to make every choice yourself. Each building block has many settings, and the blocks must be connected correctly.

That causes three common problems:

**1. Something is set up wrong.** A storage room is made public by accident, so anyone can see the files. Or the database accepts connections from the whole internet.

**2. Something is left running.** You try EC2 for a weekend project, then forget about it. It keeps running, and pay-as-you-go keeps charging, every second, for months.

**3. Someone else uses your account.** To control AWS from your code, you use secret keys. If a key ends up in a public place, strangers can rent computers with your account, and you get the bill.

> **Go deeper:** [Your API key leaked, and strangers are spending your money](/lessons/api-key-ended-up-public) (Level 2) shows how keys leak and how to stop it.

None of this means AWS is bad. Big apps use it every day. It means AWS expects you to know what you're doing.

> **In short:** AWS gives you raw parts with many settings. Mistakes, like a forgotten computer or a leaked key, can cost real money.

---

## What good looks like

**For your first apps, let someone else assemble the parts.** Hosting platforms like Vercel and Netlify use cloud building blocks behind the scenes and set them up for you. The next lesson shows how.

**If you do use AWS, Google Cloud or Azure:**

- Set up a **budget alert** right away. It emails you when spending passes an amount you choose. On its own, an alert only warns you. It doesn't switch anything off.
- Never put secret keys in your code. Keep them in environment variables.
- Turn off and delete anything you're not using.
- Know which building block each part of your app uses. This table helps:

| Your app needs... | AWS building block | Pays for... |
|---|---|---|
| A computer that's always on | EC2 | Every second it runs |
| A place for uploaded files | S3 | How much you store (and how much is downloaded) |
| A database | RDS | The time it runs, plus storage |
| Code that runs now and then | Lambda | Each time it runs, and for how long |

> **In short:** start on a hosting platform. If you use a cloud provider directly, set a budget alert, protect your keys and switch off what you don't use.

---

## Try it yourself

### Experiment 1: Count the building blocks

1. Open `aws.amazon.com/products` in your browser.
2. Look through the categories: Compute, Storage, Database, and many more.
3. Try to count the services. Give up when you get bored.

You'll see why AWS can feel like a giant hardware store with no map.

### Experiment 2: Find the four from this lesson

On the same page, use the search or the categories to find **EC2**, **S3**, **RDS** and **Lambda**. Open each one and read the first sentence. Does it match what you learned here?

You don't need an account for either experiment, and nothing costs money.

---

## Takeaways

**Key terms**
- **The cloud:** servers in data centers that you rent and reach over the internet
- **Cloud provider:** a company that rents out computers, storage and other services, like AWS, Google Cloud or Microsoft Azure
- **Pay-as-you-go:** paying only for what you use, measured in seconds, gigabytes or requests
- **EC2:** a rented computer that runs all the time
- **S3:** storage for files like images, videos and backups
- **RDS:** a database that AWS runs and looks after for you
- **Lambda:** code that runs only when it's needed
- **Serverless:** running code without managing any servers yourself (the servers still exist)

**Red flags**
- You tried a cloud service once and never turned it off
- A secret key is written inside your code
- You have a cloud account with no budget alert
- Your AI tells you to change a setting to "public" and you don't know why

**Ask your AI**
- *"My app has [describe it]. Which cloud building blocks would it use: a computer that's always on, file storage, a database, or code that runs only when needed?"*
- *"Before I create anything on AWS, list everything that will cost money and how to turn each one off."*
- *"Explain the difference between EC2 and Lambda for my app, with the costs in plain words."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Your rented computer is usually a slice of a bigger one.** AWS calls an EC2 computer an *instance* and describes it as a *virtual server*. Special software splits one powerful physical machine into several smaller pretend computers. Each acts like its own computer with its own operating system, and they can't see each other. That's how a cloud provider can hand you a computer in minutes: it doesn't install new hardware, it starts a new slice.

**The same building blocks at Google Cloud and Azure.** Google publishes a comparison table. The closest matches are:

| AWS | Google Cloud | Microsoft Azure |
|---|---|---|
| EC2 | Compute Engine | Azure Virtual Machines |
| S3 | Cloud Storage | Azure Blob Storage |
| RDS | Cloud SQL | Azure SQL Database, Azure Database for PostgreSQL or MySQL |
| Lambda | Cloud Run functions | Azure Functions |

**Regions.** Cloud providers have data centers in many parts of the world. A group of data centers in one area is called a *region*. When you create something, you choose its region. Picking a region close to your users makes your app faster for them.

**What RDS takes off your hands.** AWS's own comparison says that with RDS, AWS handles backups, software updates for the database and the operating system, and failure detection. You still design your tables and write your queries. With a database on EC2, you'd do all of the updates and backups yourself.

**Billing details change.** EC2 on-demand computers are billed per second, with a minimum of 60 seconds. Lambda is billed per request plus how long the code runs. Prices, free-tier offers and billing rules change often, so always check the provider's current pricing page before you build.

**Budget alerts are delayed.** AWS's documentation warns that there can be a delay between when you use something and when the budget notification arrives. Your costs can pass your limit before the email reaches you.

**Market share.** Analysts at Synergy Research Group (now part of TechInsights) track cloud spending every quarter. In their 2026 reports, AWS had the largest share, followed by Microsoft and Google. The exact percentages move every quarter.

</details>

## References

- [Overview of Amazon Web Services](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/introduction.html): AWS whitepaper. AWS started offering cloud services in 2006, uses pay-as-you-go pricing, and has over 200 services.
- [What is Amazon EC2?](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html): AWS docs. An EC2 instance is a virtual server, and on-demand instances are billed per second with a 60-second minimum.
- [Blocking public access to your Amazon S3 storage](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html): AWS docs. New S3 buckets and files don't allow public access unless someone changes the settings.
- [What is Amazon Relational Database Service (Amazon RDS)?](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html): AWS docs. With RDS, AWS handles backups, database and operating system updates, and failure detection. With a database on EC2, you do.
- [AWS Lambda pricing](https://aws.amazon.com/lambda/pricing/): AWS. Lambda is billed by the number of requests and how long the code runs.
- [Managing your costs with AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html): AWS docs. Budget alerts by email, and the warning that notifications can arrive after costs have already passed the limit.
- [Compare AWS and Azure services to Google Cloud](https://docs.cloud.google.com/docs/get-started/aws-azure-gcp-service-comparison): Google Cloud docs. The matching building blocks at AWS, Google Cloud and Azure.
- [Q2 Cloud Market Passes $143 Billion; Highest Growth Rate in Eight Years](https://www.srgresearch.com/articles/q2-cloud-market-passes-143-billion-highest-growth-rate-in-eight-years): Synergy Research Group (now part of TechInsights), July 2026. Amazon has the largest share of the cloud market, followed by Microsoft and Google.
