import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const outputPath = resolve(process.argv[2] || 'src/data/today-football.json');
const teamLabelsPath = resolve('src/data/football-team-labels.json');
const KST_OFFSET = 9 * 60 * 60 * 1000;
const RETRY_DELAYS = [0, 1_000, 3_000];
const MATCH_LIMIT = 12;
const MATCH_WINDOW_AFTER = 20 * 60 * 60 * 1000;
const LIVE_STATUS_MAX_AGE = 4 * 60 * 60 * 1000;
const STANDINGS_LIMIT = 24;
const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'IN_PLAY', 'PAUSED']);

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

const FEATURED_LEAGUES = [
  { id: '4480', weight: 110 }, // UEFA Champions League
  { id: '4328', weight: 105 }, // English Premier League
  { id: '4335', weight: 100 }, // Spanish La Liga
  { id: '4332', weight: 95 },  // Italian Serie A
  { id: '4331', weight: 90 },  // German Bundesliga
  { id: '4334', weight: 85 },  // French Ligue 1
  { id: '4481', weight: 80 },  // UEFA Europa League
  { id: '4337', weight: 75 },  // Dutch Eredivisie
];
const STANDINGS_LEAGUES = [
  { id: '4328', espn: 'eng.1', label: '프리미어 리그' },
  { id: '4335', espn: 'esp.1', label: '라리가' },
  { id: '4332', espn: 'ita.1', label: '세리에 A' },
  { id: '4331', espn: 'ger.1', label: '푸스발-분데스리가' },
  { id: '4334', espn: 'fra.1', label: '리그 1' },
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

const TEAM_LABELS = JSON.parse(await readFile(teamLabelsPath, 'utf8'));

function teamLabel(name) {
  if (!name) return '';
  const withoutSuffix = name.replace(/\s+FC$/i, '');
  return TEAM_LABELS[name] || TEAM_LABELS[withoutSuffix] || name;
}

async function settleInBatches(tasks, batchSize = 4, pauseMs = 250) {
  const results = [];
  for (let index = 0; index < tasks.length; index += batchSize) {
    results.push(...await Promise.allSettled(tasks.slice(index, index + batchSize).map((task) => task())));
    if (index + batchSize < tasks.length) await wait(pauseMs);
  }
  return results;
}

function currentSeason(parts) {
  const startYear = parts.month >= 7 ? parts.year : parts.year - 1;
  return `${startYear}-${startYear + 1}`;
}

function nullableScore(value) {
  if (value === null || value === undefined || value === '') return null;
  const score = Number(value);
  return Number.isInteger(score) && score >= 0 ? score : null;
}

function eventScore(event, leagueWeight) {
  const teams = `${event.strHomeTeam || ''} ${event.strAwayTeam || ''}`.toLowerCase();
  const clubBonus = BIG_CLUBS.some((club) => teams.includes(club)) ? 100 : 0;
  return clubBonus + leagueWeight;
}

function utcDate(date) {
  return date.toISOString().slice(0, 10);
}

function utcDatesBetween(start, end) {
  const dates = [];
  const cursor = new Date(`${utcDate(start)}T00:00:00Z`);
  const last = new Date(`${utcDate(end)}T00:00:00Z`);
  while (cursor <= last) {
    dates.push(utcDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function parseUtcTimestamp(value) {
  if (!value) return null;
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const timestamp = new Date(normalized);
  return Number.isNaN(timestamp.valueOf()) ? null : timestamp;
}

function normalizeMatchStatus(status, kickoff) {
  const normalized = String(status || '').trim().toUpperCase();
  if (!LIVE_STATUSES.has(normalized) || !kickoff || Number.isNaN(kickoff.valueOf())) return status || '';
  return Date.now() - kickoff.valueOf() >= LIVE_STATUS_MAX_AGE ? 'FT' : status;
}

function curateMatches(events) {
  const unique = [...new Map(events.map((event) => [event.id, event])).values()]
    .sort((a, b) => a.sortTime.localeCompare(b.sortTime) || b.score - a.score);
  const selected = [];
  const selectedIds = new Set();
  const coveredLeagues = new Set();
  for (const event of unique) {
    if (coveredLeagues.has(event.leagueId)) continue;
    selected.push(event);
    selectedIds.add(event.id);
    coveredLeagues.add(event.leagueId);
  }
  for (const event of unique) {
    if (selected.length >= MATCH_LIMIT) break;
    if (selectedIds.has(event.id)) continue;
    selected.push(event);
    selectedIds.add(event.id);
  }
  return selected
    .sort((a, b) => a.sortTime.localeCompare(b.sortTime) || b.score - a.score)
    .slice(0, MATCH_LIMIT)
    .map(({ score, sortTime, leagueId, ...event }) => event);
}

async function fetchMatches(date, previousMatches = []) {
  const todayStart = new Date(`${date}T00:00:00+09:00`);
  const koreaWeekday = new Date(Date.now() + KST_OFFSET).getUTCDay();
  const weekendRetentionDays = koreaWeekday === 1 ? 2 : 0;
  const windowStart = new Date(todayStart.getTime() - weekendRetentionDays * 86_400_000);
  const windowEnd = new Date(Date.now() + MATCH_WINDOW_AFTER);
  const queryDates = utcDatesBetween(windowStart, windowEnd);
  const requests = FEATURED_LEAGUES.flatMap((league) => queryDates.map((queryDate) => async () => {
    const url = new URL('https://www.thesportsdb.com/api/v1/json/123/eventsday.php');
    url.searchParams.set('d', queryDate);
    url.searchParams.set('l', league.id);
    const payload = await fetchJson(url, { headers: { Accept: 'application/json' } }, `TheSportsDB league ${league.id} ${queryDate}`);
    return (Array.isArray(payload?.events) ? payload.events : []).map((event) => ({ event, weight: league.weight }));
  }));
  const results = await settleInBatches(requests, 2, 650);
  const requestSucceeded = results.some((result) => result.status === 'fulfilled');
  const hasPartialFailure = results.some((result) => result.status === 'rejected');
  let events = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  if (!requestSucceeded) throw new Error('TheSportsDB 유럽 주요리그 및 전체 축구 일정 요청 실패');
  const normalizedEvents = events.map(({ event, weight }) => {
    const timestamp = parseUtcTimestamp(event.strTimestamp);
    const validTimestamp = Boolean(timestamp);
    const koreaDate = validTimestamp
      ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(timestamp)
      : event.dateEvent || date;
    const koreaTime = validTimestamp
      ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(timestamp)
      : '';
    return {
      id: event.idEvent,
      league: leagueLabel(event.strLeague),
      home: teamLabel(event.strHomeTeam),
      away: teamLabel(event.strAwayTeam),
      homeBadge: event.strHomeTeamBadge || '',
      awayBadge: event.strAwayTeamBadge || '',
      homeScore: nullableScore(event.intHomeScore),
      awayScore: nullableScore(event.intAwayScore),
      status: normalizeMatchStatus(event.strStatus, timestamp),
      progress: event.strProgress || '',
      time: koreaTime,
      date: koreaDate,
      score: eventScore(event, weight),
      sortTime: validTimestamp ? timestamp.toISOString() : `${koreaDate}T${koreaTime || '23:59'}`,
      leagueId: event.idLeague || event.strLeague || 'other',
      inWindow: validTimestamp ? timestamp >= windowStart && timestamp <= windowEnd : true,
    };
  }).filter((event) => event.home && event.away && event.inWindow)
    .map(({ inWindow, ...event }) => event);
  const reusablePrevious = hasPartialFailure ? previousMatches.map((event) => {
    const timestamp = event.date && event.time ? new Date(`${event.date}T${event.time}:00+09:00`) : null;
    const validTimestamp = timestamp && !Number.isNaN(timestamp.valueOf());
    return {
      ...event,
      status: normalizeMatchStatus(event.status, timestamp),
      score: 0,
      sortTime: validTimestamp ? timestamp.toISOString() : `${event.date}T${event.time || '23:59'}`,
      leagueId: `previous-${event.league}`,
      inWindow: validTimestamp ? timestamp >= windowStart && timestamp <= windowEnd : false,
    };
  }).filter((event) => event.home && event.away && event.inWindow)
    .map(({ inWindow, ...event }) => event) : [];
  return curateMatches([...reusablePrevious, ...normalizedEvents]);
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
    const timestamp = parseUtcTimestamp(event.utcDate);
    const validTimestamp = Boolean(timestamp);
    const koreaDate = validTimestamp
      ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(timestamp)
      : date;
    const koreaTime = validTimestamp
      ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(timestamp)
      : '';
    return {
      id: `fd-${event.id}`,
      league: leagueLabel(event.competition?.name),
      home: teamLabel(event.homeTeam?.shortName || event.homeTeam?.name),
      away: teamLabel(event.awayTeam?.shortName || event.awayTeam?.name),
      homeBadge: event.homeTeam?.crest || '',
      awayBadge: event.awayTeam?.crest || '',
      homeScore: nullableScore(event.score?.fullTime?.home),
      awayScore: nullableScore(event.score?.fullTime?.away),
      status: normalizeMatchStatus(event.status, timestamp),
      progress: '',
      time: koreaTime,
      date: koreaDate,
      score: eventScore({ strHomeTeam: event.homeTeam?.name, strAwayTeam: event.awayTeam?.name }, 40),
    };
  }).filter((event) => event.home && event.away && event.date >= date)
    .sort((a, b) => b.score - a.score || a.time.localeCompare(b.time))
    .slice(0, MATCH_LIMIT)
    .map(({ score, ...event }) => event);
}

function sourceProviders(source) {
  return String(source || '')
    .split('+')
    .map((provider) => provider.trim())
    .filter((provider) => provider && provider !== 'none' && provider !== 'previous-data');
}

async function fetchStandings(season, previousStandings = [], previousSource = 'none') {
  const requests = STANDINGS_LEAGUES.map((league) => async () => {
    try {
      const url = new URL(`https://site.web.api.espn.com/apis/v2/sports/soccer/${league.espn}/standings`);
      const payload = await fetchJson(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'BBinge-FC/1.0 (+https://bbingefc.com)' },
      }, `ESPN table ${league.espn}`);
      const entries = Array.isArray(payload?.children?.[0]?.standings?.entries)
        ? payload.children[0].standings.entries
        : [];
      const rows = entries.slice(0, STANDINGS_LIMIT).map((entry, index) => {
        const stats = new Map((Array.isArray(entry?.stats) ? entry.stats : []).map((stat) => [stat.name, Number(stat.value)]));
        return {
          rank: stats.get('rank') || index + 1,
          team: teamLabel(entry?.team?.displayName || entry?.team?.name),
          badge: entry?.team?.logos?.[0]?.href || '',
          played: stats.get('gamesPlayed') || 0,
          goalDifference: stats.get('pointDifferential') || 0,
          points: stats.get('points') || 0,
        };
      }).filter((row) => row.team);
      if (rows.length < 10) throw new Error(`전체 순위 행 부족: ${rows.length}`);
      return { leagueId: league.id, league: league.label, season, rows, provider: 'ESPN' };
    } catch (espnError) {
      console.warn(`ESPN standings fallback ${league.espn}: ${espnError.message}`);
      const url = new URL('https://www.thesportsdb.com/api/v1/json/123/lookuptable.php');
      url.searchParams.set('l', league.id);
      url.searchParams.set('s', season);
      const payload = await fetchJson(url, { headers: { Accept: 'application/json' } }, `TheSportsDB table ${league.id} ${season}`);
      const rows = (Array.isArray(payload?.table) ? payload.table : []).slice(0, STANDINGS_LIMIT).map((row, index) => ({
        rank: Number(row.intRank) || index + 1,
        team: teamLabel(row.strTeam),
        badge: row.strBadge || '',
        played: Number(row.intPlayed) || 0,
        goalDifference: Number(row.intGoalDifference) || 0,
        points: Number(row.intPoints) || 0,
      })).filter((row) => row.team);
      return { leagueId: league.id, league: league.label, season, rows, provider: 'TheSportsDB' };
    }
  });
  const results = await settleInBatches(requests, 1, 650);
  const tables = [];
  let usedPrevious = false;
  const providers = new Set();
  for (let index = 0; index < STANDINGS_LEAGUES.length; index += 1) {
    const league = STANDINGS_LEAGUES[index];
    const result = results[index];
    if (result.status === 'fulfilled' && result.value.rows.length) {
      const { provider, ...table } = result.value;
      tables.push(table);
      providers.add(provider);
      continue;
    }
    const previous = previousStandings.find((table) => table.leagueId === league.id && table.season === season && table.rows?.length);
    if (previous) {
      tables.push(previous);
      usedPrevious = true;
      sourceProviders(previousSource).forEach((provider) => providers.add(provider));
    }
  }
  const errors = results.filter((result) => result.status === 'rejected').map((result) => result.reason.message);
  if (!tables.length && errors.length === results.length) throw new Error('TheSportsDB 유럽 주요리그 순위 요청 실패');
  return {
    standings: tables,
    source: [...providers].join(' + ') || 'previous-data',
    usedPrevious,
    error: errors.length ? `${errors.length}개 리그 순위 갱신 실패` : null,
  };
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
const season = currentSeason(parts);
const previous = await previousData();
const [matchesResult] = await Promise.allSettled([fetchMatches(date, previous.matches || [])]);
await wait(650);
const [standingsResult] = await Promise.allSettled([
  fetchStandings(season, previous.standings || [], previous.sources?.standings),
]);

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
  if (!selectedMatches.length && previous.date === date && previous.matches?.length) {
    selectedMatches = previous.matches;
    matchesState = 'fallback';
    matchesSource = previous.sources?.matches || previous.status?.matches?.source || 'previous-data';
  }
}

let selectedStandings = [];
let standingsState = 'unavailable';
let standingsSource = 'none';
let standingsError = null;
if (standingsResult.status === 'fulfilled') {
  selectedStandings = standingsResult.value.standings;
  standingsState = selectedStandings.length
    ? (standingsResult.value.usedPrevious ? 'fallback' : 'ok')
    : 'empty';
  standingsSource = standingsResult.value.source;
  standingsError = standingsResult.value.error;
} else if (previous.standings?.length) {
  selectedStandings = previous.standings;
  standingsState = 'fallback';
  standingsSource = previous.sources?.standings || previous.status?.standings?.source || 'previous-data';
  standingsError = standingsResult.reason.message;
}

const dataWithoutTimestamp = {
  date,
  matches: selectedMatches,
  standings: selectedStandings,
  status: {
    matches: {
      state: matchesState,
      source: matchesSource,
      error: matchesResult.status === 'rejected' ? matchesResult.reason.message : null,
    },
    standings: {
      state: standingsState,
      source: standingsSource,
      error: standingsError,
    },
  },
  sources: {
    matches: matchesSource,
    standings: standingsSource,
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

if (matchesResult.status === 'rejected') console.warn(`TheSportsDB final: ${matchesResult.reason.message}`);
if (standingsResult.status === 'rejected') console.warn(`TheSportsDB standings final: ${standingsResult.reason.message}`);
