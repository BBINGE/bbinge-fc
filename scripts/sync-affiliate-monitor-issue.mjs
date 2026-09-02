import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { paths } from './affiliate-products-lib.mjs';

const marker = '<!-- bbinge-affiliate-monitor -->';
const testMarker = '<!-- bbinge-affiliate-monitor-test -->';
const isTest = process.argv.includes('--test');
const reportArgument = process.argv.find((argument) => argument.startsWith('--report='));
const reportPath = reportArgument ? path.resolve(paths.projectRoot, reportArgument.slice('--report='.length)) : path.join(paths.projectRoot, 'affiliate-monitor-report.json');
const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const assignee = process.env.AFFILIATE_MONITOR_ASSIGNEE || 'BBINGE';
if (!token || !repository) throw new Error('GITHUB_TOKEN과 GITHUB_REPOSITORY 환경변수가 필요합니다.');

const apiBase = `https://api.github.com/repos/${repository}`;
async function github(endpoint, options = {}) {
  const response = await fetch(`${apiBase}${endpoint}`, {
    ...options,
    headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'x-github-api-version': '2022-11-28', ...options.headers },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${(await response.text()).slice(0, 500)}`);
  return response.status === 204 ? null : response.json();
}

async function ensureLabel(name, color, description) {
  const encoded = encodeURIComponent(name);
  try {
    await github(`/labels/${encoded}`);
  } catch (error) {
    if (!error.message.includes('GitHub API 404')) throw error;
    await github('/labels', { method: 'POST', body: JSON.stringify({ name, color, description }), headers: { 'content-type': 'application/json' } });
  }
}

async function findIssue(bodyMarker) {
  const issues = await github('/issues?state=all&per_page=100&labels=affiliate-monitor');
  return issues.find((item) => !item.pull_request && item.body?.includes(bodyMarker));
}

async function createTestIssue() {
  await ensureLabel('affiliate-monitor', 'D73A4A', '제휴상품 자동 감시 알림');
  const existing = await findIssue(testMarker);
  const body = `${testMarker}\n\n삥이야, 테스트 메일이 무사히 도착했는지 살짝 확인해줘 🤍\n\n이 Issue가 Gmail에 왔다면, 실제 제휴상품 오류도 같은 길로 알려줄 수 있어. 확인했으면 이 테스트 Issue는 닫아도 돼요.`;
  const payload = { title: '[테스트] 삥이야, 제휴 링크 알림이 잘 도착하는지 보고 싶어 🤍', body, labels: ['affiliate-monitor'], assignees: [assignee], state: 'open' };
  if (existing) await github(`/issues/${existing.number}`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'content-type': 'application/json' } });
  else await github('/issues', { method: 'POST', body: JSON.stringify(payload), headers: { 'content-type': 'application/json' } });
  console.log('Gmail 수신 확인용 테스트 Issue를 만들었습니다.');
}

function renderIssue(report, fingerprint) {
  const grouped = new Map();
  for (const alert of report.alerts) {
    if (!grouped.has(alert.productId)) grouped.set(alert.productId, []);
    grouped.get(alert.productId).push(alert);
  }
  const title = grouped.size === 1
    ? `삥이야, 잠깐만 봐줄래? ${[...grouped.values()][0][0].productLabel} 링크에 문제가 생겼어 🥺`
    : `삥이야, 오늘은 제휴상품 ${grouped.size}개에 문제가 생겼어. 얼른 봐봐!`;
  const sections = [...grouped.entries()].map(([id, alerts]) => {
    const item = report.items.find((candidate) => candidate.id === id);
    const refs = item.articleReferences.length
      ? item.articleReferences.map((reference) => `- 연결 글: \`${reference.file}:${reference.line}\``).join('\n')
      : '- 연결 글: 없음';
    return `### ${item.label} (${item.productCode})\n\n${alerts.map((alert) => `- **${alert.title}** — ${alert.detail}`).join('\n')}\n${refs}\n- 내부 주소: \`/go/${id}\``;
  });
  const warningBlock = report.warnings.length
    ? `\n\n<details><summary>확정 오류는 아니지만 자동 확인이 제한된 항목 ${report.warnings.length}건</summary>\n\n${report.warnings.map((warning) => `- ${warning.productLabel}: ${warning.detail}`).join('\n')}\n</details>`
    : '';
  const body = `${marker}\n<!-- fingerprint:${fingerprint} -->\n\n삥이야, 내가 링크들을 살펴보다가 그냥 넘기면 안 될 것 같은 걸 발견했어. 놀라진 말고, 아래 내용 그대로 Codex 열음이에게 보여주면 어디를 고쳐야 하는지 이어서 볼 수 있어요.\n\n${sections.join('\n\n')}\n\n마지막 자동 확인: ${report.checkedAt}${warningBlock}\n\n> 처리할 때 Codex에 “제휴상품 감시 Issue에 쌓인 오류를 확인하고 고쳐서 배포해줘”라고 말해줘.`;
  return { title, body };
}

async function syncReport() {
  await ensureLabel('affiliate-monitor', 'D73A4A', '제휴상품 자동 감시 알림');
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const existing = await findIssue(marker);
  const fingerprint = createHash('sha256').update(JSON.stringify(report.alerts.map(({ productId, code, detail }) => ({ productId, code, detail })))).digest('hex').slice(0, 16);

  if (!report.alerts.length) {
    if (existing?.state === 'open') {
      await github(`/issues/${existing.number}/comments`, { method: 'POST', body: JSON.stringify({ body: `삥이야, 다시 확인해보니 감지됐던 문제가 모두 사라졌어. 이 알림은 안심하고 닫아둘게요 🤍\n\n정상 확인: ${report.checkedAt}` }), headers: { 'content-type': 'application/json' } });
      await github(`/issues/${existing.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed', state_reason: 'completed' }), headers: { 'content-type': 'application/json' } });
    }
    console.log('확정 오류가 없습니다. 열린 감시 Issue가 있다면 닫았습니다.');
    return;
  }

  const rendered = renderIssue(report, fingerprint);
  if (!existing) {
    await github('/issues', { method: 'POST', body: JSON.stringify({ ...rendered, labels: ['affiliate-monitor'], assignees: [assignee] }), headers: { 'content-type': 'application/json' } });
    console.log('새 제휴상품 감시 Issue를 만들었습니다.');
    return;
  }
  if (existing.body?.includes(`<!-- fingerprint:${fingerprint} -->`) && existing.state === 'open') {
    console.log('기존 Issue와 같은 오류입니다. 중복 메일을 보내지 않습니다.');
    return;
  }
  await github(`/issues/${existing.number}`, { method: 'PATCH', body: JSON.stringify({ ...rendered, state: 'open', assignees: [assignee] }), headers: { 'content-type': 'application/json' } });
  console.log('기존 제휴상품 감시 Issue를 새 상태로 갱신했습니다.');
}

if (isTest) await createTestIssue();
else await syncReport();
