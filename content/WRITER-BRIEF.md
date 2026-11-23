# Brief for lesson writers

You are writing lessons for a free, no-login website that teaches software engineering fundamentals to people who build apps with AI. Most readers are complete beginners. The site takes them from zero to production-ready across 5 levels.

## Read these first, fully
1. `D:\myfirstintern\MVP.md`: the source of truth. It has the levels, the full lesson table (number, slug, title, core concepts), outlines for some lessons, writing rules, the Level 1 "write for a kid" rules, cross-link rules, fact-checking rules and quiz rules. Follow all of them.
2. `D:\myfirstintern\content\lessons\what-happens-when-you-open-a-website.md`: the approved Level 1 example. Copy its tone, pace and structure for Level 1 lessons.
3. `D:\myfirstintern\content\lessons\logged-in-doesnt-mean-allowed.md`: the approved Level 2 example. Copy its structure for Level 2–5 lessons, raising depth gradually by level.

## Output
- One file per lesson: `D:\myfirstintern\content\lessons\<slug>.md`, slug exactly as in the MVP.md table.
- Only create your assigned lesson files. Don't edit any other file.

## Frontmatter (exact fields, valid YAML)
```yaml
---
title: "<title from the MVP table>"
slug: <slug>
order: <number from the MVP table>
level: <1-5>
levelName: <Foundations | Builder | Shipping | Reliability & scale | Systems & architecture>
concepts: [<the core concepts>]
readTime: <N> min
quiz:
  - question: "..."
    options:
      - text: "..."
      - text: "..."
        correct: true
      - text: "..."
      - text: "..."
    explanation: "..."
---
```
- 5–6 questions, 4 options each, exactly one `correct: true`. Vary which position is correct across questions.
- Quote every string. Escape inner double quotes as `\"`.
- The site renders the quiz, the "Mark as completed" button and the "Report a mistake" link. Don't write them into the body.

## Title
Use the title from the MVP.md table exactly. Titles are deliberately catchy scenarios ("Bots signed up 10,000 times overnight. Now what?"); your hook section should deliver on the title's promise. Don't rename lessons yourself.

## Body
- `# <title>` first, then the structure in MVP.md: Before you start → Hook → Mental model → How it goes wrong → What good looks like → Test it yourself → Takeaways → Going deeper (optional) → References → (quiz comes from frontmatter).
- Section names can fit the topic (Level 1 lessons used "Try it yourself" instead of "Test your own app"), but keep the order.
- **Before you start:** a blockquote starting `> **Before you start**`, listing at most 4 terms from earlier lessons with one-line meanings and links.
- **Level 1 only:** end each main section with `> **In short:** ...`.
- **Cross-links:** `> **Go deeper:** [Exact lesson title](/lessons/<slug>) (Level N)`. Link only to slugs in the MVP.md table. Backward links in "Before you start", forward links where a later lesson covers the topic in depth. Never write "Lesson 7" or any lesson number in text.
- **Takeaways:** "Key terms" list, a red-flags or "which step broke" style list, and "Ask your AI" prompts the reader can paste.
- **Going deeper:** at the end, in this exact HTML (blank lines inside so Markdown renders):
  ```
  <details>
  <summary><strong>Going deeper</strong> (optional, for readers who want more detail)</summary>

  ...markdown...

  </details>
  ```
- **References:** the very last thing in the body, after `</details>`:
  ```
  ## References

  - [Page title](https://...): Publisher. What it supports in this lesson.
  ```
  3–12 entries (never cut a true, important claim just to keep the list short). Prefer primary sources (official docs, RFCs, MDN, OWASP, vendor docs, a company's own incident report). Every specific number, date, incident, error message or quote in the lesson must be backed by one. Only list pages you actually opened; never guess a URL. Don't put a separate sources list inside Going deeper.
- No other raw HTML. Tables, fenced code blocks with a language (`js`, `ts`, `json`, `sql`, `bash`, `yaml`, `text`) and blockquotes are fine.
- Code: JavaScript/TypeScript (Node/Express or Next.js style) unless the topic needs SQL or shell. Snippets must be short and minimal: aim for 8 lines or fewer, never more than 12 (the checker fails anything longer). Show only the lines that make the point; cut imports, setup and boilerplate, and use `// ...` for skipped parts. One idea per snippet. Every snippet is followed by a plain-English walkthrough.

## Level and length
- Main text (not counting Going deeper or frontmatter): Level 1 about 1,500–2,200 words; Levels 2–5 about 1,800–2,500 words.
- Level 1: write for a curious 13-year-old who just got into programming. One idea per section, at most two new terms per section, short sentences, examples from a kid's world. Never use "simply", "just", "obviously" or "easy".
- All levels: simple English, no idioms. Many readers aren't native English speakers.
- **Jargon check before you finish:** list every technical word in order of first appearance. Each must be explained at or before that point, or be a core concept of an earlier lesson in the MVP table (and then linked in "Before you start" if it matters). Developer-basic words count: server, terminal, route, header, cache, deploy, repository, etc.

## Readability (ASD-STE100), punctuation and diagrams
- Write in ASD-STE100 (Simplified Technical English) style: descriptive sentences 25 words or fewer, instructions 20 or fewer, one instruction per sentence, paragraphs of at most 6 sentences, active voice, simple tenses, one word for one meaning, no idioms.
- No em dashes (—) anywhere, and no spaced en dash used as a dash. Number ranges like 10–15 are fine.
- 1 to 3 diagrams per lesson, following `content/DIAGRAM-GUIDE.md`, saved as `public/diagrams/<slug>-<n>.svg`. Never use ASCII drawings.

## Fact-checking (mandatory)
- Check every factual claim twice with WebSearch, preferring official docs, MDN, OWASP, RFCs, vendor docs. This includes error messages, tool names and behavior, rankings, dates, numbers and prices.
- If you can't verify a claim, cut it or rewrite it so it's true without the detail. Don't invent statistics, incidents or quotes.
- If you use a specific number or incident, list its source in the References section.
- Prefer facts that won't go stale. Use example values that can't be wrong: `example.com`, `203.0.113.x`, `2001:db8::`.

## When you finish
Run `node scripts/check-lessons.mjs <your-slugs>` from `D:\myfirstintern` and fix every ERROR line. Fix warnings too where you reasonably can.

Then reply with a short report: files written, main-text word count for each, any claims you removed because you couldn't verify them, and anything you're unsure about.
