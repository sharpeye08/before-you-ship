# Diagram guide

Every lesson has 1 to 3 diagrams that make the main idea easier to see. Diagrams are SVG files in `public/diagrams/`, shown in a lesson with Markdown:

```md
![The browser sends a request to the server, and the server sends back a response.](/diagrams/what-happens-when-you-open-a-website-1.svg)
```

## When to add a diagram
- The main mental model of the lesson (almost always).
- Any flow with steps or two sides talking (request and response, before and after, A then B).
- Any place the lesson had an ASCII drawing in a `text` code block. Replace that drawing with an SVG.
- Not for things a table or a list already shows clearly.

## Rules
- **File name:** `public/diagrams/<slug>-<n>.svg`, numbered from 1 in the order they appear.
- **Alt text:** one plain sentence that says what the diagram shows, so a reader who can't see it learns the same thing.
- **Size:** `viewBox="0 0 720 H"` with H between 200 and 420. No fixed `width` or `height` attributes.
- **Background:** a rounded panel, `<rect width="720" height="H" rx="16" fill="#141414"/>`. It works on every page design.
- **Boxes:** `fill="#1f1f1f" stroke="#3a3a3a" stroke-width="1.5" rx="10"`. Highlight the key box with one level color.
- **Colors:** yellow `#f2c94c`, blue `#4f6bd8`, green `#1f9d6b`, pink `#e98da4`, orange `#f08a4b`. Red `#e5484d` only for "this fails" or "attacker". Use dark text `#111111` on yellow, pink and orange fills, and light text on the others.
- **Text:** `font-family="Inter, system-ui, sans-serif"`. Labels 15px, `fill="#f2f2f2"`. Notes 12px, `fill="#a0a0a0"`. Labels are short: 1 to 4 words, the same words the lesson uses. No jargon the lesson hasn't explained yet.
- **Arrows:** `stroke="#cfcfcf" stroke-width="2"` with an arrowhead marker. Use a dashed red arrow for a request that is blocked or goes wrong.
- **At most about 6 boxes.** If it needs more, split it into two diagrams.
- **Accessibility:** include `role="img"`, a `<title>` and a `<desc>` inside the SVG.
- **Not allowed:** scripts, `<foreignObject>`, external fonts or images, event attributes like `onload`.
- Hand-written SVG only, so the files stay small and are easy to edit.

## Example
See `public/diagrams/what-happens-when-you-open-a-website-1.svg`.
