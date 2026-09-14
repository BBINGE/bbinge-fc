import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readAwardEdition, expandAwardRecords, resolveHistoricalIdentity } from './render-award-records.mjs';

// 1957년 발롱도르: 경기별 원장 → 기록 패널 수치, 발표 원자료의 241점(5위표 17장) 예외, 공유 정체성 연도.
const data = readAwardEdition('1957-ballon-dor');
const ledger = JSON.parse(readFileSync('docs/editorial/1957-ballon-dor-stat-ledger.json', 'utf8'));
const source = readFileSync('src/content/archive/1957-ballon-dor-alfredo-di-stefano.md', 'utf8');
const sum = games => [games.length, games.reduce((n, game) => n + game.goals, 0)];
const label = ([apps, goals]) => apps === 0 ? '0경기' : `${apps}경기 ${goals}골`;

const expectations = [
  { id: 135778, season: [41, 41], club: [39, 32], national: [7, 7], total: [46, 39] },
  { id: 215272, season: [42, 0], club: [42, 0], national: [7, 0], total: [49, 0] },
  { id: 170730, season: [30, 8], club: [34, 10], national: [0, 0], total: [34, 10] },
  { id: 289544, season: [48, 6], club: [50, 8], national: [7, 2], total: [57, 10] },
];
const panels = [...source.matchAll(/<ul class="award-stat-list">([\s\S]*?)<\/ul>/g)].map(m => m[1]);
assert.equal(panels.length, 4, '포디움 네 명의 스탯 패널');
for (const [index, expected] of expectations.entries()) {
  const games = ledger.players.find(player => player.id === expected.id).games;
  assert.equal(new Set(games.map(game => game.id)).size, games.length, 'no duplicated appearance');
  const annual = games.filter(game => game.date.startsWith('1957'));
  const actual = {
    season: sum(games.filter(game => game.season === 1956 && !game.national)),
    club: sum(annual.filter(game => !game.national)),
    national: sum(annual.filter(game => game.national)),
    total: sum(annual),
  };
  assert.deepEqual(actual, { season: expected.season, club: expected.club, national: expected.national, total: expected.total }, 'ledger ' + expected.id);
  const panel = panels[index];
  assert(panel.includes(`1956-57 클럽 공식전 합계</span><strong>${label(actual.season)}`), 'season total ' + expected.id);
  assert(panel.includes(`1957년 클럽 공식전</span><strong>${label(actual.club)}`), 'annual club ' + expected.id);
  assert(panel.includes(`1957년 국가대표팀</span><strong>${label(actual.national)}`), 'national ' + expected.id);
  assert(panel.includes(`1957년 클럽＋국가대표팀 합계</span><strong>${label(actual.total)}`), 'annual total ' + expected.id);
}

assert.equal(data.ranking.length, 23);
assert.equal(data.ranking.reduce((total, row) => total + row.points, 0), 241);
assert.deepEqual(data.weights.map((_, i) => data.ranking.reduce((total, row) => total + row.votes[i], 0)), [16, 16, 16, 16, 17]);
assert.throws(() => readAwardEdition('1957-ballon-dor-missing'));
assert.equal(data.ranking.find(row => row.original === 'Igor Netto').clubs[0], 'FC 스파르타크 모스크바');
assert.equal((source.match(/data-award-record="1957-ballon-dor:identity-[a-z-]+"/g) ?? []).length, 4);
const html = expandAwardRecords(source);
assert.equal((html.match(/class="identity-row/g) ?? []).length, 14, '3 + 4 + 3 + 4 identity rows');
assert(html.includes('<th scope="col">1957년 소속 구단</th>'));
assert.equal(resolveHistoricalIdentity('wolves', 1957).src, '/images/archive/identity/wolves-1960.gif');
assert.throws(() => resolveHistoricalIdentity('wolves', 1956));
console.log('1957 BALLON D’OR DATA: PASS');
