#!/usr/bin/env node
// 팝업관 이름 데이터 검수(2026-09-16).
// 팝업 카드의 선수·구단 한글명은 본문 검수(validate-editorial-writing)와 선수 아카이브 검수를 거치지 않는 JSON 데이터라
// 「사비 알론소」 같은 이미 틀린 것으로 확정된 표기가 그대로 들어간 적이 있다. 그 재발을 막는 검수다.
// 1) 이미 틀린 표기로 확정된 이름을 쓰지 않는다.
// 2) 같은 원어 이름을 사이트의 다른 데이터나 다른 팝업과 다르게 적지 않는다.
// 3) 득점자 줄에 쓰는 구단 약칭 사전이 두 팝업의 모든 구단을 덮고, 약칭이 서로 겹치지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

const comebacks = read('src/data/popup/comebacks-names.json');
const dungi = read('src/data/popup/bayern-dungi-names.json');
const nicknames = read('src/data/popup/club-nicknames.json');
const haechuk = read('src/data/haechuk-players.json');

// 확정된 오표기. 선수 아카이브 검수(validate-player-archives.mjs)의 knownWrongNames와 같은 기준이다.
const knownWrongNames = new Map([
  ['사비 알론소', '샤비 알론소'],
  ['사비 에르난데스', '차비 에르난데스'],
  ['피에르에메리크 오바메양', '피에르에므리크 오바므양'],
  ['피에르에메릭 오바메양', '피에르에므리크 오바므양'],
  ['헤나투 산셰스', '헤나투 산시스'],
  ['헤나투 산체스', '헤나투 산시스'],
  ['주제 모리뉴', '조제 모리뉴'],
  ['클라렌서 세도르프', '클라렌스 세도르프'],
  ['마리우 코르소', '마리오 코르소'],
  ['리우데자네이루', '히우지자네이루'],
  ['라울레', '라울헤'],
]);

const failures = [];
const popups = [
  ['역전극', comebacks],
  ['둔기론', dungi],
];

for (const [label, data] of popups) {
  for (const [original, ko] of Object.entries(data.players)) {
    for (const [wrong, correct] of knownWrongNames) {
      if (ko.includes(wrong)) failures.push(`${label}: ${original}의 '${ko}'는 '${correct}' 표기를 써야 한다.`);
    }
  }
}

// 같은 원어 이름은 사이트 전체에서 한 가지 한글명으로 적는다.
const dictionary = new Map();
for (const player of Object.values(haechuk)) {
  if (player.original && player.ko) dictionary.set(player.original, { ko: player.ko, source: '오늘 밤 해축 선수 사전' });
}
for (const [label, data] of popups) {
  for (const [original, ko] of Object.entries(data.players)) {
    const known = dictionary.get(original);
    if (!known) { dictionary.set(original, { ko, source: `${label} 팝업` }); continue; }
    if (known.ko !== ko) failures.push(`${label}: ${original}을 '${ko}'로 적었지만 ${known.source}는 '${known.ko}'다.`);
  }
}

// 득점자 줄 약칭 사전.
const clubs = new Set([...Object.values(comebacks.teams), ...Object.values(dungi.teams), 'FC 바이에른 뮌헨']);
for (const club of clubs) {
  if (!nicknames[club]) failures.push(`구단 약칭 없음: ${club}. src/data/popup/club-nicknames.json에 추가한다.`);
}
const byNickname = new Map();
for (const [club, nickname] of Object.entries(nicknames)) {
  if (club === '//') continue;
  const seen = byNickname.get(nickname);
  if (seen) failures.push(`약칭 중복: '${nickname}'을 ${seen}와 ${club}가 함께 쓴다.`);
  else byNickname.set(nickname, club);
}

if (failures.length > 0) {
  console.error('팝업관 이름 검수 실패');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`팝업관 이름 검수 통과 (선수 ${Object.keys(comebacks.players).length + Object.keys(dungi.players).length}명, 구단 약칭 ${clubs.size}개)`);
