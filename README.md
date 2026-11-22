# Before You Ship

Free, no-login lessons on software fundamentals for people who build apps with AI: how the web works, databases, security, shipping and running apps in production. Written for complete beginners first, growing level by level to production-ready.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/
```

## How the content works

- Lessons are Markdown files in `content/lessons/<slug>.md`, one per lesson.
- The plan, levels and writing rules live in [MVP.md](MVP.md). The short version for writers is [content/WRITER-BRIEF.md](content/WRITER-BRIEF.md).
- Each lesson's quiz lives in its frontmatter and is graded in the browser. No server, no accounts.
- Check lessons against the rules before opening a pull request:

  ```bash
  npm run check:lessons                 # all lessons
  npm run check:lessons -- cors webhooks  # just these
  ```

## Settings

Set these as environment variables when building (all optional):

| Variable | What it does |
|----------|--------------|
| `SITE_URL` | The site's public address, used for canonical links |
| `PUBLIC_GITHUB_REPO` | `owner/repo` that receives "Report a mistake" issues (default: this repo) |
| `PUBLIC_CF_BEACON_TOKEN` | Cloudflare Web Analytics token. Analytics are off when it's empty. |

## Found a mistake?

Every lesson has a "Report a mistake" link that opens an issue from a template. Accuracy matters more than anything here, so thank you.
