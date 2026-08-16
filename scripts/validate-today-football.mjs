import { readFile } from 'node:fs/promises';

const KST_OFFSET = 9 * 60 * 60 * 1000;
const shifted = new Date(Date.now() + KST_OFFSET);
const today = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
const data = JSON.parse(await readFile('src/data/today-football.json', 'utf8'));
const allowed = new Set(['ok', 'fallback', 'empty', 'unavailable']);
const errors = [];

if (data.date !== today) errors.push(`date mismatch: expected ${today}, received ${data.date}`);
if (!allowed.has(data.status?.birthday?.state)) errors.push('birthday status missing or invalid');
if (!allowed.has(data.status?.matches?.state)) errors.push('matches status missing or invalid');
if (data.status?.matches?.state === 'ok' && !data.matches?.length) errors.push('matches state is ok but matches are empty');
if (data.status?.matches?.state === 'empty' && data.matches?.length) errors.push('matches state is empty but matches exist');
if (['ok', 'fallback'].includes(data.status?.birthday?.state) && !data.birthday?.name) errors.push('birthday data missing');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({ date: data.date, birthday: data.status.birthday, matches: data.status.matches }));
