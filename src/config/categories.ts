export type CategorySlug = 'history' | 'pilgrimage' | 'play' | 'culture';

interface CategoryMeta {
  label: string;      // 짧은 표시명 (내비게이션)
  fullLabel: string;  // 전체 표시명 (카테고리 페이지 부제)
}

export const categories: Record<CategorySlug, CategoryMeta> = {
  history: { label: '축세', fullLabel: '축구로 보는 세계사' },
  pilgrimage: { label: '축행', fullLabel: '축구로 가는 세계여행' },
  play: { label: '축겜', fullLabel: '축구로 노는 게임' },
  culture: { label: '축디', fullLabel: '축구로 보는 OOTD' },
};

export const categoryList = Object.entries(categories).map(([slug, meta]) => ({
  slug: slug as CategorySlug,
  ...meta,
}));
