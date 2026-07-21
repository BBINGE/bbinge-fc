import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: () =>
    z.object({
      title: z.string(),
      description: z.string(),
      category: z.enum(['history', 'pilgrimage', 'play', 'culture']),
      tags: z.array(z.string()).default([]),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      // CMS가 public/uploads/에 올린 이미지의 경로 문자열 (예: /uploads/xxx.jpg)
      coverImage: z.string().optional(),
      gallery: z.array(z.string()).optional(),
      faq: z
        .array(
          z.object({
            question: z.string(),
            answer: z.string(),
          })
        )
        .optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { articles };
