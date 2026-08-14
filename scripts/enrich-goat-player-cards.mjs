import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../src/data/goat-players.json', import.meta.url);
const data = JSON.parse(await readFile(path, 'utf8'));

const names = {
  shevchenko: '안드리 셰우첸코',
  albert: '얼베르트 플로리안',
  kocsis: '코치시 샨도르',
  hidegkuti: '히데그쿠티 난도르',
  bozsik: '보지크 요제프',
};

const greatness = {
  andrade: '1920년대 세계 축구가 처음 마주한 흑인 미드필더 슈퍼스타',
  puskas: '헝가리 황금세대의 주장, 대표팀 85경기 84골의 왼발',
  'di-stefano': '유러피언컵 5연패를 지휘한 레알 마드리드 최초의 절대자',
  pele: '월드컵을 세 번 들어 올린 축구 역사상 유일한 선수',
  eusebio: '벤피카와 포르투갈을 세계 정상권으로 끌어올린 득점왕',
  'denis-law': '맨체스터 유나이티드의 왕이 된 1964년 발롱도르',
  'george-best': '드리블과 스타성을 동시에 지배한 북아일랜드 최고의 재능',
  kopa: '레알의 유럽 제패를 완성한 프랑스 최초의 발롱도르',
  'luis-suarez-m': '스페인 남자 선수 최초의 발롱도르 수상자',
  schiaffino: '마라카나수와 밀란을 연결한 1950년대 최고의 플레이메이커',
  cruyff: '토털 풋볼을 한 선수의 몸으로 설명한 세 차례 발롱도르',
  neeskens: '압박·침투·득점을 모두 수행한 토털 풋볼의 엔진',
  beckenbauer: '리베로를 수비수가 아닌 경기 지휘자로 바꾼 황제',
  'gerd-muller': '작은 공간에서 골을 발명한 독일 축구 최고의 해결사',
  rummenigge: '속도와 파괴력으로 발롱도르를 연속 수상한 바이에른의 에이스',
  'falcao-paulo': '브라질 1982의 리듬을 설계한 완성형 중앙 미드필더',
  'carlos-alberto': '1970 브라질의 주장, 풀백 공격의 교과서가 된 결승골',
  maradona: '한 사람의 재능으로 나폴리와 아르헨티나의 운명을 바꾼 10번',
  passarella: '월드컵 우승을 이끈 주장, 공격력까지 갖춘 남미 최고의 센터백',
  kempes: '1978 월드컵 득점왕과 우승을 동시에 움켜쥔 아르헨티나의 영웅',
  dalglish: '리버풀 황금기의 공격과 우승 문화를 지배한 킹 케니',
  'paolo-rossi': '1982 월드컵을 해트트릭부터 결승골까지 끝낸 승부사',
  figueroa: '펠레 시대 남미에서 3년 연속 최고로 뽑힌 수비수',
  zidane: '월드컵과 유로, 챔피언스리그 결승을 지배한 큰 경기의 10번',
  cantona: '맨유의 우승 본능을 깨운 프리미어리그 시대의 첫 번째 왕',
  'ronaldo-r9': '속도·기술·결정력을 한 몸에 넣은 현대형 스트라이커의 원형',
  romario: '페널티박스 안 한 번의 터치로 1994 브라질을 우승시킨 골잡이',
  cafu: '월드컵 결승에 세 번 연속 선발로 나선 유일한 선수',
  'roberto-carlos': '왼쪽 측면을 혼자 점유한 역대 최고 공격형 풀백 후보',
  maldini: '25년 동안 세계 최고 수준을 유지한 수비의 기준점',
  buffon: '20년 넘게 정상급을 지킨 골키퍼 포지션의 절대 기준',
  baggio: '세리에 A의 수비를 상대로 예술과 득점을 함께 만든 판타지스타',
  batistuta: '강한 슈팅과 연속 득점으로 세리에 A를 폭격한 바티골',
  riquelme: '경기의 속도를 자신의 발밑에 묶어 둔 마지막 고전적 10번',
  zanetti: '인테르 858경기와 트레블을 완성한 측면의 철인',
  casillas: '레알과 스페인의 황금기를 문 앞에서 지킨 성 이케르',
  beckham: '오른발 킥 하나를 세계적인 전술 무기로 만든 맨유의 7번',
  scholes: '패스·중거리 슛·경기 조율을 겸비한 미드필더들의 교과서',
  kahn: '골키퍼 최초 월드컵 골든볼로 증명한 압도적 존재감',
  iniesta: '공간을 지우는 드리블과 결승골로 스페인의 황금기를 완성',
  'park-ji-sung': '압박과 활동량으로 유럽 최정상 전술에 들어간 아시아 미드필더',
  messi: '득점·도움·드리블을 모두 역사상 최고 수준으로 끌어올린 8회 발롱도르',
  neymar: '브라질의 10번 계보를 이은 동시대 최고의 일대일 공격수',
  zlatan: '네 개 리그에서 우승과 곡예 같은 득점을 반복한 장수 스트라이커',
  'luis-suarez': '압박·연계·득점을 모두 갖춘 2010년대 최고의 9번 후보',
  salah: '리버풀의 프리미어리그·유럽 제패를 이끈 이집트의 득점왕',
  'de-bruyne': '프리미어리그의 패스 각도와 속도를 다시 정의한 플레이메이커',
  pirlo: '낮은 위치에서 경기 전체를 설계한 레지스타의 완성형',
  'kim-min-jae': '나폴리 33년 만의 우승을 지탱한 세리에 A 최우수 수비수',
  scarone: '우루과이 최초의 세계 제패 시대를 대표한 당대 최고의 내부 공격수',
  coluna: '벤피카 유러피언컵 2연패를 지휘한 중원의 장군',
  greaves: '잉글랜드 1부 통산 357골을 남긴 페널티박스의 천재',
  vogts: '크라위프를 봉쇄하고 월드컵을 들어 올린 대인 수비의 표본',
  giggs: '프리미어리그 13회 우승을 관통한 맨유 왼쪽 측면의 상징',
  rodri: '맨체스터 시티의 트레블과 스페인의 유로 우승을 통제한 발롱도르',
  'nilton-santos': '축구사 이래 가장 완벽한 레프트백 TOP 5에 드는 선구자',
  neuer: '바이에른 전성기와 독일의 월드컵 우승을 완성한 스위퍼 키퍼',
};

const positionFallback = {
  GK: '시대를 대표해 골키퍼 포지션의 기준을 끌어올린 수문장',
  DF: '수비 방식과 빌드업의 기준을 바꾼 시대 대표 수비수',
  MF: '경기의 리듬과 공간을 지배한 시대 대표 미드필더',
  FW: '당대 수비가 가장 두려워한 시대 대표 공격수',
};

for (const player of data.players) {
  if (names[player.id]) player.name = names[player.id];
  if (player.id === 'neuer') player.clubs = ['바이에른 뮌헨'];
  player.greatness = greatness[player.id] || player.note || positionFallback[player.position];
}

await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
