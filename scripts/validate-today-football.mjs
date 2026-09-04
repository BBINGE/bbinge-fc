import { readFile } from 'node:fs/promises';

const KST_OFFSET = 9 * 60 * 60 * 1000;
const shifted = new Date(Date.now() + KST_OFFSET);
const today = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
const data = JSON.parse(await readFile('src/data/today-football.json', 'utf8'));
const allowed = new Set(['ok', 'fallback', 'empty', 'unavailable']);
const liveStatuses = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'IN_PLAY', 'PAUSED']);
const liveStatusMaxAge = 4 * 60 * 60 * 1000;
const errors = [];

if (data.date !== today) errors.push(`date mismatch: expected ${today}, received ${data.date}`);
if (!allowed.has(data.status?.matches?.state)) errors.push('matches status missing or invalid');
if (!allowed.has(data.status?.standings?.state)) errors.push('standings status missing or invalid');
if (data.status?.matches?.state === 'ok' && !data.matches?.length) errors.push('matches state is ok but matches are empty');
if (data.status?.matches?.state === 'empty' && data.matches?.length) errors.push('matches state is empty but matches exist');
if ((data.matches?.length ?? 0) > 12) errors.push('matches exceed display limit of 12');
if (new Set((data.matches ?? []).map((match) => match.id)).size !== (data.matches?.length ?? 0)) errors.push('duplicate match ids');
for (const match of data.matches ?? []) {
  const homeHasScore = Number.isInteger(match.homeScore) && match.homeScore >= 0;
  const awayHasScore = Number.isInteger(match.awayScore) && match.awayScore >= 0;
  if (homeHasScore !== awayHasScore) errors.push(`incomplete score pair: ${match.id}`);
  if (!match.home || !match.away) errors.push(`team name missing: ${match.id}`);
  const kickoff = Date.parse(`${match.date}T${match.time || '00:00'}:00+09:00`);
  if (liveStatuses.has(String(match.status || '').trim().toUpperCase()) && Number.isFinite(kickoff) && Date.now() - kickoff >= liveStatusMaxAge) {
    errors.push(`stale live status: ${match.id}`);
  }
}
if ((data.standings?.length ?? 0) > 5) errors.push('standings exceed display limit of 5 leagues');
for (const table of data.standings ?? []) {
  if (!table.leagueId || !table.league || !table.season) errors.push('standings league metadata missing');
  if (!table.rows?.length || table.rows.length > 24) errors.push(`invalid standings row count: ${table.leagueId}`);
  for (const row of table.rows ?? []) {
    const numericFields = ['rank', 'played', 'wins', 'draws', 'losses', 'goalsFor', 'goalsAgainst', 'goalDifference', 'points'];
    if (!row.team || numericFields.some((field) => !Number.isInteger(row[field]))) {
      errors.push(`invalid standings row: ${table.leagueId}`);
    }
    if (row.played !== row.wins + row.draws + row.losses) errors.push(`standings W-D-L mismatch: ${table.leagueId} ${row.team}`);
    if (row.goalDifference !== row.goalsFor - row.goalsAgainst) errors.push(`standings goal difference mismatch: ${table.leagueId} ${row.team}`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({ date: data.date, matches: data.status.matches, standings: data.status.standings }));
