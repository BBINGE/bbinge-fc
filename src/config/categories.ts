export type CategorySlug = 'history' | 'pilgrimage' | 'play' | 'culture';

interface CategoryMeta {
  label: string;
}

export const categories: Record<CategorySlug, CategoryMeta> = {
  history: { label: '역사' },
  pilgrimage: { label: '순례' },
  play: { label: '놀이' },
  culture: { label: '컬쳐' },
};

export const categoryList = Object.entries(categories).map(([slug, meta]) => ({
  slug: slug as CategorySlug,
  ...meta,
}));
