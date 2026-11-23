---
title: "The AI broke your working app. Here's your undo button"
slug: git-as-an-undo-button
order: 13
level: 1
levelName: Foundations
concepts: [Git, Repositories, Commits, Branches, GitHub]
readTime: 12 min
quiz:
  - question: "Your app works. You're about to ask the AI for a big new feature. What should you do first?"
    options:
      - text: "Nothing. If something breaks, the AI can fix it."
      - text: "Copy every file into an email to yourself"
      - text: "Make a commit, so you have a save point to come back to"
        correct: true
      - text: "Delete the .git folder so the AI has a clean start"
    explanation: "Git can only take you back to a save point that exists. A commit right before a big change gives you a known working version to return to."

  - question: "The AI changed several files and broke your app. You haven't made a commit since it last worked. Which command puts the AI's changes aside without deleting them?"
    options:
      - text: "git stash -u"
        correct: true
      - text: "git reset --hard"
      - text: "git push"
      - text: "git log --oneline"
    explanation: "git stash -u puts all uncommitted changes, including new files, into a drawer and returns your folder to the last commit. git stash pop brings them back. git reset --hard would delete the changes to your saved files for good."

  - question: "Your last commit, \"Add high-score board\", broke the sign-in page. You want to undo it without deleting anything. What do you use?"
    options:
      - text: "Delete the .git folder"
      - text: "git reset --hard"
      - text: "git branch -D main"
      - text: "git revert with that commit's hash"
        correct: true
    explanation: "git revert adds a new commit that does the opposite of the bad one. The bad commit stays in the history, so nothing is lost."

  - question: "Your AI suggests running git reset --hard. What should you know before you agree?"
    options:
      - text: "It only shows information and never changes anything"
      - text: "It deletes your uncommitted changes, and you can't get them back"
        correct: true
      - text: "It uploads your code to GitHub"
      - text: "It creates a new save point"
    explanation: "git reset --hard throws away every change you haven't committed to the files Git saves. Run git status first, and commit or stash anything you might want."

  - question: "You want to try a risky redesign without touching your working version. What's the safest way?"
    options:
      - text: "Make the changes on main and hope they work"
      - text: "Turn off Git while you experiment"
      - text: "Create a new branch, try the redesign there, and switch back to main if it fails"
        correct: true
      - text: "Make the changes without committing anything"
    explanation: "A branch is a separate line of save points. Your main branch stays exactly as it was until you decide to merge the experiment into it."

  - question: "Your laptop stops working. Which version of your project can you still get back?"
    options:
      - text: "Every commit you ever made, even if you never pushed"
      - text: "The commits you pushed to GitHub"
        correct: true
      - text: "Nothing. Git only works on one computer."
      - text: "Only your .env file"
    explanation: "Commits live in the .git folder on your laptop. Only the commits you pushed to GitHub have a copy somewhere else."
---

# The AI broke your working app. Here's your undo button

> **Before you start**
> This lesson uses a few words from earlier lessons:
> - **Terminal:** a window where you type commands for your computer to run. *([It works on my laptop. Why can't my friend open it?](/lessons/localhost-vs-production))*
> - **.env file:** a file that holds your app's secret settings, like passwords and keys. *([Your app's secrets don't belong in your code. Here's where they go](/lessons/environment-variables))*
> - **node_modules:** the folder where npm puts downloaded packages. It can always be rebuilt. *([It works on my machine, but not on yours. Blame the packages](/lessons/packages-and-dependencies))*

## It worked ten minutes ago

Your quiz game works. Players can sign in and play.

You ask your AI: "Add a high-score board." It changes nine files. The high-score board appears. But now the sign-in page is blank.

You ask the AI to fix it. It changes more files. Now the game doesn't start at all.

You'd give anything for the version from ten minutes ago. In a video game, you would load your last save.

Code can have save points too. This lesson shows you how, using a tool called Git. It takes a few minutes to set up, and it can save you hours.

---

## Save points for your code

**Git** is a program that saves snapshots of your project folder whenever you tell it to.

Each snapshot is called a **commit**. A commit remembers every file in your project exactly as it was at that moment. Later, you can look at any commit, compare it with your project now, or go back to it.

So a commit is like a save point in a game. You save before the boss fight. If the fight goes badly, you load the save and try again.

**Where the game comparison stops working:**

- Many games save automatically. Git only saves when you tell it to. If you never commit, there's nothing to go back to.
- Git saves your files. It doesn't save the data inside your database, like your players' scores.

> **Go deeper:** [The AI deleted your production database. Now what?](/lessons/backups) (Level 2) covers saving your data too.

> **In short:** Git takes snapshots of your project. Each snapshot is a commit, like a save point you can go back to.

---

## Setting up Git (once per project)

First, install Git from `git-scm.com`. Then check it in your terminal with `git --version`. It should print a version number.

Next, run these commands. The first two are only needed once per computer:

```bash
git config --global user.name "Sam Lee"
git config --global user.email "sam@example.com"
cd quiz-game
git init
```

In plain English:

- **Lines 1–2:** tell Git your name and email. Git writes them into every commit, so it knows who made each save point. Use your own name and email.
- **Line 3:** go into your project folder.
- **Line 4:** start using Git in this folder.

A folder that Git is watching is called a **repository**, or **repo** for short. Git keeps all your save points in a hidden folder called `.git` inside it. Never delete that folder. It *is* your history.

### Tell Git what not to save

Before your first commit, create a file called `.gitignore` in your project folder. It's a list of things Git should never save. Put these two lines in it:

```text
node_modules
.env
```

`node_modules` is huge and can always be rebuilt. `.env` holds your secrets, which should never go into your save points.

> **In short:** install Git, tell it your name, and run `git init` in your project. Add a `.gitignore` file so Git skips `node_modules` and `.env`.

---

## Making a save point

Making a commit takes three commands:

```bash
git status
git add .
git commit -m "Sign-in page works"
```

In plain English:

- **`git status`** shows which files changed since your last commit. It never changes anything, so run it as often as you like.
- **`git add .`** chooses what goes into the next save point. The dot means "everything in this folder", except what's listed in `.gitignore`.
- **`git commit -m "..."`** takes the snapshot. The text in quotes is the **commit message**: a short note saying what's in this save point.

Write messages that describe what works, like "Sign-in page works". Future you will read them when looking for a working version.

**When should you commit?** Every time something works, and **always before you ask the AI for a big change.** Many small commits give you more places to go back to.

> **In short:** `git add .` then `git commit -m "message"` makes a save point. Commit whenever something works, and before every big AI change.

---

## Looking at your save points

To see all your commits, run:

```bash
git log --oneline
```

You'll see something like this:

```text
c4e81a2 Add high-score board
9f3b7d0 Sign-in page works
1a2b3c4 First version of the quiz game
```

Each line is one commit, with the newest at the top. The code on the left is the commit's **hash**: a unique ID that Git gives every commit. Git shows a short version of it. You'll use it to tell Git which save point you mean. (If the list is long, press `q` to leave it.)

To see exactly what changed since your last commit, run `git diff`. Removed lines start with `-`, and added lines start with `+`.

> **In short:** `git log --oneline` lists your commits, newest first. Each one has a hash, a short ID you use to point at it.

---

## How it goes wrong

### No save point

The most common problem is having no commit to go back to. If your last commit was a week ago, Git can only take you back a week.

### Commands that throw work away

When something breaks, your AI may suggest Git commands to "clean up". Some are completely safe. Others delete your uncommitted work, and Git can't bring it back.

| Command | What it does | Can you get the work back? |
|---|---|---|
| `git status`, `git log`, `git diff` | Only show information | Nothing changes |
| `git stash -u` | Puts uncommitted changes aside in a drawer | Yes, with `git stash pop` |
| `git revert <hash>` | Adds a new commit that undoes an old one | Yes, nothing is deleted |
| `git restore .` | Throws away changes you haven't added with `git add` | **No** |
| `git reset --hard` | Throws away all uncommitted changes to files Git saves | **No** |
| `git clean -fd` | Deletes new files you never added with `git add` | **No** |

**The rule:** before any command in the last three rows, run `git status`. Commit or stash anything you might want. If you're not sure, ask your AI: *"Will this command delete anything I can't get back?"*

### Saving secrets

If `.env` gets committed, your secrets are inside your history. Deleting the file later doesn't remove it from old commits. That's why `.gitignore` comes before your first commit.

> **Go deeper:** [Your API key leaked, and strangers are spending your money](/lessons/api-key-ended-up-public) (Level 2) shows how this goes wrong and how to fix it.

> **In short:** have a recent commit, know which commands delete work, and keep secrets out of your history.

---

## What good looks like: going back safely

Here's what to do in each situation. Start with `git status` to see where you are.

### Situation 1: it broke, and you haven't committed yet

```bash
git stash -u
```

This puts every change since your last commit into a drawer. The `-u` includes new files too. Your folder goes back to how it was at your last commit. (Files listed in `.gitignore`, like `.env`, are left alone.) Test your app.

- Want the changes back after all? Run `git stash pop`.
- Sure you don't want them? Run `git stash drop` to delete them for good.

### Situation 2: the broken change is already committed

```bash
git log --oneline
git revert --no-edit c4e81a2
```

Find the hash of the bad commit in the log. Then `git revert` makes a **new** commit that does the opposite of the bad one. The bad commit stays in your history, so you can still look at it later. Nothing is lost.

`--no-edit` tells Git to write the commit message for you, instead of opening a text editor. Git can refuse to revert while you have uncommitted changes, so commit or stash first. If several commits went bad, revert each one, starting with the newest.

### Situation 3: go back and throw everything after it away

```bash
git reset --hard 9f3b7d0
```

This moves your project back to that commit. The commits after it disappear from `git log`, and **any uncommitted changes to files Git saves are deleted forever**. Only use it when you're sure. When in doubt, use situation 1 or 2 instead.

> **In short:** not committed yet → `git stash -u`. Already committed → `git revert`. `git reset --hard` works too, but it deletes things, so use it last.

---

## Branches: safe experiments

So far, all your commits are in one line. A **branch** is a separate line of commits.

Think of copying your game's save file before trying something risky. If it goes badly on the copy, the original is untouched.

Your main line is usually called `main` (on some computers, it's called `master`). `git status` tells you which branch you're on. Here's how to experiment safely:

```bash
git switch -c try-high-scores
# let the AI work, test it, commit
git switch main
git merge try-high-scores
```

In plain English:

- **Line 1:** create a new branch called `try-high-scores` and move onto it.
- **Line 2:** a note for you (lines starting with `#` are ignored). Work and commit as usual. Your `main` branch doesn't change.
- **Lines 3–4:** it worked! Go back to `main`, and **merge** the experiment: bring its commits into `main`.

If the experiment failed, throw the branch away instead:

```bash
git switch main
git branch -D try-high-scores
```

This deletes the branch and its commits. `main` is exactly as you left it.

One tip: commit or stash before you switch branches. Otherwise, Git either refuses to switch, or brings your uncommitted changes along with you.

> **In short:** a branch is a safe copy for experiments. Merge it if it works. Delete it if it doesn't.

---

## GitHub: a copy that survives your laptop

Everything so far lives in the `.git` folder on your laptop. If your laptop breaks, your save points are gone too.

**GitHub** is a website that keeps copies of Git repositories online. Git and GitHub are different things. Git is the program on your computer. GitHub is a website that stores a copy of your repo.

1. Make a free account at `github.com`.
2. Create a new repository. Choose **Private**, so only you can see it. Leave the options for adding starting files unticked. GitHub's guide says this avoids errors.
3. GitHub then shows you commands to copy. They look like this:

```bash
git remote add origin https://github.com/your-name/quiz-game.git
git push -u origin main
```

- **Line 1:** tells your repo where its online copy lives. `origin` is the usual nickname for it.
- **Line 2:** **push** your commits, which means upload them to GitHub. Use your branch name if it isn't `main`.

The first time, you'll need to sign in to GitHub. After that, run `git push` whenever you want your new commits backed up.

> **Go deeper:** [From your laptop to a real website in one push](/lessons/hosting-platforms) (Level 1) shows how GitHub also helps you put your app on the internet.

> **In short:** GitHub keeps an online copy of your repo. `git push` uploads your commits there.

---

## Try it yourself

Practice in a test folder first, not your real app.

1. Make a new folder, open a terminal inside it, and run `git init`.
2. Create a file called `game.txt` containing `Level 1: works`.
3. Run `git add .` and then `git commit -m "Level 1 works"`.
4. Change the file to `Level 1: BROKEN`. Run `git status` and `git diff`.
5. Run `git stash -u`. Open the file: it says "works" again. Run `git stash pop`: it's broken again.
6. Commit the broken version. Run `git log --oneline` and copy its hash. Run `git revert --no-edit <hash>`. Open the file. Run `git log --oneline` again and count the commits.
7. Run `git switch -c experiment`, change the file, and commit. Run `git switch main` and open the file. Then run `git branch -D experiment`.

---

## Takeaways

**Key terms**
- **Git:** a program that saves snapshots of your project
- **Repository (repo):** a folder that Git is watching
- **Commit:** one snapshot, a save point you can return to
- **Hash:** the unique ID of a commit
- **Branch:** a separate line of commits for experiments
- **Merge:** bringing a branch's commits into another branch
- **GitHub:** a website that stores copies of your repos online
- **Push:** uploading your commits to GitHub

**Safe or dangerous?**
- Safe, only shows information: `git status`, `git log`, `git diff`
- Safe, can be undone: `git commit`, `git stash -u`, `git revert`, `git switch`
- Can delete work you may not get back: `git restore .`, `git reset --hard`, `git clean -fd`, `git stash drop`, `git branch -D`

**Ask your AI**
- *"Before you change anything, remind me to commit."*
- *"Before you suggest any git command, tell me if it can delete work I can't get back."*
- *"My app broke after your last change. Help me find the last working commit with git log and undo the change with git revert."*

---

<details>
<summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

**The staging area.** `git add` puts changes into a waiting area called the **staging area** (or **index**). `git commit` saves what's in it. `git diff` shows changes you haven't added yet. `git diff --staged` shows changes you have added.

**Why `git restore .` might not undo everything.** By default, `git restore` copies files back from the staging area, not from your last commit. If you already ran `git add`, those changes stay. **HEAD** is Git's name for the commit you're on now, so `git restore --source=HEAD --staged --worktree .` resets both to your last commit. It also deletes uncommitted work.

**Reverting several commits at once.** `git revert --no-edit 9f3b7d0..HEAD` reverts every commit after `9f3b7d0`, newest first, with one new commit for each.

**Looking at an old commit without changing anything.** `git switch --detach 9f3b7d0` lets you look at the project as it was then. Git calls this "detached HEAD". Run `git switch main` to come back.

**The reflog: a second chance for commits.** Git keeps a private log of where your branches have pointed, called the **reflog**. Commits that "disappeared" after `git reset --hard` or `git branch -D` can usually be found with `git reflog`. By default, entries are kept for 90 days, or 30 days for commits no branch points to. The reflog lives only on your computer, and it never contains uncommitted changes. Stashes you drop are much harder to recover.

**Don't rewrite pushed history.** `git reset --hard` moves your branch backwards. If you already pushed those commits and someone else has them, use `git revert` instead. The Git docs warn against resetting commits you've already given to somebody else.

**`main` or `master`?** Unless you change a setting called `init.defaultBranch`, `git init` has named the first branch `master`. GitHub uses `main` for new repositories. The Git project has announced that Git 3.0 will switch its default to `main`. You can rename your branch with `git branch -m main`.

**Merge conflicts.** If two branches changed the same lines, `git merge` stops and marks the clashing lines in your files. You choose what to keep, then commit. Ask your AI to walk you through it.

**AI tools with their own undo.** Some AI coding tools keep their own checkpoints of recent changes. They're useful, but they only cover that tool. Git works no matter what changed your files.

</details>

## References

- [git-stash](https://git-scm.com/docs/git-stash): Git docs. What `git stash -u`, `pop` and `drop` do, and that dropped stashes are hard to recover.
- [git-revert](https://git-scm.com/docs/git-revert): Git docs. `git revert` adds a new commit that undoes an old one, asks for a clean working tree, and `--no-edit` skips the editor.
- [git-restore](https://git-scm.com/docs/git-restore): Git docs. `git restore` copies files from the staging area by default, and `--source=HEAD --staged --worktree` resets both.
- [git-reset](https://git-scm.com/docs/git-reset): Git docs. `git reset --hard` overwrites your files, and the warning not to reset commits you've already given to somebody else.
- [git-reflog](https://git-scm.com/docs/git-reflog): Git docs. What the reflog records, and the default 90-day and 30-day expiry times.
- [BreakingChanges](https://git-scm.com/docs/BreakingChanges): Git docs. Git 3.0 will name the first branch of new repositories `main`, and has no release date yet.
- [Adding locally hosted code to GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github): GitHub Docs. Don't add starting files to the new repository, to avoid errors, and the `git remote add` and `git push` commands.
- [The default branch for newly-created repositories is now main](https://github.blog/changelog/2020-10-01-the-default-branch-for-newly-created-repositories-is-now-main/): GitHub Changelog. GitHub names the first branch of new repositories `main`.
