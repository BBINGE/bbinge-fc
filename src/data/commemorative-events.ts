export type CommemorativeScene =
  | 'celebrate'
  | 'football'
  | 'food'
  | 'love'
  | 'nature'
  | 'remember'
  | 'season';

export type CommemorativeStory = 'pass' | 'liberation';

export type CommemorativeEvent = {
  id: string;
  /** 해마다 반복되는 날짜. MM-DD */
  monthDay?: string;
  /** 특정 연도에만 쓰는 날짜. YYYY-MM-DD */
  date?: string;
  message: string;
  label: string;
  scene: CommemorativeScene;
  /** 반복 모션의 장면 구성. 새 전용 스토리를 만들 때 이 값을 확장한다. */
  story?: CommemorativeStory;
  prop: string;
  priority?: number;
};

/**
 * 헤더 기념일 편성표.
 * - 같은 날에는 priority가 높은 항목이 먼저 나온다.
 * - date(특정 연도)가 monthDay(매년 반복)보다 우선한다.
 * - 음력 명절·대회 일정처럼 매년 바뀌는 날은 date로 추가한다.
 */
export const commemorativeEvents: CommemorativeEvent[] = [
  { id: 'new-year', monthDay: '01-01', message: '새해 복 많이 받으세요 :)', label: '1.1 새해 첫날', scene: 'celebrate', prop: '✦', priority: 90 },
  { id: 'valentines-day', monthDay: '02-14', message: '사랑하는 사람에게!', label: '2.14 밸런타인데이', scene: 'love', prop: '♥' },
  { id: 'march-first', monthDay: '03-01', message: '그날의 함성을 기억합니다', label: '3.1 삼일절', scene: 'remember', prop: '🇰🇷', priority: 100 },
  { id: 'white-day', monthDay: '03-14', message: '오늘은 마음을 건네는 날!', label: '3.14 화이트데이', scene: 'love', prop: '♥' },
  { id: 'arbor-day', monthDay: '04-05', message: '오늘은 나무 심쟝~', label: '4.5 식목일', scene: 'nature', prop: '🌱' },
  { id: 'black-day', monthDay: '04-14', message: '오늘은 짜장면 먹는 날!', label: '4.14 블랙데이', scene: 'food', prop: '🍜' },
  { id: 'earth-day', monthDay: '04-22', message: '오늘은 지구를 한 번 더 생각해요', label: '4.22 지구의 날', scene: 'nature', prop: '●' },
  { id: 'childrens-day', monthDay: '05-05', message: '오늘만큼은 마음껏 뛰어놀아요!', label: '5.5 어린이날', scene: 'celebrate', prop: '★' },
  { id: 'parents-day', monthDay: '05-08', message: '오늘, 고맙다는 말을 꼭 전해요', label: '5.8 어버이날', scene: 'love', prop: '♥' },
  { id: 'teachers-day', monthDay: '05-15', message: '가르침의 마음을 기억합니다', label: '5.15 스승의 날', scene: 'love', prop: '✿' },
  { id: 'fifa-founded', monthDay: '05-21', message: '세계의 축구가 한자리에 모인 날!', label: '1904.5.21 FIFA 창립', scene: 'football', prop: '⚽' },
  { id: 'memorial-day', monthDay: '06-06', message: '당신의 이름을 기억하겠습니다', label: '6.6 현충일', scene: 'remember', prop: '🇰🇷', priority: 100 },
  { id: 'constitution-day', monthDay: '07-17', message: '헌법의 약속을 기억합니다', label: '7.17 제헌절', scene: 'remember', prop: '🇰🇷', priority: 100 },
  { id: 'first-world-cup-final', monthDay: '07-30', message: '첫 월드컵 우승자가 탄생한 날!', label: '1930.7.30 월드컵 첫 결승', scene: 'football', prop: '⚽' },
  { id: 'liberation-day', monthDay: '08-15', message: '그날을 잊지 않겠습니다', label: '8.15 광복절', scene: 'remember', story: 'liberation', prop: '🇰🇷', priority: 110 },
  { id: 'numbered-shirts', monthDay: '08-25', message: '오늘, 유니폼에 번호가 생겼어요!', label: '1928.8.25 등번호의 시작', scene: 'football', prop: '10·7', priority: 70 },
  { id: 'armed-forces-day', monthDay: '10-01', message: '오늘의 평화를 지켜줘서 고맙습니다', label: '10.1 국군의 날', scene: 'remember', prop: '🇰🇷', priority: 90 },
  { id: 'foundation-day', monthDay: '10-03', message: '오늘, 아주 오래된 이야기를 펼쳐요', label: '10.3 개천절', scene: 'remember', prop: '🇰🇷', priority: 100 },
  { id: 'hangul-day', monthDay: '10-09', message: '오늘은 한글로 더 잘 말해봐요!', label: '10.9 한글날', scene: 'celebrate', prop: '한' },
  { id: 'halloween', monthDay: '10-31', message: '오늘은 조금 유쾌하게 놀라볼까요?', label: '10.31 핼러윈', scene: 'season', prop: '●' },
  { id: 'pepero-day', monthDay: '11-11', message: '오늘은 가볍게 마음을 나눠요!', label: '11.11 빼빼로데이', scene: 'food', prop: 'Ⅱ' },
  { id: 'christmas-eve', monthDay: '12-24', message: '오늘은 산타 오는 날!', label: '12.24 크리스마스이브', scene: 'season', prop: '★' },
  { id: 'christmas', monthDay: '12-25', message: '메리 크리스마스!', label: '12.25 크리스마스', scene: 'season', prop: '★', priority: 80 },
  { id: 'year-end', monthDay: '12-31', message: '올해도 함께해줘서 고마워요 :)', label: '12.31 올해의 마지막 날', scene: 'celebrate', prop: '✦' },

  // 해마다 날짜가 달라지는 명절·축구 일정은 아래처럼 특정 날짜로 편성한다.
  { id: 'world-cup-2026-opening', date: '2026-06-11', message: '월드컵이 개막했어요!', label: '2026.6.11 FIFA 월드컵 개막', scene: 'football', prop: '⚽', priority: 150 },
  { id: 'ucl-playoff-2026', date: '2026-08-26', message: '오늘은 챔스 본선행이 걸린 날!', label: '2026.8.26 챔피언스리그 플레이오프', scene: 'football', prop: '⚽', priority: 120 },
  { id: 'ucl-draw-2026', date: '2026-08-27', message: '챔스 대진표가 열리는 날!', label: '2026.8.27 챔피언스리그 추첨', scene: 'football', prop: '✦', priority: 120 },
  { id: 'ucl-league-phase-2026', date: '2026-09-08', message: '오늘, 새 챔스가 시작돼요!', label: '2026.9.8 챔피언스리그 리그 페이즈', scene: 'football', prop: '⚽', priority: 120 },
  { id: 'chuseok-2026', date: '2026-09-25', message: '마음까지 둥근 한가위 보내세요 :)', label: '2026.9.25 추석', scene: 'celebrate', prop: '●', priority: 150 },
  { id: 'ucl-quarter-final-2027-1', date: '2027-04-06', message: '오늘은 챔스 8강의 날이에요!', label: '2027.4.6 챔피언스리그 8강', scene: 'football', prop: '⚽', priority: 120 },
  { id: 'ucl-quarter-final-2027-2', date: '2027-04-07', message: '오늘은 챔스 8강의 날이에요!', label: '2027.4.7 챔피언스리그 8강', scene: 'football', prop: '⚽', priority: 120 },
  { id: 'ucl-quarter-final-2027-3', date: '2027-04-13', message: '챔스 4강으로 가는 밤이에요!', label: '2027.4.13 챔피언스리그 8강 2차전', scene: 'football', prop: '⚽', priority: 120 },
  { id: 'ucl-quarter-final-2027-4', date: '2027-04-14', message: '챔스 4강으로 가는 밤이에요!', label: '2027.4.14 챔피언스리그 8강 2차전', scene: 'football', prop: '⚽', priority: 120 },
  { id: 'ucl-final-2027', date: '2027-06-05', message: '오늘, 유럽의 왕이 정해져요!', label: '2027.6.5 챔피언스리그 결승', scene: 'football', prop: '★', priority: 140 },
];
