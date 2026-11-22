// Adds classes to lesson building blocks so they can be styled:
// - blockquotes starting with "Before you start", "In short:" or "Go deeper:" become callouts
// - tables get a scrollable wrapper for small screens
// - links to other sites open in a new tab

const CALLOUTS = [
  ['before you start', 'callout callout-start'],
  ['in short', 'callout callout-short'],
  ['go deeper', 'callout callout-deeper'],
];

function textOf(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  return (node.children || []).map(textOf).join('');
}

function firstElement(node) {
  return (node.children || []).find((c) => c.type === 'element');
}

function addClass(node, cls) {
  node.properties = node.properties || {};
  const existing = node.properties.className || [];
  node.properties.className = [...(Array.isArray(existing) ? existing : [existing]), ...cls.split(' ')];
}

function walk(node) {
  if (!node.children) return;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.type !== 'element') continue;

    if (child.tagName === 'blockquote') {
      const p = firstElement(child);
      const lead = p ? textOf(firstElement(p) || p).trim().toLowerCase() : '';
      const match = CALLOUTS.find(([start]) => lead.startsWith(start));
      addClass(child, match ? match[1] : 'callout callout-plain');
    }

    if (child.tagName === 'table') {
      node.children[i] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-wrap'] },
        children: [child],
      };
      continue;
    }

    if (child.tagName === 'a') {
      const href = String(child.properties?.href || '');
      if (/^https?:\/\//.test(href)) {
        child.properties.target = '_blank';
        child.properties.rel = 'noopener noreferrer';
      }
    }

    walk(child);
  }
}

export default function rehypeLessonBlocks() {
  return (tree) => walk(tree);
}
