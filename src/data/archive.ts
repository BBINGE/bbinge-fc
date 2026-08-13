export interface ArchiveBranch {
  id: string;
  number: string;
  title: string;
  originalTitle: string;
  description: string;
  indexes: string[];
}

export const archiveBranches: ArchiveBranch[] = [
  {
    id: 'legends',
    number: '01',
    title: '삥이 IN 레전드',
    originalTitle: 'LEGENDS',
    description: '선수의 생애와 경력을 국가·지역의 축구사와 함께 읽는 인물 기록.',
    indexes: ['네덜란드', '브라질', '독일', '스페인', '잉글랜드', '이탈리아', '프랑스', '포르투갈', '남아메리카', '동유럽', '서유럽', '북유럽'],
  },
  {
    id: 'leagues',
    number: '02',
    title: '삥이 IN 리그',
    originalTitle: 'DOMESTIC LEAGUES',
    description: '각국 리그의 역사와 시즌, 구단과 스쿼드를 축적하는 국내 대회 기록.',
    indexes: ['프리미어리그', '라리가', '세리에 A', '분데스리가', '리그 1', '기타 국내 리그'],
  },
  {
    id: 'european-club',
    number: '03',
    title: '삥이 IN 클럽 대항전',
    originalTitle: 'CLUB COMPETITIONS',
    description: '대륙별 클럽 대항전의 개편 전후를 당대의 공식 명칭으로 구분한 기록.',
    indexes: ['유러피언컵', 'UEFA 챔피언스 리그', 'UEFA 컵위너스컵', 'UEFA 컵', 'UEFA 유로파 리그', 'UEFA 유로파 콘퍼런스 리그', '코파 리베르타도레스', '인터콘티넨털컵'],
  },
  {
    id: 'national-team',
    number: '04',
    title: '삥이 IN 국가대표팀 대회',
    originalTitle: 'INTERNATIONAL COMPETITIONS',
    description: '국가대표팀 대회의 역사와 결승전, 선정 기록을 연도별로 정리한 총람.',
    indexes: ['FIFA 월드컵™', 'UEFA 유러피언 챔피언십', '코파 아메리카', 'AFC 아시안컵', '아프리카 네이션스컵'],
  },
  {
    id: 'awards',
    number: '05',
    title: '삥이 IN 시상식',
    originalTitle: 'AWARDS & HONOURS',
    description: '개인상과 대회별 수상 기록을 수상 당시의 맥락과 함께 보존하는 연감.',
    indexes: ['발롱도르', '코파 아메리카 최우수 선수', '대회별 득점왕', '시즌 베스트 11'],
  },
];
