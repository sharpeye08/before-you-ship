# New home page plan: "space" (route `/space`)

Built from scratch on a new route. The live home page, `/nova` and the prism stay as they are.
Stack: Astro page + React components + Tailwind CSS v4 (scoped to this page only).
Fonts: Geist for text, Geist Mono for small labels.

## 1. What Aria does (studied from joinariapp.com)

- **One fixed sky behind the whole page.** The sky is a grid of cells locked to the screen (about 480 x 300 cells
  on a laptop, 3 CSS px each). The shader runs once per cell, not once per screen pixel.
- **Crisp squares.** Each cell is a whole number of device pixels, so every cell is a sharp square.
- **A tone ladder, not free colour.** Each cell picks one of 8 fixed tones. Between two tones, a 4 x 4 Bayer
  pattern decides which one. This is the clean "dither" look. (My `/nova` page quantised RGB instead,
  which is why its grain looked noisy.)
- **Render only when needed.** A frame is drawn only if something on screen changed (scroll, pointer, size,
  scene values), or on a slow ambient tick (about 30 fps) for drift. Otherwise the frame is skipped.
- **Text stays readable.** The page marks text areas, and the sky thins behind them. No dark boxes.
- **The sky tells a story with scroll.** The page is one day: morning, sunset, night with aurora, dawn at the
  download button. Colours change through the tone ladder as you scroll.
- **Section rhythm** (layouts change from section to section):
  1. Hero: centred wordmark, one line, two buttons.
  2. Product: centred heading over a big product window.
  3. Dusk: centred two-line statement, second line tinted.
  4. Index: left-aligned big heading, 4 columns of grouped items.
  5. Privacy: centred heading, two columns, aurora behind.
  6. FAQ: heading on the left, questions on the right.
  7. Download: huge centred "Get Aria." and one button.
  8. Footer: link columns and a large wordmark.
  Plus: a centred pill nav, a small clock chip in the bottom-left corner.

## 2. Our sky: gas waves in space

Not a supernova picture. The idea taken from the supernova is **how gas spreads**: thin filaments that drift,
fold and spread outwards. We use that gas to make **waves across a night sky**.

- **Layers (all per cell):**
  - Stars: single cells, the brightest 3% as a small cross, slow twinkle, slight drift with scroll.
  - Gas waves: three long wave bands across the screen. Each band is bent by slow noise and broken into
    thin filaments, so it looks like spreading gas, not a clean sine line.
  - Ripples: soft rings of gas that spread out from the centre behind the hero title, then fade.
  - Aurora: a curtain of rays at the "promise" section.
  - Dawn: a glow that rises from the bottom at the final call to action.
- **Two tone ladders:** a night ladder (black, deep navy, indigo, violet, pale lilac) for space and gas,
  and an aurora ladder (deep teal, teal, green, pale cyan) for the brightest gas and the aurora.
- **Scroll journey:** each section sets scene values (gas amount, wave energy, aurora, dawn, hue).
  The page blends between them as you scroll, so colours fade from one section into the next.
- **Intro:** on load the gas pours out from the centre behind the title (a growing circle), then settles.
- **Pointer:** a soft light that follows the pointer and brightens the gas near it.
- **Reduced motion:** no drift, no ripples, no intro. The sky still changes with scroll.

## 3. Performance budget (the bar: no lag)

- Shader runs per cell (about 144,000 cells on a laptop), not per pixel (about 3.2 million at 1440 x 900 at 2x).
- One small canvas (grid size). The browser scales it up by a whole number with `image-rendering: pixelated`.
  No second pass, no per-pixel work.
- Render only when the scroll, pointer, size or scene changed, or on the ambient tick (24 fps). Stop when the
  tab is hidden.
- Native browser scrolling (no scroll library), so scrolling never waits for JavaScript.
- No layout reads per frame: section and text positions are measured on load and resize, then reused.
- React only where there is interaction (sky, quiz, lesson tabs, corner chip). Everything else is plain HTML
  rendered at build time.

## 4. Sections and layouts

Desktop width 1440 px, content max 1200 px. Each section gets a different layout.

| # | Section | Layout (desktop) | Layout (phone) | Sky |
|---|---|---|---|---|
| 1 | **Hero** | Full screen. Everything centred: mono kicker, huge title "Before you ship.", one line, two buttons, small note. | Same, centred, buttons stacked. | Gas pours out from the centre, ripples spread behind the title. |
| 2 | **Why** | Centred two-line statement, second line tinted: "Your AI writes the code. / You still ship it." Short paragraph below. | Same. | Wave bands rise from the bottom, more energy. |
| 3 | **The path** | Centred heading "Five levels. One path." A horizontal row of 5 steps joined by a line: number, colour dot, name, one line, lesson count. | Vertical stepper, line on the left. | Aurora green starts to show in the waves. |
| 4 | **A lesson** | Centred heading "Ten minutes. One real problem." Below it one wide glass window with two columns: left, a lesson preview (title, "Before you start" box, first lines); right, a real quiz question you can answer. | Window stacks: preview, then quiz. | Gas calms and thins behind the window. |
| 5 | **Every lesson** | Left-aligned big heading "66 lessons." Level tabs in a row, then the lessons of that level in 3 columns. | Tabs scroll sideways, list in 1 column. | Dense stars, a faint band of light, little gas. |
| 6 | **Tools** | Heading on the left. Bento grid: the checklist as one large card (with 3 sample red flags), four small cards. | Cards stacked. | Violet waves. |
| 7 | **The promise** | Centred two-line heading "Free. No login. / Nothing to install." Three columns of short facts. | Columns stacked. | Aurora curtain at full strength. |
| 8 | **FAQ** | Split: heading on the left (stays in place), questions on the right. | Heading, then questions. | Quiet, dim. |
| 9 | **Start** | Huge centred "Start before you ship." One button, one small line. | Same. | Dawn glow rises from the bottom. |
| 10 | **Footer** | Link columns, then a large "before/you/ship" wordmark across the width. | Columns in 2 rows. | Dawn fades out. |

**Always on screen:** a centred frosted pill nav (logo, 4 section links, a light "Start learning" button), and a
mono chip in the bottom-left corner that shows the current section, like Aria's clock ("03 / The path").

## 5. Files

- `src/pages/space.astro`: the page. Reads lessons at build time and passes data to the components.
- `src/styles/space.css`: Tailwind import and the page's theme (used only by this page).
- `src/lib/sky/engine.ts`: the cell renderer (WebGL2), the tone ladders and the scene blending.
- `src/components/space/*.tsx`: Sky, Nav, Chip, PathRow, LessonWindow (quiz), LessonIndex (tabs), Tools,
  Faq and Footer.

## 6. Checks before calling it done

- 1440 x 900, 1366 x 768 and 375 x 812: no overlap, no sideways scroll, title centred.
- Frame cost: the renderer skips frames when nothing changes; measure the average time per rendered frame.
- No console errors. Reduced motion works. Text passes the STE and no-em-dash rules.
