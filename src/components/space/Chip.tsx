import { useEffect, useState } from 'react';

// Small chip in the bottom-left corner (Aria's clock): shows where you are on the page.
const LABELS: Record<string, string> = {
  hero: 'Start',
  why: 'Why',
  path: 'The path',
  lesson: 'A lesson',
  index: 'Every lesson',
  tools: 'Tools',
  promise: 'The promise',
  faq: 'Questions',
  start: 'Begin',
  footer: 'Begin',
};

export default function Chip({ total }: { total: number }) {
  const [state, setState] = useState({ index: 0, name: 'hero' });
  useEffect(() => {
    const on = (e: Event) => setState((e as CustomEvent<{ index: number; name: string }>).detail);
    addEventListener('sky:section', on);
    return () => removeEventListener('sky:section', on);
  }, []);
  const n = Math.min(state.index + 1, total);
  return (
    <p
      aria-hidden="true"
      className="glass label fixed bottom-4 left-4 z-40 flex items-center gap-2.5 rounded-full px-3.5 py-2 text-[0.7rem] text-soft"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-l1 shadow-[0_0_10px_var(--color-l1)]" />
      {String(n).padStart(2, '0')} / {String(total).padStart(2, '0')} · {LABELS[state.name] ?? ''}
    </p>
  );
}
