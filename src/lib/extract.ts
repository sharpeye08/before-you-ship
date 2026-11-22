// Pulls reusable pieces out of each lesson's "Takeaways" section at build time:
// key terms, red flags and "Ask your AI" prompts. Used by the checklist, glossary,
// prompt library and hover definitions.
import type { Lesson } from './lessons';

export interface Term {
  term: string;
  def: string; // inline Markdown
  slug: string;
  title: string;
  order: number;
}
export interface Flag {
  text: string; // inline Markdown
  slug: string;
  title: string;
  order: number;
  level: number;
}
export interface Prompt {
  text: string;
  slug: string;
  title: string;
  order: number;
  level: number;
}

function takeaways(body: string): string {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => /^## Takeaways/.test(l));
  if (start < 0) return '';
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^## |^<details>|^---\s*$/.test(line)) break;
    out.push(line);
  }
  return out.join('\n');
}

// Splits a Takeaways section into labelled bullet lists: { "Key terms": [...], ... }.
function blocks(section: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  let label = '';
  for (const raw of section.split('\n')) {
    const line = raw.trim();
    const head = line.match(/^\*\*(.+?)\*\*$/);
    if (head) {
      label = head[1].trim();
      map.set(label, []);
      continue;
    }
    if (label && line.startsWith('- ')) map.get(label)!.push(line.slice(2).trim());
  }
  return map;
}

export function extract(lessons: Lesson[]) {
  const terms: Term[] = [];
  const flags: Flag[] = [];
  const prompts: Prompt[] = [];
  for (const l of lessons) {
    const base = { slug: l.id, title: l.data.title, order: l.data.order };
    for (const [label, items] of blocks(takeaways(l.body ?? ''))) {
      if (/^key terms$/i.test(label)) {
        for (const item of items) {
          const m = item.match(/^\*\*(.+?):?\*\*:?\s*(.+)$/);
          if (m) terms.push({ ...base, term: m[1].replace(/:$/, '').trim(), def: m[2].trim() });
        }
      } else if (/^red flags/i.test(label)) {
        for (const item of items) flags.push({ ...base, level: l.data.level, text: item });
      } else if (/^ask your ai$/i.test(label)) {
        for (const item of items) {
          const text = item.replace(/^\*+|\*+$/g, '').replace(/^["“]|["”]$/g, '').trim();
          if (text) prompts.push({ ...base, level: l.data.level, text });
        }
      }
    }
  }
  return { terms, flags, prompts };
}

// Glossary: one entry per term (case-insensitive), keeping the earliest lesson's definition.
export function glossary(terms: Term[]) {
  const byKey = new Map<string, Term & { also: { slug: string; title: string }[] }>();
  for (const t of [...terms].sort((a, b) => a.order - b.order)) {
    const key = t.term.toLowerCase();
    const found = byKey.get(key);
    if (found) found.also.push({ slug: t.slug, title: t.title });
    else byKey.set(key, { ...t, also: [] });
  }
  return [...byKey.values()].sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
}

// Minimal, safe inline Markdown: escapes HTML, then renders `code`, **bold**, *italic* and [links](url).
export function inline(md: string): string {
  const esc = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const codes: string[] = [];
  let s = esc.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)/g, (_, text, href) => {
      const external = href.startsWith('http');
      return `<a href="${href.replace(/"/g, '&quot;')}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
    });
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
}

// Plain text version (for tooltips and copying).
export function plain(md: string): string {
  return md
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}
