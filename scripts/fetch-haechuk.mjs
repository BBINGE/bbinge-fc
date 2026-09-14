import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// 「오늘 밤 해축」 현황판 데이터: ESPN 공개 JSON에서 대회별 순위표, 어제·오늘·내일 경기, 득점·도움 순위를 받아 저장한다.
// 실패한 대회는 이전 저장본을 유지한다. 선수 한글 표기는 src/data/haechuk-players.json 대응표를 따른다.
const outputPath = resolve('src/data/haechuk.json');
const playersPath = resolve('src/data/haechuk-players.json');
const teamLabelsPath = resolve('src/data/football-team-labels.json');
const teamFullPath = resolve('src/data/haechuk-teams.json');
const updatePlayers = process.argv.includes('--update-players');

const KST_OFFSET = 9 * 60 * 60 * 1000;
const RETRY_DELAYS = [0, 1_000, 3_000];
const LEADER_LIMIT = 20;
const PROFILE_FETCH_LIMIT = updatePlayers ? 400 : 60;
const HEADERS = { Accept: 'application/json', 'User-Agent': 'BBinge-FC/1.0 (+https://bbingefc.com)' };
const BASE = 'https://site.web.api.espn.com/apis';

export const COMPETITIONS = [
  { id: 'eng.1', label: '프리미어 리그', kind: 'league' },
  { id: 'esp.1', label: '라리가', kind: 'league' },
  { id: 'ita.1', label: '세리에 A', kind: 'league' },
  { id: 'ger.1', label: '푸스발-분데스리가', kind: 'league' },
  { id: 'fra.1', label: '리그 1', kind: 'league' },
  { id: 'uefa.champions', label: 'UEFA 챔피언스 리그', kind: 'uefa' },
  { id: 'uefa.europa', label: 'UEFA 유로파 리그', kind: 'uefa' },
  { id: 'uefa.europa.conf', label: 'UEFA 컨퍼런스 리그', kind: 'uefa' },
];

const ZONE_LABELS = new Map([
  ['champions league', { key: 'ucl', label: 'UEFA 챔피언스 리그' }],
  ['champions league qualifying', { key: 'ucl-q', label: 'UEFA 챔피언스 리그 예선' }],
  ['europa league', { key: 'uel', label: 'UEFA 유로파 리그' }],
  ['conference league qualifying', { key: 'uecl', label: 'UEFA 컨퍼런스 리그 예선' }],
  ['conference league', { key: 'uecl', label: 'UEFA 컨퍼런스 리그' }],
  ['relegation playoff', { key: 'relegation-po', label: '강등 플레이오프' }],
  ['relegation', { key: 'relegation', label: '강등' }],
  ['relegated', { key: 'relegation', label: '강등' }],
  ['qualifies for round of 16', { key: 'r16', label: '16강 직행' }],
  ['knockout phase playoffs - seeded', { key: 'playoff', label: '녹아웃 플레이오프(시드)' }],
  ['knockout phase playoffs - unseeded', { key: 'playoff-u', label: '녹아웃 플레이오프' }],
  ['eliminated', { key: 'out', label: '탈락' }],
]);

const POSITION_LABELS = { Forward: '공격수', Midfielder: '미드필더', Defender: '수비수', Goalkeeper: '골키퍼' };

const NATIONALITY_LABELS = {
  Albania: '알바니아', Algeria: '알제리', Argentina: '아르헨티나', Armenia: '아르메니아', Australia: '오스트레일리아', Austria: '오스트리아',
  Belgium: '벨기에', 'Bosnia and Herzegovina': '보스니아 헤르체고비나', Brazil: '브라질', Bulgaria: '불가리아', 'Burkina Faso': '부르키나파소',
  Cameroon: '카메룬', Canada: '캐나다', 'Cape Verde': '카보베르데', 'Central African Republic': '중앙아프리카 공화국', Chile: '칠레', China: '중국',
  Colombia: '콜롬비아', 'DR Congo': '콩고 민주 공화국', 'Congo DR': '콩고 민주 공화국', Croatia: '크로아티아', 'Curaçao': '퀴라소', Cyprus: '키프로스',
  Czechia: '체코', 'Czech Republic': '체코', Denmark: '덴마크', 'Dominican Republic': '도미니카 공화국', Ecuador: '에콰도르', Egypt: '이집트',
  England: '잉글랜드', Estonia: '에스토니아', Finland: '핀란드', France: '프랑스', Gabon: '가봉', Gambia: '감비아', Georgia: '조지아',
  Germany: '독일', Ghana: '가나', Greece: '그리스', Guinea: '기니', 'Guinea-Bissau': '기니비사우', Hungary: '헝가리', Iceland: '아이슬란드',
  Iran: '이란', Iraq: '이라크', Israel: '이스라엘', Italy: '이탈리아', 'Ivory Coast': '코트디부아르', "Côte d'Ivoire": '코트디부아르',
  Jamaica: '자메이카', Japan: '일본', Kazakhstan: '카자흐스탄', Kosovo: '코소보', Latvia: '라트비아', Lithuania: '리투아니아', Luxembourg: '룩셈부르크',
  Mali: '말리', Mexico: '멕시코', Montenegro: '몬테네그로', Morocco: '모로코', Mozambique: '모잠비크', Netherlands: '네덜란드',
  'New Zealand': '뉴질랜드', Nigeria: '나이지리아', 'North Macedonia': '북마케도니아', 'Northern Ireland': '북아일랜드', Norway: '노르웨이',
  Paraguay: '파라과이', Peru: '페루', Poland: '폴란드', Portugal: '포르투갈', 'Republic of Ireland': '아일랜드', Romania: '루마니아', Russia: '러시아',
  Scotland: '스코틀랜드', Senegal: '세네갈', Serbia: '세르비아', Slovakia: '슬로바키아', Slovenia: '슬로베니아', 'South Africa': '남아프리카 공화국',
  'South Korea': '대한민국', 'Korea Republic': '대한민국', Spain: '스페인', Suriname: '수리남', Sweden: '스웨덴', Switzerland: '스위스',
  Tunisia: '튀니지', 'Türkiye': '튀르키예', Turkey: '튀르키예', Ukraine: '우크라이나', Uruguay: '우루과이', USA: '미국', 'United States': '미국',
  Uzbekistan: '우즈베키스탄', Venezuela: '베네수엘라', Wales: '웨일스', Zambia: '잠비아', Zimbabwe: '짐바브웨',
};

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

async function fetchJson(url, label) {
  let lastError;
  for (const delay of RETRY_DELAYS) {
    if (delay) await wait(delay);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, { headers: HEADERS, signal: controller.signal });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`${label}: ${lastError?.message || 'unknown error'}`);
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

// 팀명은 풀네임(예: FC 바이에른 뮌헨, 아스널 FC)을 먼저 쓰고, 풀네임표에 없는 팀은 약칭 대응표, 그다음 원어로 표시한다.
const TEAM_FULL = await readJson(teamFullPath, {});
const TEAM_LABELS = await readJson(teamLabelsPath, {});
const missingTeams = new Set();
const teamLabel = (name) => {
  if (!name) return '';
  if (TEAM_FULL[name]) return TEAM_FULL[name];
  missingTeams.add(name);
  return TEAM_LABELS[name] || TEAM_LABELS[name.replace(/\s+FC$/i, '')] || name;
};

function koreaDate(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function koreaTime(date) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function shiftDay(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00+09:00`);
  return koreaDate(new Date(date.getTime() + days * 86_400_000));
}

const today = koreaDate(new Date());
const days = { yesterday: shiftDay(today, -1), today, tomorrow: shiftDay(today, 1) };

function ageFrom(displayDOB) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(displayDOB || '');
  if (!match) return null;
  const [, d, m, y] = match.map(Number);
  const now = new Date(Date.now() + KST_OFFSET);
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d)) age -= 1;
  return age;
}

function isoDob(displayDOB) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(displayDOB || '');
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : '';
}

async function fetchStandings(comp) {
  const payload = await fetchJson(`${BASE}/v2/sports/soccer/${comp.id}/standings`, `standings ${comp.id}`);
  const group = payload?.children?.[0]?.standings;
  const entries = Array.isArray(group?.entries) ? group.entries : [];
  const rows = entries.map((entry, index) => {
    const stats = new Map((entry.stats || []).map((stat) => [stat.name, Number(stat.value)]));
    const zone = entry.note ? ZONE_LABELS.get(String(entry.note.description).toLowerCase()) : null;
    return {
      rank: stats.get('rank') || index + 1,
      team: teamLabel(entry.team?.displayName || entry.team?.name),
      badge: entry.team?.logos?.[0]?.href || '',
      played: stats.get('gamesPlayed') || 0,
      wins: stats.get('wins') || 0,
      draws: stats.get('ties') || 0,
      losses: stats.get('losses') || 0,
      goalsFor: stats.get('pointsFor') || 0,
      goalsAgainst: stats.get('pointsAgainst') || 0,
      goalDifference: stats.get('pointDifferential') || 0,
      points: stats.get('points') || 0,
      zone: zone?.key || (entry.note?.description ? 'other' : ''),
      zoneLabel: zone?.label || '',
    };
  }).filter((row) => row.team);
  if (rows.length < 8) throw new Error(`standings ${comp.id}: rows ${rows.length}`);
  return { season: group?.seasonDisplayName || '', rows };
}

async function fetchMatches(comp) {
  const start = shiftDay(days.yesterday, -1).replaceAll('-', '');
  const end = shiftDay(days.tomorrow, 1).replaceAll('-', '');
  const payload = await fetchJson(`${BASE}/site/v2/sports/soccer/${comp.id}/scoreboard?dates=${start}-${end}&limit=200`, `scoreboard ${comp.id}`);
  const events = Array.isArray(payload?.events) ? payload.events : [];
  return events.map((event) => {
    const kickoff = new Date(event.date);
    const competition = event.competitions?.[0];
    const home = competition?.competitors?.find((c) => c.homeAway === 'home');
    const away = competition?.competitors?.find((c) => c.homeAway === 'away');
    const state = event.status?.type?.state || 'pre';
    return {
      id: event.id,
      date: koreaDate(kickoff),
      time: koreaTime(kickoff),
      kickoff: kickoff.toISOString(),
      state,
      detail: event.status?.type?.shortDetail || '',
      home: teamLabel(home?.team?.displayName),
      away: teamLabel(away?.team?.displayName),
      homeBadge: home?.team?.logo || '',
      awayBadge: away?.team?.logo || '',
      homeScore: state === 'pre' ? null : Number(home?.score ?? 0),
      awayScore: state === 'pre' ? null : Number(away?.score ?? 0),
    };
  }).filter((match) => match.home && match.away && Object.values(days).includes(match.date))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

async function fetchLeaders(comp) {
  const payload = await fetchJson(`${BASE}/site/v2/sports/soccer/${comp.id}/statistics`, `statistics ${comp.id}`);
  const pick = (name) => (payload?.stats || []).find((stat) => stat.name === name)?.leaders || [];
  const shape = (leaders) => leaders.slice(0, LEADER_LIMIT).map((leader) => ({
    id: String(leader.athlete?.id || ''),
    name: leader.athlete?.displayName || '',
    team: teamLabel(leader.athlete?.team?.displayName || leader.athlete?.team?.name),
    value: Number(leader.value) || 0,
    appearances: Number((leader.athlete?.statistics || []).find((s) => s.name === 'appearances')?.value) || 0,
  })).filter((row) => row.id && row.name);
  return { goals: shape(pick('goalsLeaders')), assists: shape(pick('assistsLeaders')) };
}

async function fetchProfile(compId, athleteId) {
  const payload = await fetchJson(`${BASE}/common/v3/sports/soccer/${compId}/athletes/${athleteId}`, `athlete ${athleteId}`);
  const athlete = payload?.athlete || payload;
  return {
    name: athlete?.displayName || '',
    dob: isoDob(athlete?.displayDOB),
    position: athlete?.position?.displayName || '',
    nationality: athlete?.citizenship || '',
  };
}

const previous = await readJson(outputPath, {});
const players = await readJson(playersPath, {});
const previousById = new Map((previous.competitions || []).map((comp) => [comp.id, comp]));
const errors = [];
const competitions = [];
let profileFetches = 0;

for (const comp of COMPETITIONS) {
  const prev = previousById.get(comp.id) || {};
  const entry = { id: comp.id, label: comp.label, kind: comp.kind, season: prev.season || '', standings: prev.standings || [], matches: prev.matches || [], goals: prev.goals || [], assists: prev.assists || [] };
  const [standings, matches, leaders] = await Promise.allSettled([fetchStandings(comp), fetchMatches(comp), fetchLeaders(comp)]);
  if (standings.status === 'fulfilled') { entry.standings = standings.value.rows; entry.season = standings.value.season; } else errors.push(standings.reason.message);
  if (matches.status === 'fulfilled') entry.matches = matches.value; else errors.push(matches.reason.message);
  if (leaders.status === 'fulfilled') { entry.goals = leaders.value.goals; entry.assists = leaders.value.assists; } else errors.push(leaders.reason.message);

  for (const row of [...entry.goals, ...entry.assists]) {
    let known = players[row.id];
    if (!known && profileFetches < PROFILE_FETCH_LIMIT) {
      profileFetches += 1;
      try {
        const profile = await fetchProfile(comp.id, row.id);
        known = { ko: '', original: profile.name || row.name, ...profile };
        if (updatePlayers) players[row.id] = known;
        await wait(120);
      } catch (error) {
        errors.push(error.message);
      }
    }
    row.ko = known?.ko || '';
    row.original = known?.original || row.name;
    row.dob = known?.dob || '';
    row.age = known?.dob ? ageFrom(known.dob.split('-').reverse().map((part, i) => (i < 2 ? String(Number(part)) : part)).join('/')) : null;
    row.position = POSITION_LABELS[known?.position] || known?.position || '';
    row.nationality = NATIONALITY_LABELS[known?.nationality] || known?.nationality || '';
    delete row.name;
  }
  competitions.push(entry);
  await wait(250);
}

const summary = {
  today: days.today,
  todayMatches: competitions.reduce((sum, comp) => sum + comp.matches.filter((match) => match.date === days.today).length, 0),
};
const body = { days, summary, competitions, errors };
const { updatedAt: prevUpdated, ...prevBody } = previous;
const changed = JSON.stringify(prevBody) !== JSON.stringify(body);
const data = { updatedAt: changed || !prevUpdated ? new Date().toISOString() : prevUpdated, ...body };

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
if (updatePlayers) {
  const sorted = Object.fromEntries(Object.entries(players).sort(([a], [b]) => Number(a) - Number(b)));
  await writeFile(playersPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
}
const missingKo = new Set(competitions.flatMap((comp) => [...comp.goals, ...comp.assists]).filter((row) => !row.ko).map((row) => `${row.id} ${row.original}`));
console.log(`해축 데이터: 대회 ${competitions.length}개, 오늘 경기 ${summary.todayMatches}, 오류 ${errors.length}, 한글명 없는 선수 ${missingKo.size}`);
if (missingTeams.size) console.warn(`풀네임 없는 팀: ${[...missingTeams].join(', ')}`);
if (errors.length) console.warn(errors.join('\n'));
