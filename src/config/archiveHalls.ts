export const archiveHalls = [
  { id: 'people', label: '인물', title: '인물관', en: 'PEOPLE & LEGACIES', href: '/archive/legends/', description: '선수와 감독의 생애, 플레이와 기록을 따라갑니다.' },
  { id: 'competitions', label: '대회', title: '대회관', en: 'COMPETITIONS & SEASONS', href: '/archive/competitions/', description: '대회의 역사와 시즌, 우승과 개인 기록을 함께 읽습니다.' },
  { id: 'awards', label: '시상', title: '시상관', en: 'AWARDS & HONOURS', href: '/archive/awards/', description: '독립된 상의 수상자와 투표, 선정 기준의 변화를 살펴봅니다.' },
] as const;
export type ArchiveHallId = typeof archiveHalls[number]['id'];
export function archiveHallFor(branch: string, index = ''): ArchiveHallId {
  if (branch === 'legends') return 'people';
  if (branch === 'awards' && !['copa-america-best-player', 'top-scorers', 'team-of-the-season'].includes(index)) return 'awards';
  return 'competitions';
}
