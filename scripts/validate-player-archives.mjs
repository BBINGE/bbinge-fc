import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const archiveRoot = path.resolve('src/content/archive');
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
]);

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
for (const file of await markdownFiles(archiveRoot)) {
  const source = await readFile(file, 'utf8');
  if (!source.includes('## 역대 클럽·국대 기록')) continue;

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
    if (source.includes(phrase)) failures.push(`${relative}: 공개 금지 제작 문구 '${phrase}' 발견.`);
  }
  for (const [wrong, correct] of knownWrongNames) {
    if (source.includes(wrong)) failures.push(`${relative}: '${wrong}' 대신 '${correct}' 사용.`);
  }
}

if (failures.length > 0) {
  console.error('선수 인물 아카이브 검수 실패:\n' + failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log('선수 인물 아카이브 검수 통과');
