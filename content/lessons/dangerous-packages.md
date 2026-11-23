---
title: "The AI suggested a package that didn't exist. Then someone made it"
slug: dangerous-packages
order: 31
level: 2
levelName: Builder
concepts: [Supply chain attacks, Typosquatting, Hallucinated packages, Slopsquatting, Install scripts, npm audit, Checking a package]
readTime: 13 min
quiz:
  - question: "Your AI tells you to run npm install with a package name you've never heard of. Before you run it, what is the most useful first check?"
    options:
      - text: "Run it, then delete it if anything looks wrong"
      - text: "Look the package up on npmjs.com and check its exact name, age, downloads and source code link"
        correct: true
      - text: "Ask the AI again whether the package is safe"
      - text: "Check that the name sounds professional"
    explanation: "Installing can already run the package's code, so checking afterwards is too late. Asking the same AI again isn't a real check, because it may confidently repeat its own mistake. Look at the package's page on npmjs.com before installing."

  - question: "You run npm view on a package your AI suggested, and npm replies with a 404 Not Found error. What does this most likely mean?"
    options:
      - text: "The npm registry is down"
      - text: "The package is private and you need to log in"
      - text: "Nobody has published a package with that name: the AI probably made it up"
        correct: true
      - text: "You should create a package with that name yourself"
    explanation: "AI tools sometimes invent package names that sound right. A 404 means no such package exists yet. Don't install anything with a similar name. Ask the AI for a real, well-known alternative and check it."

  - question: "Why are made-up package names a security risk, and not only an annoying error?"
    options:
      - text: "Attackers can publish real packages under names that AI tools often invent, and wait for people to install them"
        correct: true
      - text: "Made-up names slow down npm for everyone"
      - text: "npm charges money for failed installs"
      - text: "Made-up names delete your lockfile"
    explanation: "This attack is called slopsquatting. Researchers found that AI tools often suggest the same made-up names again, so an attacker can predict them, register them and fill them with harmful code."

  - question: "You install a package but never import it in your code. Can it still harm you?"
    options:
      - text: "No, code only runs if you import it"
      - text: "Only if you deploy your app"
      - text: "Only on Windows"
      - text: "Yes, packages can include install scripts that npm runs automatically during npm install"
        correct: true
    explanation: "A package's package.json can include preinstall, install or postinstall scripts. npm runs them during installation, with access to your files and environment variables. Several real attacks worked this way."

  - question: "npm audit says \"found 0 vulnerabilities\". What does that tell you?"
    options:
      - text: "Every package in your project is safe"
      - text: "None of your packages has a known, already-reported vulnerability in npm's database"
        correct: true
      - text: "None of your packages has install scripts"
      - text: "The AI didn't invent any package names"
    explanation: "npm audit compares your packages with a list of reported problems. A brand-new malicious package, or a problem nobody has reported yet, won't be on that list. It's a useful check, but not a guarantee."

  - question: "You find out that a package you installed last week stole environment variables. What should you do first, after removing it?"
    options:
      - text: "Nothing, removing the package fixes everything"
      - text: "Delete your node_modules folder and reinstall"
      - text: "Replace every secret that was on that computer or server, like API keys and database passwords"
        correct: true
      - text: "Write a bad review on npmjs.com"
    explanation: "Removing the package stops future damage, but the secrets it already sent are still in the attacker's hands. Create new keys and passwords, and turn off the old ones."
---

# The AI suggested a package that didn't exist. Then someone made it

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Package and npm:** code someone else wrote and shared, and the tool that downloads it from the npm registry. *([It works on my machine, but not on yours. Blame the packages](/lessons/packages-and-dependencies))*
> - **Lockfile:** `package-lock.json`, which records the exact version of every installed package. *([It works on my machine, but not on yours. Blame the packages](/lessons/packages-and-dependencies))*
> - **Environment variables:** settings and secrets kept outside your code, often in a `.env` file. *([Your app's secrets don't belong in your code. Here's where they go](/lessons/environment-variables))*
> - **Leaked secret:** a key or password that someone else can now use, which must be replaced. *([Your API key leaked, and strangers are spending your money](/lessons/api-key-ended-up-public))*

## A name that sounded right

You ask your AI to add a feature that turns uploaded spreadsheets into charts. It writes the code and gives you a command: `npm install`, followed by a package name. The name sounds exactly right. It mentions spreadsheets and charts.

You run it. It installs. But the AI's code doesn't work: the package doesn't have the functions the AI used. You ask the AI to fix it, and it switches to a different package. Everything works. You forget about the first one.

Here's what you didn't see. Until a few weeks ago, that first package didn't exist. The AI had invented the name. Someone noticed that AI tools keep inventing that same name, registered it on npm, and added a script that runs the moment anyone installs it. The script read your `.env` file and sent your API keys to a server somewhere else.

Your app works. You didn't import the package. You can't see anything wrong. And your keys are gone.

This lesson is about the code you install without reading it, and how to stop the dangerous kind getting in.

---

## The mental model: installing is running a stranger's code

When you run `npm install`, you aren't downloading a picture or a document. You're adding a stranger's code to your project. That code can run with the same permissions you have: it can read your files, your `.env` file, and anything else on your computer. On a server, it can read your production secrets.

Most package authors are honest, and most packages are safe. But you're trusting many people at once. Every package you install brings its own dependencies, and you trust all of their authors too.

Think of a restaurant. The cook is careful and the kitchen is clean. But the food comes from dozens of suppliers, and those suppliers have their own suppliers. If one of them sends something bad, the meal is bad, however careful the cook is. All the people and steps that bring ingredients to the kitchen are called the **supply chain**.

Software has a supply chain too: the packages you install, their dependencies, the npm registry, and the people who publish them. A **supply chain attack** is an attack that reaches your app through something you use, instead of attacking your app directly.

**Where the restaurant comparison stops working:** food inspectors check suppliers. Nobody checks every npm package before you install it. Anyone can publish one, under almost any free name, in minutes.

---

## Four ways a bad package gets in

### 1. Typosquatting: a name one typo away

Attackers publish packages with names very close to popular ones, hoping someone mistypes. This is called **typosquatting**.

A real case: in 2017, a package called `crossenv` appeared on npm. The popular, real package is `cross-env`, with a dash. When installed, the fake one sent the environment variables of whoever installed it to the attacker's server. npm removed it, and about 40 packages in total after looking further, and told anyone who had installed them to "immediately revoke and replace" their credentials.

### 2. Slopsquatting: names the AI invents

AI tools sometimes **hallucinate** packages: they confidently suggest a package name that doesn't exist. The name sounds right because the AI builds it from words that often appear together.

Researchers measured how often this happens. A study presented at USENIX Security 2025, a major computer security conference, generated 576,000 code samples with 16 AI models, in Python and JavaScript. On average, at least 5.2% of the packages suggested by commercial models didn't exist. For open-source models (models whose files anyone can download and run), it was 21.7%. Across all the tests, the models invented 205,474 different fake package names.

Here's why that matters for security. If an AI invents the same name again and again, an attacker can find that name, publish a real package under it, and wait. The next person whose AI suggests it installs the attacker's code. This is called **slopsquatting**, from "slop" (careless AI output) and "typosquatting". Seth Larson, the security developer-in-residence at the Python Software Foundation, gave it this name.

This isn't only a theory. In 2024, a researcher at Lasso Security noticed AI tools kept suggesting a Python package called `huggingface-cli`, which didn't exist. (The real tool is installed differently.) He published an empty, harmless package with that name as an experiment. In three months it was downloaded about 15,000 times, and it even appeared in the install instructions of a project from a large company.

### 3. Hijacked real packages

Sometimes the package is real, popular and trusted, but someone else takes control of it.

- **In 2018,** an attacker talked their way into becoming a maintainer of `event-stream`, a widely used package. (A package's **maintainer** is the person who looks after it and publishes new versions.) The new maintainer added a dependency with hidden code that targeted one bitcoin wallet app and tried to steal its users' coins.
- **In September 2025,** the maintainer of `chalk`, `debug` and other very popular packages received a **phishing** email: a fake message designed to trick someone into giving away their login. It pretended to be npm support, but came from a look-alike address, `support@npmjs.help`. The attacker took over his account and published new versions containing code that tried to steal cryptocurrency in the browser. The bad versions were live for roughly two hours before people started removing them, and npm removed them the same day. But these are some of the most downloaded packages on npm, so even a few hours mattered.

This is where your lockfile protects you. A project with a lockfile keeps installing the exact versions it recorded. A project without one, or a fresh `npm install` of a new package, picks up the newest version, including a freshly hijacked one.

> **Go deeper:** [It works on my machine, but not on yours. Blame the packages](/lessons/packages-and-dependencies) (Level 1) explains how lockfiles pin exact versions.

### 4. Install scripts: code that runs during install

The story at the top of this lesson worked even though you never imported the package. How?

A package's `package.json` can list **install scripts**: commands that npm runs automatically while installing it. They have names like `preinstall`, `install` and `postinstall`:

```json
{
  "name": "some-package",
  "version": "1.0.0",
  "scripts": {
    "postinstall": "node setup.js"
  }
}
```

In plain English: after npm installs this package, it runs `node setup.js`, a file inside the package. That file can do anything your user account can do.

Install scripts have honest uses. Some packages need to build parts of themselves for your computer. npm's own docs say compiling code for your machine is the only valid reason for `install` or `preinstall` scripts. But they're also the attacker's favourite tool, because the code runs before you've written a single line that uses the package.

In September 2025, a self-spreading attack nicknamed **Shai-Hulud** used exactly this. Infected package versions used a `postinstall` script to run code that searched the computer for secrets, such as GitHub tokens and cloud API keys. Then it used the developer's own npm access to publish infected versions of *other* packages they maintained. The US cybersecurity agency CISA published an alert about it, saying it had compromised more than 500 packages.

---

## How it goes wrong with AI

AI tools make every one of these risks a bit worse:

- **They suggest packages confidently.** A made-up name looks exactly like a real one in the chat.
- **They suggest packages for small jobs.** Things a few lines of code, or a built-in feature, could do.
- **AI agents can install packages themselves.** Some coding tools run `npm install` without stopping to ask. Set yours to ask before installing anything.
- **"Fix it" leaves things behind.** When a package doesn't work, the AI often switches to another one, but the first stays in `package.json`, and its install script has already run.

---

## What good looks like

### Habit 1: Check a package before you install it

Before installing a package you don't know, look it up. You can do it in the terminal:

```bash
npm view some-package-name
```

This prints the package's description, latest version, how many versions exist, who maintains it and when it was last published. If npm replies with a **404 Not Found** error, the package doesn't exist: the AI made it up. Don't install anything with a similar name. Ask the AI for a well-known alternative, and check that one too.

Then open the package's page on `npmjs.com/package/` followed by its name, and look for these warning signs:

| Check | Safer sign | Warning sign |
|---|---|---|
| **Name** | Exactly the name in the official docs | One letter different from a famous package |
| **Age and history** | Published years ago, many versions | Created days or weeks ago, one or two versions |
| **Weekly downloads** | Thousands or more (for a common job) | Very few, for a job lots of apps need |
| **Repository link** | Links to real source code with recent activity | No link, or a link to an empty or unrelated project |
| **Install scripts** | None, or clearly explained (for example, building native code) | A `postinstall` script in a package that has no reason to need one |

No single check proves a package is safe. Popular packages get hijacked too. But a brand-new package with a name your AI invented and a `postinstall` script should stop you completely.

Before all of this, ask the simplest question: **do I need a package at all?** Each one you skip is one less stranger in your supply chain.

### Habit 2: Read what npm audit tells you

When you run `npm install`, npm also checks your packages against a database of reported security problems and prints a summary, like "found 0 vulnerabilities". To see the full report:

```bash
npm audit
```

It lists packages with known problems, how serious each one is, and whether an update fixes it. `npm audit fix` applies the updates that stay within the versions your `package.json` allows.

Two warnings:

- **Don't run `npm audit fix --force` without reading it.** It can install major versions that break your app. npm's own docs say not to use this option if you don't have a clear idea of what you want to do.
- **"0 vulnerabilities" isn't "safe".** `npm audit` only knows about problems that someone has already found and reported. A brand-new malicious package, or a hijacked version published an hour ago, isn't in the database yet.

> **Go deeper:** [Stop broken code before it ever goes live](/lessons/ci-cd) (Level 3) shows how to run checks like this automatically.

### Habit 3: Control install scripts

You can tell npm not to run any install scripts:

```bash
npm install --ignore-scripts
```

To make this the default for a project, add the line `ignore-scripts=true` to a file called `.npmrc` in your project folder. `.npmrc` is npm's settings file. After the Shai-Hulud attack, the CERT Coordination Center, a US security research center, recommended using `--ignore-scripts` "where feasible".

The trade-off: a few packages need their install scripts to work. If something breaks, you'll see it, and you can decide on purpose to let that one package run its script. Some newer package managers already work this way: pnpm, since version 10, doesn't run dependencies' install scripts unless you allow them.

### Habit 4: Keep your lockfile, and keep secrets small

- **Commit `package-lock.json`** and install from it, so nobody gets a surprise new version.
- **Don't keep secrets on your laptop that you don't need there.** Use test keys for development, not production keys.
- **If a package you installed turns out to be malicious,** remove it, then treat every secret on that computer or server as leaked. Create new keys and turn off the old ones.

> **Go deeper:** [Your API key leaked, and strangers are spending your money](/lessons/api-key-ended-up-public) (Level 2) explains how to replace a leaked key properly.

---

## Test your own app

1. **Run `npm audit`** in your project folder. Read what it says. For each problem, ask your AI whether it affects your app and how to fix it without `--force`.
2. **Check every package in your `package.json`.** For each name under `dependencies`, open its npmjs.com page. Is it the package you think it is? Do you still use it? If not, remove it with `npm uninstall <name>`.
3. **Find install scripts.** Run this to list installed packages that have a `postinstall` script:

```bash
npm query ":attr(scripts, [postinstall])"
```

For each one, ask: do I know why this package needs to run code during install?

4. **Check your AI tool's settings.** Can it run `npm install` without asking you? If yes, change that.

---

## Takeaways

**Key terms**
- **Supply chain attack:** an attack that reaches your app through something you use, like a package
- **Typosquatting:** a malicious package with a name close to a popular one
- **Hallucinated package:** a package name an AI invented that doesn't exist
- **Slopsquatting:** publishing a malicious package under a name AI tools tend to invent
- **Install script:** a command in a package's `package.json` that npm runs automatically during install
- **npm audit:** a command that checks your packages against reported security problems

**Red flags**
- The AI suggests a package you can't find in any official documentation
- `npm view` returns 404, or the package was created very recently
- A name one letter or one dash away from a famous package
- A `postinstall` script in a package that has no reason to build anything
- Packages in `package.json` that nobody can explain
- Fixing `npm audit` warnings with `--force` without reading what changes

**Ask your AI**
- *"Before we add a package, tell me if we can do this without one. If we need one, give me the exact name and the link to its official documentation."*
- *"List every package in my package.json, what it's for, and whether my code still uses it."*
- *"Explain each problem npm audit reports in my project, and how to fix it without breaking changes."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**Waiting before you upgrade.** Many attacks are found within hours or days. Recent versions of npm have a `min-release-age` setting that only installs versions that have been public for a number of days. pnpm and tools like Renovate have similar settings. Waiting a few days before taking new versions avoids most freshly hijacked releases.

**Checking the registry's signatures.** `npm audit signatures` checks that the packages you downloaded carry valid signatures from the registry, and checks their provenance attestations where available. **Provenance** is a signed record of which source code repository and build system produced a package, so you can tell it was built from the code you can see.

**Other ecosystems.** Everything in this lesson also applies to Python (PyPI and `pip`), Ruby gems, Rust crates and others. The `huggingface-cli` experiment was on PyPI, and the USENIX study tested both Python and JavaScript.

**Dependency confusion.** A related attack: if your company uses private packages, an attacker publishes a public package with the same name and a higher version number, hoping your tools pick the public one. Scoped package names (like `@yourcompany/utils`) and registry settings prevent it.

**Tools.** Services such as Socket, Snyk and GitHub's Dependabot watch your dependencies and warn about known problems or suspicious new versions. They help, but they don't replace knowing why each package is in your project.

</details>

## References

- [We Have a Package for You! A Comprehensive Analysis of Package Hallucinations by Code Generating LLMs](https://www.usenix.org/conference/usenixsecurity25/presentation/spracklen): Spracklen et al., USENIX Security 2025. 576,000 code samples, 16 models, hallucination rates of at least 5.2% (commercial) and 21.7% (open-source), and 205,474 invented package names.
- [LLMs can't stop making up software dependencies](https://www.theregister.com/2025/04/12/ai_code_suggestions_sabotage_supply_chain/) and [AI hallucinates software packages and devs download them](https://www.theregister.com/2024/03/28/ai_bots_hallucinate_software_packages/): The Register. Seth Larson naming "slopsquatting", and Lasso Security's `huggingface-cli` experiment (more than 15,000 downloads in three months, used in a large company's install instructions).
- [crossenv malware on the npm registry](https://blog.npmjs.org/post/163723642530/crossenv-malware-on-the-npm-registry) and [Details about the event-stream incident](https://blog.npmjs.org/post/180565383195/details-about-the-event-stream-incident): npm Blog. The 2017 `crossenv` typosquat, about 40 removed packages in total and the "immediately revoke and replace" advice; the 2018 `event-stream` takeover that targeted one bitcoin wallet app.
- [Dev snared in crypto phishing net, 18 npm packages compromised](https://www.theregister.com/2025/09/08/dev_falls_for_phishing_email): The Register. The fake email from `support@npmjs.help` and the roughly two hours before the bad versions started being removed.
- [Malware in chalk](https://github.com/advisories/GHSA-2v46-p5h4-248w) and [debug@4.4.2 contains malware after npm account takeover](https://github.com/advisories/GHSA-4x49-vf9v-38px): GitHub Advisory Database. The September 2025 phishing takeover, the browser code that tampered with cryptocurrency transactions, and npm removing the versions on the same day.
- [Widespread Supply Chain Compromise Impacting npm Ecosystem](https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem): CISA, 23 September 2025. Shai-Hulud, a self-replicating worm that stole GitHub tokens and cloud keys and compromised more than 500 packages.
- [VU#534320: NPM supply chain compromise exposes challenges to securing the ecosystem](https://kb.cert.org/vuls/id/534320): CERT/CC. Shai-Hulud's use of a `postinstall` script, and the advice to use `npm install --ignore-scripts` "where feasible".
- [scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts), [npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit) and [config](https://docs.npmjs.com/cli/v11/using-npm/config): npm Docs. Install scripts and their only valid use, `audit fix` and the `--force` warning, `audit signatures` and provenance, and the `ignore-scripts` and `min-release-age` settings.
- [pnpm v10.0.0 release notes](https://github.com/pnpm/pnpm/releases/tag/v10.0.0): pnpm. Dependencies' install scripts don't run by default unless you allow them.
