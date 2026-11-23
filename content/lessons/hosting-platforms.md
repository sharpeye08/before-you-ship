---
title: "From your laptop to a real website in one push"
slug: hosting-platforms
order: 16
level: 1
levelName: Foundations
concepts: [Hosting platforms, Deploys from GitHub, Builds, CDNs, Serverless functions, Preview links]
readTime: 11 min
quiz:
  - question: "Your app's GitHub repository is connected to a hosting platform. You push a new commit to your main branch. What happens next?"
    options:
      - text: "Nothing, until you email the platform and ask for an update"
      - text: "The platform downloads your code, builds it and puts the new version live"
        correct: true
      - text: "GitHub sends your laptop's files directly to every visitor"
      - text: "Your old version is deleted and the site stays empty until tomorrow"
    explanation: "That's the whole point of connecting GitHub once. Every push to the production branch starts a new build and, if the build works, a new live version."

  - question: "You push your code and the platform shows \"Build failed\". What should you do first?"
    options:
      - text: "Open the build log and find the first error message"
        correct: true
      - text: "Delete the project and create it again"
      - text: "Push the same code again a few times"
      - text: "Ask your AI to rewrite the whole app"
    explanation: "The build log shows every message the build printed. The first error usually names the file and the problem. Read it, or copy it to your AI with the lines around it."

  - question: "Your app works on your laptop. On the live site, it says the API key is missing. What's the most likely reason?"
    options:
      - text: "The hosting platform deleted your key"
      - text: "Live sites can't use API keys"
      - text: "The key is in a .env file on your laptop, but you never added it to the platform's environment variables"
        correct: true
      - text: "Your laptop is turned off"
    explanation: "Your .env file stays on your laptop and isn't pushed to GitHub. The platform only knows the environment variables you set in its dashboard. Add the key there and deploy again."

  - question: "You open a pull request, and the platform posts a preview link. What is that link for?"
    options:
      - text: "It's your app's new main address, and all visitors now see the change"
      - text: "It's a copy of GitHub's website"
      - text: "It's a backup of your old version"
      - text: "It lets you test your change at its own address before it goes live, while visitors still see the old version"
        correct: true
    explanation: "A preview link is a separate deployment of your branch. You can click around and share it with friends. The live site only changes when you merge into the production branch."

  - question: "Your images load fast for a friend on the other side of the world. Which part of the hosting platform helps most?"
    options:
      - text: "The build log"
      - text: "The preview link"
      - text: "The CDN, which keeps copies of your files on servers in many countries"
        correct: true
      - text: "The environment variables"
    explanation: "The CDN keeps copies of your pages, images, CSS and JavaScript close to visitors. Your friend gets the files from a nearby server instead of one far away."

  - question: "Your app's backend runs as a serverless function. One request makes it wait a very long time for another website. What can happen?"
    options:
      - text: "The function runs forever until the other website answers"
      - text: "The platform stops the function when it reaches its time limit, and the visitor gets an error"
        correct: true
      - text: "The platform moves your app to your laptop"
      - text: "The CDN answers instead with the correct result"
    explanation: "Serverless functions have a maximum running time. If your code takes longer, the platform stops it and returns an error. Check the limit in your platform's docs and keep slow work out of a single request."
---

# From your laptop to a real website in one push

> **Before you start**
> - **Deploying:** copying your app to a computer that's always on the internet, so anyone can open it. [It works on my laptop. Why can't my friend open it?](/lessons/localhost-vs-production)
> - **GitHub and pushing:** GitHub stores your git repository online. Pushing sends your new commits there. [The AI broke your working app. Here's your undo button](/lessons/git-as-an-undo-button)
> - **Environment variables:** settings and secrets kept outside your code, like in a `.env` file. [Your app's secrets don't belong in your code. Here's where they go](/lessons/environment-variables)
> - **Cloud provider and serverless:** companies like AWS rent out computers; serverless code runs only when needed. [There is no cloud. It's someone else's computer](/lessons/what-is-the-cloud)

## It works on your laptop. Now what?

You built an app. It runs on your laptop at `localhost`. You show it to a friend, and they ask: "Can you send me the link?"

You can't. `localhost` only means "this computer". Your friend's phone can't reach your laptop.

You could rent a computer from AWS. But AWS gives you raw parts with many settings, and that's a lot of work for one small app. So most people use a service that does the cloud setup for them. This lesson shows what that service does every time you change your code.

> **In short:** to share your app, it must run on a computer that's always online. Most people don't set that up by hand.

---

## A hosting platform does the setup for you

If AWS is like buying flour, eggs and sugar, a **hosting platform** is like a bakery. You bring the recipe (your code). The bakery has the ovens, the staff and the shop window. You get the cake.

A hosting platform takes your code and puts it online. It picks the computers, sets them up and keeps them running.

Two popular hosting platforms for web apps are **Vercel** and **Netlify**. They work in very similar ways, so this lesson explains them together. There are others too, and many of them can also put your app online straight from GitHub.

> **In short:** a hosting platform puts your code online and handles the computers for you. Vercel and Netlify are two popular ones.

---

## Connect once, push forever

Here's the best part. You set things up **one time**:

1. Create an account on the hosting platform. The page where you control your projects is called the **dashboard**.
2. Give it permission to read your GitHub repository.
3. Pick the repository and press **Deploy**.

After that, you never upload anything by hand. Every time you **push** a commit to GitHub, the platform downloads your new code and puts the new version online. Each version it puts online is called a **deployment**.

Pushes to your main branch (usually called `main`) go to the real, public site. That branch is the **production branch**, and the public site is called **production**.

> **In short:** connect your GitHub repository once. After that, every push to your main branch creates a new deployment of your live site.

---

## What happens after each push

When you push, the platform goes through four steps. Here's the whole trip:

```text
 You push to GitHub
        │
        ▼
 1. BUILD      code ──▶ files ready for browsers
        │
        ├──▶ 2. CDN        pages, images, CSS, JS copied to many countries
        │
        ├──▶ 3. FUNCTIONS  backend code, runs only when a request arrives
        │
        ▼
 4. LIVE ADDRESS   like my-app.vercel.app or my-app.netlify.app
```

---

## Step 1: the build

Your project might have hundreds of small files, packages from npm, and code the browser can't read directly. So the platform first **builds** your app. A **build** turns your project into the final files a browser can use. The platform installs your packages and runs your project's build command, like `npm run build`.

Think of a video editing app. Your project has clips, music, text and effects in separate layers. You press Export, and you get one video file anyone can play. A build is the Export button for your app.

While it builds, the platform writes down every message the build prints. This list is the **build log**. If the build fails, the build log tells you why.

> **In short:** a build turns your project into files a browser can use. The build log shows everything that happened, including errors.

---

## Step 2: copies everywhere with a CDN

After the build, your pages, images, CSS and JavaScript are ready. These files are the same for every visitor, so the platform can copy them.

It puts copies on servers in many countries. A group of servers like this is called a **CDN** (content delivery network). When someone opens your app, they get the files from the server closest to them.

Think of a popular book. If only one library has it, people from far away must travel there. If every town's library has a copy, everyone borrows it nearby. A CDN gives every "town" a copy of your files.

Closer means faster, even for a friend in another country.

> **Go deeper:** [Fast in the US, painfully slow in India](/lessons/latency-and-cdns) (Level 4) explains why distance makes websites slower.

> **In short:** a CDN keeps copies of your files on servers around the world, so they load fast for everyone.

---

## Step 3: backend code becomes functions

Some of your code can't be copied to a CDN. Your backend does different work for each request: it reads the database, checks a password or uses a secret key.

The platform turns this backend code into **serverless functions**. You met serverless in the last lesson: code that runs only when it's needed. Each time a request arrives, the platform starts your function, runs it and sends back the answer.

Here's a tiny backend function in the style Vercel's docs use:

```js
// api/hello.js
export function GET(request) {
  return new Response("Hello from the server!");
}
```

The file's place (`api/hello.js`) decides its address: `/api/hello`. When a browser asks to read that address (that's what `GET` means), the platform runs this function, and it answers with a short message. You never set up a server for it. Netlify uses a different folder and file format, but the idea is the same.

> **In short:** your backend code becomes serverless functions. They run only when a request arrives, on servers you never see.

---

## Step 4: a live address

When everything is ready, the platform gives your app a web address. You don't have to buy one. It looks like this:

- On Vercel: an address ending in `.vercel.app`
- On Netlify: `your-site-name.netlify.app`

Send that link to your friend. It works on their phone, from anywhere.

> **In short:** each project gets a free address ending in `.vercel.app` or `.netlify.app`, which anyone can open.

---

## Preview links: try it before it goes live

Say you're adding a dark mode. You want to test it on the real internet before everyone sees it.

In git, you'd do this work on a separate branch. Then you open a **pull request** on GitHub: a request to merge your branch into `main`.

When you open a pull request, the platform builds your branch too. (Vercel also does this for every push to any branch.) But it doesn't touch your live site. Instead, it gives that version its own address. This is called a **preview deployment**, and its address is a **preview link**. Vercel and Netlify can post the link as a comment on your pull request.

It's like uploading a YouTube video as "unlisted". You and your friends can watch it with the link. Your subscribers don't see it until you publish.

When you're happy, you merge the pull request into `main`. That creates a new production deployment, and everyone gets dark mode.

> **In short:** each branch or pull request can get its own preview link. You can test there while visitors still see the old version.

---

## Your own domain name

`my-app.vercel.app` works, but you might want `my-app.com`. You can buy a domain name and connect it to your project.

Remember DNS, the internet's address book, from [How does your browser find one computer out of billions?](/lessons/ip-addresses-and-dns). A **DNS record** is one entry in it, saying where a name points. You add one where you bought your domain:

- an **A record** points your domain to an IP address
- a **CNAME record** points your domain to another name, like your `.netlify.app` address

The platform's dashboard tells you exactly which record to add. After you save it, it can take a while before every computer sees the change.

> **In short:** to use your own domain, you add a DNS record that points it at your hosting platform. The dashboard tells you which one.

---

## Secrets live in the dashboard

On your laptop, your API keys live in a `.env` file. That file should never go to GitHub. So how does the platform get them?

You type them into the platform's dashboard. Each project has a page called **Environment Variables**. Your code reads them the same way it does on your laptop.

One catch: the platform uses the values from the moment of the build. If you add or change a variable, you need a new deployment before your app sees it.

> **In short:** put your secrets in the platform's environment variables page, then deploy again so your app picks them up.

---

## Under the hood: it's the cloud again

There's no cloud, only rented computers, and hosting platforms rent them too. Vercel has written that its functions run on AWS Lambda. Netlify launched its functions as a way to use AWS Lambda without an AWS account. So your function may run on the same Amazon computers from the last lesson.

That help isn't free. As your app grows, a platform usually costs more per unit than renting the same parts from a cloud provider directly. You pay extra so you never manage anything. For a first app, that's usually a good deal.

> **In short:** hosting platforms run on big cloud providers like AWS. You pay a bit more per unit in exchange for not managing anything.

---

## How it goes wrong

**The build fails.** The platform shows "Build failed" and your live site stays on the old version. Open the build log. Find the first red error, not the last one. It often names the file and line.

**It works on your laptop but not online.** The most common reason: an environment variable is in your `.env` file but missing in the platform's dashboard. Another one: a package or file exists on your laptop but was never pushed to GitHub.

**A function times out.** Every serverless function has a maximum running time. If your code waits too long, for example for a slow AI service, the platform stops it and the visitor gets an error. Vercel shows a `504` status code for this.

**You hit a free-plan limit.** Free plans have limits, for example on how much data visitors download, how many deployments you make or how long functions can run. Vercel's free plan is also for personal, non-commercial projects only. Limits change, so check your platform's pricing page.

> **In short:** most problems show up in the build log, in missing environment variables, in function time limits or in free-plan limits.

---

## What good looks like

- Your repository is connected, and every push to `main` deploys on its own.
- You test changes on a preview link before merging.
- Every variable in your `.env` file is also set in the platform's dashboard.
- When a deploy fails, you read the build log before changing any code.
- You know your plan's limits, especially the function time limit.

---

## Try it yourself

You need a GitHub account and a free account on Vercel or Netlify.

1. Create a new GitHub repository with one file, `index.html`, containing `<h1>Hello, world!</h1>`.
2. On Vercel or Netlify, start a new project and pick that repository.
3. Press **Deploy** and open the build log. Watch it work line by line.
4. Open your new `.vercel.app` or `.netlify.app` address on your phone.
5. Change the text in `index.html`, commit and push. Watch a new deployment start on its own.
6. Bonus: make a branch, change the text again and open a pull request. Find the preview link.

---

## Takeaways

**Key terms**
- **Hosting platform:** a service that puts your code online and manages the computers for you, like Vercel or Netlify
- **Deployment:** one version of your app that the platform put online
- **Production branch:** the branch (usually `main`) that becomes your live site
- **Build:** turning your project into the final files a browser can use
- **Build log:** every message the build printed, including errors
- **CDN:** servers in many countries that keep copies of your files close to visitors
- **Serverless function:** backend code that runs only when a request arrives
- **Preview link:** a separate address for testing a branch or pull request before it goes live
- **DNS record:** an address book entry that points your domain at your app

**Which step broke?**
- "Build failed" → the build. Read the build log.
- The page loads but data or login doesn't work → a function. Check the environment variables, then the platform's logs for that function.
- The page loads on `.vercel.app` but not on your domain → DNS. Check the records in the dashboard.
- It works on the preview link but not in production → compare the environment variables for each.

**Ask your AI**
- *"Here's my build log: [paste it]. What is the first error, and what does it mean?"*
- *"List every environment variable my app reads, so I can add them all to my hosting platform."*
- *"Which parts of my app will be files on a CDN, and which will be serverless functions?"*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**What the generated addresses look like.** Vercel gives each deployment a unique address, plus one per branch that always shows that branch's newest version. Netlify's Deploy Previews use the pull request number: for pull request #42, the address is `deploy-preview-42--mysitename.netlify.app`.

**Check who can open your previews.** Some platforms can ask visitors of preview links to log in first, but that depends on your settings, so check yours. Netlify adds a header asking search engines not to list Deploy Previews, but that doesn't hide them from people who have the link. Either way, don't put real secrets or real user data on a preview.

**Production and preview can have different variables.** Vercel lets you set each environment variable for Production, Preview or both, and other platforms have similar settings. This is useful: a preview can use a test database while production uses the real one.

**Upper and lower case can break a build.** Windows and macOS usually treat `Logo.png` and `logo.png` as the same file, but build computers often don't. Code that works on your laptop can fail in the build because of one capital letter.

**Function limits, as of writing.** Vercel's docs list a default maximum duration of 300 seconds, with higher limits on paid plans. Netlify's docs list 60 seconds for regular functions and 15 minutes for background functions. These numbers change, so check the current docs.

**How the Lambda link is documented.** Vercel's 2025 engineering post about its "Fluid compute" model says Vercel Functions run on AWS Lambda, and its limits page says the function size limit is enforced by AWS. Netlify's 2018 launch post described its functions as a way to deploy AWS Lambda functions without setting up an AWS account. Both companies have added their own layers on top, so the details may change.

**Not everything fits in a function.** Serverless functions are built for short request-and-answer work. Apps that keep a process running all the time, or hold a connection open for a long time, may fit better on a platform that runs a normal always-on server. Ask your AI which kind of platform fits your app.

</details>

## References

- [Deploying Git Repositories with Vercel](https://vercel.com/docs/git): Vercel docs. Every push deploys, the production branch (usually `main`) becomes the live site, every other branch and pull request gets a preview with its own address, and Vercel can comment on pull requests.
- [Environment variables](https://vercel.com/docs/environment-variables): Vercel docs. The Environment Variables page, separate values for Production and Preview, and changes applying only to new deployments.
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations): Vercel docs. The default maximum duration of 300 seconds, higher limits on paid plans, the 504 error on a timeout, and the size limit enforced by AWS.
- [Fluid: How we built serverless servers](https://vercel.com/blog/fluid-how-we-built-serverless-servers): Vercel blog, July 2025. Vercel Functions run on AWS Lambda.
- [Terms of Service](https://vercel.com/legal/terms): Vercel. The free Hobby plan is only for personal or non-commercial use.
- [Functions API Reference](https://vercel.com/docs/functions/functions-api-reference): Vercel docs. A function in `api/hello.js` that exports `GET` and returns a `Response`, as in this lesson's example.
- [Deploy Previews](https://docs.netlify.com/deploy/deploy-types/deploy-previews/): Netlify Docs. The `deploy-preview-42--mysitename.netlify.app` address, the pull request comment with the link when deploy notifications are on, and the header that asks search engines not to list previews.
- [Configuration for functions](https://docs.netlify.com/build/functions/configuration/): Netlify Docs. The 60-second limit for regular functions and 15 minutes for background functions.
- [Netlify's AWS Lambda functions bring the backend to your frontend workflow](https://www.netlify.com/blog/2018/03/20/netlifys-aws-lambda-functions-bring-the-backend-to-your-frontend-workflow/): Netlify blog, March 2018. Netlify Functions launched as a way to deploy AWS Lambda functions without setting up an AWS account.
