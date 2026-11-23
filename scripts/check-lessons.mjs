// Checks every lesson in content/lessons against the rules in MVP.md.
// Usage: npm run check:lessons [-- slug1 slug2 ...]
// Exits with code 1 if any lesson has an error. Warnings don't fail the run.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const lessonsDir = path.join(root, 'content', 'lessons');
const mvp = fs.readFileSync(path.join(root, 'MVP.md'), 'utf8');

// Lesson plan from the MVP.md tables: | # | `slug` | Title | Concepts |
const plan = new Map();
for (const m of mvp.matchAll(/^\| (\d+) \| `([a-z0-9-]+)` \| (.+?) \|/gm)) {
  plan.set(m[2], { order: Number(m[1]), title: m[3].trim() });
}

const LEVEL_NAMES = { 1: 'Foundations', 2: 'Builder', 3: 'Shipping', 4: 'Reliability & scale', 5: 'Systems & architecture' };
const BANNED_L1 = /\b(simply|just|obviously|easy)\b/gi;

const only = process.argv.slice(2);
const files = fs
  .readdirSync(lessonsDir)
  .filter((f) => f.endsWith('.md'))
  .filter((f) => only.length === 0 || only.includes(f.replace(/\.md$/, '')));

let errorCount = 0;

for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  const errors = [];
  const warnings = [];
  const raw = fs.readFileSync(path.join(lessonsDir, file), 'utf8').replace(/\r\n/g, '\n');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fm) {
    console.log(`✗ ${slug}\n    - no frontmatter block`);
    errorCount++;
    continue;
  }

  let data;
  try {
    data = yaml.load(fm[1]);
  } catch (e) {
    console.log(`✗ ${slug}\n    - invalid YAML: ${e.message.split('\n')[0]}`);
    errorCount++;
    continue;
  }
  const body = fm[2];

  // Frontmatter
  const planned = plan.get(slug);
  if (!planned) errors.push('slug is not in the MVP.md lesson table');
  if (data.slug !== slug) errors.push(`slug field "${data.slug}" doesn't match file name`);
  if (planned && data.order !== planned.order) errors.push(`order ${data.order} should be ${planned.order}`);
  if (planned && data.title !== planned.title.replace(/^"|"$/g, '') && data.title !== planned.title)
    warnings.push(`title differs from plan: "${data.title}" vs "${planned.title}"`);
  if (![1, 2, 3, 4, 5].includes(data.level)) errors.push('level must be 1–5');
  if (LEVEL_NAMES[data.level] !== data.levelName) errors.push(`levelName should be "${LEVEL_NAMES[data.level]}"`);
  if (!Array.isArray(data.concepts) || data.concepts.length === 0) errors.push('concepts missing');

  // Quiz
  const quiz = data.quiz;
  if (!Array.isArray(quiz) || quiz.length < 5 || quiz.length > 6) {
    errors.push(`quiz must have 5–6 questions (has ${Array.isArray(quiz) ? quiz.length : 0})`);
  } else {
    const positions = [];
    quiz.forEach((q, i) => {
      const n = i + 1;
      if (!q.question) errors.push(`Q${n}: no question text`);
      if (!q.explanation) errors.push(`Q${n}: no explanation`);
      if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`Q${n}: needs exactly 4 options`);
      else {
        const correct = q.options.map((o, j) => (o.correct ? j : -1)).filter((j) => j >= 0);
        if (correct.length !== 1) errors.push(`Q${n}: needs exactly one correct option (has ${correct.length})`);
        else positions.push(correct[0]);
        if (q.options.some((o) => !o.text)) errors.push(`Q${n}: empty option text`);
      }
    });
    if (positions.length >= 5 && new Set(positions).size === 1) warnings.push('correct answer is in the same position in every question');
  }

  // Body
  const h1 = body.match(/^# (.+)$/m);
  if (!h1) errors.push('no "# Title" heading');
  else if (h1[1].trim() !== data.title) warnings.push('H1 differs from frontmatter title');
  if (!/>\s*\*\*Before you start\*\*/.test(body)) errors.push('no "Before you start" box');
  if (!/<details>/.test(body)) warnings.push('no "Going deeper" section');
  if (/<details>/.test(body) && !/<\/details>/.test(body)) errors.push('<details> is not closed');
  if (/\b[Ll]esson \d+\b/.test(body)) errors.push('mentions a lesson by number (link by slug instead)');
  if (/\]\(\/lessons\/[^)]*\)/.test(body)) {
    for (const m of body.matchAll(/\]\(\/lessons\/([a-z0-9-]+)\/?\)/g)) {
      if (!plan.has(m[1])) errors.push(`link to unknown lesson /lessons/${m[1]}`);
    }
  }

  // References: last section, after Going deeper, with at least 3 real links.
  const refIndex = body.search(/^## References\s*$/m);
  if (refIndex < 0) errors.push('no "## References" section');
  else {
    const refs = body.slice(refIndex);
    const links = [...refs.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
    if (links.length < 3) errors.push(`References has ${links.length} links (need at least 3)`);
    if (links.some((u) => u.startsWith('http://'))) warnings.push('a reference uses http:// instead of https://');
    const detailsEnd = body.lastIndexOf('</details>');
    if (detailsEnd > refIndex) errors.push('References must come after the Going deeper section');
    if (/^## /m.test(refs.slice(refs.indexOf('\n') + 1))) errors.push('References must be the last section');
  }

  const main = body.replace(/<details>[\s\S]*?<\/details>/g, '').replace(/^## References[\s\S]*$/m, '');
  const words = main.split(/\s+/).filter(Boolean).length;
  const [min, max] = data.level === 1 ? [1300, 2600] : [1500, 2900];
  if (words < min || words > max) warnings.push(`main text is ${words} words (aim ${min}–${max})`);

  // Leftover tool output and raw HTML that would render as real markup.
  if (/<\/?(invoke|parameter|function_calls)\b|<\/content>/i.test(body)) errors.push('leftover tool-call text in the body');
  {
    const prose = body
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`\n]*`/g, '')
      .replace(/<\/?(details|summary|strong)>/g, '');
    const raw = prose.match(/<\/?[a-zA-Z][a-zA-Z0-9-]*(\s[^>]*)?>/g);
    if (raw) errors.push(`raw HTML outside code (wrap it in backticks): ${[...new Set(raw)].slice(0, 3).join(' ')}`);
  }

  // Punctuation: no em dashes anywhere, and no en dash used as a dash between words.
  {
    const all = fm[1] + '\n' + body;
    const em = (all.match(/—/g) || []).length;
    if (em) errors.push(`${em} em dash(es) — rewrite as separate sentences, commas or a colon`);
    const enDash = (all.replace(/```[\s\S]*?```/g, '').match(/\s–\s/g) || []).length;
    if (enDash) errors.push(`${enDash} spaced en dash(es) used as a dash; rewrite the sentence`);
  }

  // Diagrams: at least one real diagram image per lesson, with alt text, and the file must exist.
  {
    const imgs = [...body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g)];
    const diagrams = imgs.filter((m) => m[2].startsWith('/diagrams/'));
    if (!diagrams.length) errors.push('no diagram (add at least one ![alt](/diagrams/<slug>-1.svg))');
    for (const m of imgs) {
      if (!m[1].trim()) errors.push(`image without alt text: ${m[2]}`);
      if (m[2].startsWith('/diagrams/') && !fs.existsSync(path.join(root, 'public', m[2])))
        errors.push(`diagram file missing: public${m[2]}`);
    }
  }

  // ASD-STE100 style: descriptive sentences ≤25 words, paragraphs ≤6 sentences (main text only).
  {
    const text = body
      .replace(/<details>[\s\S]*?<\/details>/g, '')
      .replace(/^## References[\s\S]*$/m, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/^\s*\|.*$/gm, '')
      .replace(/^#.*$/gm, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\]\([^)]*\)/g, ']');
    // Split into units: each list item (also inside a blockquote) is its own unit,
    // so a normal bulleted list is never read as one long sentence.
    const LIST_ITEM = /^\s*(?:>\s*)*(?:[-*+]|\d+\.)\s+/;
    const units = [];
    for (const block of text.split(/\n\s*\n/)) {
      let current = null;
      for (const line of block.split('\n')) {
        if (!line.trim()) continue;
        if (LIST_ITEM.test(line) || current === null) {
          current = { list: LIST_ITEM.test(line), text: '' };
          units.push(current);
        }
        current.text += ' ' + line.replace(LIST_ITEM, '').replace(/^\s*(?:>\s*)+/, '');
      }
    }
    const longSentences = [];
    for (const u of units) {
      const p = u.text.replace(/\s+/g, ' ').trim();
      if (!p) continue;
      const sentences = p.split(/(?<=[.!?]\**)\s+(?=[A-Z0-9"*`(\[])/).filter((s) => s.split(/\s+/).length > 2);
      for (const s of sentences) {
        const words = s.split(/\s+/).filter(Boolean).length;
        if (words > 25) longSentences.push(`${words}w: "${s.slice(0, 60)}…"`);
      }
      if (!u.list && sentences.length > 6) warnings.push(`paragraph has ${sentences.length} sentences (STE max 6): "${p.slice(0, 50)}…"`);
    }
    if (longSentences.length) errors.push(`${longSentences.length} sentence(s) over 25 words (STE). First: ${longSentences[0]}`);
  }

  // Code snippets: short and minimal. `text` blocks (output, diagrams) are not code.
  for (const m of body.matchAll(/```(\w*)\n([\s\S]*?)```/g)) {
    const lang = m[1] || 'text';
    if (lang === 'text') continue;
    const lines = m[2].replace(/\n+$/, '').split('\n').length;
    const firstLine = m[2].split('\n')[0].trim().slice(0, 40);
    if (lines > 12) errors.push(`${lang} snippet is ${lines} lines (max 12): "${firstLine}"`);
    else if (lines > 8) warnings.push(`${lang} snippet is ${lines} lines (aim ≤8): "${firstLine}"`);
  }

  if (data.level === 1) {
    const prose = main.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
    const banned = [...new Set((prose.match(BANNED_L1) || []).map((w) => w.toLowerCase()))];
    if (banned.length) warnings.push(`Level 1 uses banned words: ${banned.join(', ')}`);
    if (!/>\s*\*\*In short:\*\*/.test(main)) warnings.push('Level 1 lesson has no "In short" boxes');
  }

  const status = errors.length ? '✗' : warnings.length ? '!' : '✓';
  console.log(`${status} ${String(data.order ?? '?').padStart(2)} ${slug} (${words} words)`);
  for (const e of errors) console.log(`    ERROR  ${e}`);
  for (const w of warnings) console.log(`    warn   ${w}`);
  errorCount += errors.length;
}

const missing = [...plan.keys()].filter((s) => !fs.existsSync(path.join(lessonsDir, `${s}.md`)));
console.log(`\n${files.length} checked, ${errorCount} errors. ${plan.size - missing.length}/${plan.size} planned lessons exist.`);
process.exit(errorCount ? 1 : 0);
