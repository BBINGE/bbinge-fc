import categoriesData from '../data/categories.json';

// 카테고리는 src/data/categories.json에 데이터로 저장된다(인접 리스트: parentSlug로 무한 depth 표현).
// 새 카테고리를 추가·수정·삭제하려면 코드가 아니라 그 파일을 편집한다(/admin CMS의 "설정 > 카테고리" 화면 권장).
export type CategorySlug = string;

interface CategoryMeta {
  label: string; // 짧은 표시명 (내비게이션)
  pageTitle?: string; // 카테고리 페이지의 확장 제목 (없으면 label)
  fullLabel: string; // 전체 표시명 (카테고리 페이지 부제)
  description?: string; // 카테고리 편집 방향
  emptyMessage?: string; // 발행 글이 없을 때 안내
  parentSlug: CategorySlug | null; // 상위 카테고리 slug, 최상위는 null
}

export interface CategoryNode extends CategoryMeta {
  slug: CategorySlug;
}

export interface CategoryTreeNode extends CategoryNode {
  children: CategoryTreeNode[];
}

export const categoryList: CategoryNode[] = categoriesData.categories as CategoryNode[];

export const categories: Record<CategorySlug, CategoryMeta> = Object.fromEntries(
  categoryList.map(({ slug, label, pageTitle, fullLabel, description, emptyMessage, parentSlug }) => [
    slug,
    { label, pageTitle, fullLabel, description, emptyMessage, parentSlug },
  ])
);

export const categorySlugs: CategorySlug[] = categoryList.map(({ slug }) => slug);

export function getTopLevel(): CategoryNode[] {
  return categoryList.filter((c) => c.parentSlug === null);
}

export function getChildren(slug: CategorySlug): CategoryNode[] {
  return categoryList.filter((c) => c.parentSlug === slug);
}

// root -> ... -> slug 순서의 조상 체인 (자기 자신 포함). 존재하지 않는 slug면 빈 배열.
export function getAncestorChain(slug: CategorySlug): CategoryNode[] {
  const chain: CategoryNode[] = [];
  let current = categories[slug] ? { ...categories[slug], slug } : undefined;
  const seen = new Set<CategorySlug>();
  while (current) {
    if (seen.has(current.slug)) break; // 순환 참조 방어
    seen.add(current.slug);
    chain.unshift(current);
    const parentSlug = current.parentSlug;
    current = parentSlug && categories[parentSlug] ? { ...categories[parentSlug], slug: parentSlug } : undefined;
  }
  return chain;
}

export function getCategoryPath(slug: CategorySlug): string {
  return `/${getAncestorChain(slug).map((category) => category.slug).join('/')}/`;
}

export function getArticlePath(categorySlug: CategorySlug, articleId: string): string {
  return `${getCategoryPath(categorySlug)}${articleId}/`;
}

export function buildTree(): CategoryTreeNode[] {
  const toNode = (c: CategoryNode): CategoryTreeNode => ({
    ...c,
    children: getChildren(c.slug).map(toNode),
  });
  return getTopLevel().map(toNode);
}

// 글 목록(카테고리 slug 배열, draft 제외 후 넘길 것)을 받아 노드별 카운트를 자기 자신 + 하위 전체로 롤업한다.
export function countByNode(articleCategorySlugs: CategorySlug[]): Record<CategorySlug, number> {
  const own: Record<CategorySlug, number> = Object.fromEntries(categorySlugs.map((s) => [s, 0]));
  for (const slug of articleCategorySlugs) {
    if (own[slug] !== undefined) own[slug] += 1;
  }
  const rollup: Record<CategorySlug, number> = { ...own };
  // 자식이 부모보다 먼저 계산되도록 리스트를 깊이 역순으로 정렬할 필요 없이,
  // 각 노드에서 자기 조상 체인 전체에 own count를 더하는 방식으로 처리한다.
  for (const slug of categorySlugs) {
    if (own[slug] === 0) continue;
    const chain = getAncestorChain(slug);
    for (const ancestor of chain.slice(0, -1)) {
      rollup[ancestor.slug] += own[slug];
    }
  }
  return rollup;
}
