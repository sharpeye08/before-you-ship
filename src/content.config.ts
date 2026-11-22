import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const option = z.object({
  text: z.string(),
  correct: z.boolean().optional(),
});

const question = z
  .object({
    question: z.string(),
    options: z.array(option).length(4),
    explanation: z.string(),
  })
  .refine((q) => q.options.filter((o) => o.correct).length === 1, {
    message: 'Each quiz question needs exactly one option with correct: true',
  });

const lessons = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/lessons' }),
  schema: z.object({
    title: z.string(),
    order: z.number().int().positive(),
    level: z.number().int().min(1).max(5),
    levelName: z.string(),
    concepts: z.array(z.string()).default([]),
    readTime: z.union([z.string(), z.number()]).optional(),
    quiz: z.array(question).min(5).max(6),
  }),
});

export const collections = { lessons };
