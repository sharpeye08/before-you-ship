// Every quiz question from every lesson, for review mode. Built once as a static file.
import type { APIRoute } from 'astro';
import { getLessons } from '../lib/lessons';

export const GET: APIRoute = async () => {
  const lessons = await getLessons();
  const questions = lessons.flatMap((l) =>
    l.data.quiz.map((q, i) => ({
      id: `${l.id}#${i}`,
      slug: l.id,
      title: l.data.title,
      order: l.data.order,
      level: l.data.level,
      q: q.question,
      o: q.options.map((o) => ({ t: o.text, c: !!o.correct })),
      e: q.explanation,
    })),
  );
  return new Response(JSON.stringify(questions), { headers: { 'Content-Type': 'application/json' } });
};
