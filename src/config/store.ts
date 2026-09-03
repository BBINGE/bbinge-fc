export type StoreFloorIconName = 'rooftop' | 'cinema' | 'honor' | 'tactics' | 'library' | 'arcade' | 'travel' | 'fashion' | 'luxury' | 'lobby';

export interface StoreZone {
  label: string;
  href?: string;
}

export interface StoreFloor {
  floor: string;
  name: string;
  en: string;
  copy: string;
  icon: StoreFloorIconName;
  zones: readonly StoreZone[];
  href?: string;
  split?: boolean;
}

export const storeFloors = [
  { floor: '10', name: '옥상', en: 'ROOFTOP · NEXT OPENING', copy: '다음 공간을 상상하며 잠시 숨을 고르는 옥상', icon: 'rooftop', zones: [{ label: '입점 대기중' }] },
  { floor: '09', name: '영화관', en: 'MATCH HIGHLIGHTS CINEMA', copy: '한 경기를 다시 살리는 장면과 시간의 상영관', icon: 'cinema', zones: [{ label: '하이라이트', href: '/highlights/' }], href: '/highlights/' },
  { floor: '08', name: '명예의 전당', en: 'HALL OF FAME', copy: '시대와 구단을 대표하는 열한 명의 전시실', icon: 'honor', zones: [{ label: '베스트 11', href: '/squads/' }], href: '/squads/' },
  { floor: '07', name: '전술 · 축떡관', en: 'TACTICS · FOOTBALL MADE EASY', copy: '경기의 구조와 규칙, 판정의 쟁점을 읽는 층', icon: 'tactics', zones: [{ label: '전술관', href: '/tactics/' }, { label: '축떡관', href: '/football-made-easy/' }], href: '/tactics/', split: true },
  { floor: '06', name: '도서실 · 세계사관', en: 'LIBRARY · WORLD HISTORY', copy: '기록을 꺼내 읽고 축구와 세계사의 관계를 잇는 층', icon: 'library', zones: [{ label: '아카이브', href: '/archive/' }, { label: '세계사관', href: '/history/' }], href: '/archive/', split: true },
  { floor: '05', name: '오락실', en: 'PB FOOTBALL ARCADE', copy: '축겜과 나만의 GOAT 뽑기가 시작되는 플레이 층', icon: 'arcade', zones: [{ label: '축겜', href: '/play/' }, { label: '나만의 GOAT', href: '/play/' }], href: '/play/' },
  { floor: '04', name: '축행', en: 'FOOTBALL TRAVEL DESK', copy: '경기장과 도시를 잇는 여행 동선과 출발 전 준비', icon: 'travel', zones: [{ label: '여행사', href: '/pilgrimage/' }, { label: '보험사' }], href: '/pilgrimage/' },
  { floor: '03', name: '오뭐입? · 유니폼관', en: 'OOTD · FOOTBALL KIT HALL', copy: '따라 입고 싶은 축구 패션과 시즌 유니폼이 나란히 놓인 두 개의 관', icon: 'fashion', zones: [{ label: '오뭐입?', href: '/culture/outfits/' }, { label: '유니폼관', href: '/culture/kits/' }], href: '/culture/outfits/', split: true },
  { floor: '02', name: '명품관', en: 'LUXURY BOUTIQUE HALL', copy: '인물과 희소한 착장이 축구를 오브제로 바꾸는 부티크', icon: 'luxury', zones: [{ label: '명품관 입장', href: '/culture/boutique/' }], href: '/culture/boutique/' },
  { floor: '01', name: '메인', en: 'GRAND MAIN LOBBY', copy: '오늘의 삥이FC와 모든 층이 시작되는 로비', icon: 'lobby', zones: [{ label: '안내 데스크', href: '/' }], href: '/' },
] as const satisfies readonly StoreFloor[];

export interface StoreLocation {
  floor: string;
  name: string;
  en: string;
  href: string;
  nearby: readonly { floor: string; label: string; href: string }[];
}

const locations: readonly (StoreLocation & { matches: readonly string[] })[] = [
  { floor: '02', name: '명품관', en: 'LUXURY BOUTIQUE HALL', href: '/culture/boutique/', matches: ['/culture/boutique/'], nearby: [{ floor: '03', label: '오뭐입?', href: '/culture/outfits/' }, { floor: '03', label: '유니폼관', href: '/culture/kits/' }] },
  { floor: '03', name: '오뭐입?', en: 'OOTD · BLOCKCORE', href: '/culture/outfits/', matches: ['/culture/outfits/'], nearby: [{ floor: '02', label: '명품관', href: '/culture/boutique/' }, { floor: '03', label: '유니폼관', href: '/culture/kits/' }] },
  { floor: '03', name: '유니폼관', en: 'FOOTBALL KIT GALLERY', href: '/culture/kits/', matches: ['/culture/kits/'], nearby: [{ floor: '03', label: '오뭐입?', href: '/culture/outfits/' }, { floor: '04', label: '축행', href: '/pilgrimage/' }] },
  { floor: '02·03', name: '축디 편집관', en: 'FOOTBALL & STYLE', href: '/culture/', matches: ['/culture/'], nearby: [{ floor: '02', label: '명품관', href: '/culture/boutique/' }, { floor: '03', label: '유니폼관', href: '/culture/kits/' }] },
  { floor: '04', name: '축행', en: 'FOOTBALL TRAVEL DESK', href: '/pilgrimage/', matches: ['/pilgrimage/'], nearby: [{ floor: '03', label: '유니폼관', href: '/culture/kits/' }, { floor: '05', label: '오락실', href: '/play/' }] },
  { floor: '05', name: '오락실', en: 'PB FOOTBALL ARCADE', href: '/play/', matches: ['/play/'], nearby: [{ floor: '04', label: '축행', href: '/pilgrimage/' }, { floor: '06', label: '도서실', href: '/archive/' }] },
  { floor: '06', name: '도서실', en: 'LIBRARY · ARCHIVE', href: '/archive/', matches: ['/archive/'], nearby: [{ floor: '06', label: '세계사관', href: '/history/' }, { floor: '07', label: '전술관', href: '/tactics/' }] },
  { floor: '06', name: '세계사관', en: 'FOOTBALL WORLD HISTORY', href: '/history/', matches: ['/history/'], nearby: [{ floor: '06', label: '도서실', href: '/archive/' }, { floor: '07', label: '전술관', href: '/tactics/' }] },
  { floor: '07', name: '전술관', en: 'TACTICS ROOM', href: '/tactics/', matches: ['/tactics/'], nearby: [{ floor: '07', label: '축떡관', href: '/football-made-easy/' }, { floor: '08', label: '명예의 전당', href: '/squads/' }] },
  { floor: '07', name: '축떡관', en: 'FOOTBALL MADE EASY', href: '/football-made-easy/', matches: ['/football-made-easy/'], nearby: [{ floor: '07', label: '전술관', href: '/tactics/' }, { floor: '08', label: '명예의 전당', href: '/squads/' }] },
  { floor: '08', name: '명예의 전당', en: 'HALL OF FAME', href: '/squads/', matches: ['/squads/'], nearby: [{ floor: '07', label: '전술관', href: '/tactics/' }, { floor: '09', label: '영화관', href: '/highlights/' }] },
  { floor: '09', name: '영화관', en: 'MATCH HIGHLIGHTS CINEMA', href: '/highlights/', matches: ['/highlights/'], nearby: [{ floor: '08', label: '명예의 전당', href: '/squads/' }, { floor: '07', label: '축떡관', href: '/football-made-easy/' }] },
];

export function getStoreLocation(pathname: string, breadcrumbHrefs: readonly string[] = []): StoreLocation | null {
  const hallFromBreadcrumb = locations.find((location) =>
    location.matches.some((match) => breadcrumbHrefs.includes(match))
  );
  if (hallFromBreadcrumb) return hallFromBreadcrumb;

  return locations.find((location) =>
    location.matches.some((match) => pathname === match || pathname.startsWith(match))
  ) ?? null;
}
