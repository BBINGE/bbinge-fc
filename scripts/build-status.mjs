// STATUS.md를 저장소 실제 내용에서 다시 쓴다.
// 손으로 고치지 않는다. 사람이 적는 것은 HANDOFF.md의 OPEN-ITEMS 블록 하나뿐이다.
// 새 세션(집·회사·Codex·Claude)은 이 파일을 제일 먼저 읽고 현재 위치를 잡는다.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sh = (cmd) => {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return ''; }
};
const fm = (s, key) => (s.match(new RegExp('^' + key + ":\\s*'?\"?([^'\"\\n]+)", 'm')) || [])[1]?.trim();

// ── 카테고리 이름표
const cats = JSON.parse(read('src/data/categories.json')).categories;
const labelOf = (slug) => {
  const c = cats.find((x) => x.slug === slug);
  if (!c) return slug;
  const parent = c.parentSlug ? cats.find((x) => x.slug === c.parentSlug) : null;
  return parent ? parent.label + ' · ' + c.label : c.label;
};

// ── 글
const artDir = 'src/content/articles';
const articles = fs.readdirSync(path.join(ROOT, artDir)).filter((f) => f.endsWith('.md')).map((f) => {
  const s = read(path.join(artDir, f));
  return {
    slug: f.replace(/\.md$/, ''),
    title: fm(s, 'title') || f,
    category: fm(s, 'category') || '없음',
    pubDate: fm(s, 'pubDate') || '',
    draft: /^draft:\s*true/m.test(s),
  };
});

// ── 아카이브
const arcDir = 'src/content/archive';
const archives = fs.readdirSync(path.join(ROOT, arcDir)).filter((f) => f.endsWith('.md')).map((f) => {
  const s = read(path.join(arcDir, f));
  return {
    slug: f.replace(/\.md$/, ''),
    title: fm(s, 'title') || f,
    branch: fm(s, 'branch') || '없음',
    index: fm(s, 'index') || '',
    pubDate: fm(s, 'pubDate') || '',
    draft: /^draft:\s*true/m.test(s),
  };
});

const BRANCH_LABEL = { legends: '인물관', club: '대회관(클럽)', 'national-team': '대회관(대표팀)', awards: '시상관' };

const count = (rows, key) => rows.reduce((a, r) => { a[r[key]] = (a[r[key]] || 0) + 1; return a; }, {});
const latest = (rows, n) => [...rows].filter((r) => r.pubDate).sort((a, b) => b.pubDate.localeCompare(a.pubDate)).slice(0, n);
const day = (d) => (d || '').slice(0, 10);

// ── 축쿼드 리그 진행: SquadsCategoryPage의 리그 매핑을 읽는다
let squadLeagues = '';
try {
  const sp = read('src/components/SquadsCategoryPage.astro');
  const pairs = [...sp.matchAll(/'([\w-]+all-time-best-xi|[\w-]+best-xi)'\s*:\s*'(\w+)'/g)].map((m) => [m[1], m[2]]);
  // 역대 베스트 11만 리그 순번에 들어간다. 시대 편은 순번 밖이다(운영자 확정).
  const byLeague = {};
  const eras = [];
  for (const [slug, league] of pairs) {
    if (slug.endsWith('-all-time-best-xi')) (byLeague[league] = byLeague[league] || []).push(slug.replace(/-all-time-best-xi$/, ''));
    else eras.push(slug);
  }
  squadLeagues = Object.entries(byLeague)
    .map(([l, v]) => '- `' + l + '` 역대 베스트 11 ' + v.length + '편: ' + v.join(', '))
    .join('\n');
  if (eras.length) squadLeagues += '\n- 리그 순번 밖(시대 베스트 11) ' + eras.length + '편: ' + eras.join(', ');
} catch { squadLeagues = '- (리그 매핑을 읽지 못했다)'; }

// ── 팝업
const popups = fs.existsSync(path.join(ROOT, 'src/pages/popup'))
  ? fs.readdirSync(path.join(ROOT, 'src/pages/popup')).filter((f) => f.endsWith('.astro') && f !== 'index.astro')
  : [];

// ── 빌드가 막는 검사
const pkg = JSON.parse(read('package.json'));
const gates = (pkg.scripts.build || '').split('&&').map((s) => s.trim())
  .filter((s) => /validate|test/.test(s))
  .map((s) => s.replace(/^node scripts\//, '').replace(/\.mjs/, ''));

// ── 사람이 적는 열린 항목
let openItems = '- 없음';
try {
  const h = read('HANDOFF.md');
  const m = h.match(/<!-- OPEN-ITEMS:START -->([\s\S]*?)<!-- OPEN-ITEMS:END -->/);
  if (m && m[1].trim()) openItems = m[1].trim();
} catch { /* HANDOFF가 없으면 기본값 */ }

// ── 깃
const commit = sh('git rev-parse --short HEAD');
const subject = sh('git log -1 --pretty=%s');
const when = sh('git log -1 --date=format:"%Y-%m-%d %H:%M" --pretty=format:%cd');
// STATUS.md 자신은 매번 다시 쓰이므로 더티 집계에서 뺀다.
const dirty = sh('git status --porcelain').split('\n').filter(Boolean).filter((l) => !l.includes('STATUS.md')).length;
const recent = sh('git log -12 --date=short --pretty=format:"%cd  %h  %s"').split('\n').filter(Boolean);

const table = (obj, mapLabel) => Object.entries(obj).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => '| ' + mapLabel(k) + ' | ' + v + ' |').join('\n');

const drafts = [...articles, ...archives].filter((r) => r.draft);

const out = `<!-- 자동 생성 파일이다. 손으로 고치지 않는다. \`node scripts/build-status.mjs\`(빌드가 자동 실행)가 다시 쓴다. -->
# 지금 어디까지 왔나

새 세션은 **이 파일을 제일 먼저 읽는다.** 여기 있는 숫자는 문서에 적어 둔 기억이 아니라 저장소를 직접 센 값이다.
고정 규칙은 \`AGENTS.md\` §1의 핵심 문서를, 작업 경위는 \`HANDOFF.md\`를 본다.

- 생성 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })} (KST)
- 이 파일을 만든 시점의 커밋: \`${commit}\` · ${when} · ${subject}
- 작업 트리: ${dirty === 0 ? '깨끗함' : '커밋 안 된 변경 ' + dirty + '건'}
- **배포 확인:** \`git log --oneline -1\`의 해시와 https://bbinge-fc.pages.dev/deploy.json 의 \`commit\`이 같으면 반영 완료다. 이 파일은 빌드 때 만들어지므로 그 뒤의 커밋 한 개만큼 뒤처져 있을 수 있다.

## 열린 항목

${openItems}

> 이 목록만 사람이 적는다. \`HANDOFF.md\`의 \`OPEN-ITEMS\` 블록을 고치면 여기 반영된다. 비어 있으면 진행 중인 과제가 없다는 뜻이다.

## 발행 현황 — 글 ${articles.length}편

| 관 | 편수 |
|---|---|
${table(count(articles, 'category'), labelOf)}

최근 발행 5편

${latest(articles, 5).map((a) => '- ' + day(a.pubDate) + ' · ' + labelOf(a.category) + ' · ' + a.title).join('\n')}

## 삥이 아카이브 — ${archives.length}편

| 관 | 편수 |
|---|---|
${table(count(archives, 'branch'), (k) => BRANCH_LABEL[k] || k)}

최근 발행 5편

${latest(archives, 5).map((a) => '- ' + day(a.pubDate) + ' · ' + (BRANCH_LABEL[a.branch] || a.branch) + (a.index ? '/' + a.index : '') + ' · ' + a.title).join('\n')}

## 축쿼드 리그별 진행

${squadLeagues}

> 축적 순서는 \`Bundesliga → La Liga → Ligue 1 → Premier League → Serie A\`, 리그 안에서는 구단 영문명 A→Z다. 상세는 \`SQUAD_ARCHIVE_RULES.md\`.

## 팝업관 — ${popups.length}개

${popups.map((f) => '- `/popup/' + f.replace(/\.astro$/, '') + '/`').join('\n')}

## 초안·미공개

${drafts.length ? drafts.map((d) => '- ' + d.slug).join('\n') : '- 없음'}

## 빌드가 막는 검사 ${gates.length}개

${gates.map((g) => '- `' + g + '`').join('\n')}

> 실패하면 원고·표기·UI를 고친다. 검사를 완화해 통과시키지 않는다.

## 최근 커밋 12건

\`\`\`
${recent.join('\n')}
\`\`\`
`;

// 생성 시각만 바뀐 경우에는 다시 쓰지 않는다. 빌드할 때마다 작업 트리가 더러워지면
// 진짜 변경이 묻힌다.
const target = path.join(ROOT, 'STATUS.md');
const strip = (t) => t.replace(/^- 생성 시각:.*$/m, '');
const same = fs.existsSync(target) && strip(fs.readFileSync(target, 'utf8')) === strip(out);
if (same) {
  console.log('STATUS.md 변경 없음 (글 ' + articles.length + '편 · 아카이브 ' + archives.length + '편 · 커밋 ' + commit + ')');
} else {
  fs.writeFileSync(target, out);
  console.log('STATUS.md 갱신: 글 ' + articles.length + '편 · 아카이브 ' + archives.length + '편 · 커밋 ' + commit);
}
