import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const outputPath = resolve(process.argv[2] || 'src/data/today-football.json');
const birthdayFallbackPath = resolve('src/data/football-birthday-fallbacks.json');
const KST_OFFSET = 9 * 60 * 60 * 1000;
const RETRY_DELAYS = [0, 1_000, 3_000];

function koreaParts(date = new Date()) {
  const shifted = new Date(date.getTime() + KST_OFFSET);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function isoDate(parts) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

async function fetchJson(url, options = {}, label = 'API') {
  let lastError;
  for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt += 1) {
    if (RETRY_DELAYS[attempt]) await wait(RETRY_DELAYS[attempt]);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      console.warn(`${label}: ${attempt + 1}/${RETRY_DELAYS.length}회 시도 실패 - ${error.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`${label} ${RETRY_DELAYS.length}회 시도 실패: ${lastError?.message || 'unknown error'}`);
}

async function fetchBirthday(month, day) {
  const query = `
SELECT ?person ?personLabel ?birth ?image ?sitelinks WHERE {
  ?person wdt:P106/wdt:P279* wd:Q937857;
          wdt:P569 ?birth;
          wdt:P18 ?image;
          wikibase:sitelinks ?sitelinks.
  FILTER(MONTH(?birth) = ${month} && DAY(?birth) = ${day})
  FILTER(?sitelinks >= 20)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en". }
}
ORDER BY DESC(?sitelinks)
LIMIT 12`;
  const url = new URL('https://query.wikidata.org/sparql');
  url.searchParams.set('query', query);
  url.searchParams.set('format', 'json');
  const payload = await fetchJson(url, {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'BBingeFC/1.0 (https://bbingefc.com/contact/)',
    },
  }, 'Wikidata');
  const row = payload?.results?.bindings?.[0];
  if (!row?.personLabel?.value || !row?.birth?.value) return null;
  const born = new Date(row.birth.value);
  const originalImage = row.image.value.replace(/^http:/, 'https:');
  const imageUrl = `${originalImage.replace('/wiki/Special:FilePath/', '/wiki/Special:Redirect/file/')}?width=700`;
  return {
    name: row.personLabel.value,
    birthYear: born.getUTCFullYear(),
    wikidataUrl: row.person.value,
    imageUrl,
  };
}

const FEATURED_LEAGUES = [
  { id: '4480', weight: 100 },
  { id: '4328', weight: 95 },
  { id: '4335', weight: 90 },
  { id: '4332', weight: 85 },
  { id: '4331', weight: 80 },
  { id: '4334', weight: 75 },
  { id: '4481', weight: 70 },
  { id: '4406', weight: 60 },
  { id: '4351', weight: 55 },
  { id: '4337', weight: 50 },
];

const BIG_CLUBS = [
  'real madrid', 'barcelona', 'manchester united', 'manchester city', 'liverpool', 'arsenal', 'chelsea',
  'tottenham', 'bayern munich', 'borussia dortmund', 'inter milan', 'internazionale', 'ac milan',
  'juventus', 'napoli', 'paris saint-germain', 'psg', 'marseille', 'ajax', 'psv', 'benfica', 'porto',
  'boca juniors', 'river plate', 'racing club', 'flamengo', 'palmeiras', 'corinthians', 'santos',
];

const LEAGUE_LABELS = new Map([
  ['English Premier League', '프리미어 리그'],
  ['German Bundesliga', '푸스발-분데스리가'],
  ['Bundesliga', '푸스발-분데스리가'],
  ['Spanish La Liga', '라리가'],
  ['Italian Serie A', '세리에 A'],
  ['French Ligue 1', '리그 1'],
  ['Dutch Eredivisie', '에레디비시'],
  ['UEFA Champions League', 'UEFA 챔피언스 리그'],
  ['UEFA Europa League', 'UEFA 유로파 리그'],
  ['UEFA Europa Conference League', 'UEFA 컨퍼런스 리그'],
  ['UEFA Conference League', 'UEFA 컨퍼런스 리그'],
  ['Portuguese Primeira Liga', '프리메이라리가'],
  ['Argentinian Primera Division', '아르헨티나 프리메라 디비시온'],
]);

function leagueLabel(name) {
  return LEAGUE_LABELS.get(name) || name || '축구 경기';
}

function eventScore(event, leagueWeight) {
  const teams = `${event.strHomeTeam || ''} ${event.strAwayTeam || ''}`.toLowerCase();
  const clubBonus = BIG_CLUBS.some((club) => teams.includes(club)) ? 100 : 0;
  return clubBonus + leagueWeight;
}

async function fetchMatches(date) {
  const results = await Promise.allSettled(FEATURED_LEAGUES.map(async (league) => {
    const url = new URL('https://www.thesportsdb.com/api/v1/json/123/eventsday.php');
    url.searchParams.set('d', date);
    url.searchParams.set('l', league.id);
    const payload = await fetchJson(url, { headers: { Accept: 'application/json' } }, `TheSportsDB league ${league.id}`);
    return (Array.isArray(payload?.events) ? payload.events : []).map((event) => ({ event, weight: league.weight }));
  }));
  let events = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  if (!events.length) {
    const url = new URL('https://www.thesportsdb.com/api/v1/json/123/eventsday.php');
    url.searchParams.set('d', date);
    url.searchParams.set('s', 'Soccer');
    const payload = await fetchJson(url, { headers: { Accept: 'application/json' } }, 'TheSportsDB all soccer');
    events = (Array.isArray(payload?.events) ? payload.events : []).map((event) => ({ event, weight: 0 }));
  }
  return events.map(({ event, weight }) => {
    const timestamp = event.strTimestamp ? new Date(event.strTimestamp) : null;
    const validTimestamp = timestamp && !Number.isNaN(timestamp.valueOf());
    const koreaDate = validTimestamp
      ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(timestamp)
      : event.dateEvent || date;
    const koreaTime = validTimestamp
      ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(timestamp)
      : '';
    return {
      id: event.idEvent,
      league: leagueLabel(event.strLeague),
      home: event.strHomeTeam || '',
      away: event.strAwayTeam || '',
      homeBadge: event.strHomeTeamBadge || '',
      awayBadge: event.strAwayTeamBadge || '',
      time: koreaTime,
      date: koreaDate,
      score: eventScore(event, weight),
    };
  }).filter((event) => event.home && event.away && event.date === date)
    .sort((a, b) => b.score - a.score || a.time.localeCompare(b.time))
    .slice(0, 3)
    .map(({ score, ...event }) => event);
}

async function fetchFootballDataMatches(date) {
  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!token) return null;
  const url = new URL('https://api.football-data.org/v4/matches');
  url.searchParams.set('date', date);
  const payload = await fetchJson(url, {
    headers: { Accept: 'application/json', 'X-Auth-Token': token },
  }, 'football-data.org');
  const events = Array.isArray(payload?.matches) ? payload.matches : [];
  return events.map((event) => {
    const timestamp = event.utcDate ? new Date(event.utcDate) : null;
    const validTimestamp = timestamp && !Number.isNaN(timestamp.valueOf());
    const koreaDate = validTimestamp
      ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(timestamp)
      : date;
    const koreaTime = validTimestamp
      ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(timestamp)
      : '';
    return {
      id: `fd-${event.id}`,
      league: leagueLabel(event.competition?.name),
      home: event.homeTeam?.shortName || event.homeTeam?.name || '',
      away: event.awayTeam?.shortName || event.awayTeam?.name || '',
      homeBadge: event.homeTeam?.crest || '',
      awayBadge: event.awayTeam?.crest || '',
      time: koreaTime,
      date: koreaDate,
      score: eventScore({ strHomeTeam: event.homeTeam?.name, strAwayTeam: event.awayTeam?.name }, 40),
    };
  }).filter((event) => event.home && event.away && event.date === date)
    .sort((a, b) => b.score - a.score || a.time.localeCompare(b.time))
    .slice(0, 3)
    .map(({ score, ...event }) => event);
}

async function birthdayFallback(month, day) {
  try {
    const calendar = JSON.parse(await readFile(birthdayFallbackPath, 'utf8'));
    return calendar.people?.[`${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`] ?? null;
  } catch (error) {
    console.warn(`Local birthday fallback: ${error.message}`);
    return null;
  }
}

async function rememberBirthdayFallback(month, day, birthday) {
  try {
    const calendar = JSON.parse(await readFile(birthdayFallbackPath, 'utf8'));
    calendar.people ||= {};
    calendar.people[`${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`] = birthday;
    const sortedPeople = Object.fromEntries(Object.entries(calendar.people).sort(([a], [b]) => a.localeCompare(b)));
    await writeFile(birthdayFallbackPath, `${JSON.stringify({ ...calendar, people: sortedPeople }, null, 2)}\n`, 'utf8');
  } catch (error) {
    console.warn(`Local birthday fallback save: ${error.message}`);
  }
}

async function previousData() {
  try {
    return JSON.parse(await readFile(outputPath, 'utf8'));
  } catch {
    return {};
  }
}

const parts = koreaParts();
const date = isoDate(parts);
const previous = await previousData();
const [birthdayResult, matchesResult] = await Promise.allSettled([
  fetchBirthday(parts.month, parts.day),
  fetchMatches(date),
]);

const localBirthday = await birthdayFallback(parts.month, parts.day);
let selectedBirthday = null;
let birthdayState = 'unavailable';
let birthdaySource = 'none';
if (birthdayResult.status === 'fulfilled' && birthdayResult.value) {
  selectedBirthday = birthdayResult.value;
  birthdayState = 'ok';
  birthdaySource = 'Wikidata';
  await rememberBirthdayFallback(parts.month, parts.day, selectedBirthday);
} else if (localBirthday) {
  selectedBirthday = localBirthday;
  birthdayState = 'fallback';
  birthdaySource = 'local-calendar';
} else if (birthdayResult.status === 'fulfilled') {
  birthdayState = 'empty';
  birthdaySource = 'Wikidata';
}

let selectedMatches = [];
let matchesState = 'unavailable';
let matchesSource = 'none';
if (matchesResult.status === 'fulfilled') {
  selectedMatches = matchesResult.value;
  matchesState = selectedMatches.length ? 'ok' : 'empty';
  matchesSource = 'TheSportsDB';
} else {
  try {
    const backupMatches = await fetchFootballDataMatches(date);
    if (backupMatches) {
      selectedMatches = backupMatches;
      matchesState = selectedMatches.length ? 'ok' : 'empty';
      matchesSource = 'football-data.org';
    }
  } catch (error) {
    console.warn(`football-data.org backup: ${error.message}`);
  }
}

const dataWithoutTimestamp = {
  date,
  birthday: selectedBirthday,
  matches: selectedMatches,
  status: {
    birthday: {
      state: birthdayState,
      source: birthdaySource,
      error: birthdayResult.status === 'rejected' ? birthdayResult.reason.message : null,
    },
    matches: {
      state: matchesState,
      source: matchesSource,
      error: matchesResult.status === 'rejected' ? matchesResult.reason.message : null,
    },
  },
  sources: {
    birthday: birthdaySource,
    matches: matchesSource,
  },
};
const { updatedAt: previousUpdatedAt, ...previousWithoutTimestamp } = previous;
const contentChanged = JSON.stringify(previousWithoutTimestamp) !== JSON.stringify(dataWithoutTimestamp);
const data = {
  date,
  updatedAt: contentChanged || !previousUpdatedAt ? new Date().toISOString() : previousUpdatedAt,
  ...Object.fromEntries(Object.entries(dataWithoutTimestamp).filter(([key]) => key !== 'date')),
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(data));

if (birthdayResult.status === 'rejected') console.warn(`Wikidata final: ${birthdayResult.reason.message}`);
if (matchesResult.status === 'rejected') console.warn(`TheSportsDB final: ${matchesResult.reason.message}`);
