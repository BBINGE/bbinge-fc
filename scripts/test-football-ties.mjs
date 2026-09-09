import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expandFootballTies, renderTie, resolveClub } from './render-football-ties.mjs';
const expected = [[5,8],[10,4],[0,7],[1,5],[4,1],[2,4],[6,2],[7,5],[1,4],[8,6],[4,3],[3,8]];
for (let i = 0; i < 12; i++) {
  const html = renderTie('1955-56-european-cup', `match-${i+1}`);
  assert(html.includes(`<strong>${expected[i][0]}<i>:</i>${expected[i][1]}</strong>`));
  assert(!html.includes('background-position'));
  assert.equal((html.match(/class="cup-side"/g) ?? []).length, 2);
  assert.equal((html.match(/class="cup-flag"/g) ?? []).length, 2);
}
assert.equal(resolveClub('rapid','1955-56').crest, undefined);
assert(resolveClub('milan','1955-56').crest.src.endsWith('milan-1946.svg'));
assert.throws(() => resolveClub('milan','1988-89'), /Unreviewed historical flag/);
assert.throws(() => resolveClub('unknown','1955-56'), /Unknown historical club/);
assert.throws(() => renderTie('../escape','match-1'), /Invalid/);
assert.throws(() => renderTie('1955-56-european-cup','match-99'), /Unknown tie/);
assert(expandFootballTies('<div data-football-tie="1955-56-european-cup:match-1"></div>').includes('class="cup-tie"'));
assert.equal(expandFootballTies('<h3>그대로 보존</h3>'),'<h3>그대로 보존</h3>');
const source=readFileSync(new URL('../src/content/archive/1955-56-european-cup.md',import.meta.url),'utf8');
assert.equal((source.match(/data-football-tie=/g)??[]).length,12);
assert(!source.includes('background-position'));
console.log('대진 카드 검수 통과: 12개 합계·시즌 자산·미확인 국기 전용·원고 분리');
