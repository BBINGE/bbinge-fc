export type CategorySlug = 'history' | 'pilgrimage' | 'play' | 'culture';

export type CategoryColor =
  | 'coral'
  | 'teal'
  | 'purple'
  | 'pink'
  | 'blue'
  | 'green'
  | 'amber'
  | 'gray';

interface CategoryMeta {
  label: string;
  color: CategoryColor;
}

export const categories: Record<CategorySlug, CategoryMeta> = {
  history: { label: '역사', color: 'coral' },
  pilgrimage: { label: '순례', color: 'teal' },
  play: { label: '놀이', color: 'purple' },
  culture: { label: '컬쳐', color: 'pink' },
};

export const categoryList = Object.entries(categories).map(([slug, meta]) => ({
  slug: slug as CategorySlug,
  ...meta,
}));
