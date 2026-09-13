import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expandFootballTies, renderEuropeanCupMilestone, renderTie, resolveClub } from './render-football-ties.mjs';
const expected = [[5,8],[10,4],[0,7],[1,5],[4,1],[2,4],[6,2],[7,5],[1,4],[8,6],[4,3],[3,8]];
for (let i = 0; i < 12; i++) {
  const html = renderTie('1955-56-european-cup', `match-${i+1}`);
  assert(html.includes(`<strong>${expected[i][0]}<i>:</i>${expected[i][1]}</strong>`));
  assert(!html.includes('background-position'));
  assert.equal((html.match(/class="cup-side"/g) ?? []).length, 2);
  assert.equal((html.match(/class="cup-flag"/g) ?? []).length, 2);
  assert.equal((html.match(/class="cup-crest-slot"/g) ?? []).length, 2);
  assert.equal((html.match(/class="cup-flag-slot"/g) ?? []).length, 2);
  assert(!html.includes('cup-flag-emblem'));
}
assert(resolveClub('rapid','1955-56').crest.src.endsWith('rapid-supplied.jfif'));
assert(resolveClub('milan','1955-56').crest.src.endsWith('milan-1946.svg'));
assert.equal(resolveClub('real-madrid','1955-56').flag.src, '/images/flags/es-1945.png');
assert.throws(() => resolveClub('milan','1988-89'), /Unreviewed historical flag/);
assert.throws(() => resolveClub('unknown','1955-56'), /Unknown historical club/);
assert.throws(() => renderTie('../escape','match-1'), /Invalid/);
assert.throws(() => renderTie('1955-56-european-cup','match-99'), /Unknown tie/);
assert(expandFootballTies('<div data-football-tie="1955-56-european-cup:match-1"></div>').includes('class="cup-tie"'));
const participantTable = renderEuropeanCupMilestone('1955-56', 'competition');
assert.equal((participantTable.match(/class="cup-entrant-club"/g) ?? []).length, 16);
assert.equal((participantTable.match(/통산 첫 유러피언컵 출전/g) ?? []).length, 16);
assert(participantTable.includes('1955년 리그 최종 2위·미트로파컵 우승'));
assert(participantTable.includes('레알 마드리드 CF'));
const roundOf16Table = renderEuropeanCupMilestone('1955-56', 'round-of-16');
assert.equal((roundOf16Table.match(/class="cup-entrant-club"/g) ?? []).length, 16);
assert.equal((roundOf16Table.match(/통산 첫 16강 진출/g) ?? []).length, 16);
const quarterFinalTable = renderEuropeanCupMilestone('1955-56', 'quarter-finals');
assert.equal((quarterFinalTable.match(/class="cup-entrant-club"/g) ?? []).length, 8);
assert.equal((quarterFinalTable.match(/통산 첫 8강 진출/g) ?? []).length, 8);
const semifinalTable = renderEuropeanCupMilestone('1955-56', 'semi-finals');
assert.equal((semifinalTable.match(/class="cup-entrant-club"/g) ?? []).length, 4);
assert.equal((semifinalTable.match(/통산 첫 4강 진출/g) ?? []).length, 4);
const finalTable = renderEuropeanCupMilestone('1955-56', 'final');
assert.equal((finalTable.match(/class="cup-entrant-club"/g) ?? []).length, 2);
assert.equal((finalTable.match(/통산 첫 결승 진출/g) ?? []).length, 2);
assert(renderEuropeanCupMilestone('1955-56', 'champions').includes('통산 첫 유러피언컵 우승'));
assert(renderEuropeanCupMilestone('1955-56', 'runners-up').includes('통산 첫 유러피언컵 준우승'));
assert(expandFootballTies('<div data-european-cup-milestone="1955-56:champions"></div>').includes('레알 마드리드 CF'));
assert(expandFootballTies('<div data-european-cup-milestone="1955-56:quarter-finals"></div>').includes('통산 첫 8강 진출'));
assert.equal(expandFootballTies('<h3>그대로 보존</h3>'),'<h3>그대로 보존</h3>');
const source=readFileSync(new URL('../src/content/archive/1955-56-european-cup.md',import.meta.url),'utf8');
assert.equal((source.match(/data-football-tie=/g)??[]).length,12);
assert.equal((source.match(/data-european-cup-milestone=/g)??[]).length,3);
assert.equal((source.match(/class="cup-result-scroll"/g)??[]).length,2);
assert(!source.includes('background-position'));
for (const name of ['스포르팅 CP','FK 파르티잔','RSC 안데를레흐트','세르베트 FC','로트바이스 에센','히버니언 FC','유고덴 IF','그바르디아 바르샤바','오르후스 GF','스타드 드 랭스','SK 라피트 빈','PSV 에인트호번','AC 밀란','1. FC 자르브뤼켄']) assert(source.includes(name));
assert(source.includes('/images/flags/es-1945.png'));
assert(!source.includes('/images/flags/es-franco-civil.svg'));
const semifinalSource=readFileSync(new URL('../src/content/archive/1955-56-european-cup-semifinals.md',import.meta.url),'utf8');
assert.equal((semifinalSource.match(/data-european-cup-milestone=/g)??[]).length,1);
for (const name of ['스타드 드 랭스','히버니언 FC','레알 마드리드 CF','AC 밀란']) assert(semifinalSource.includes(name));
assert(!semifinalSource.includes('| 랭스 |'));
assert(!semifinalSource.includes('| 히버니언 |'));
assert(!/[|/]\s*레알:/.test(semifinalSource));
assert(!/[|/]\s*밀란:/.test(semifinalSource));
const cupHistory=JSON.parse(readFileSync(new URL('../src/data/european-cup-seasons.json',import.meta.url),'utf8'));
const cupTies=JSON.parse(readFileSync(new URL('../src/data/cup-ties/1955-56-european-cup.json',import.meta.url),'utf8'));
const firstSeason=cupHistory.seasons[0];
for (const [stage,key] of [['16강','round-of-16'],['8강','quarter-finals']]) {
  const tieOrder=Object.values(cupTies.ties).filter(tie=>tie.stage===stage).flatMap(tie=>[tie.left,tie.right]);
  assert.deepEqual(firstSeason.stages[key],tieOrder);
}
for (const [id, total, winner] of [['match-1','3<i>:</i>0','스타드 드 랭스'], ['match-2','5<i>:</i>4','레알 마드리드 CF']]) {
  const html = renderTie('1955-56-european-cup-semifinals', id);
  assert(html.includes(`<strong>${total}</strong>`));
  assert(html.includes('<dt>결승 진출</dt>'));
  assert(html.includes(winner));
  assert(html.includes('<dt>4강 1차전</dt>'));
  assert(html.includes('<dt>4강 2차전</dt>'));
  assert(!html.includes('<dt>4강 진출</dt>'));
}
// 1956-57: 예선 신설, 재경기 세 번, 두 번째 시즌 누적 횟수.
const expected5657 = [[5,5],[4,3],[4,2],[0,12],[2,6],[3,5],[3,2],[10,4],[3,3],[1,2],[5,5],[2,1],[3,6],[6,5],[5,6],[5,3],[6,2],[4,3]];
const winners5657 = ['보루시아 도르트문트','FC 디나모 부쿠레슈티','슬로반 ÚNV 브라티슬라바','맨체스터 유나이티드 FC','OGC 니스','아틀레티코 데 빌바오','맨체스터 유나이티드 FC','CDNA 소피아','OGC 니스','그라스호퍼 클럽 취리히','레알 마드리드 CF','AC 피오렌티나','FK 츠르베나 즈베즈다','아틀레티코 데 빌바오','맨체스터 유나이티드 FC','AC 피오렌티나','레알 마드리드 CF','FK 츠르베나 즈베즈다'];
const ties5657=JSON.parse(readFileSync(new URL('../src/data/cup-ties/1956-57-european-cup.json',import.meta.url),'utf8'));
for (let i = 0; i < 18; i++) {
  const html = renderTie('1956-57-european-cup', `match-${i+1}`);
  assert(html.includes(`<strong>${expected5657[i][0]}<i>:</i>${expected5657[i][1]}</strong>`), `1956-57 match-${i+1} aggregate`);
  const nextStage = i < 6 ? '16강' : i < 14 ? '8강' : '4강';
  assert(html.includes(`<dt>${nextStage} 진출</dt><dd>${winners5657[i]}</dd>`), `1956-57 match-${i+1} winner`);
  assert.equal((html.match(/class="cup-crest-slot"/g) ?? []).length, 2);
}
for (const [id, replay] of [['match-1','7 : 0'],['match-9','1 : 3'],['match-11','2 : 0']]) {
  const html = renderTie('1956-57-european-cup', id);
  assert(html.includes('cup-leg-results--replay'));
  assert(html.includes(`<dt>재경기</dt><dd>${replay}</dd>`));
  assert(html.includes('<small>재경기로 결정</small>'));
}
assert.equal(Object.values(ties5657.ties).filter(tie => tie.playoff).length, 3);
assert(!renderTie('1956-57-european-cup','match-2').includes('재경기'));
assert(!resolveClub('rapid','1956-57').crest, '운영자 제공 라피트 문장은 1956-57로 자동 확장하지 않는다');
assert(resolveClub('real-madrid','1956-57').crest.src.endsWith('real-madrid-1941.svg'));
assert.equal(resolveClub('cdna-sofia','1956-57').flag.src, '/images/flags/bg-1948.svg');
assert.throws(() => resolveClub('cdna-sofia','1955-56'), /Unreviewed historical flag/);
const season5657=cupHistory.seasons.find(record=>record.season==='1956-57');
assert.equal(season5657.entrants.length, 22);
for (const [stage,key] of [['예선','preliminary-round'],['16강','round-of-16'],['8강','quarter-finals']]) {
  const tieOrder=Object.values(ties5657.ties).filter(tie=>tie.stage===stage).flatMap(tie=>[tie.left,tie.right]);
  assert.deepEqual(season5657.stages[key],tieOrder);
}
const competition5657 = renderEuropeanCupMilestone('1956-57', 'competition');
assert.equal((competition5657.match(/class="cup-entrant-club"/g) ?? []).length, 22);
assert.equal((competition5657.match(/통산 두 번째 유러피언컵 출전/g) ?? []).length, 4);
assert.equal((competition5657.match(/통산 첫 유러피언컵 출전/g) ?? []).length, 18);
const r16_5657 = renderEuropeanCupMilestone('1956-57', 'round-of-16');
assert.equal((r16_5657.match(/통산 두 번째 16강 진출/g) ?? []).length, 2);
assert.equal((r16_5657.match(/통산 첫 16강 진출/g) ?? []).length, 14);
const qf5657 = renderEuropeanCupMilestone('1956-57', 'quarter-finals');
assert.equal((qf5657.match(/통산 두 번째 8강 진출/g) ?? []).length, 1);
assert.equal((qf5657.match(/통산 첫 8강 진출/g) ?? []).length, 7);
assert(renderEuropeanCupMilestone('1956-57', 'champions').includes('통산 두 번째 유러피언컵 우승'));
assert(!renderEuropeanCupMilestone('1955-56', 'champions').includes('번째'), '앞 시즌 표는 뒤 시즌 기록에 영향받지 않는다');
const source5657=readFileSync(new URL('../src/content/archive/1956-57-european-cup.md',import.meta.url),'utf8');
assert.equal((source5657.match(/data-football-tie="1956-57-european-cup:/g)??[]).length,18);
assert(!source5657.includes('| 로다 JC'), '결과표는 당시 구단명 라피트 JC를 쓴다');
assert(!source5657.includes('| ACF 피오렌티나'), '결과표는 당시 구단명 AC 피오렌티나를 쓴다');
assert(source5657.includes('/images/flags/bg-1948.svg') && source5657.includes('/images/flags/ro-1952.svg'));
console.log('대진·누적 기록 검수 통과: 1955-56 12개·1956-57 18개 합계, 재경기 3건, 대회/16강/8강/4강 횟수·시즌 자산·원고 분리');
