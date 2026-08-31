import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const requirements = new Map([
  ['EDITORIAL_RISK_GATE.md', [
    'RISK-GATE-1',
    'RISK-GATE-2',
    'RISK-GATE-3',
    'VIABILITY-VETO',
    'REGRESSION-82-HOSTED-VIDEOS',
    'REGRESSION-HIGH-RES-EDITORIAL-IMAGE',
    'REGRESSION-ADSENSE-GENERIC-REJECTION',
    'REGRESSION-CONCRETE-SIGNAL',
    'REPORT-CONTRACT',
    'NO ACTION',
  ]],
  ['AGENTS.md', ['EDITORIAL_RISK_GATE.md', 'EDITORIAL_WRITING_RULES.md', 'npm run validate:risk-gate']],
  ['CLAUDE.md', ['EDITORIAL_RISK_GATE.md', 'EDITORIAL_WRITING_RULES.md']],
  ['EDITORIAL_ASSET_POLICY.md', ['EDITORIAL_RISK_GATE.md']],
  ['package.json', ['validate:risk-gate', 'validate-editorial-risk-gate.mjs', 'validate-editorial-writing.mjs --self-test']],
]);

const failures = [];

for (const [relativePath, markers] of requirements) {
  const source = await readFile(resolve(root, relativePath), 'utf8');

  for (const marker of markers) {
    if (!source.includes(marker)) {
      failures.push(`${relativePath}: 필수 연결 또는 판정 표식 누락: ${marker}`);
    }
  }
}

if (failures.length > 0) {
  console.error('편집 위험 진단 게이트 검수 실패');
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error('\n발행 중단: EDITORIAL_RISK_GATE.md와 각 AI 진입점의 연결을 복구하십시오.');
  process.exit(1);
}

console.log('편집 위험 진단 게이트 검수 통과');
console.log('판정 기준: 구체적 외부 신호 없는 라이선스 불확실성은 C등급·NO ACTION이며, 일괄 삭제·저화질 교체·카테고리 축소의 근거가 아닙니다.');
