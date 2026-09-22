import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readAwardEdition, expandAwardRecords, resolveHistoricalIdentity } from './render-award-records.mjs';

// 1958년 발롱도르: 경기별 원장 → 기록 패널 수치, 발표 원자료 240점, 서독·로트바이스 에센 정체성.
const data = readAwardEdition('1958-ballon-dor');
const ledger = JSON.parse(readFileSync('docs/editorial/1958-ballon-dor-stat-ledger.json', 'utf8'));
const source = readFileSync('src/content/archive/1958-ballon-dor-raymond-kopa.md', 'utf8');
const sum = games => [games.length, games.reduce((n, game) => n + game.goals, 0)];
const label = ([apps, goals]) => apps === 0 ? '0경기' : `${apps}경기 ${goals}골`;

const expectations = [
  { id: 170730, season: [34, 11], club: [34, 11], national: [7, 4], total: [41, 15] },
  { id: 89228, season: [27, 8], club: [24, 9], national: [11, 10], total: [35, 19] },
  { id: 151245, season: [32, 39], club: [40, 48], national: [12, 18], total: [52, 66] },
];
const panels = [...source.matchAll(/<section><h3>개인 스탯<\/h3>([\s\S]*?)<\/section>/g)].map(m => m[1]);
assert.equal(panels.length, 3, '포디움 세 명의 스탯 패널');
for (const [index, expected] of expectations.entries()) {
  const games = ledger.players.find(player => player.id === expected.id).games;
  assert.equal(new Set(games.map(game => game.id)).size, games.length, 'no duplicated appearance');
  const annual = games.filter(game => game.date.startsWith('1958'));
  const actual = {
    season: sum(games.filter(game => game.season === 1957 && !game.national)),
    club: sum(annual.filter(game => !game.national)),
    national: sum(annual.filter(game => game.national)),
    total: sum(annual),
  };
  assert.deepEqual(actual, { season: expected.season, club: expected.club, national: expected.national, total: expected.total }, 'ledger ' + expected.id);
  const panel = panels[index];
  assert(panel.includes(`1957-58 클럽 공식전 합계</span><strong>${label(actual.season)}`), 'season total ' + expected.id);
  assert(panel.includes(`1958년 클럽 공식전</span><strong>${label(actual.club)}`), 'annual club ' + expected.id);
  assert(panel.includes(`1958년 국가대표팀</span><strong>${label(actual.national)}`), 'national ' + expected.id);
  assert(panel.includes(`1958년 클럽＋국가대표팀 합계</span><strong>${label(actual.total)}`), 'annual total ' + expected.id);
  const spring = annual.filter(game => !game.national && game.season === 1957), autumn = annual.filter(game => !game.national && game.season === 1958);
  assert(panel.includes(`상반기 · 1957-58 시즌</span><strong>${label(sum(spring))}`) && panel.includes(`하반기 · 1958-59 시즌</span><strong>${label(sum(autumn))}`), 'half-year split ' + expected.id);
  assert.deepEqual([spring.length + autumn.length, sum(spring)[1] + sum(autumn)[1]], actual.club, 'split adds up ' + expected.id);
}

assert.equal(data.ranking.length, 26);
assert.equal(data.ranking.reduce((total, row) => total + row.points, 0), 240);
assert.deepEqual(data.weights.map((_, i) => data.ranking.reduce((total, row) => total + row.votes[i], 0)), [16, 16, 16, 16, 16]);
assert.equal(data.ranking.find(row => row.original === 'Ivan Kolev').points, 2, '운영자 원고에서 빠진 콜레프도 RSSSF대로 싣는다');
assert.equal(data.ranking.find(row => row.original === 'Johnny Haynes').points, 7, '헤인스 7점(원고 본문의 10점 아님)');
for (const [name, points, voters] of [['Raymond Kopa', 71, 15], ['Helmut Rahn', 40, 12], ['Just Fontaine', 23, 9]]) {
  const row = data.ranking.find(r => r.original === name);
  assert.equal(row.points, points);
  assert.equal(row.votes.reduce((a, b) => a + b, 0), voters, name + ' 선정 기자');
}
assert(source.includes('<strong>71점</strong><small>1위표 14장<br />선정 기자 15명</small>'));
assert(source.includes('<strong>40점</strong><small>1위표 없음<br />선정 기자 12명</small>'));
assert(source.includes('<strong>23점</strong><small>1위표 1장<br />선정 기자 9명</small>'));
assert.equal((source.match(/data-award-record="1958-ballon-dor:identity-[a-z-]+"/g) ?? []).length, 3);
const html = expandAwardRecords(source);
assert.equal((html.match(/class="identity-row/g) ?? []).length, 9, '3 + 3 + 3 identity rows');
assert.equal(resolveHistoricalIdentity('west-germany-team', 1958).src, '/images/archive/identity/germany-1950.png', '1950-1962 DFB 메달');
assert.throws(() => resolveHistoricalIdentity('west-germany-team', 1957));
console.log('1958 BALLON D’OR DATA: PASS');
