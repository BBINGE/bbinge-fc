// 여러 관(대회관·H/L·시상관)에 흩어진 같은 시즌 기록을 서로 잇는 하단 읽기 동선.
// 운영자 확정(2026-09-14): 유러피언컵 기록끼리는 서로 전부 연결하고, 발롱도르는 같은 시즌 결승 H/L과 베스트 11로 보낸다.

export type ReadingRouteTheme = 'european-cup' | 'ballon-dor';

export interface ReadingRouteStory {
  id: string;
  href: string;
  index: string;
  label: string;
  title: string;
  description: string;
  image: string;
  theme: ReadingRouteTheme;
}

export interface ReadingRoute {
  theme: ReadingRouteTheme;
  kicker: string;
  title: string;
  lead: string;
  stories: ReadingRouteStory[];
}

const europeanCup1955Stories: ReadingRouteStory[] = [
  {
    id: '1955-56-european-cup',
    href: '/archive/european-club/european-cup/1955-56-european-cup/',
    index: '01',
    label: '대회관 · 창설과 본선',
    title: '첫 유러피언컵은 어떻게 시작됐나',
    description: '자크 페랑의 구상부터 16강·8강까지, 열여섯 구단의 출발선 읽기',
    image: '/images/archive/1955-56-european-cup/cover.png',
    theme: 'european-cup',
  },
  {
    id: '1955-56-european-cup-semifinals',
    href: '/archive/european-club/european-cup/1955-56-european-cup-semifinals/',
    index: '02',
    label: '대회관 · 4강',
    title: '결승행 두 자리는 누가 가져갔나',
    description: '파리가 부른 코파의 이름과 산 시로의 페널티킥, 4강 네 경기 읽기',
    image: '/images/archive/1955-56-european-cup-semifinals/cover.webp',
    theme: 'european-cup',
  },
  {
    id: '1955-56-european-cup-final-real-madrid-stade-de-reims',
    href: '/highlights/european-cup/1955-56-european-cup-final-real-madrid-stade-de-reims/',
    index: '03',
    label: 'H/L · 결승전',
    title: '파리의 4-3은 어떻게 뒤집혔나',
    description: '0-2에서 시작된 레알 마드리드의 역전을 장면별 영상으로 보기',
    image: '/images/highlights/1955-56-european-cup-final-kopa-di-stefano.jpg',
    theme: 'european-cup',
  },
  {
    id: '1955-56-european-cup-tournament-best-xi',
    href: '/archive/european-club/european-cup/1955-56-european-cup-tournament-best-xi/',
    index: '04',
    label: '대회관 · 베스트 11',
    title: '그해 가장 잘한 열한 명은 누구였나',
    description: '29경기의 라인업과 등번호로 다시 고른 첫 대회의 베스트 11',
    image: '/images/archive/1955-56-european-cup-tournament-best-xi/cover.webp',
    theme: 'european-cup',
  },
  {
    id: '1956-ballon-dor-stanley-matthews',
    href: '/archive/awards/ballon-dor/1956-ballon-dor-stanley-matthews/',
    index: '05',
    label: '시상관 · 발롱도르',
    title: '첫 발롱도르는 왜 매슈스였나',
    description: '디스테파노와 코파를 제친 1956년 투표의 포디움과 랭킹',
    image: '/images/archive/awards/1956-ballon-dor/cover.png',
    theme: 'ballon-dor',
  },
];

const byId = (id: string) => europeanCup1955Stories.find((story) => story.id === id)!;

export function getReadingRoute(currentId: string): ReadingRoute | undefined {
  if (currentId === '1956-ballon-dor-stanley-matthews') {
    return {
      theme: 'ballon-dor',
      kicker: "BALLON D’OR 1956 × EUROPEAN CUP 1955-56",
      title: '첫 발롱도르와<br />같은 시즌의 유럽 무대',
      lead: '매슈스와 디스테파노, 코파가 겨룬 투표 옆에는 첫 유러피언컵이 있었다. 파리의 결승 장면과 그 대회의 베스트 11로 이어서 읽으면 된다.',
      stories: [byId('1955-56-european-cup-tournament-best-xi'), byId('1955-56-european-cup-final-real-madrid-stade-de-reims')],
    };
  }
  if (europeanCup1955Stories.some((story) => story.id === currentId && story.theme === 'european-cup')) {
    return {
      theme: 'european-cup',
      kicker: 'EUROPEAN CUP 1955-56 READING ROUTE · 01—05',
      title: '첫 유러피언컵을<br />다섯 개의 기록으로 읽기',
      lead: '대회가 어떻게 시작됐는지, 누가 결승에 올랐는지, 파리의 4-3이 어떻게 뒤집혔는지, 그해 가장 빛난 선수가 누구였는지에 따라 다음 기록을 고르면 된다.',
      stories: europeanCup1955Stories.filter((story) => story.id !== currentId),
    };
  }
  return undefined;
}
