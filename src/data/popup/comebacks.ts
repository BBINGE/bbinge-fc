// 팝업관 「유럽 대항전 역전극 모음.Zip」 데이터 가공(운영자 확정, 2026-09-16: 전체 시즌 · 유로파·컵위너스컵 포함 · 단판은 3골 차).
// 원자료 scripts/fetch-comebacks-sources.mjs, 문장 scripts/build-comebacks-assets.mjs.
// 제외: 몰수 판정으로 1차전 열세나 역전이 만들어진 대결(경기장 점수와 기록 점수가 다르고 득점 기록이 맞지 않음),
// 재경기로 갈렸지만 UEFA 기록에 재경기가 없는 원정골 규정 이전 대결(1958-59 KB-샬케, 1964-65 구르니크-두클라).
import sources from './comebacks-sources.json';
import names from './comebacks-names.json';
import crests from './comebacks-crests.json';

type Comp = 'ucl' | 'uel' | 'cwc';
interface SrcTeam { id: string; name: string; country: string }
interface SrcGoal { minute: number | null; injury: number; phase: string | null; type: string; teamId: string; player: string | null }
interface SrcMatch { id: string; competition: Comp; date: string; round: string | null; leg: number | null; home: SrcTeam; away: SrcTeam; score: { home: number; away: number }; regular: { home: number; away: number } | null; penalty: { home: number; away: number } | null; goals: SrcGoal[]; stadium: string | null; city: string | null }

export interface ComebackGoal { clock: string; minute: number; injury: number; phase: string | null; comeback: boolean; penalty: boolean; ownGoal: boolean; player: string }
export interface ComebackLeg { name: string; date: string; dateLabel: string; score: [number, number]; penalty: [number, number] | null; carry: number; goals: ComebackGoal[] }
export interface ComebackEntry {
  key: string; kind: 'aggregate' | 'single'; competition: Comp; competitionLabel: string; round: string; season: string; stage: string; date: string; dateLabel: string;
  comeback: { name: string; crest: string | null }; opponent: { name: string; crest: string | null };
  score: [number, number]; note: string; worstLabel: string; deficit: number; legs: ComebackLeg[]; card: boolean; summary: string;
}

const matches = sources.matches as unknown as Record<string, SrcMatch>;
const teamNames = names.teams as Record<string, string>;
const playerNames = names.players as Record<string, string>;
const crestMap = crests as Record<string, string>;

const EXCLUDED_REPLAY_ERA = new Set(['1958-09-18', '1964-09-06']);
const ROUND: Record<string, string> = {
  PRELIMINARY: '예비 라운드', QUALIFYING: '예선', FIRST_QUALIFYING: '1차 예선', SECOND_QUALIFYING: '2차 예선', THIRD_QUALIFYING: '3차 예선', PLAY_OFF: '플레이오프',
  FIRST: '1라운드', SECOND: '2라운드', THIRD: '3라운드', FOURTH: '4라운드', ROUND_OF_32: '32강', ROUND_OF_16: '16강', QUARTER_FINALS: '8강', SEMIFINAL: '4강', FINAL: '결승',
  GROUP_STANDINGS: '조별리그', SECOND_GROUP_MATCH_STAGE: '2차 조별리그', INTERMEDIATE: '중간 라운드', FINAL_TOURNAMENT_PLAY_OFF: '녹아웃 플레이오프',
};

const seasonOf = (date: string) => { const y = Number(date.slice(0, 4)); const s = date.slice(5) >= '06-20' ? y : y - 1; return `${s}-${String((s + 1) % 100).padStart(2, '0')}`; };
const dateLabel = (iso: string) => `${iso.slice(0, 4)}.${Number(iso.slice(5, 7))}.${Number(iso.slice(8, 10))}`;
const competitionLabel = (c: Comp, date: string) => (c === 'ucl' ? (date < '1992-07-01' ? '유러피언컵' : 'UEFA 챔피언스 리그') : c === 'uel' ? (date < '2009-07-01' ? 'UEFA컵' : 'UEFA 유로파 리그') : '유러피언 컵위너스컵');
const teamName = (t: SrcTeam) => { const ko = teamNames[t.name]; if (!ko) throw new Error(`역전극 구단 한글명 없음: ${t.name}`); return ko; };
const side = (t: SrcTeam) => ({ name: teamName(t), crest: crestMap[t.id] ?? null });
const scorer = (id: string, m: SrcMatch, g: SrcGoal) => (g.type === 'OWN' ? (g.teamId === m.home.id ? m.away.id : m.home.id) : g.teamId) === id;
const forfeit = (legs: SrcMatch[]) => legs.some((m) => m.regular && (m.regular.home !== m.score.home || m.regular.away !== m.score.away) && !m.penalty && m.goals.length !== m.score.home + m.score.away);

function legOf(m: SrcMatch, cbId: string, name: string, carry: number, withPlayers: boolean): ComebackLeg {
  const home = m.home.id === cbId;
  const goals = [...m.goals]
    .filter((g) => g.minute != null)
    .sort((a, b) => a.minute! + a.injury / 100 - (b.minute! + b.injury / 100))
    .map((g) => {
      const player = g.player ? (withPlayers ? (playerNames[g.player] ?? (() => { throw new Error(`역전극 선수 한글명 없음: ${g.player}`); })()) : '') : '득점자 미상';
      return { clock: `${g.minute}${g.injury ? `+${g.injury}` : ''}'`, minute: g.minute!, injury: g.injury ?? 0, phase: g.phase, comeback: scorer(cbId, m, g), penalty: g.type === 'PENALTY', ownGoal: g.type === 'OWN', player };
    });
  return {
    name, date: m.date, dateLabel: dateLabel(m.date),
    score: home ? [m.score.home, m.score.away] : [m.score.away, m.score.home],
    penalty: m.penalty ? (home ? [m.penalty.home, m.penalty.away] : [m.penalty.away, m.penalty.home]) : null,
    carry, goals,
  };
}

const venueOf = (m: SrcMatch, cbId: string) => (m.round === 'FINAL' && m.leg == null ? '중립' : m.home.id === cbId ? '홈' : '원정');
const isCardAggregate = (m: SrcMatch, deficit: number) => (m.competition === 'ucl' && !/QUAL|PRELIM|PLAY_OFF/.test(m.round ?? '')) || (m.competition !== 'ucl' && /QUARTER|SEMI|FINAL/.test(m.round ?? '')) || deficit <= -4;

const aggregate: ComebackEntry[] = [];
for (const a of sources.aggregate) {
  const legs = a.legs.map((id) => matches[id]).sort((x, y) => x.date.localeCompare(y.date));
  if (forfeit(legs) || EXCLUDED_REPLAY_ERA.has(legs[0].date)) continue;
  const first = legs[0];
  // UEFA 기록의 차전 번호가 날짜와 뒤바뀐 대결이 있어(1958-59 KB-샬케), 1차전 열세는 날짜순 첫 경기로 다시 계산한다.
  const firstDeficit = first.home.id === a.winnerId ? first.score.home - first.score.away : first.score.away - first.score.home;
  if (firstDeficit > -3) continue;
  const cbTeam = first.home.id === a.winnerId ? first.home : first.away;
  const oppTeam = first.home.id === a.winnerId ? first.away : first.home;
  const card = isCardAggregate(first, firstDeficit);
  const built = legs.map((m, i) => legOf(m, a.winnerId, `${i === 0 ? '1차전' : i === 1 ? '2차전' : '재경기'} · ${venueOf(m, a.winnerId)}`, 0, card));
  if (built[1]) built[1].carry = built[0].score[0] - built[0].score[1];
  const score: [number, number] = [built.reduce((s, l) => s + l.score[0], 0), built.reduce((s, l) => s + l.score[1], 0)];
  const last = legs.at(-1)!;
  const decider = last.penalty ? '승부차기' : score[0] === score[1] ? '원정 다득점' : '두 경기 합산';
  const round = ROUND[first.round ?? ''] ?? first.round ?? '';
  const label = competitionLabel(first.competition, first.date);
  aggregate.push({
    key: `agg-${first.id}`, kind: 'aggregate', competition: first.competition, competitionLabel: label, round, season: seasonOf(first.date), stage: `${seasonOf(first.date)} ${label} · ${round}`,
    date: last.date, dateLabel: dateLabel(last.date), comeback: side(cbTeam), opponent: side(oppTeam), score,
    note: last.penalty ? `승부차기 ${built.at(-1)!.penalty!.join('-')}` : decider,
    worstLabel: `1차전 ${built[0].score[0]}-${built[0].score[1]}, ${-firstDeficit}골 차에서 뒤집음`, deficit: -firstDeficit, legs: built, card,
    summary: `1차전 ${built[0].score.join('-')} · 2차전 ${built[1].score.join('-')}${last.penalty ? ` · 승부차기 ${built.at(-1)!.penalty!.join('-')}` : ''}`,
  });
}

const single: ComebackEntry[] = sources.single.map((s) => {
  const m = matches[s.matchId];
  const cbTeam = m.home.id === s.winnerId ? m.home : m.away;
  const oppTeam = m.home.id === s.winnerId ? m.away : m.home;
  const leg = legOf(m, s.winnerId, venueOf(m, s.winnerId), 0, true);
  let worst = [0, 0]; let cb = 0; let op = 0;
  for (const g of leg.goals) { if (g.comeback) cb += 1; else op += 1; if (cb - op < worst[0] - worst[1]) worst = [cb, op]; }
  const round = ROUND[m.round ?? ''] ?? m.round ?? '';
  const label = competitionLabel(m.competition, m.date);
  return {
    key: `single-${m.id}`, kind: 'single', competition: m.competition, competitionLabel: label, round, season: seasonOf(m.date), stage: `${seasonOf(m.date)} ${label} · ${round}`,
    date: m.date, dateLabel: dateLabel(m.date), comeback: side(cbTeam), opponent: side(oppTeam), score: leg.score,
    note: leg.penalty ? `승부차기 ${leg.penalty.join('-')}` : `${dateLabel(m.date)} · ${leg.name}`,
    worstLabel: `${worst[0]}-${worst[1]}까지 뒤지다 뒤집음`, deficit: -s.worst, legs: [leg], card: true, summary: `${leg.score.join('-')}`,
  };
});

const byDate = (x: ComebackEntry, y: ComebackEntry) => x.date.localeCompare(y.date);
// 대표 카드(운영자 제목): 2004-05 결승 이스탄불(단판), 2018-19 4강 안필드(합계).
export const featuredIstanbul = single.find((e) => e.date === '2005-05-25')!;
export const featuredAnfield = aggregate.find((e) => e.date === '2019-05-07')!;
if (!featuredIstanbul || !featuredAnfield) throw new Error('역전극 대표 카드(이스탄불·안필드)를 찾지 못했습니다.');
export const aggregateCards = aggregate.filter((e) => e.card && e !== featuredAnfield).sort(byDate);
export const aggregateTable = aggregate.filter((e) => !e.card).sort(byDate);
export const singleCards = single.filter((e) => e !== featuredIstanbul).sort(byDate);
export const counts = {
  aggregate: aggregate.length,
  single: single.length,
  ucl: [...aggregate, ...single].filter((e) => e.competition === 'ucl').length,
  uel: [...aggregate, ...single].filter((e) => e.competition === 'uel').length,
  cwc: [...aggregate, ...single].filter((e) => e.competition === 'cwc').length,
};
export const total = counts.aggregate + counts.single;
