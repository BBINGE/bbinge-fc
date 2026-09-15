// 여러 관(대회관·H/L·시상관)에 흩어진 같은 시즌 기록을 서로 잇는 하단 읽기 동선.
// 운영자 확정(2026-09-14): 유러피언컵 기록끼리는 서로 전부 연결하고, 발롱도르는 같은 시즌 결승 H/L과 베스트 11로 보낸다.

// 운영자 요청(2026-09-15): 헝가리 황금의 팀을 다룬 축술·축세·대회관·H/L·축행 여섯 편도 같은 방식으로 서로 잇는다.

export type ReadingRouteTheme = 'european-cup' | 'ballon-dor' | 'hungary';

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
    id: '1955-56-european-cup-top-scorers',
    href: '/archive/european-club/european-cup/1955-56-european-cup-top-scorers/',
    index: '04',
    label: '대회관 · 득점 순위',
    title: '가장 많은 골을 넣은 선수는 누구였나',
    description: '8강에서 멈춘 밀루티노비치의 8골부터 결승 두 팀의 5골 트리오까지, 경기별 득점 기록',
    image: '/images/archive/1955-56-european-cup-top-scorers/top-scorers.png',
    theme: 'european-cup',
  },
  {
    id: '1955-56-european-cup-tournament-best-xi',
    href: '/archive/european-club/european-cup/1955-56-european-cup-tournament-best-xi/',
    index: '05',
    label: '대회관 · 베스트 11',
    title: '그해 가장 잘한 열한 명은 누구였나',
    description: '29경기의 라인업과 등번호로 다시 고른 첫 대회의 베스트 11',
    image: '/images/archive/1955-56-european-cup-tournament-best-xi/cover.webp',
    theme: 'european-cup',
  },
  {
    id: '1956-ballon-dor-stanley-matthews',
    href: '/archive/awards/ballon-dor/1956-ballon-dor-stanley-matthews/',
    index: '06',
    label: '시상관 · 발롱도르',
    title: '첫 발롱도르는 왜 매슈스였나',
    description: '디스테파노와 코파를 제친 1956년 투표의 포디움과 랭킹',
    image: '/images/archive/awards/1956-ballon-dor/cover.png',
    theme: 'ballon-dor',
  },
];

const europeanCup1956Stories: ReadingRouteStory[] = [
  {
    id: '1956-57-european-cup',
    href: '/archive/european-club/european-cup/1956-57-european-cup/',
    index: '01',
    label: '대회관 · 참가팀과 본선',
    title: '스물두 구단은 어떻게 4강까지 좁혀졌나',
    description: '맨유의 첫 도전과 브뤼셀로 옮겨 간 혼베드의 홈경기, 예선부터 8강까지 읽기',
    image: '/images/archive/1956-57-european-cup/cover.png',
    theme: 'european-cup',
  },
  {
    id: '1956-57-european-cup-semifinals',
    href: '/archive/european-club/european-cup/1956-57-european-cup-semifinals/',
    index: '02',
    label: '대회관 · 4강',
    title: '결승행 두 자리는 누가 가져갔나',
    description: '베오그라드 88분의 한 골과 조명을 단 올드 트래퍼드의 2-2, 4강 네 경기 읽기',
    image: '/images/archive/1956-57-european-cup-semifinals/cover.webp',
    theme: 'european-cup',
  },
  {
    id: '1956-57-european-cup-final-real-madrid-fiorentina',
    href: '/highlights/european-cup/1956-57-european-cup-final-real-madrid-fiorentina/',
    index: '03',
    label: 'H/L · 결승전',
    title: '베르나베우의 69분은 어떻게 깨졌나',
    description: '논란의 페널티킥과 헨토의 로빙슛, 두 번째 결승을 장면별 영상으로 보기',
    image: '/images/highlights/1956-57-european-cup-final-thumbnail.jpg',
    theme: 'european-cup',
  },
  {
    id: '1956-57-european-cup-top-scorers',
    href: '/archive/european-club/european-cup/1956-57-european-cup-top-scorers/',
    index: '04',
    label: '대회관 · 득점 순위',
    title: '가장 많은 골을 넣은 선수는 누구였나',
    description: '4강에서 멈춘 맨유의 바이올렛 9골과 테일러 8골부터 디스테파노의 7골까지, 경기별 득점 기록',
    image: '/images/archive/1956-57-european-cup-top-scorers/top-scorers.png',
    theme: 'european-cup',
  },
  {
    id: '1956-57-european-cup-tournament-best-xi',
    href: '/archive/european-club/european-cup/1956-57-european-cup-tournament-best-xi/',
    index: '05',
    label: '대회관 · 베스트 11',
    title: '그해 가장 잘한 열한 명은 누구였나',
    description: '44경기의 라인업과 등번호로 다시 고른 두 번째 대회의 베스트 11',
    image: '/images/archive/1956-57-european-cup-tournament-best-xi/cover.webp',
    theme: 'european-cup',
  },
  {
    id: '1957-ballon-dor-alfredo-di-stefano',
    href: '/archive/awards/ballon-dor/1957-ballon-dor-alfredo-di-stefano/',
    index: '06',
    label: '시상관 · 발롱도르',
    title: '두 번째 발롱도르는 왜 디스테파노였나',
    description: '72점의 디스테파노와 라이트·코파·에드워즈, 1957년 투표의 포디움과 랭킹',
    image: '/images/archive/awards/1957-ballon-dor/cover.jpg',
    theme: 'ballon-dor',
  },
];

const hungaryStories: ReadingRouteStory[] = [
  {
    id: 'hungary-golden-team-total-football-elo-rating',
    href: '/tactics/hungary-golden-team-total-football-elo-rating/',
    index: '01',
    label: '축술 · 이기는 방식',
    title: '황금의 팀은 어떻게 세계를 앞서갔나',
    description: '다뉴브 학파부터 웸블리의 6-3까지, Elo 레이팅 역대 1위 팀의 전술 계보',
    image: '/images/tactics/hungary-golden-team/puskas.png',
    theme: 'hungary',
  },
  {
    id: '1954-korea-world-cup-journey',
    href: '/history/1954-korea-world-cup-journey/',
    index: '02',
    label: '축세 · 첫 상대',
    title: '그 세계 최강을 첫 경기에서 만난 나라',
    description: '휴전 11개월 뒤 스위스에 도착한 대한민국의 첫 월드컵과 헝가리전 0-9',
    image: '/images/history/1954-korea-world-cup/cover.png',
    theme: 'hungary',
  },
  {
    id: '1954-fifa-world-cup-best-xi',
    href: '/archive/national-team/fifa-world-cup/1954-fifa-world-cup-best-xi/',
    index: '03',
    label: '대회관 · 베스트 11',
    title: '1954년 가장 잘한 열한 명은 누구였나',
    description: '매직 마자르와 베른의 기적, 대회 전체 기록과 베스트 11',
    image: '/images/archive/1954-fifa-world-cup-best-xi/cover.png',
    theme: 'hungary',
  },
  {
    id: '1954-fifa-world-cup-final-west-germany-hungary',
    href: '/highlights/fifa-world-cup/1954-fifa-world-cup-final-west-germany-hungary/',
    index: '04',
    label: 'H/L · 결승전',
    title: '32경기 무패는 베른에서 어떻게 멈췄나',
    description: '8분 만의 2-0부터 란의 결승골까지, 서독 3-2 헝가리를 장면별 영상으로 보기',
    image: '/images/highlights/1954-world-cup-final-cover.webp',
    theme: 'hungary',
  },
  {
    id: 'hungary-1956-revolution-golden-team-dissolution',
    href: '/history/hungary-1956-revolution-golden-team-dissolution/',
    index: '05',
    label: '축세 · 흩어진 이유',
    title: '1956년 가을, 황금의 팀은 왜 흩어졌나',
    description: '소련 간부회 기록과 너지의 마지막 방송으로 다시 읽은 헝가리 혁명',
    image: '/images/history/hungary-1956-revolution/fortepan-40165-crowd.webp',
    theme: 'hungary',
  },
  {
    id: 'budapest-honeymoon-football-travel-10',
    href: '/pilgrimage/budapest-honeymoon-football-travel-10/',
    index: '06',
    label: '축행 · 여행 동선',
    title: '황금의 팀이 남긴 부다페스트는 어떻게 가나',
    description: '푸슈카시 박물관과 혼베드 홈경기, 다뉴브의 밤까지 10곳의 동선',
    image: '/images/pilgrimage/budapest-honeymoon-football-10/card.webp',
    theme: 'hungary',
  },
];

// 홈 시즌 서가: 최신 시즌을 앞에 두고, 각 시즌의 읽기 동선을 한 줄 선반으로 보여 준다.
export const seasonShelves = [
  { id: 'european-cup-1956-57', kicker: 'EUROPEAN CUP 1956-57', title: '두 번째 유러피언컵을 여섯 개의 기록으로 읽기', stories: europeanCup1956Stories },
  { id: 'european-cup-1955-56', kicker: 'EUROPEAN CUP 1955-56', title: '첫 유러피언컵을 여섯 개의 기록으로 읽기', stories: europeanCup1955Stories },
] as const;

const byId = (id: string) => europeanCup1955Stories.find((story) => story.id === id)!;
const byId1956 = (id: string) => europeanCup1956Stories.find((story) => story.id === id)!;

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
      kicker: 'EUROPEAN CUP 1955-56 READING ROUTE · 01—06',
      title: '첫 유러피언컵을<br />여섯 개의 기록으로 읽기',
      lead: '대회가 어떻게 시작됐는지, 누가 결승에 올랐는지, 파리의 4-3이 어떻게 뒤집혔는지, 누가 가장 많은 골을 넣었는지, 그해 가장 잘한 열한 명과 가장 빛난 선수가 누구였는지에 따라 다음 기록을 고르면 된다.',
      stories: europeanCup1955Stories.filter((story) => story.id !== currentId),
    };
  }
  if (currentId === '1957-ballon-dor-alfredo-di-stefano') {
    return {
      theme: 'ballon-dor',
      kicker: "BALLON D’OR 1957 × EUROPEAN CUP 1956-57",
      title: '두 번째 발롱도르와<br />같은 시즌의 유럽 무대',
      lead: '72점을 받은 디스테파노의 한 해에는 두 번째 유러피언컵이 있었다. 그 대회의 베스트 11과 베르나베우의 결승 장면으로 이어서 읽으면 된다.',
      stories: [byId1956('1956-57-european-cup-tournament-best-xi'), byId1956('1956-57-european-cup-final-real-madrid-fiorentina')],
    };
  }
  if (europeanCup1956Stories.some((story) => story.id === currentId && story.theme === 'european-cup')) {
    return {
      theme: 'european-cup',
      kicker: 'EUROPEAN CUP 1956-57 READING ROUTE · 01—06',
      title: '두 번째 유러피언컵을<br />여섯 개의 기록으로 읽기',
      lead: '스물두 구단이 나선 예선부터 8강까지, 결승행 두 자리를 가른 4강 네 경기, 베르나베우의 결승 장면, 누가 가장 많은 골을 넣었는지, 그해 가장 잘한 열한 명과 가장 빛난 선수가 누구였는지에 따라 다음 기록을 고르면 된다.',
      stories: europeanCup1956Stories.filter((story) => story.id !== currentId),
    };
  }
  if (hungaryStories.some((story) => story.id === currentId)) {
    return {
      theme: 'hungary',
      kicker: 'HUNGARY READING ROUTE · 01—06',
      title: '헝가리 황금의 팀을<br />여섯 개의 시선으로 읽기',
      lead: '어떻게 이겼는지, 첫 상대 한국은 어땠는지, 1954년의 기록과 베른의 결승 장면, 1956년에 왜 흩어졌는지, 직접 부다페스트에 가고 싶은지에 따라 다음 글을 고르면 된다.',
      stories: hungaryStories.filter((story) => story.id !== currentId),
    };
  }
  return undefined;
}
