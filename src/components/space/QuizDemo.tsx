import { useState } from 'react';

// A real quiz question from a lesson. Pick an answer to see if it is right and why.
export interface QuizItem {
  question: string;
  options: { text: string; correct?: boolean }[];
  explanation: string;
}

export default function QuizDemo({ items, href }: { items: QuizItem[]; href: string }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = items[i];
  const answered = picked !== null;
  const right = answered && q.options[picked!].correct;

  return (
    <div className="flex h-full flex-col">
      <p className="mb-5 text-[1.05rem] leading-relaxed text-ink">{q.question}</p>
      <ul className="flex flex-col gap-2.5">
        {q.options.map((o, j) => {
          const state = !answered ? 'idle' : o.correct ? 'right' : j === picked ? 'wrong' : 'other';
          return (
            <li key={j}>
              <button
                type="button"
                disabled={answered}
                onClick={() => setPicked(j)}
                className={[
                  'w-full rounded-2xl border px-4 py-3 text-left text-[0.95rem] leading-snug transition-colors',
                  state === 'idle' && 'border-line bg-white/[0.03] hover:border-white/35 hover:text-ink',
                  state === 'right' && 'border-l1/70 bg-l1/10 text-ink',
                  state === 'wrong' && 'border-l5/70 bg-l5/10 text-ink',
                  state === 'other' && 'border-line',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {o.text}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 min-h-[5.5rem]" aria-live="polite">
        {answered && (
          <>
            <p className="mb-1 font-medium">{right ? 'Correct.' : 'Not quite.'}</p>
            <p className="text-[0.95rem] leading-relaxed">{q.explanation}</p>
          </>
        )}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
        {answered && i < items.length - 1 && (
          <button
            type="button"
            className="btn btn-ghost h-10 text-sm"
            onClick={() => {
              setI(i + 1);
              setPicked(null);
            }}
          >
            Next question
          </button>
        )}
        <a href={href} className="text-sm underline decoration-white/30 underline-offset-4 hover:text-ink">
          Read the full lesson
        </a>
      </div>
    </div>
  );
}
