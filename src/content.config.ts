import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
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
      // 최신순 동률을 피하려면 수동 발행도 날짜만 쓰지 말고 ISO 8601 시각까지 기록한다.
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      // CMS가 public/uploads/에 올린 이미지의 경로 문자열 (예: /uploads/xxx.jpg)
      coverImage: z.string().optional(),
      // 목록 카드 전용 정사각 이미지. 없으면 coverImage를 1:1로 크롭해 사용한다.
      cardImage: z.string().optional(),
      coverImageAlt: z.string().optional(),
      coverImageCaption: z.string().optional(),
      coverImageWidth: z.number().int().positive().optional(),
      coverImageHeight: z.number().int().positive().optional(),
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
      // 같은 대회·사건을 다룬 글끼리 자동으로 서로 연결한다.
      relatedGroup: z.string().optional(),
    }),
});

const archive = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/archive' }),
  schema: () => z.object({
    title: z.string(),
    description: z.string(),
    branch: z.string(),
    index: z.string(),
    year: z.number(),
    subject: z.string(),
    originalTitle: z.string().optional(),
    keywords: z.array(z.string()).default([]),
    // 아카이브 역시 같은 날 여러 건을 발행할 수 있으므로 ISO 8601 시각을 보존한다.
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    coverImage: z.string(),
    coverImageAlt: z.string(),
    coverImageCaption: z.string().optional(),
    coverImageWidth: z.number().int().positive(),
    coverImageHeight: z.number().int().positive(),
    draft: z.boolean().default(false),
    relatedGroup: z.string().optional(),
  }),
});

export const collections = { articles, archive };
