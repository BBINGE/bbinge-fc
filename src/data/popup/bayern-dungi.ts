// 팝업관 「바이언 둔기론」 데이터 가공. 원자료는 scripts/fetch-bayern-dungi-sources.mjs, 문장은 scripts/build-bayern-dungi-assets.mjs가 만든다.
// 카드 편성(운영자 확정, 2026-09-16): 강팀 상대는 카드, 나머지는 「그 외 더보기」 표. 대표 카드는 2012-13 UEFA 챔피언스 리그 4강 FC 바르셀로나 합계 7-0.
import sources from './bayern-dungi-sources.json';
import names from './bayern-dungi-names.json';
import crests from './bayern-dungi-crests.json';

export type Competition = 'bundesliga' | 'ucl' | 'dfb-pokal' | 'club-world-cup' | 'supercup';

interface SourceGoal { clock: string; minute: number; injury: number; player: string | null; bayern: boolean; penalty: boolean; ownGoal: boolean }
interface SourceMatch {
  competition: Competition; season: number; date: string; round: string; leg?: number | null; tie?: string; big?: boolean;
  bayernHome: boolean | null; opponentSource: string; opponentCountry?: string; score: [number, number]; venue?: string | null; goals: SourceGoal[];
}

export interface Goal { clock: string; minute: number; injury: number; bayern: boolean; penalty: boolean; ownGoal: boolean; player: string }
export interface Match {
  competition: Competition; competitionLabel: string; season: string; date: string; dateLabel: string; round: string;
  venue: '홈' | '원정' | '중립'; opponent: string; opponentCrest: string | null; score: [number, number]; margin: number; goals: Goal[]; big: boolean;
}
export interface Tie { key: string; competition: Competition; title: string; season: string; round: string; opponent: string; opponentCrest: string | null; legs: Match[]; aggregate: [number, number] }

const teamNames = names.teams as Record<string, string>;
const playerNames = names.players as Record<string, string>;
const playerShort = names.playerShort as Record<string, string>;
const crestMap = crests as Record<string, string>;
const removals = names.overrides.goalRemovals;

export const BAYERN = { name: 'FC 바이에른 뮌헨', crest: crestMap['FC Bayern München'] };
export const COMPETITION_LABEL: Record<Competition, string> = { bundesliga: '분데스리가', ucl: 'UEFA 챔피언스 리그', 'dfb-pokal': 'DFB-포칼', 'club-world-cup': 'FIFA 클럽 월드컵', supercup: 'DFL-슈퍼컵' };
const UCL_ROUND: Record<string, string> = { GROUP_STANDINGS: '조별리그', ROUND_OF_16: '16강', QUARTER_FINALS: '8강', SEMIFINAL: '4강', FINAL: '결승', PLAY_OFF: '플레이오프' };
// 5대 리그(독일 제외) 구단과 유러피언컵·UEFA 챔피언스 리그 우승 경험 구단은 카드로 보여 준다.
const UCL_CARD_COUNTRIES = new Set(['ENG', 'ESP', 'ITA', 'FRA']);
const UCL_CARD_CLUBS = new Set(['Benfica', 'Porto', 'PSV', 'Celtic', 'Crvena Zvezda']);
const BUNDESLIGA_CARD = /Wolfsburg|Leverkusen|Dortmund|Leipzig/;
const CUP_CARD = new Set(['Bremer SV', 'Auckland City', 'Guangzhou Evergrande', 'Eintracht Frankfurt', 'VfL Wolfsburg', 'Bayer 04 Leverkusen']);

const seasonLabel = (s: number) => `${s}-${String((s + 1) % 100).padStart(2, '0')}`;
const dateLabel = (iso: string) => `${iso.slice(0, 4)}.${Number(iso.slice(5, 7))}.${Number(iso.slice(8, 10))}`;
const team = (source: string) => { const ko = teamNames[source]; if (!ko) throw new Error(`둔기론 구단 한글명 없음: ${source}`); return ko; };
const shortPlayer = (source: string | null) => {
  if (!source) return '';
  const ko = playerNames[source];
  if (!ko) throw new Error(`둔기론 선수 한글명 없음: ${source}`);
  return playerShort[ko] ?? ko.split(' ').at(-1)!;
};

function roundLabel(m: SourceMatch) {
  const matchday = m.round.match(/^(\d+)\. Spieltag$/);
  if (matchday) return `${matchday[1]}라운드`;
  if (m.competition === 'ucl') return m.round === 'GROUP_STANDINGS' && m.season >= 2024 ? '리그 페이즈' : (UCL_ROUND[m.round] ?? m.round);
  return m.round;
}

function build(m: SourceMatch, withPlayers: boolean): Match {
  const goals = m.goals
    .filter((g) => !removals.some((r) => r.date === m.date && r.clock === g.clock && r.player === g.player))
    .map((g) => ({ clock: g.clock, minute: g.minute, injury: g.injury, bayern: g.bayern, penalty: g.penalty, ownGoal: g.ownGoal, player: withPlayers ? shortPlayer(g.player) : '' }));
  const bayernGoals = goals.filter((g) => g.bayern).length;
  if (bayernGoals !== m.score[0] || goals.length - bayernGoals !== m.score[1]) throw new Error(`둔기론 득점 수 불일치: ${m.date} ${m.opponentSource}`);
  return {
    competition: m.competition, competitionLabel: COMPETITION_LABEL[m.competition], season: seasonLabel(m.season), date: m.date, dateLabel: dateLabel(m.date), round: roundLabel(m),
    venue: m.bayernHome === null ? '중립' : m.bayernHome ? '홈' : '원정', opponent: team(m.opponentSource), opponentCrest: crestMap[m.opponentSource] ?? null,
    score: m.score, margin: m.score[0] - m.score[1], goals, big: m.competition !== 'ucl' || Boolean(m.big),
  };
}

const all = sources.matches as SourceMatch[];
const isCard = (m: SourceMatch) =>
  (m.competition === 'bundesliga' && BUNDESLIGA_CARD.test(m.opponentSource))
  || (m.competition === 'ucl' && (UCL_CARD_COUNTRIES.has(m.opponentCountry ?? '') || UCL_CARD_CLUBS.has(m.opponentSource)))
  || (m.competition !== 'bundesliga' && m.competition !== 'ucl' && CUP_CARD.has(m.opponentSource));

// UEFA 챔피언스 리그: 같은 대진(조별리그 두 경기, 토너먼트 1·2차전)을 한 카드로 묶는다.
const uclTies = new Map<string, SourceMatch[]>();
for (const m of all.filter((x) => x.competition === 'ucl')) uclTies.set(m.tie!, [...(uclTies.get(m.tie!) ?? []), m]);
const tieOf = (key: string, list: SourceMatch[]): Tie => {
  const legs = list.sort((a, b) => a.date.localeCompare(b.date)).map((m) => build(m, true));
  const first = list[0];
  const aggregate: [number, number] = [legs.reduce((s, l) => s + l.score[0], 0), legs.reduce((s, l) => s + l.score[1], 0)];
  const round = roundLabel(first);
  return { key, competition: 'ucl', season: seasonLabel(first.season), round, title: `${seasonLabel(first.season)} UEFA 챔피언스 리그 · ${round}`, opponent: team(first.opponentSource), opponentCrest: crestMap[first.opponentSource] ?? null, legs, aggregate };
};

const FEATURED_KEY = '50080|SEMIFINAL|2012';
export const featured = tieOf(FEATURED_KEY, uclTies.get(FEATURED_KEY)!);
// 조별리그 두 경기는 둘 다 이겼을 때만 합산하고, 한 경기라도 이기지 못했으면 대승 경기만 따로 카드로 둔다(이번 편은 승리만). 토너먼트 1·2차전은 늘 합산한다.
export const uclCardTies = [...uclTies.entries()]
  .filter(([key, list]) => key !== FEATURED_KEY && isCard(list[0]))
  .flatMap(([key, list]) => {
    const group = key.split('|')[1] === 'G';
    if (!group || list.every((m) => m.score[0] > m.score[1])) return [tieOf(key, list)];
    return list.filter((m) => m.big).map((m) => tieOf(`${key}|${m.date}`, [m]));
  })
  .sort((a, b) => a.legs[0].date.localeCompare(b.legs[0].date));
export const uclTable = all.filter((m) => m.competition === 'ucl' && m.big && !isCard(m)).map((m) => build(m, false));

const byDate = (a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date);
export const bundesligaCards = all.filter((m) => m.competition === 'bundesliga' && isCard(m)).map((m) => build(m, true)).sort(byDate);
export const bundesligaTable = all.filter((m) => m.competition === 'bundesliga' && !isCard(m)).map((m) => build(m, false)).sort(byDate);
const cups = all.filter((m) => ['dfb-pokal', 'club-world-cup', 'supercup'].includes(m.competition));
export const cupCards = cups.filter(isCard).map((m) => build(m, true)).sort(byDate);
export const cupTable = cups.filter((m) => !isCard(m)).map((m) => build(m, false)).sort(byDate);

export const counts = {
  bundesliga: all.filter((m) => m.competition === 'bundesliga').length,
  ucl: all.filter((m) => m.competition === 'ucl' && m.big).length,
  pokal: all.filter((m) => m.competition === 'dfb-pokal').length,
  clubWorldCup: all.filter((m) => m.competition === 'club-world-cup').length,
  supercup: all.filter((m) => m.competition === 'supercup').length,
};
export const total = Object.values(counts).reduce((s, n) => s + n, 0);
