import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// 팝업관 「바이언 둔기론」 원자료 수집. 2010-11시즌 이후 바이에른 뮌헨의 대승만 모은다.
// 기준(운영자 확정, 2026-09-16): 독일 구단 상대(분데스리가·DFB-포칼·DFL-슈퍼컵)는 4골 차 이상, 타리그 구단 상대는 3골 차 이상.
// 경기 선별: 분데스리가 = OpenLigaDB 최종 점수, UEFA 챔피언스 리그 = UEFA.com 경기 데이터, DFB-포칼·클럽 월드컵·슈퍼컵 = Wikipedia 경기 박스로 확인한 목록.
// 득점 분·득점자: ESPN 경기 기록(추가시간·자책골 표기 포함). OpenLigaDB 득점 기록은 분·득점자가 틀린 경기가 있어 쓰지 않는다.
// 선별 점수와 ESPN 점수가 다르면 수집을 멈춘다.
const outDir = path.resolve('src/data/popup');
await mkdir(outDir, { recursive: true });
const UA = { 'User-Agent': 'BBingeFC/1.0 (sho36036@gmail.com)' };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getJson = async (url) => {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const res = await fetch(url, url.includes('espn.com') ? {} : { headers: UA });
    const text = await res.text();
    try { return JSON.parse(text); } catch { if (attempt === 4) throw new Error(`JSON 아님(${res.status}): ${url}`); await sleep(1500 * attempt); }
  }
};

const matches = [];

// 1. 분데스리가(4골 차 이상)
for (let season = 2010; season <= 2025; season += 1) {
  for (const m of await getJson(`https://api.openligadb.de/getmatchdata/bl1/${season}`)) {
    const bayernHome = m.team1.teamName === 'FC Bayern München';
    if (!bayernHome && m.team2.teamName !== 'FC Bayern München') continue;
    const fin = m.matchResults.find((r) => r.resultTypeID === 2);
    const score = bayernHome ? [fin.pointsTeam1, fin.pointsTeam2] : [fin.pointsTeam2, fin.pointsTeam1];
    if (score[0] - score[1] < 4) continue;
    matches.push({ competition: 'bundesliga', season, date: m.matchDateTime.slice(0, 10), round: m.group.groupName, bayernHome, opponentSource: bayernHome ? m.team2.teamName : m.team1.teamName, score, espnLeague: 'ger.1' });
  }
}

// 2. UEFA 챔피언스 리그(독일 밖 구단 상대 3골 차 이상). 같은 대진의 다른 차전도 함께 받는다.
const uclAll = new Map();
for (let year = 2011; year <= 2026; year += 1) {
  for (let offset = 0; ; offset += 500) {
    const page = await getJson(`https://match.uefa.com/v5/matches?competitionId=1&seasonYear=${year}&limit=500&offset=${offset}&order=ASC`);
    if (!Array.isArray(page) || !page.length) break;
    for (const m of page) if (m.status === 'FINISHED' && m.kickOffTime.date >= '2010-07-01' && [m.homeTeam.id, m.awayTeam.id].includes('50037')) uclAll.set(m.id, m);
    if (page.length < 500) break;
  }
}
const uclSeason = (date) => (date.slice(5) >= '07-01' ? +date.slice(0, 4) : +date.slice(0, 4) - 1);
const isHome = (m) => m.homeTeam.id === '50037';
const oppOf = (m) => (isHome(m) ? m.awayTeam : m.homeTeam);
const scoreOf = (m) => (isHome(m) ? [m.score.total.home, m.score.total.away] : [m.score.total.away, m.score.total.home]);
// 2020년 8월 리스본 토너먼트로 2019-20 16강 2차전이 8월에 열려, 대진 키의 시즌은 1차전 시즌을 따른다.
const roundKey = (m) => (m.round.metaData.type === 'GROUP_STANDINGS' ? 'G' : m.round.metaData.type);
const uclList = [...uclAll.values()].sort((a, b) => a.kickOffTime.date.localeCompare(b.kickOffTime.date));
for (const m of uclList) {
  const season = m.kickOffTime.date.startsWith('2020-08') && m.round.metaData.type === 'ROUND_OF_16' ? 2019 : uclSeason(m.kickOffTime.date);
  m.tieKey = `${oppOf(m).id}|${roundKey(m)}|${season}`;
}
const bigUcl = uclList.filter((m) => scoreOf(m)[0] - scoreOf(m)[1] >= 3 && oppOf(m).countryCode !== 'GER');
const wantedTies = new Set(bigUcl.map((m) => m.tieKey));
for (const m of uclList.filter((x) => wantedTies.has(x.tieKey))) {
  const opp = oppOf(m);
  matches.push({ competition: 'ucl', season: +m.tieKey.split('|')[2], date: m.kickOffTime.date, round: m.round.metaData.type, leg: m.leg?.number ?? null, tie: m.tieKey, big: bigUcl.includes(m), bayernHome: isHome(m), opponentSource: opp.internationalName, opponentCountry: opp.countryCode, opponentLogo: opp.bigLogoUrl, score: scoreOf(m), espnLeague: 'uefa.champions' });
}

// 3. DFB-포칼(4골 차 이상), 4. FIFA 클럽 월드컵(3골 차 이상), 5. DFL-슈퍼컵(4골 차 이상): Wikipedia 경기 박스로 확인한 목록.
const listed = [
  ['dfb-pokal', 2010, '2010-08-16', '1라운드', false, 'Germania Windeck', [4, 0]],
  ['dfb-pokal', 2010, '2011-01-26', '8강', false, 'Alemannia Aachen', [4, 0]],
  ['dfb-pokal', 2011, '2011-10-26', '2라운드', true, 'FC Ingolstadt 04', [6, 0]],
  ['dfb-pokal', 2012, '2012-08-20', '1라운드', false, 'Jahn Regensburg', [4, 0]],
  ['dfb-pokal', 2012, '2012-10-31', '2라운드', true, '1. FC Kaiserslautern', [4, 0]],
  ['dfb-pokal', 2012, '2013-04-16', '준결승', true, 'VfL Wolfsburg', [6, 1]],
  ['dfb-pokal', 2013, '2013-08-05', '1라운드', false, 'Schwarz-Weiß Rehden', [5, 0]],
  ['dfb-pokal', 2013, '2014-02-12', '8강', false, 'Hamburger SV', [5, 0]],
  ['dfb-pokal', 2013, '2014-04-16', '준결승', true, '1. FC Kaiserslautern', [5, 1]],
  ['dfb-pokal', 2016, '2016-08-19', '1라운드', false, 'FC Carl Zeiss Jena', [5, 0]],
  ['dfb-pokal', 2017, '2017-08-12', '1라운드', false, 'Chemnitzer FC', [5, 0]],
  ['dfb-pokal', 2017, '2018-02-06', '8강', false, 'SC Paderborn 07', [6, 0]],
  ['dfb-pokal', 2017, '2018-04-17', '준결승', false, 'Bayer 04 Leverkusen', [6, 2]],
  ['dfb-pokal', 2021, '2021-08-25', '1라운드', false, 'Bremer SV', [12, 0]],
  ['dfb-pokal', 2022, '2022-08-31', '1라운드', false, 'Viktoria Köln', [5, 0]],
  ['dfb-pokal', 2022, '2023-02-01', '16강', false, '1. FSV Mainz 05', [4, 0]],
  ['dfb-pokal', 2023, '2023-09-26', '1라운드', false, 'Preußen Münster', [4, 0]],
  ['dfb-pokal', 2024, '2024-08-16', '1라운드', false, 'SSV Ulm 1846', [4, 0]],
  ['dfb-pokal', 2024, '2024-10-30', '2라운드', false, '1. FSV Mainz 05', [4, 0]],
  ['club-world-cup', 2013, '2013-12-17', '준결승', null, 'Guangzhou Evergrande', [3, 0]],
  ['club-world-cup', 2024, '2025-06-15', '조별리그', null, 'Auckland City', [10, 0]],
  ['supercup', 2018, '2018-08-12', '결승', false, 'Eintracht Frankfurt', [5, 0]],
];
const espnSlug = { 'dfb-pokal': 'ger.dfb_pokal', 'club-world-cup': 'fifa.cwc', supercup: 'ger.super_cup' };
for (const [competition, season, date, round, bayernHome, opponentSource, score] of listed) matches.push({ competition, season, date, round, bayernHome, opponentSource, score, espnLeague: espnSlug[competition] });

// ESPN 득점 기록
const problems = [];
const espnLeagueAlt = { 'fifa.cwc': ['fifa.cwc'], 'ger.super_cup': ['ger.super_cup'], 'ger.dfb_pokal': ['ger.dfb_pokal'], 'ger.1': ['ger.1'], 'uefa.champions': ['uefa.champions'] };
for (const match of matches) {
  let event = null;
  for (const slug of espnLeagueAlt[match.espnLeague]) {
    for (const offset of [0, -1, 1]) {
      const d = new Date(`${match.date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset);
      const ymd = d.toISOString().slice(0, 10).replaceAll('-', '');
      const board = await getJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${ymd}`);
      event = (board.events ?? []).find((e) => e.competitions[0].competitors.some((c) => c.team.id === '132'));
      if (event) break;
    }
    if (event) break;
  }
  if (!event) { problems.push(`ESPN 경기 없음: ${match.date} ${match.opponentSource}`); continue; }
  const comp = event.competitions[0];
  const bayern = comp.competitors.find((c) => c.team.id === '132');
  const opp = comp.competitors.find((c) => c.team.id !== '132');
  const espnScore = [Number(bayern.score), Number(opp.score)];
  if (espnScore[0] !== match.score[0] || espnScore[1] !== match.score[1]) problems.push(`점수 불일치: ${match.date} ${match.opponentSource} ${match.score} / ESPN ${espnScore}`);
  match.espnId = event.id;
  match.opponentEspn = opp.team.displayName;
  match.opponentLogoEspn = opp.team.logo ?? null;
  match.venue = comp.venue?.fullName ?? null;
  match.goals = (comp.details ?? []).filter((x) => x.scoringPlay).map((x) => {
    const clock = x.clock.displayValue;
    const [base, extra] = clock.replace(/'/g, '').split('+').map(Number);
    return { clock, minute: base, injury: extra || 0, player: x.athletesInvolved?.[0]?.displayName ?? null, bayern: x.team.id === '132', penalty: Boolean(x.penaltyKick), ownGoal: Boolean(x.ownGoal) };
  });
  const bGoals = match.goals.filter((g) => g.bayern).length;
  if (bGoals !== match.score[0] || match.goals.length - bGoals !== match.score[1]) problems.push(`득점 수 불일치: ${match.date} ${match.opponentSource} ${match.score} / ESPN 득점 ${bGoals}-${match.goals.length - bGoals}`);
  await sleep(350);
}

if (problems.length) console.log(`확인 필요 ${problems.length}건:\n${problems.join('\n')}`);
await writeFile(path.join(outDir, 'bayern-dungi-sources.json'), `${JSON.stringify({ fetchedAt: new Date().toISOString(), matches }, null, 1)}\n`);
const count = (c) => matches.filter((m) => m.competition === c && (c !== 'ucl' || m.big)).length;
console.log(`분데스리가 ${count('bundesliga')} · 챔스 ${count('ucl')} · 포칼 ${count('dfb-pokal')} · 클럽 월드컵 ${count('club-world-cup')} · 슈퍼컵 ${count('supercup')} · 합계 ${['bundesliga', 'ucl', 'dfb-pokal', 'club-world-cup', 'supercup'].reduce((s, c) => s + count(c), 0)}`);
