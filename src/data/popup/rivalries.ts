// 팝업관 「유럽 해외축구 빅클럽간 맞대결 역대전적 모음(박빙인 것만, 2026년 버전)」 데이터 가공(운영자 확정, 2026-09-16).
// 원자료 scripts/fetch-rivalries-sources.mjs, 문장 scripts/build-rivalries-assets.mjs.
// 규칙: 유럽 대항전(유러피언컵·챔스, UEFA컵·유로파, 컵위너스컵) 전 시즌의 맞대결만 센다. 국내 경기는 UEFA 기록 밖이라 세지 않는다.
// 박빙: 맞대결 6경기 이상 + 승패 차 1 이내 + 득실 차가 맞대결 수보다 작음. 8경기 이상은 카드, 6~7경기는 표.
import sources from './rivalries-sources.json';
import crests from './rivalries-crests.json';

type Comp = 'ucl' | 'uel' | 'cwc';

interface SrcLeg {
  id: string; competition: Comp; seasonYear: number; date: string; round: string | null; leg: number | null;
  home: string; away: string; score: { home: number; away: number }; penalty: { home: number; away: number } | null;
  aggregateWinner: string | null; aggregateReason: string | null;
}
interface SrcRivalry {
  key: string; a: string; b: string; matches: number;
  record: { aWin: number; draw: number; bWin: number }; goals: { a: number; b: number };
  first: string; last: string; competitions: Partial<Record<Comp, number>>; legs: SrcLeg[];
}

export interface RivalryMeeting {
  date: string; dateLabel: string; season: string; competition: Comp; competitionLabel: string; round: string;
  score: [number, number]; penalty: [number, number] | null; result: 'a' | 'b' | 'draw'; position: number;
}
export interface RivalrySide { key: string; name: string; short: string; crest: string | null; country: string }
export interface Rivalry {
  key: string; slug: string; a: RivalrySide; b: RivalrySide; matches: number;
  record: { aWin: number; draw: number; bWin: number }; goals: [number, number];
  first: string; last: string; span: number; competitions: { key: Comp; label: string; count: number }[];
  meetings: RivalryMeeting[]; card: boolean; summary: string;
}

const clubs = sources.clubs as Record<string, string>;
const crestMap = crests as Record<string, string>;

const COUNTRY: Record<string, string> = {
  ENG: '잉글랜드', ESP: '스페인', ITA: '이탈리아', GER: '독일', FRA: '프랑스', POR: '포르투갈', NED: '네덜란드',
  SCO: '스코틀랜드', TUR: '튀르키예', BEL: '벨기에', GRE: '그리스', UKR: '우크라이나', RUS: '러시아', SRB: '세르비아', CZE: '체코',
};
const ROUND: Record<string, string> = {
  PRELIMINARY: '예비 라운드', QUALIFYING: '예선', FIRST_QUALIFYING: '1차 예선', SECOND_QUALIFYING: '2차 예선', THIRD_QUALIFYING: '3차 예선', PLAY_OFF: '플레이오프',
  FIRST: '1라운드', SECOND: '2라운드', THIRD: '3라운드', FOURTH: '4라운드', ROUND_OF_32: '32강', ROUND_OF_16: '16강', QUARTER_FINALS: '8강', SEMIFINAL: '4강', FINAL: '결승',
  GROUP_STANDINGS: '조별리그', SECOND_GROUP_MATCH_STAGE: '2차 조별리그', INTERMEDIATE: '중간 라운드', FINAL_TOURNAMENT_PLAY_OFF: '녹아웃 플레이오프',
};

// 득점자 줄과 같은 사전을 쓴다. 카드 폭이 좁아 긴 풀네임을 다 세우면 줄이 흐트러진다.
import nicknames from './club-nicknames.json';
const shortName = (name: string) => (nicknames as Record<string, string>)[name] ?? name;

const dateLabel = (iso: string) => `${iso.slice(0, 4)}.${Number(iso.slice(5, 7))}.${Number(iso.slice(8, 10))}`;
const seasonOf = (date: string) => { const y = Number(date.slice(0, 4)); const s = date.slice(5) >= '06-20' ? y : y - 1; return `${s}-${String((s + 1) % 100).padStart(2, '0')}`; };
const competitionLabel = (c: Comp, date: string) => (c === 'ucl' ? (date < '1992-07-01' ? '유러피언컵' : 'UEFA 챔피언스 리그') : c === 'uel' ? (date < '2009-07-01' ? 'UEFA컵' : 'UEFA 유로파 리그') : '유러피언 컵위너스컵');

const side = (key: string): RivalrySide => {
  const name = clubs[key];
  if (!name) throw new Error(`박빙 구단 한글명 없음: ${key}`);
  return { key, name, short: shortName(name), crest: crestMap[key] ?? null, country: COUNTRY[key.split('|')[1]] ?? key.split('|')[1] };
};
const slugOf = (a: string, b: string) => [a, b].map((k) => k.split('|')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).join('-vs-');

const YEAR_MIN = 1955;
const YEAR_MAX = 2026;

function build(src: SrcRivalry): Rivalry {
  const a = side(src.a);
  const b = side(src.b);
  const meetings: RivalryMeeting[] = src.legs.map((leg) => {
    const aHome = leg.home === src.a;
    const score: [number, number] = aHome ? [leg.score.home, leg.score.away] : [leg.score.away, leg.score.home];
    const year = Number(leg.date.slice(0, 4)) + Number(leg.date.slice(5, 7)) / 12;
    return {
      date: leg.date,
      dateLabel: dateLabel(leg.date),
      season: seasonOf(leg.date),
      competition: leg.competition,
      competitionLabel: competitionLabel(leg.competition, leg.date),
      round: ROUND[leg.round ?? ''] ?? leg.round ?? '',
      score,
      penalty: leg.penalty ? (aHome ? [leg.penalty.home, leg.penalty.away] : [leg.penalty.away, leg.penalty.home]) : null,
      result: score[0] > score[1] ? 'a' : score[1] > score[0] ? 'b' : 'draw',
      position: Math.min(100, Math.max(0, ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100)),
    };
  });
  const competitions = (['ucl', 'uel', 'cwc'] as Comp[])
    .filter((c) => src.competitions[c])
    .map((c) => ({ key: c, label: c === 'ucl' ? '유러피언컵·챔스' : c === 'uel' ? 'UEFA컵·유로파' : '컵위너스컵', count: src.competitions[c]! }));
  // 첫 맞대결에서 마지막 맞대결까지 지난 햇수. 1976년에 처음 만나 2026년에 마지막이면 50년이다.
  const span = Math.max(1, Number(src.last.slice(0, 4)) - Number(src.first.slice(0, 4)));
  const drawNote = src.record.draw === 0 ? '무승부 없이' : src.record.draw >= src.matches / 2 ? '절반 넘게 비기며' : '';
  const goalNote = src.goals.a === src.goals.b ? '골까지 같다' : `골은 ${Math.abs(src.goals.a - src.goals.b)}골 차다`;
  return {
    key: src.key,
    slug: slugOf(src.a, src.b),
    a, b,
    matches: src.matches,
    record: src.record,
    goals: [src.goals.a, src.goals.b],
    first: src.first,
    last: src.last,
    span,
    competitions,
    meetings,
    card: src.matches >= 8,
    summary: `${span}년 동안 ${src.matches}경기를 ${drawNote} 나눠 가졌고 ${goalNote}.`.replace('  ', ' '),
  };
}

const all = (sources.rivalries as unknown as SrcRivalry[]).map(build);

export const featured = all.find((r) => r.matches === 30) ?? all[0];
export const cards = all.filter((r) => r.card && r !== featured);
export const tableRows = all.filter((r) => !r.card);
export const rule = sources.rule;
export const counts = {
  total: all.length,
  cards: all.filter((r) => r.card).length,
  table: tableRows.length,
  meetings: all.reduce((sum, r) => sum + r.matches, 0),
  clubs: new Set(all.flatMap((r) => [r.a.key, r.b.key])).size,
  ucl: all.reduce((sum, r) => sum + (r.competitions.find((c) => c.key === 'ucl')?.count ?? 0), 0),
  uel: all.reduce((sum, r) => sum + (r.competitions.find((c) => c.key === 'uel')?.count ?? 0), 0),
  cwc: all.reduce((sum, r) => sum + (r.competitions.find((c) => c.key === 'cwc')?.count ?? 0), 0),
};
export const yearRange = { min: YEAR_MIN, max: YEAR_MAX };
export default all;
