import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expandFootballTies, renderEuropeanCupMilestone, renderResultTable, renderTie, renderTopScorers, resolveClub } from './render-football-ties.mjs';
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
assert.equal((source.match(/data-football-results="1955-56-european-cup:/g)??[]).length,2);
assert(!source.includes('class="cup-result-scroll"'), '결과표는 원고에 손으로 쓰지 않고 대진 데이터에서 만든다');
const results5556=['16강','8강'].map(stage=>renderResultTable('1955-56-european-cup',stage)).join('');
assert.equal((results5556.match(/<tr><td class="cup-result-match">/g)??[]).length,12);
assert.equal((results5556.match(/class="cup-result-crest"><img/g)??[]).length,36, '대진 24칸 + 진출 12칸 로고');
assert.equal((results5556.match(/class="cup-result-flag"/g)??[]).length,24, '국기는 대진 칸에만');
assert(!results5556.includes('재경기'));
assert(!source.includes('background-position'));
for (const name of ['스포르팅 CP','FK 파르티잔','RSC 안데를레흐트','세르베트 FC','로트바이스 에센','히버니언 FC','유고덴 IF','그바르디아 바르샤바','오르후스 GF','스타드 드 랭스','SK 라피트 빈','PSV 에인트호번','AC 밀란','1. FC 자르브뤼켄']) assert(results5556.includes(name), name);
assert(results5556.includes('/images/flags/es-1945.png'));
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
const winners5657 = ['보루시아 도르트문트','FC 디나모 부쿠레슈티','슬로반 ÚNV 브라티슬라바','맨체스터 유나이티드 FC','OGC 니스','아틀레틱 클루브','맨체스터 유나이티드 FC','CDNA 소피아','OGC 니스','그라스호퍼 클럽 취리히','레알 마드리드 CF','AC 피오렌티나','FK 츠르베나 즈베즈다','아틀레틱 클루브','맨체스터 유나이티드 FC','AC 피오렌티나','레알 마드리드 CF','FK 츠르베나 즈베즈다'];
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
assert(resolveClub('rapid','1956-57').crest.src.endsWith('rapid-supplied.jfif'), '라피트 제공 문장은 1919/1935-1968 도안 대조 뒤 1956-57 확장');
for (const id of ['grasshopper','norrkoping','spora','aarhus']) assert(resolveClub(id,'1956-57').crest, id + ' 1956-57 대체 문장');
assert.equal(resolveClub('athletic-club','1956-57').name, '아틀레틱 클루브');
assert(resolveClub('athletic-club','1956-57').crest.src.endsWith('athletic-club-1941.webp'));
assert(resolveClub('cwks-warszawa','1956-57').crest.src.endsWith('cwks-warszawa-1950.webp'));
const crestSlots5657 = Array.from({length:18},(_,i)=>renderTie('1956-57-european-cup',`match-${i+1}`)).join('');
assert.equal((crestSlots5657.match(/class="cup-club-crest"/g) ?? []).length, 36, '1956-57 대진 카드 로고 36칸');
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
assert.equal((source5657.match(/data-football-results="1956-57-european-cup:/g)??[]).length,3);
const results5657=['예선','16강','8강'].map(stage=>renderResultTable('1956-57-european-cup',stage));
assert(results5657[0].includes('has-replay') && results5657[1].includes('has-replay') && !results5657[2].includes('has-replay'), '재경기 열은 재경기가 있는 단계에만');
assert.equal((results5657.join('').match(/class="cup-result-crest"><img/g)??[]).length,54, '대진 36칸 + 진출 18칸 로고');
assert(results5657.join('').includes('/images/flags/bg-1948.svg') && results5657.join('').includes('/images/flags/ro-1952.svg'));
assert(results5657[0].includes('data-label="재경기">7-0'));
// 1955-56 득점 순위: RSSSF·UEFA 일치 9명, 공동 순위 규칙, 시즌 문장.
const scorers5556 = renderTopScorers('1955-56');
assert.equal((scorers5556.match(/<tr[ >]/g) ?? []).length, 10, '머리글 1행 + 선수 9행');
for (const [rank, name, goals] of [['1위','밀로시 밀루티노비치',8],['공동 2위','레옹 글로바츠키',6],['공동 2위','펄로타시 페테르',6],['공동 4위','르네 블리아르',5],['공동 4위','알프레도 디스테파노',5],['공동 4위','엑토르 리알',5],['공동 7위','런토시 미하이',4],['공동 7위','군나르 노르달',4],['공동 7위','미셸 르블롱',4]]) {
  assert(new RegExp(rank + '</td><td class="cup-scorer-player"><strong>' + name + '</strong>').test(scorers5556), name + ' 순위');
  assert(scorers5556.includes(name + '</strong>') && scorers5556.includes('data-label="득점">' + goals + '골'), name + ' 골');
}
assert.equal((scorers5556.match(/class="is-top"/g) ?? []).length, 1);
assert.equal((scorers5556.match(/cup-result-crest"><img/g) ?? []).length, 9, '득점자 9명 클럽 문장');
assert(expandFootballTies('<div data-european-cup-scorers="1955-56"></div>').includes('cup-scorer-table'));
assert.throws(() => renderTopScorers('1999-00'), /Unknown top scorers season/);
const scorerSource = readFileSync(new URL('../src/content/archive/1955-56-european-cup-top-scorers.md', import.meta.url), 'utf8');
assert.equal((scorerSource.match(/data-european-cup-scorers="1955-56"/g) ?? []).length, 1);
assert(!scorerSource.includes('<table'), '득점 순위표는 원고에 손으로 쓰지 않는다');
// 1956-57 득점 순위: RSSSF·UEFA 일치 8명(콜레프 3·4골 차이로 제외), 시대 국기·문장.
const scorers5657 = renderTopScorers('1956-57');
assert.equal((scorers5657.match(/<tr[ >]/g) ?? []).length, 9, '머리글 1행 + 선수 8행');
for (const [rank, name, goals, apps] of [['1위','데니스 바이올렛',9,6],['2위','토미 테일러',8,8],['3위','알프레도 디스테파노',7,8],['4위','알프레트 프라이슬러',6,5],['공동 5위','호세 루이스 아르테체',5,5],['공동 5위','자크 푸아',5,7],['공동 5위','보라 코스티치',5,6],['8위','자크 페브르',4,7]]) {
  const row = scorers5657.split('<tr').find(part => part.includes('<strong>' + name + '</strong>'));
  assert(row && row.includes('data-label="순위">' + rank + '</td>'), name + ' 순위');
  assert(row.includes('data-label="득점">' + goals + '골') && row.includes('data-label="출전">' + apps + '경기'), name + ' 골·출전');
}
assert(!scorers5657.includes('이반 콜레프'), '자료가 갈리는 콜레프는 표에서 제외');
assert.equal((scorers5657.match(/cup-result-crest"><img/g) ?? []).length, 8, '득점자 8명 클럽 문장');
assert(scorers5657.includes('/images/flags/es-1945.png'), '아르테체 1945-1977 스페인 국기');
const scorerSource5657 = readFileSync(new URL('../src/content/archive/1956-57-european-cup-top-scorers.md', import.meta.url), 'utf8');
assert.equal((scorerSource5657.match(/data-european-cup-scorers="1956-57"/g) ?? []).length, 1);
assert(!scorerSource5657.includes('<table'), '득점 순위표는 원고에 손으로 쓰지 않는다');
// 1948 남미 챔피언 오브 챔피언십 득점 순위: 출전 기록이 없는 대회라 출전 칸을 만들지 않는다.
const scorers1948 = renderTopScorers('1948');
assert.equal((scorers1948.match(/<tr[ >]/g) ?? []).length, 10, '머리글 1행 + 선수 9행');
assert(!scorers1948.includes('출전'), '출전 기록이 없으면 출전 칸을 두지 않는다');
for (const [rank, name, goals, origin] of [['1위','로베르토 카파렐리',7,'아르헨티나'],['2위','아틸리오 가르시아',5,'아르헨티나'],['공동 3위','알프레도 디스테파노',4,'아르헨티나'],['공동 3위','펠릭스 로우스타우',4,'아르헨티나'],['공동 3위','발테르 고메스',4,'우루과이'],['공동 3위','프리아사',4,'브라질'],['공동 3위','막시모 모스케라',4,'페루'],['공동 3위','페드로 로페스',4,'칠레'],['9위','렐레',3,'브라질']]) {
  const row = scorers1948.split('<tr').find(part => part.includes('<strong>' + name + '</strong>'));
  assert(row && row.includes('data-label="순위">' + rank + '</td>'), name + ' 순위');
  assert(row.includes('data-label="득점">' + goals + '골') && row.includes(origin), name + ' 골·출신');
}
// 경기별 득점자를 팀별로 더한 값이 최종 순위표의 득점 칸과 맞는 쪽을 따랐다. 자료가 갈리는 지점이라 숫자를 고정한다.
const record1948 = JSON.parse(readFileSync(new URL('../src/data/european-cup-scorers.json', import.meta.url), 'utf8')).seasons.find(item => item.season === '1948');
assert.equal(record1948.scorers.reduce((sum, p) => sum + p.goals, 0), 39, '표에 실은 아홉 명의 합계');
assert.equal(record1948.goals, 76, '대회 전체 득점');
assert.equal(record1948.matches, 21, '대회 경기 수');
assert(record1948.scorers.every(p => p.apps === undefined), '출전 기록은 비워 둔다');
const scorerSource1948 = readFileSync(new URL('../src/content/archive/1948-south-american-championship-of-champions-top-scorers.md', import.meta.url), 'utf8');
assert.equal((scorerSource1948.match(/data-european-cup-scorers="1948"/g) ?? []).length, 1);
assert(!scorerSource1948.includes('<table'), '득점 순위표는 원고에 손으로 쓰지 않는다');
// 1956-57 4강: 합계·결승 진출, 레알 두 번째 4강, 원고 자리표시.
for (const [id, total, winner] of [['match-1','0<i>:</i>1','AC 피오렌티나'], ['match-2','5<i>:</i>3','레알 마드리드 CF']]) {
  const html = renderTie('1956-57-european-cup-semifinals', id);
  assert(html.includes('<strong>' + total + '</strong>'), id + ' 합계');
  assert(html.includes('<dt>결승 진출</dt><dd>' + winner + '</dd>'), id + ' 결승 진출');
  assert(!html.includes('재경기'));
}
const semis5657 = renderEuropeanCupMilestone('1956-57', 'semi-finals');
assert.equal((semis5657.match(/통산 첫 4강 진출/g) ?? []).length, 3);
assert.equal((semis5657.match(/통산 두 번째 4강 진출/g) ?? []).length, 1);
const semiSource5657 = readFileSync(new URL('../src/content/archive/1956-57-european-cup-semifinals.md', import.meta.url), 'utf8');
assert.equal((semiSource5657.match(/data-football-tie="1956-57-european-cup-semifinals:/g) ?? []).length, 2);
assert.equal((semiSource5657.match(/data-european-cup-milestone="1956-57:semi-finals"/g) ?? []).length, 1);
assert(!semiSource5657.includes('ACF 피오렌티나 |') && !semiSource5657.includes('스타디온 파르티자나,'), '표·헤더는 당시 명칭');
// 1957-58 4강: 합계·결승 진출, 득점자 줄, 레알 세 번째·맨유 두 번째·밀란 두 번째·버셔시 첫 4강.
for (const [id, total, winner] of [['match-1','4<i>:</i>2','레알 마드리드 CF'], ['match-2','2<i>:</i>5','AC 밀란']]) {
  const html = renderTie('1957-58-european-cup-semifinals', id);
  assert(html.includes('<strong>' + total + '</strong>'), '1957-58 4강 ' + id + ' 합계');
  assert(html.includes('<dt>결승 진출</dt><dd>' + winner + '</dd>'), '1957-58 4강 ' + id + ' 결승 진출');
  assert(!html.includes('재경기'));
}
assert(renderTie('1957-58-european-cup-semifinals','match-1').includes('<span class="cup-goal">디스테파노 9분 42분(PK) 50분</span>'), '1957-58 4강 카드 득점자');
assert(renderTie('1957-58-european-cup-semifinals','match-2').includes('<span class="cup-goal">E. 테일러 80분(PK)</span>'));
const semis5758 = renderEuropeanCupMilestone('1957-58', 'semi-finals');
assert.deepEqual([(semis5758.match(/통산 세 번째 4강 진출/g) ?? []).length, (semis5758.match(/통산 두 번째 4강 진출/g) ?? []).length, (semis5758.match(/통산 첫 4강 진출/g) ?? []).length], [1, 2, 1]);
const semiSource5758 = readFileSync(new URL('../src/content/archive/1957-58-european-cup-semifinals.md', import.meta.url), 'utf8');
assert.equal((semiSource5758.match(/data-football-tie="1957-58-european-cup-semifinals:/g) ?? []).length, 2);
assert.equal((semiSource5758.match(/data-european-cup-milestone="1957-58:semi-finals"/g) ?? []).length, 1);
assert(semiSource5758.includes('| 4강 2차전 | 1958.04.16 | 버셔시 SC'), '버셔시-레알 2차전은 4월 16일 부다페스트(도판의 산 시로 표기를 따르지 않는다)');
// 1956-57 결승 H/L: 레알 두 번째 결승·우승, 피오렌티나 첫 결승·준우승, 원고 자리표시.
const final5657 = renderEuropeanCupMilestone('1956-57', 'final');
assert.equal((final5657.match(/class="cup-entrant-club"/g) ?? []).length, 2);
assert.equal((final5657.match(/통산 두 번째 결승 진출/g) ?? []).length, 1);
assert.equal((final5657.match(/통산 첫 결승 진출/g) ?? []).length, 1);
assert(renderEuropeanCupMilestone('1956-57', 'runners-up').includes('통산 첫 유러피언컵 준우승'));
assert(renderEuropeanCupMilestone('1956-57', 'runners-up').includes('AC 피오렌티나'));
const finalSource5657 = readFileSync(new URL('../src/content/articles/1956-57-european-cup-final-real-madrid-fiorentina.md', import.meta.url), 'utf8');
for (const stage of ['final', 'champions', 'runners-up']) assert.equal((finalSource5657.match(new RegExp('data-european-cup-milestone="1956-57:' + stage + '"', 'g')) ?? []).length, 1, stage);
assert(!finalSource5657.includes('ACF 피오렌티나'), '결승 원고는 당시 구단명 AC 피오렌티나를 쓴다');
// 1955-58 페어스컵 4강권: 대회명은 데이터에서, 버밍엄-바르셀로나 재경기, 두 경기 결승의 우승 칸.
const fairs = id => renderTie('1955-58-inter-cities-fairs-cup-semifinals-final', id);
assert(fairs('match-1').includes('1955-58 인터시티스 페어스컵 · 4강') && fairs('match-1').includes('<dt>결승 진출</dt><dd>런던 XI</dd>'));
assert(fairs('match-2').includes('<dt>재경기</dt><dd>1 : 2</dd>') && fairs('match-2').includes('<dt>결승 진출</dt><dd>CF 바르셀로나</dd>'));
assert(fairs('match-3').includes('<dt>결승 1차전</dt><dd>2 : 2</dd>') && fairs('match-3').includes('<strong>2<i>:</i>8</strong>') && fairs('match-3').includes('<dt>우승</dt><dd>CF 바르셀로나</dd>'));
assert(!fairs('match-3').includes('유러피언컵'));
assert.equal((fairs('match-2').match(/class="cup-goal-row"/g) ?? []).length, 3, '재경기 포함 득점자 줄 3개');
assert(fairs('match-3').includes('<span class="cup-goal">수아레스 6분 8분</span>') && fairs('match-3').includes('득점 없음'));
assert(renderTie('1956-57-european-cup-semifinals', 'match-2').includes('<span class="cup-goal">디스테파노 73분</span>'), '유러피언컵 4강 카드 득점자');
assert(renderTie('1955-56-european-cup-semifinals', 'match-2').includes('달몬테 69분 86분(모두 PK)'));
assert(!renderTie('1956-57-european-cup', 'match-1').includes('cup-tie-goals'), '유러피언컵 16강·8강 카드에는 득점자 줄을 넣지 않는다');
const groupC = expandFootballTies('<div data-football-group="1955-58-inter-cities-fairs-cup:C"></div>');
assert(groupC.includes('<span class="cup-goal">에슈만 37분 43분 55분</span>'), '조별 경기 득점자');
assert.equal((expandFootballTies('<div data-football-group="1955-58-inter-cities-fairs-cup:B"></div>').match(/cup-group-goals--home/g) ?? []).length, 5, '0-0 경기는 득점자 줄 없음');
const fairsSource = readFileSync(new URL('../src/content/archive/1955-58-inter-cities-fairs-cup-semifinals-final.md', import.meta.url), 'utf8');
assert.equal((fairsSource.match(/data-football-tie="1955-58-inter-cities-fairs-cup-semifinals-final:match-\d"/g) ?? []).length, 3);

// 1957-58: 스물네 구단, 재경기 두 번(그중 하나는 동전 던지기), 세 번째 시즌 누적 횟수.
const expected5758 = [[3,7],[4,3],[1,14],[3,0],[4,4],[3,1],[2,9],[6,6],[1,8],[3,4],[1,4],[2,3],[3,1],[4,2],[5,5],[1,6],[5,4],[10,2],[2,6],[2,5]];
const winners5758 = ['버셔시 SC','레인저스 FC','FK 츠르베나 즈베즈다','오르후스 GF','SC 비스무트 카를마르크스슈타트','세비야 FC','맨체스터 유나이티드 FC','AC 밀란','레알 마드리드 CF','FK 츠르베나 즈베즈다','AFC 아약스','버셔시 SC','맨체스터 유나이티드 FC','세비야 FC','보루시아 도르트문트','AC 밀란','맨체스터 유나이티드 FC','레알 마드리드 CF','버셔시 SC','AC 밀란'];
const ties5758=JSON.parse(readFileSync(new URL('../src/data/cup-ties/1957-58-european-cup.json',import.meta.url),'utf8'));
for (let i = 0; i < 20; i++) {
  const html = renderTie('1957-58-european-cup', `match-${i+1}`);
  assert(html.includes(`<strong>${expected5758[i][0]}<i>:</i>${expected5758[i][1]}</strong>`), `1957-58 match-${i+1} aggregate`);
  const nextStage = i < 8 ? '16강' : i < 16 ? '8강' : '4강';
  assert(html.includes(`<dt>${nextStage} 진출</dt><dd>${winners5758[i]}</dd>`), `1957-58 match-${i+1} winner`);
  assert.equal((html.match(/class="cup-club-crest"/g) ?? []).length, 2, `1957-58 match-${i+1} 로고 두 칸`);
}
const coin5758 = renderTie('1957-58-european-cup','match-5');
assert(coin5758.includes('<dt>재경기</dt><dd>1 : 1 · 동전 던지기</dd>') && coin5758.includes('<small>동전 던지기로 결정</small>'), '재경기도 비기면 동전 던지기');
assert(renderTie('1957-58-european-cup','match-8').includes('<dt>재경기</dt><dd>4 : 2</dd>'));
assert(renderTie('1957-58-european-cup','match-15').includes('<dt>재경기</dt><dd>3 : 1</dd>'));
assert.equal(Object.values(ties5758.ties).filter(tie => tie.playoff).length, 3);
assert(renderResultTable('1957-58-european-cup','예선').includes('1-1 (동전)'));
assert.equal(resolveClub('wismut-karl-marx-stadt','1957-58').name, 'SC 비스무트 카를마르크스슈타트');
assert.equal(resolveClub('wismut-karl-marx-stadt','1957-58').flag.src, '/images/flags/de.svg', '1959년 이전 동독 국기는 문장 없는 흑적금');
assert.equal(resolveClub('glenavon','1957-58').flag.src, '/images/flags/gb-nir-1953.svg');
assert(renderTie('1957-58-european-cup','match-11').includes('<strong>SC 비스무트 카를마르크스<wbr>슈타트</strong>'), '긴 한 단어는 nameBreak 자리에서만 줄바꿈');
assert.equal(resolveClub('shamrock-rovers','1957-58').flag.src, '/images/flags/ie.svg');
assert.equal(resolveClub('stade-dudelange','1957-58').flag.src, '/images/flags/lu.svg', '도판의 체코 국기 오류를 따르지 않는다');
const season5758=cupHistory.seasons.find(record=>record.season==='1957-58');
assert.equal(season5758.entrants.length, 24);
for (const [stage,key] of [['예선','preliminary-round'],['16강','round-of-16'],['8강','quarter-finals']]) {
  const tieOrder=Object.values(ties5758.ties).filter(tie=>tie.stage===stage).flatMap(tie=>[tie.left,tie.right]);
  assert.deepEqual(season5758.stages[key],tieOrder);
}
const count5758 = (stage, phrase) => (renderEuropeanCupMilestone('1957-58', stage).match(new RegExp(phrase, 'g')) ?? []).length;
assert.deepEqual([count5758('competition','통산 세 번째 유러피언컵 출전'),count5758('competition','통산 두 번째 유러피언컵 출전'),count5758('competition','통산 첫 유러피언컵 출전')],[3,8,13]);
assert.deepEqual([count5758('round-of-16','통산 세 번째 16강 진출'),count5758('round-of-16','통산 두 번째 16강 진출'),count5758('round-of-16','통산 첫 16강 진출')],[1,7,8]);
assert.deepEqual([count5758('quarter-finals','통산 세 번째 8강 진출'),count5758('quarter-finals','통산 두 번째 8강 진출'),count5758('quarter-finals','통산 첫 8강 진출')],[1,3,4]);
assert.deepEqual([count5758('semi-finals','통산 세 번째 4강 진출'),count5758('semi-finals','통산 두 번째 4강 진출'),count5758('semi-finals','통산 첫 4강 진출')],[1,2,1]);
assert(renderEuropeanCupMilestone('1957-58', 'champions').includes('통산 세 번째 유러피언컵 우승'));
assert(!renderEuropeanCupMilestone('1956-57', 'champions').includes('세 번째'), '앞 시즌 표는 뒤 시즌 기록에 영향받지 않는다');
const source5758=readFileSync(new URL('../src/content/archive/1957-58-european-cup.md',import.meta.url),'utf8');
assert.equal((source5758.match(/data-football-tie="1957-58-european-cup:/g)??[]).length,20);
assert.equal((source5758.match(/data-football-results="1957-58-european-cup:/g)??[]).length,3);
console.log('대진·누적 기록 검수 통과: 1955-56 12개·1956-57 18개 합계, 재경기 3건, 대회/16강/8강/4강 횟수·시즌 자산·원고 분리, 1955-56 득점 순위 9명, 1956-57 4강 2개·결승 누적 3표, 1957-58 20개 합계·동전 던지기 1건·세 번째 시즌 누적·4강 2개');
