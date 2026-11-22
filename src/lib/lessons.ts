import { getCollection, type CollectionEntry } from 'astro:content';
import { LEVELS } from '../config';

export type Lesson = CollectionEntry<'lessons'>;

export interface LessonSummary {
  slug: string;
  title: string;
  order: number;
  level: number;
  levelName: string;
  concepts: string[];
  minutes: number;
}

// Reading time for the main lesson: everything except the optional "Going deeper" section.
export function readingMinutes(body: string): number {
  const main = body.replace(/<details>[\s\S]*?<\/details>/g, '');
  const words = main.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

export async function getLessons(): Promise<Lesson[]> {
  const all = await getCollection('lessons');
  return all.sort((a, b) => a.data.order - b.data.order);
}

export function summarize(lesson: Lesson): LessonSummary {
  return {
    slug: lesson.id,
    title: lesson.data.title,
    order: lesson.data.order,
    level: lesson.data.level,
    levelName: lesson.data.levelName,
    concepts: lesson.data.concepts,
    minutes: readingMinutes(lesson.body ?? ''),
  };
}

export async function getSummaries(): Promise<LessonSummary[]> {
  return (await getLessons()).map(summarize);
}

export function groupByLevel(lessons: LessonSummary[]) {
  return LEVELS.map((level) => ({
    ...level,
    lessons: lessons.filter((l) => l.level === level.n),
  }));
}
