export interface ArchiveBranch {
  id: string;
  number: string;
  title: string;
  originalTitle: string;
  description: string;
  indexes: ArchiveIndex[];
}

export interface ArchiveIndex {
  slug: string;
  label: string;
}

export const archiveBranches: ArchiveBranch[] = [
  {
    id: 'legends',
    number: '01',
    title: '삥이 IN 레전드',
    originalTitle: 'LEGENDS',
    description: '선수의 생애와 경력을 국가·지역의 축구사와 함께 읽는 인물 기록.',
    indexes: [
      ['netherlands', '네덜란드'], ['brazil', '브라질'], ['germany', '독일'], ['spain', '스페인'], ['england', '잉글랜드'], ['italy', '이탈리아'], ['france', '프랑스'], ['portugal', '포르투갈'], ['south-america', '남아메리카'], ['eastern-europe', '동유럽'], ['western-europe', '서유럽'], ['northern-europe', '북유럽'],
    ].map(([slug, label]) => ({ slug, label })),
  },
  {
    id: 'leagues',
    number: '02',
    title: '삥이 IN 리그',
    originalTitle: 'DOMESTIC LEAGUES',
    description: '각국 리그의 역사와 시즌, 구단과 스쿼드를 축적하는 국내 대회 기록.',
    indexes: [
      ['premier-league', '프리미어리그'], ['la-liga', '라리가'], ['serie-a', '세리에 A'], ['bundesliga', '분데스리가'], ['ligue-1', '리그 1'], ['other-domestic-leagues', '기타 국내 리그'],
    ].map(([slug, label]) => ({ slug, label })),
  },
  {
    id: 'european-club',
    number: '03',
    title: '삥이 IN 클럽 대항전',
    originalTitle: 'CLUB COMPETITIONS',
    description: '대륙별 클럽 대항전의 개편 전후를 당대의 공식 명칭으로 구분한 기록.',
    indexes: [
      ['european-cup', '유러피언컵'], ['uefa-champions-league', 'UEFA 챔피언스 리그'], ['uefa-cup-winners-cup', 'UEFA 컵위너스컵'], ['uefa-cup', 'UEFA 컵'], ['uefa-europa-league', 'UEFA 유로파 리그'], ['uefa-europa-conference-league', 'UEFA 유로파 콘퍼런스 리그'], ['copa-libertadores', '코파 리베르타도레스'], ['intercontinental-cup', '인터콘티넨털컵'],
    ].map(([slug, label]) => ({ slug, label })),
  },
  {
    id: 'national-team',
    number: '04',
    title: '삥이 IN 국가대표팀 대회',
    originalTitle: 'INTERNATIONAL COMPETITIONS',
    description: '국가대표팀 대회의 역사와 결승전, 선정 기록을 연도별로 정리한 총람.',
    indexes: [
      ['fifa-world-cup', 'FIFA 월드컵™'], ['uefa-european-championship', 'UEFA 유러피언 챔피언십'], ['copa-america', '코파 아메리카'], ['afc-asian-cup', 'AFC 아시안컵'], ['africa-cup-of-nations', '아프리카 네이션스컵'],
    ].map(([slug, label]) => ({ slug, label })),
  },
  {
    id: 'awards',
    number: '05',
    title: '삥이 IN 시상식',
    originalTitle: 'AWARDS & HONOURS',
    description: '개인상과 대회별 수상 기록을 수상 당시의 맥락과 함께 보존하는 연감.',
    indexes: [
      ['ballon-dor', '발롱도르'], ['copa-america-best-player', '코파 아메리카 최우수 선수'], ['top-scorers', '대회별 득점왕'], ['team-of-the-season', '시즌 베스트 11'],
    ].map(([slug, label]) => ({ slug, label })),
  },
];

export function getArchiveBranch(id: string) {
  return archiveBranches.find((branch) => branch.id === id);
}
