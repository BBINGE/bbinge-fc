import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const archiveRoot = path.resolve('src/content/archive');
const playerTemplate = path.resolve('src/pages/archive/[branch]/[index]/[slug].astro');
const relatedAssetsComponent = path.resolve('src/components/RelatedAssets.astro');
const requiredHeadings = [
  /^## 삥이FC .+ 평가$/m,
  /^## .+ 프로필$/m,
  /^## 역대 클럽·국대 기록$/m,
  /^## 역대 등번호$/m,
  /^## .+의 개인 커리어 수상 경력$/m,
  /^## 참고 자료$/m,
];
const bannedPublicPhrases = [
  '운영자 제공',
  '사진 자료',
  '저본',
  '직접 선별',
  '개정판',
  'AI 작업',
];
const knownWrongNames = new Map([
  ['사비 알론소', '샤비 알론소'],
  ['조제 모리뉴', '주제 모리뉴'],
  ['클라렌서 세도르프', '클라렌스 세도르프'],
  ['마리우 코르소', '마리오 코르소'],
  ['리우데자네이루', '히우지자네이루'],
  ['라울레', '라울헤'],
]);
const needlessClubNotes = [
  'Liverpool Football Club;',
  'Real Madrid Club de Fútbol;',
  'Associazione Calcio Milan;',
  'Fußball-Club Bayern München;',
  'Manchester United Football Club;',
  'Manchester City Football Club;',
];
const shortenedClubNames = new Map([
  ['리버 플레이트', 'CA 리버 플레이트'],
  ['우라칸', 'CA 우라칸'],
  ['미요나리오스', '미요나리오스 FC'],
  ['레알 마드리드', '레알 마드리드 CF'],
  ['에스파뇰', 'RCD 에스파뇰'],
  ['올랜도 시티', '올랜도 시티 SC'],
]);
const requiredPlayerMarkup = [
  ['class="legend-identity', '국가·대표팀 표'],
  ['class="record-abstract', '요약 블록'],
  ['class="record-facts', '프로필 정보표'],
  ['class="club-career-grid', '클럽·국대 기록 카드'],
  ['class="number-history-table', '등번호 표'],
  ['class="career-honours', '팀 우승 목록'],
  ['class="career-awards', '개인 수상 목록'],
  ['class="source-notes', '출처 설명 목록'],
];
// 발행본 14편이 예외 없이 지키는 뼈대다. 규칙 문서만 읽고 쓴 글이 여기서 어긋나면 발행을 멈춘다.
const requiredBlockCounts = [
  [/class="number-history-table/g, 2, '등번호 표', '클럽과 대표팀을 각각 한 표로 분리한다'],
  [/class="record-note/g, 2, '자료 한계 각주', '기록 카드와 등번호 표 아래에 각각 둔다'],
];
const reelParts = [
  ['class="legend-reel-head', '머리'],
  ['class="legend-reel-foot', '꼬리'],
  ['class="legend-reel-progress', '진행바'],
];
const awardCountBaselines = new Map([
  ['cafu.md', 16],
  ['kaka.md', 32],
  ['alfredo-di-stefano.md', 19],
  ['luis-suarez-miramontes.md', 6], // 국가 수훈 1개는 별도 최상단 블록으로 이동 (운영자 승인).
  ['roberto-baggio.md', 21], // 2026-09-05 운영자 제공 목록 보강, 국가 수훈은 별도.
  ['giacinto-facchetti.md', 12],
  ['mazinho.md', 4], // 2026-09-09 운영자 승인: 1994 파울리스타 베스트 11 추가.
  ['dennis-bergkamp.md', 23], // 2026-09-13 운영자 네이버 원고 22개 항목 유지(표기·순위 교정) + 운영자 승인 FWA 공로상 2025 추가.
  ['lothar-matthaus.md', 46], // 2026-09-13 운영자 네이버 원고 40개 중 은월계수장은 국가 수훈 블록으로 분리, 확인 불가한 IFFHS 유럽 역대 드림팀 2021 제외(38) + 운영자 승인 추가 8개(UEPS 1990, IFFHS 20세기 투표, World Soccer 100인, 명예 주장, 오펠상, DFL 공로상, 스포츠기자상, 바이에른주 홍보대사).
  ['ronaldo-nazario.md', 29], // 2026-09-17 운영자 네이버 원고 25개 + 운영자 승인 추가 4개(라리가 득점왕 1996-97·2003-04, 에레디비시 득점왕 1994-95, 세리에 A 올해의 선수 1997-98, 라우레우스 올해의 복귀상 2003 시상식).
]);
const selfExplanatoryAward = /(?:^발롱도르$|득점왕$|도움왕$|명예의 전당 헌액$|명예 회장$)/;
const overExplainedAwardPhrases = [
  '기자와 전문가',
  '대상으로 선정',
  '축구사를 대상으로',
  '최다 득점자',
  '현재 UEFA',
];

function validateCareerAwards(source, relative) {
  const issues = [];
  const section = source.match(/<ul class="career-awards">([\s\S]*?)<\/ul>/)?.[1] ?? '';
  if (!section) return issues;
  const items = [...section.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((match) => match[1]);
  const baseline = awardCountBaselines.get(path.basename(relative));
  if (baseline !== undefined && items.length !== baseline) {
    issues.push(`${relative}: 개인 수상은 확정 ${baseline}개인데 ${items.length}개입니다. 운영자 승인 없이 추가·삭제하지 마십시오.`);
  }
  for (const item of items) {
    const award = item.match(/<strong>(.*?)<\/strong>/)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? '';
    const explanation = item.match(/<small>(.*?)<\/small>/)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? '';
    if (explanation && selfExplanatoryAward.test(award)) {
      issues.push(`${relative}: '${award}'는 상명 자체로 뜻이 분명하므로 별도 해설을 붙이지 마십시오.`);
    }
    if (explanation.length > 45) {
      issues.push(`${relative}: '${award}' 해설이 ${explanation.length}자로 너무 깁니다. 카푸·카카처럼 한 줄로 줄이십시오.`);
    }
    for (const phrase of overExplainedAwardPhrases) {
      if (explanation.includes(phrase)) {
        issues.push(`${relative}: '${award}' 해설에 과잉 설명 표현 '${phrase}'이 있습니다.`);
      }
    }
  }
  return issues;
}

// 마크업은 규칙 문서가 아니라 발행본에만 있었다. 그 뼈대를 발행 전에 대조한다.
// 2026-09-17 호나우두편에서 클래스 이름만 맞고 요소·구조가 어긋나 프로필 표가 통째로 깨졌다.
// 클래스 존재만 보던 검사를 실제 계약 수준으로 올린다.
function validatePlayerStructure(body, relative) {
  const issues = [];
  for (const [marker, label] of requiredPlayerMarkup) {
    if (!body.includes(marker)) issues.push(`${relative}: 필수 ${label} 마크업 누락.`);
  }

  // 프로필 표: <div class="record-facts record-facts-{국가}"> 안에 <dl><dt><dd> 행이 들어간다.
  if (/<dl[^>]*class="[^"]*record-facts/.test(body)) {
    issues.push(`${relative}: 프로필 표는 <dl>이 아니라 <div class="record-facts">입니다. 행 하나하나가 <dl><dt><dd>입니다.`);
  }
  const profile = body.match(/<div class="record-facts[^"]*"[\s\S]*?\n<\/div>/)?.[0] ?? '';
  if (profile) {
    if (!/class="record-facts record-facts-[a-z]+"/.test(profile)) {
      issues.push(`${relative}: 프로필 표에 국가 수식 클래스가 없습니다(예: record-facts record-facts-brazil). 국가별 테두리·배경이 적용되지 않습니다.`);
    }
    const head = profile.match(/<div class="profile-country-head">[\s\S]*?<\/div>/)?.[0] ?? '';
    if (!head) {
      issues.push(`${relative}: 프로필 표에 profile-country-head가 없습니다.`);
    } else {
      if ((head.match(/<img /g) ?? []).length !== 2) {
        issues.push(`${relative}: profile-country-head는 국기와 대표팀 문장 두 장을 양끝에 둡니다. 현재 ${(head.match(/<img /g) ?? []).length}장입니다.`);
      }
      if (!/<strong>[^<]+<small/.test(head)) {
        issues.push(`${relative}: profile-country-head의 국가명은 <strong>국가명<small>원어</small></strong> 형태여야 합니다.`);
      }
    }
    if (!/<dl><dt>/.test(profile)) {
      issues.push(`${relative}: 프로필 표의 행이 <dl><dt>…</dt><dd>…</dd></dl> 형태가 아닙니다.`);
    }
    for (const dd of profile.match(/<dd[^>]*>[\s\S]*?<\/dd>/g) ?? []) {
      if (/<span(?![^>]*class="foreign-note")/.test(dd)) {
        issues.push(`${relative}: 프로필 표의 <dd>에 일반 <span>이 있습니다. 값이 붙어 나옵니다. 칸을 나누거나 foreign-note를 쓰십시오.`);
      }
    }
  }

  // 서사 절은 ##이고 ###는 등번호 표의 클럽·대표팀에만 쓴다.
  for (const heading of body.match(/^### .+$/gm) ?? []) {
    if (!/^### (클럽|.*국가대표팀)$/.test(heading)) {
      issues.push(`${relative}: 서사 절 '${heading.slice(4)}'이 ###입니다. 서사 절은 ##이고 ###는 등번호 표의 클럽·대표팀에만 씁니다.`);
    }
  }

  // 출처 링크 속성은 발행본 관행을 따른다.
  const sources = body.match(/<ul class="source-notes">[\s\S]*?<\/ul>/)?.[0] ?? '';
  for (const anchor of sources.match(/<a [^>]*>/g) ?? []) {
    if (!/href="https?:/.test(anchor)) continue; // 사이트 안쪽 링크는 rel이 필요 없다
    if (!/rel="noopener noreferrer"/.test(anchor)) {
      issues.push(`${relative}: 외부 출처 링크의 rel이 noopener noreferrer가 아닙니다.`);
      break;
    }
  }
  for (const [pattern, minimum, label, hint] of requiredBlockCounts) {
    const found = (body.match(pattern) ?? []).length;
    if (found < minimum) {
      issues.push(`${relative}: ${label} ${found}개. 최소 ${minimum}개가 필요합니다(${hint}).`);
    }
  }
  if (body.includes('class="legend-reel"')) {
    for (const [marker, part] of reelParts) {
      if (!body.includes(marker)) issues.push(`${relative}: 영상 릴에 ${part}가 없습니다. 머리·꼬리·진행바를 한 세트로 넣으십시오.`);
    }
  }
  for (const figure of body.match(/<figure class="legend-section-photo"[\s\S]*?<\/figure>/g) ?? []) {
    for (const img of figure.match(/<img [^>]*>/g) ?? []) {
      if (!/width="\d+"/.test(img) || !/height="\d+"/.test(img)) {
        const src = img.match(/src="([^"]+)"/)?.[1] ?? '(src 없음)';
        issues.push(`${relative}: 본문 사진 ${src}에 고유 크기가 없습니다. width·height를 넣어 레이아웃 이동을 막으십시오.`);
      }
    }
    if (!figure.includes('<figcaption>')) {
      issues.push(`${relative}: 본문 사진에 캡션이 없습니다.`);
    }
  }
  return issues;
}

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(target);
    return entry.isFile() && entry.name.endsWith('.md') ? [target] : [];
  }));
  return nested.flat();
}

const failures = [];
const playerTemplateSource = await readFile(playerTemplate, 'utf8');
const relatedAssetsSource = await readFile(relatedAssetsComponent, 'utf8');
for (const [file, source] of [[playerTemplate, playerTemplateSource], [relatedAssetsComponent, relatedAssetsSource]]) {
  if (/font-size:\s*9px\b/.test(source)) {
    failures.push(`${path.relative(process.cwd(), file)}: 선수 상세에 연결되는 UI에 금지된 9px 글자 크기가 있습니다.`);
  }
}
if (/\.sequence-nav\s*\{[^}]*border-bottom\s*:/s.test(playerTemplateSource)) {
  failures.push(`${path.relative(process.cwd(), playerTemplate)}: 이전·다음 기록 영역에 금지된 아래 테두리가 있습니다.`);
}
for (const file of await markdownFiles(archiveRoot)) {
  const source = await readFile(file, 'utf8');
  if (!source.includes('## 역대 클럽·국대 기록')) continue;
  const body = source.replace(/^---[\s\S]*?---\s*/, '');

  const relative = path.relative(process.cwd(), file);
  const title = source.match(/^title:\s*["'](.+)["']\s*$/m)?.[1] ?? '';
  if (!/^.+\(.+\) 프로필·스탯·역대 등번호: .+$/.test(title)) {
    failures.push(`${relative}: 제목 형식이 선수 아카이브 규칙과 다릅니다.`);
  }

  const headingPositions = requiredHeadings.map((pattern) => source.search(pattern));
  requiredHeadings.forEach((pattern, index) => {
    if (headingPositions[index] === -1) failures.push(`${relative}: 필수 섹션 ${pattern} 누락.`);
  });
  if (headingPositions.every((position) => position !== -1)) {
    for (let index = 1; index < headingPositions.length; index += 1) {
      if (headingPositions[index] < headingPositions[index - 1]) {
        failures.push(`${relative}: 필수 섹션 순서가 잘못됐습니다.`);
        break;
      }
    }
  }

  if (!source.includes('class="foreign-note"')) {
    failures.push(`${relative}: 최초 등장 원어 병기가 없습니다.`);
  }
  for (const phrase of bannedPublicPhrases) {
    if (body.includes(phrase)) failures.push(`${relative}: 공개 금지 제작 문구 '${phrase}' 발견.`);
  }
  for (const [wrong, correct] of knownWrongNames) {
    if (body.includes(wrong)) failures.push(`${relative}: '${wrong}' 대신 '${correct}' 사용.`);
  }
  for (const note of needlessClubNotes) {
    if (body.includes(note)) failures.push(`${relative}: 널리 알려진 구단에 불필요한 원어 풀이 '${note}' 발견.`);
  }
  const numberHistoryStart = body.indexOf('## 역대 등번호');
  const numberHistoryEnd = body.indexOf('\n## ', numberHistoryStart + 1);
  const numberHistorySection = numberHistoryStart === -1
    ? ''
    : body.slice(numberHistoryStart, numberHistoryEnd === -1 ? undefined : numberHistoryEnd);
  for (const [shortened, full] of shortenedClubNames) {
    const escaped = shortened.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`<td(?:\\s[^>]*)?>${escaped}<\\/td>`).test(numberHistorySection)) {
      failures.push(`${relative}: 역대 등번호 표의 '${shortened}' 대신 공식 구단명 '${full}' 사용.`);
    }
  }
  failures.push(...validatePlayerStructure(body, relative));
  failures.push(...validateCareerAwards(source, relative));
  if (/\b디 스테파노\b/.test(body) || /\b디 스테파노\b/.test(title)) {
    failures.push(`${relative}: '디 스테파노' 대신 '디스테파노' 사용.`);
  }
}

if (process.argv.includes('--self-test')) {
  const badSource = '<ul class="career-awards"><li><strong>발롱도르</strong><small>기자와 전문가 투표로 대상자로 선정한 지나치게 긴 해설 문장입니다</small><span>2000년</span></li></ul>';
  const detected = validateCareerAwards(badSource, 'fixture.md');
  const wrongCount = validateCareerAwards(badSource, 'kaka.md');
  if (!detected.some((issue) => issue.includes('상명 자체로 뜻이 분명'))
    || !detected.some((issue) => issue.includes('과잉 설명'))
    || !wrongCount.some((issue) => issue.includes('확정 32개'))) {
    console.error('선수 규칙 자체 시험 실패: 과잉 수상 해설을 차단하지 못했습니다.');
    process.exit(1);
  }

  // 팀 우승 목록이 빠지고 등번호 표가 하나뿐이며 사진에 크기와 캡션이 없는 원고
  const brokenStructure = [
    '<div class="legend-identity"></div><p class="record-abstract"></p>',
    '<dl class="record-facts"></dl><div class="club-career-grid"></div>',
    '<table class="number-history-table"></table><p class="record-note"></p>',
    '<ul class="career-awards"></ul><ul class="source-notes"></ul>',
    '<div class="legend-reel"><div class="legend-reel-head"></div></div>',
    '<figure class="legend-section-photo"><img src="/a.webp" alt="" /></figure>',
  ].join('');
  const structure = validatePlayerStructure(brokenStructure, 'fixture.md');
  // 호나우두편에서 실제로 화면을 깨뜨린 형태를 그대로 심는다.
  const brokenProfile = [
    '<dl class="record-facts">기존에 통과하던 잘못된 요소</dl>',
    '<div class="record-facts">',
    '  <div class="profile-country-head"><img src="/a.svg" alt="" /><div><strong>브라질</strong></div></div>',
    '  <dl><dt>별명</dt><dd>O Fenômeno<span>경이로운 자</span></dd></dl>',
    '</div>',
    '### 서사 절 제목',
    '<ul class="source-notes"><li><a href="https://example.com" rel="nofollow noopener">자료</a>: 설명.</li></ul>',
  ].join('\n');
  const profileIssues = validatePlayerStructure(brokenProfile, 'fixture.md');
  const profileMustCatch = [
    ['<dl>이 아니라', '프로필 표 요소 오류'],
    ['국가 수식 클래스가 없습니다', '국가 수식 클래스 누락'],
    ['두 장을 양끝에', '국기·문장 이미지 누락'],
    ['일반 <span>이 있습니다', 'dd 안 span'],
    ['서사 절', '서사 절 ### 오용'],
    ["noopener noreferrer가 아닙니다", "출처 rel 오류"],
  ];
  for (const [needle, label] of profileMustCatch) {
    if (!profileIssues.some((issue) => issue.includes(needle))) {
      console.error(`선수 규칙 자체 시험 실패: ${label}을 차단하지 못했습니다.`);
      process.exit(1);
    }
  }

  const mustCatch = [
    ['팀 우승 목록', '팀 우승 목록 누락'],
    ["등번호 표 1개", "등번호 표 분리 누락"],
    ["자료 한계 각주 1개", "자료 한계 각주 누락"],
    ['꼬리가 없습니다', '영상 릴 세트 누락'],
    ['고유 크기가 없습니다', '본문 사진 크기 누락'],
    ['캡션이 없습니다', '본문 사진 캡션 누락'],
  ];
  for (const [needle, label] of mustCatch) {
    if (!structure.some((issue) => issue.includes(needle))) {
      console.error(`선수 규칙 자체 시험 실패: ${label}을 차단하지 못했습니다.`);
      process.exit(1);
    }
  }
  console.log('선수 규칙 자체 시험 통과');
  process.exit(0);
}

if (failures.length > 0) {
  console.error('선수 인물 아카이브 검수 실패:\n' + failures.map((failure) => `- ${failure}`).join('\n'));
  console.error('\n발행 중단: 위 원인을 수정한 뒤 npm run test:player-rules, npm run validate:players, npm run build를 다시 실행하십시오. 검수 우회는 금지됩니다.');
  process.exit(1);
}

console.log('선수 인물 아카이브 검수 통과');
