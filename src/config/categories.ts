import categoriesData from '../data/categories.json';

// 카테고리는 src/data/categories.json에 데이터로 저장된다.
// 새 카테고리를 추가·수정·삭제하려면 코드가 아니라 그 파일을 편집한다(/admin CMS의 "설정 > 카테고리" 화면 권장).
export type CategorySlug = string;

interface CategoryMeta {
  label: string; // 짧은 표시명 (내비게이션)
  fullLabel: string; // 전체 표시명 (카테고리 페이지 부제)
}

export const categoryList: (CategoryMeta & { slug: CategorySlug })[] = categoriesData.categories;

export const categories: Record<CategorySlug, CategoryMeta> = Object.fromEntries(
  categoryList.map(({ slug, label, fullLabel }) => [slug, { label, fullLabel }])
);
