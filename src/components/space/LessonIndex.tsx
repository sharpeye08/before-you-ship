import { useState } from 'react';

// Every lesson, one level at a time. Tabs choose the level.
export interface IndexLevel {
  n: number;
  name: string;
  color: string;
  lessons: { slug: string; title: string; order: number; minutes: number }[];
}

export default function LessonIndex({ levels }: { levels: IndexLevel[] }) {
  const [active, setActive] = useState(0);
  const lv = levels[active];
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div>
      <div role="tablist" aria-label="Levels" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {levels.map((l, i) => (
          <button
            key={l.n}
            role="tab"
            type="button"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={[
              'flex shrink-0 items-center gap-2.5 rounded-full border px-4 py-2 text-sm transition-colors',
              i === active ? 'border-white/40 bg-white/10 text-ink' : 'border-line hover:text-ink',
            ].join(' ')}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: l.color, boxShadow: `0 0 10px ${l.color}` }} />
            {l.name}
            <span className="text-xs tabular-nums">{l.lessons.length}</span>
          </button>
        ))}
      </div>
      <ol role="tabpanel" className="mt-8 grid gap-x-10 border-t border-line sm:grid-cols-2 lg:grid-cols-3">
        {lv.lessons.map((l) => (
          <li key={l.slug} className="border-b border-line">
            <a href={`/lessons/${l.slug}`} className="group flex gap-4 py-4 hover:text-ink">
              <span className="w-6 shrink-0 pt-px text-sm tabular-nums">{pad(l.order)}</span>
              <span className="leading-snug">{l.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
