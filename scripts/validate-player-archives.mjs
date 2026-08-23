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
  ['주제 모리뉴', '조제 모리뉴'],
  ['클라렌서 세도르프', '클라렌스 세도르프'],
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
  ['class="record-facts', '프로필 정보표'],
  ['class="club-career-grid', '클럽·국대 기록 카드'],
  ['class="number-history-table', '등번호 표'],
  ['class="career-awards', '개인 수상 목록'],
  ['class="source-notes', '출처 설명 목록'],
];
const awardCountBaselines = new Map([
  ['cafu.md', 16],
  ['kaka.md', 32],
  ['alfredo-di-stefano.md', 19],
  ['luis-suarez-miramontes.md', 7],
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
  for (const [marker, label] of requiredPlayerMarkup) {
    if (!body.includes(marker)) failures.push(`${relative}: 필수 ${label} 마크업 누락.`);
  }
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
  console.log('선수 규칙 자체 시험 통과');
  process.exit(0);
}

if (failures.length > 0) {
  console.error('선수 인물 아카이브 검수 실패:\n' + failures.map((failure) => `- ${failure}`).join('\n'));
  console.error('\n발행 중단: 위 원인을 수정한 뒤 npm run test:player-rules, npm run validate:players, npm run build를 다시 실행하십시오. 검수 우회는 금지됩니다.');
  process.exit(1);
}

console.log('선수 인물 아카이브 검수 통과');
