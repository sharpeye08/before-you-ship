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

const LEVEL_NAMES = { 1: 'Foundations', 2: 'Builder', 3: 'Shipping', 4: 'Reliability & scale' };
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
  if (![1, 2, 3, 4].includes(data.level)) errors.push('level must be 1–4');
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

  const main = body.replace(/<details>[\s\S]*?<\/details>/g, '');
  const words = main.split(/\s+/).filter(Boolean).length;
  const [min, max] = data.level === 1 ? [1300, 2600] : [1500, 2900];
  if (words < min || words > max) warnings.push(`main text is ${words} words (aim ${min}–${max})`);

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
