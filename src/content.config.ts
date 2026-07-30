import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import categoriesData from './data/categories.json';

// 카테고리 slug 목록은 src/data/categories.json에서 가져온다(코드 하드코딩 금지).
const categorySlugs = categoriesData.categories.map((c) => c.slug) as [string, ...string[]];

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: () =>
    z.object({
      title: z.string(),
      description: z.string(),
      category: z.enum(categorySlugs),
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
      // 홈 히어로 "이번 주 HOT" 노출 여부 — 조회수 자동 순위 아님, 운영자가 직접 켠다.
      featured: z.boolean().default(false),
    }),
});

export const collections = { articles };
