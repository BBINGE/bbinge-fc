export const cultureSections = {
  boutique: {
    slug: 'boutique',
    floor: '02',
    label: '명품관',
    en: 'LUXURY BOUTIQUE HALL',
    eyebrow: 'THE BOUTIQUE EDIT',
    description: '인물의 패션 이미지와 희소한 착장, 화보의 완성도가 축구를 하나의 오브제로 바꾸는 편집관.',
    leadArticleId: 'karina-nike-peaceminusone-korea-football-fashion',
    leadImageFocus: { x: 50, y: 38, scale: 1.08 },
  },
  outfit: {
    slug: 'outfits',
    floor: '03',
    label: '오뭐입?',
    en: 'OOTD · BLOCKCORE',
    eyebrow: 'WHAT ARE WE WEARING?',
    description: '유니폼이 일상의 옷으로 건너오는 순간과 지금 따라 입고 싶은 조합을 모은 편집관.',
    leadArticleId: 'kwon-eunbi-world-cup-red-jersey-denim-skirt',
    leadImageFocus: { x: 42, y: 35, scale: 1.65 },
  },
  kit: {
    slug: 'kits',
    floor: '03',
    label: '유니폼관',
    en: 'FOOTBALL KIT GALLERY',
    eyebrow: 'THE KIT ROOM',
    description: '시즌과 구단, 마킹과 디자인, 정품 선택까지 셔츠 자체가 주인공이 되는 유니폼관.',
    leadArticleId: 'olivia-rodrigo-barcelona-jersey-el-clasico-collaboration',
    leadImageFocus: { x: 45, y: 20, scale: 1.55 },
  },
} as const;

export const cultureCoverArticleId = 'lisa-nike-football-mercurial-dress-world-cup';

export type CultureSection = keyof typeof cultureSections;
export const cultureSectionSlugs = Object.keys(cultureSections) as [CultureSection, ...CultureSection[]];

export function getCultureSectionPath(section: CultureSection): string {
  return `/culture/${cultureSections[section].slug}/`;
}
