#!/usr/bin/env node
// 원고의 「본문 글자」가 마지막으로 바뀐 시각을 기록한다(2026-09-21, 운영자 승인 "이득만 있게 진행하자").
//
// 왜: 사이트맵 lastmod와 구조화 데이터 dateModified가 `updatedDate ?? pubDate`여서, 발행 뒤 원고를 여러 번
// 고쳐도 구글에 바뀌었다는 신호가 나가지 않았다. 하펠 편은 발행 12분 뒤 한 번 크롤링된 뒤 여덟 번 고쳐졌지만
// 열흘 동안 다시 읽히지 않았다.
//
// 원칙(이득만 남기는 조건):
// 1) 본문 글자(제목·설명·본문 텍스트)가 바뀐 경우만 수정으로 친다. <style>·<script>·태그·속성·링크 주소·이미지
//    경로만 바뀐 경우는 수정이 아니다. 글자 크기 일괄 수정 같은 작업이 날짜를 흔들지 않게 한다.
// 2) 결과를 src/data/content-modified.json에 저장하고 커밋한다. Cloudflare 빌드는 git 이력에 기대지 않는다.
//    이력이 얕은 환경에서 모든 글이 같은 날짜로 찍히는 사고를 막기 위해서다.
// 3) CI(Cloudflare·GitHub Actions)에서는 기록을 바꾸지 않는다. 기록과 원고가 어긋나면(예: CMS에서 바로 고친 글)
//    그 글은 기존 방식(updatedDate ?? pubDate)으로 돌아간다. 최악이 지금과 같다.
// 4) 로컬 빌드에서 본문 글자가 기록과 다르면 지금 시각을 적는다. 빌드는 커밋 직전에 돌므로 커밋 시각과 거의 같다.
//    기록이 없는 글은 git 이력을 거슬러 지금 본문이 처음 들어온 커밋의 시각을 찾는다.
//
// 읽는 곳: astro.config.mjs(사이트맵 lastmod), src/layouts/Layout.astro(dateModified). 두 곳 모두
// max(updatedDate ?? pubDate, 기록)을 쓴다. 화면의 「업데이트」 표기와 NEW 배지는 updatedDate 그대로다.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const contentRoot = join(root, 'src', 'content');
const outFile = join(root, 'src', 'data', 'content-modified.json');
const isCI = Boolean(process.env.CF_PAGES || process.env.CI || process.env.GITHUB_ACTIONS);

/** 본문 글자만 남긴다. 테스트 가능하도록 export 없이 이 파일 안에서 자체 시험한다. */
export function proseText(source) {
  const src = source.replace(/\r\n?/g, '\n');
  const fm = src.match(/^---\n([\s\S]*?)\n---\n?/);
  const front = fm ? fm[1] : '';
  const body = fm ? src.slice(fm[0].length) : src;
  const pick = (key) => front.match(new RegExp(`^${key}:\\s*["']?(.*?)["']?\\s*$`, 'm'))?.[1] ?? '';
  const text = body
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${pick('title')}\n${pick('description')}\n${text}`;
}
const hashOf = (source) => createHash('sha1').update(proseText(source)).digest('hex').slice(0, 16);

function selfTest() {
  const base = '---\ntitle: "A"\ndescription: "B"\npubDate: 2026-01-01\n---\n\n본문 <span class="x">글자</span>.\n\n<style>.x{font-size:10px}</style>\n';
  const cssOnly = base.replace('font-size:10px', 'font-size:12px');
  const attrOnly = base.replace('class="x"', 'class="y" lang="es"');
  const crlf = base.replace(/\n/g, '\r\n');
  const prose = base.replace('글자', '문장');
  const title = base.replace('title: "A"', 'title: "C"');
  const fails = [];
  if (hashOf(cssOnly) !== hashOf(base)) fails.push('CSS만 바뀐 경우를 수정으로 셈');
  if (hashOf(attrOnly) !== hashOf(base)) fails.push('속성만 바뀐 경우를 수정으로 셈');
  if (hashOf(crlf) !== hashOf(base)) fails.push('줄바꿈 방식 차이를 수정으로 셈');
  if (hashOf(prose) === hashOf(base)) fails.push('본문 글자 변경을 놓침');
  if (hashOf(title) === hashOf(base)) fails.push('제목 변경을 놓침');
  if (fails.length) { console.error('수정일 기록 자체 시험 실패:', fails.join(', ')); process.exit(1); }
}

function markdownFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith('.md') ? [path] : [];
  });
}

const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
let gitUsable = false;
try { gitUsable = git(['rev-parse', '--is-shallow-repository']).trim() === 'false'; } catch { gitUsable = false; }

/** 지금 본문이 처음 들어온 커밋의 시각. 작업 트리가 HEAD와 다르면 지금 시각. */
function bootstrap(repoPath, currentHash) {
  if (!gitUsable) return null;
  let log = '';
  try { log = git(['log', '--format=%H %cI', '--', repoPath]).trim(); } catch { return null; }
  if (!log) return new Date().toISOString(); // 아직 커밋되지 않은 새 글
  const commits = log.split('\n').map((line) => line.split(' '));
  let headSource = '';
  try { headSource = git(['show', `${commits[0][0]}:${repoPath}`]); } catch { return null; }
  if (hashOf(headSource) !== currentHash) return new Date().toISOString(); // 커밋 전 수정
  let introduced = commits[0][1];
  for (const [sha, date] of commits.slice(1)) {
    let older = '';
    try { older = git(['show', `${sha}:${repoPath}`]); } catch { break; }
    if (hashOf(older) !== currentHash) break;
    introduced = date;
  }
  return introduced;
}

selfTest();

const previous = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {};
const next = {};
let changed = 0;
let bootstrapped = 0;
let mismatchedInCI = 0;

for (const collection of ['articles', 'archive']) {
  for (const file of markdownFiles(join(contentRoot, collection))) {
    const source = readFileSync(file, 'utf8');
    if (/^draft:\s*true\s*$/m.test(source)) continue;
    const key = `${collection}/${relative(join(contentRoot, collection), file).split(sep).join('/').replace(/\.md$/, '')}`;
    const repoPath = relative(root, file).split(sep).join('/');
    const hash = hashOf(source);
    const old = previous[key];
    if (old && old.hash === hash) { next[key] = old; continue; }
    if (isCI) {
      // CI는 기록을 바꾸지 않는다. 어긋난 글은 기록에서 빼서 기존 방식으로 돌아가게 한다.
      if (old) mismatchedInCI++;
      continue;
    }
    const modified = old ? new Date().toISOString() : bootstrap(repoPath, hash);
    if (!modified) continue;
    next[key] = { hash, modified };
    if (old) changed++; else bootstrapped++;
  }
}

const sorted = Object.fromEntries(Object.keys(next).sort().map((k) => [k, next[k]]));
const text = JSON.stringify(sorted, null, 2) + '\n';
// CI에서도 파일을 쓴다. 어긋난 글을 뺀 사본이라 그 글은 기존 방식으로 돌아간다. 이 사본은 커밋되지 않는다
// (scheduled-deploy.yml은 haechuk.json만 이름으로 add한다).
if (text !== (existsSync(outFile) ? readFileSync(outFile, 'utf8').replace(/\r\n/g, '\n') : '')) writeFileSync(outFile, text, 'utf8');
console.log(`본문 수정일 기록: ${Object.keys(sorted).length}편 · 이번에 바뀐 글 ${changed} · 새로 기록 ${bootstrapped}${isCI ? ` · CI에서 기록과 어긋나 기존 방식으로 돌린 글 ${mismatchedInCI}` : ''}`);
