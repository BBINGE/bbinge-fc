import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// 팝업관 「유럽 대항전 역전극 모음.Zip」 원자료 수집(운영자 확정, 2026-09-16).
// 범위: UEFA 공식 기록 전체 시즌의 유러피언컵·UEFA 챔피언스 리그(1), 유러피언 컵위너스컵(2), UEFA컵·UEFA 유로파 리그(14). 인터시티스 페어스컵은 UEFA 기록 밖이라 없다.
// 합계 대역전: 1차전을 3골 차 이상으로 지고도 대결을 통과한 팀.
// 단판 대역전: 한 경기 안에서 3골 차 이상 뒤지다 그 경기를 이긴 팀(연장전 포함, 단판 결승은 승부차기 승리 포함).
// 득점 분·득점자·문장은 UEFA.com 경기 기록을 쓴다.
const outDir = path.resolve('src/data/popup');
await mkdir(outDir, { recursive: true });
const UA = { 'User-Agent': 'BBingeFC/1.0 (sho36036@gmail.com)' };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getJson = async (url) => {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const res = await fetch(url, { headers: UA });
      const text = await res.text();
      return JSON.parse(text);
    } catch (error) {
      if (attempt === 5) throw new Error(`수집 실패: ${url} ${error.message}`);
      await sleep(1500 * attempt);
    }
  }
};

const COMPETITIONS = { 1: 'ucl', 2: 'cwc', 14: 'uel' };
const all = new Map();
for (const comp of Object.keys(COMPETITIONS)) {
  for (let year = 1955; year <= 2026; year += 1) {
    for (let offset = 0; ; offset += 500) {
      const page = await getJson(`https://match.uefa.com/v5/matches?competitionId=${comp}&seasonYear=${year}&limit=500&offset=${offset}&order=ASC`);
      if (!Array.isArray(page) || !page.length) break;
      for (const m of page) if (m.status === 'FINISHED' && m.score?.total) all.set(m.id, { ...m, compKey: COMPETITIONS[comp] });
      if (page.length < 500) break;
    }
  }
  console.log(`${COMPETITIONS[comp]} 누적 ${all.size}`);
}

const team = (t) => ({ id: t.id, name: t.internationalName, country: t.countryCode, logo: t.bigLogoUrl ?? t.mediumLogoUrl ?? null });
const summary = (m) => ({
  id: m.id, competition: m.compKey, seasonYear: Number(m.seasonYear ?? m.matchday?.seasonYear ?? 0), date: m.kickOffTime.date, round: m.round?.metaData?.type ?? null, leg: m.leg?.number ?? null,
  home: team(m.homeTeam), away: team(m.awayTeam), score: m.score.total, regular: m.score.regular ?? null, penalty: m.score.penalty ?? null,
  matchWinner: m.winner?.match?.team?.id ?? null, aggregateWinner: m.winner?.aggregate?.team?.id ?? null, aggregateReason: m.winner?.aggregate?.reason ?? null,
});

// 합계 대역전: 2차전 기록에서 대결 승자와 1차전을 찾는다.
const matches = [...all.values()];
const byId = new Map(matches.map((m) => [m.id, m]));
const aggregate = [];
for (const m2 of matches.filter((m) => m.leg?.number === 2)) {
  const m1Ref = (m2.relatedMatches ?? []).find((r) => r.type === 'FIRST_LEG');
  const m1 = m1Ref && byId.get(m1Ref.id);
  if (!m1) continue;
  const replays = (m2.relatedMatches ?? []).filter((r) => !['FIRST_LEG', 'SECOND_LEG'].includes(r.type)).map((r) => byId.get(r.id)).filter(Boolean);
  const winnerId = m2.winner?.aggregate?.team?.id;
  if (!winnerId) continue;
  const winnerHomeFirst = m1.homeTeam.id === winnerId;
  if (!winnerHomeFirst && m1.awayTeam.id !== winnerId) continue;
  const firstLegDeficit = winnerHomeFirst ? m1.score.total.home - m1.score.total.away : m1.score.total.away - m1.score.total.home;
  if (firstLegDeficit > -3) continue;
  aggregate.push({ winnerId, firstLegDeficit, legs: [m1, m2, ...replays].map((x) => x.id) });
}

// 단판 대역전 후보: 두 팀 모두 3골 이상 넣은 경기만 득점 순서를 확인한다.
const singleCandidates = matches.filter((m) => Math.min(m.score.total.home, m.score.total.away) >= 3 || (m.score.penalty && Math.min(m.score.total.home, m.score.total.away) >= 3));
const detailIds = new Set([...aggregate.flatMap((a) => a.legs), ...singleCandidates.map((m) => m.id)]);
console.log(`합계 대역전 ${aggregate.length}건 · 단판 후보 ${singleCandidates.length}경기 · 상세 수집 ${detailIds.size}경기`);

const details = {};
let n = 0;
for (const id of detailIds) {
  const raw = await getJson(`https://match.uefa.com/v5/matches/${id}`);
  const d = Array.isArray(raw) ? raw[0] : raw;
  details[id] = {
    stadium: d.stadium?.translations?.name?.EN ?? null, city: d.stadium?.city?.translations?.name?.EN ?? null, attendance: d.matchAttendance ?? null,
    goals: (d.playerEvents?.scorers ?? []).map((g) => ({ minute: g.time?.minute ?? null, injury: g.time?.injuryMinute ?? 0, phase: g.phase ?? null, type: g.goalType, teamId: g.teamId, player: g.player?.internationalName ?? null, playerCountry: g.player?.countryCode ?? null })),
  };
  n += 1;
  if (n % 50 === 0) console.log(`상세 ${n}/${detailIds.size}`);
  await sleep(120);
}

// 단판: 득점 순서로 최대 열세를 계산한다. 자책골(OWN)은 기록된 팀의 상대 득점이다.
const scoringTeam = (g, m) => (g.type === 'OWN' ? (g.teamId === m.homeTeam.id ? m.awayTeam.id : m.homeTeam.id) : g.teamId);
const order = (g) => (g.minute ?? 0) + (g.injury ?? 0) / 100;
const single = [];
const incomplete = [];
for (const m of singleCandidates) {
  const goals = [...details[m.id].goals].sort((a, b) => order(a) - order(b));
  if (goals.length !== m.score.total.home + m.score.total.away || goals.some((g) => g.minute == null)) { incomplete.push(m.id); continue; }
  let h = 0; let a = 0; let homeWorst = 0; let awayWorst = 0;
  for (const g of goals) {
    if (scoringTeam(g, m) === m.homeTeam.id) h += 1; else a += 1;
    homeWorst = Math.min(homeWorst, h - a); awayWorst = Math.min(awayWorst, a - h);
  }
  const t = m.score.total; const p = m.score.penalty;
  const homeWon = t.home > t.away || (t.home === t.away && p && p.home > p.away);
  const awayWon = t.away > t.home || (t.home === t.away && p && p.away > p.home);
  if (homeWon && homeWorst <= -3) single.push({ matchId: m.id, winnerId: m.homeTeam.id, worst: homeWorst });
  if (awayWon && awayWorst <= -3) single.push({ matchId: m.id, winnerId: m.awayTeam.id, worst: awayWorst });
}

const used = new Set([...aggregate.flatMap((x) => x.legs), ...single.map((x) => x.matchId)]);
const payload = {
  fetchedAt: new Date().toISOString(),
  matches: Object.fromEntries([...used].map((id) => [id, { ...summary(byId.get(id)), ...details[id] }])),
  aggregate,
  single,
  incompleteSingleCandidates: incomplete,
};
await writeFile(path.join(outDir, 'comebacks-sources.json'), `${JSON.stringify(payload, null, 1)}\n`);
console.log(`합계 대역전 ${aggregate.length} · 단판 대역전 ${single.length} · 득점 기록 불완전 후보 ${incomplete.length}`);
