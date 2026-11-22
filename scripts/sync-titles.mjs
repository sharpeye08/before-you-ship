// Copies lesson titles from the MVP.md tables (the source of truth) into the lessons:
// - each lesson's frontmatter `title:` and its `# H1`
// - link text in callouts ("Before you start", "Go deeper") that points to a lesson
// Optional: pass a previous version of MVP.md to also replace old titles anywhere in the text.
// Usage: node scripts/sync-titles.mjs [path/to/old-MVP.md]
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const lessonsDir = path.join(root, 'content', 'lessons');

function readTitles(file) {
  const map = new Map();
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/^\| \d+ \| `([a-z0-9-]+)` \| (.+?) \|/gm)) {
    map.set(m[1], m[2].trim());
  }
  return map;
}

const titles = readTitles(path.join(root, 'MVP.md'));
const oldTitles = process.argv[2] ? readTitles(process.argv[2]) : new Map();
const yamlQuote = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let changedFiles = 0;
for (const file of fs.readdirSync(lessonsDir).filter((f) => f.endsWith('.md'))) {
  const slug = file.replace(/\.md$/, '');
  const full = path.join(lessonsDir, file);
  const original = fs.readFileSync(full, 'utf8');
  let text = original;

  const own = titles.get(slug);
  if (own) {
    text = text.replace(/^title: .*$/m, `title: ${yamlQuote(own)}`);
    text = text.replace(/^# .*$/m, `# ${own}`);
  }

  // Callout lines: always use the current title for the linked lesson.
  text = text.replace(/^(>.*)$/gm, (line) =>
    line.replace(/\[([^\]]+)\]\(\/lessons\/([a-z0-9-]+)\/?\)/g, (m, label, target) =>
      titles.has(target) ? `[${titles.get(target)}](/lessons/${target})` : m,
    ),
  );

  // Anywhere: replace exact old titles (in links or quoted in text) with the new ones.
  for (const [s, oldTitle] of oldTitles) {
    const next = titles.get(s);
    if (!next || next === oldTitle) continue;
    text = text.replace(new RegExp(`\\[${escapeRe(oldTitle)}\\]\\(/lessons/${s}`, 'g'), `[${next}](/lessons/${s}`);
  }

  if (text !== original) {
    fs.writeFileSync(full, text);
    changedFiles++;
  }
}
console.log(`Synced titles in ${changedFiles} lesson file(s).`);
