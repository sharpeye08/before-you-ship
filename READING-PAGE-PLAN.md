# Lesson reading page plan (now the lesson page at `/lessons/<slug>`)

The lesson page. It replaced the earlier editorial lesson page.
Reference: a Hashnode article page (studied on townhall.hashnode.com).

## What Hashnode does

- **App bar:** sticky at the top, 72 px. When you scroll down it slides up out of view (`translateY(-100%)`);
  when you scroll up it comes back. Near the top of the page it always shows.
- **One reading column:** 680 px wide, centred. Body text 18 px with 28 px line height. H1 36 px, H2 24 px with
  40 px above it. Nothing on the left.
- **Table of contents on the right, collapsed:** a narrow strip (208 px) that is sticky. By default it shows
  only short thin lines, one per heading, with a small bar beside the current section. When you point at it
  (or tab into it) the full list of titles fades in. So it is there for whoever wants it, and invisible otherwise.
- **Small screens:** no strip. A floating "Contents" button in the bottom-right corner opens the list.

## Our page

Same dark theme, font (DM Sans) and white text as `/space`. No animated sky: a plain dark page for reading.

| Part | What it shows |
|---|---|
| App bar | "Before you ship" on the left, "All lessons" on the right. Hides on scroll down, shows on scroll up. |
| Article head | Level and lesson number, the title, read time. |
| Body | The lesson, in a 680 px column. |
| End of article | The quiz, then one row: "Mark as completed" and the next lesson. |
| Contents | Collapsed lines on the right (wide screens), full list on hover or focus. "Contents" button on small screens. |
| Footer | Logo, link columns, one line. |

Nothing else on the page: no cover art, no sidebar of tags, no hover definitions, no progress bar.
