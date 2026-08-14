import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const outputPath = resolve(process.argv[2] || 'src/data/today-football.json');
const KST_OFFSET = 9 * 60 * 60 * 1000;

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

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBirthday(month, day) {
  const query = `
SELECT ?person ?personLabel ?birth ?sitelinks WHERE {
  ?person wdt:P106/wdt:P279* wd:Q937857;
          wdt:P569 ?birth;
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
  });
  const row = payload?.results?.bindings?.[0];
  if (!row?.personLabel?.value || !row?.birth?.value) return null;
  const born = new Date(row.birth.value);
  return {
    name: row.personLabel.value,
    birthYear: born.getUTCFullYear(),
    wikidataUrl: row.person.value,
  };
}

async function fetchMatches(date) {
  const url = new URL('https://www.thesportsdb.com/api/v1/json/123/eventsday.php');
  url.searchParams.set('d', date);
  url.searchParams.set('s', 'Soccer');
  const payload = await fetchJson(url, { headers: { Accept: 'application/json' } });
  const events = Array.isArray(payload?.events) ? payload.events : [];
  return events.map((event) => {
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
      league: event.strLeague || '축구 경기',
      home: event.strHomeTeam || '',
      away: event.strAwayTeam || '',
      time: koreaTime,
      date: koreaDate,
    };
  }).filter((event) => event.home && event.away && event.date === date).slice(0, 3);
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

const data = {
  date,
  updatedAt: new Date().toISOString(),
  birthday: birthdayResult.status === 'fulfilled' && birthdayResult.value
    ? birthdayResult.value
    : previous.date === date ? previous.birthday ?? null : null,
  matches: matchesResult.status === 'fulfilled' && matchesResult.value.length
    ? matchesResult.value
    : previous.date === date ? previous.matches ?? [] : [],
  sources: {
    birthday: 'Wikidata',
    matches: 'TheSportsDB',
  },
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(data));

if (birthdayResult.status === 'rejected') console.warn(`Wikidata: ${birthdayResult.reason.message}`);
if (matchesResult.status === 'rejected') console.warn(`TheSportsDB: ${matchesResult.reason.message}`);
