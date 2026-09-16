#!/usr/bin/env node
// 축쿼드 구조 검수(2026-09-16).
// 축쿼드는 이미 발행된 편들이 쌓인 카테고리라, 새 글이 규칙 문서만 보고 쓰이면 마크업 규격이 조용히 어긋난다.
// 실제로 맨유 버스비 편 첫 발행본이 선수 카드·비선정 후보·출처 세 군데에서 기존 규격을 벗어났다.
// 이 검수는 발행 전에 그 어긋남을 잡는다.
//
// 두 계열을 구분한다.
//   특별판(시대 베스트 11): custom-xi-era · custom-xi-honours · custom-xi-formation · custom-xi-player×11 · custom-xi-decision
//   리그별 역대 베스트 11: 위 블록을 쓰지 않는다.
// 공통: source-notes 하나, 그리고 목록 페이지의 slug 프로필·리그 매핑.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const dir = path.resolve('src/content/articles');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
const failures = [];
const fail = (file, message) => failures.push(`${file}: ${message}`);

const page = fs.readFileSync(path.resolve('src/components/SquadsCategoryPage.astro'), 'utf8');
const countOf = (s, needle) => s.split(needle).length - 1;

let checked = 0;
let signature = 0;

for (const file of files) {
  const raw = fs.readFileSync(path.join(dir, file), 'utf8');
  if (!/^category:\s*["']custom-best-xi["']/m.test(raw)) continue;
  const slug = file.replace(/\.md$/, '');
  checked += 1;

  // 1) 출처 절은 source-notes 하나다. 마크다운 번호 목록이나 다른 클래스는 쓰지 않는다.
  const notes = countOf(raw, 'class="source-notes"');
  if (notes !== 1) fail(slug, `출처 절은 <div class="source-notes"> 하나여야 한다(현재 ${notes}개).`);
  if (raw.includes('class="source-list"')) fail(slug, '출처에 source-list를 쓰지 않는다. source-notes 규격을 따른다.');
  // 출처 항목 앵커와 본문 각주가 서로 맞는지 본다. 한 줄 HTML 목록과 마크다운 번호 목록 두 형식 모두 허용한다.
  const anchors = new Set([...raw.matchAll(/id="source-(\d+)"/g)].map((m) => m[1]));
  if (anchors.size === 0) fail(slug, '출처 항목에 id="source-N" 앵커가 없다.');
  for (const m of raw.matchAll(/href="#source-(\d+)"/g)) {
    if (!anchors.has(m[1])) fail(slug, `본문 각주 [${m[1]}]에 대응하는 출처 항목이 없다.`);
  }

  // 2) 목록 페이지 연결. 프로필과 리그 매핑이 없으면 편수와 리그 구역이 계산되지 않는다.
  if (!page.includes(`'${slug}':`)) fail(slug, 'SquadsCategoryPage.astro의 profiles에 slug 프로필이 없다.');
  if (!page.includes(`'${slug}':'`)) fail(slug, 'SquadsCategoryPage.astro의 countryFor에 리그 매핑이 없다.');

  // 3) 특별판 계열인지 판정한다. 선수 카드를 하나라도 쓰면 특별판 규격 전체를 갖춰야 한다.
  const players = countOf(raw, 'class="custom-xi-player"');
  if (players === 0) continue;
  signature += 1;

  if (players !== 11) fail(slug, `특별판의 선수 카드는 11장이어야 한다(현재 ${players}장).`);
  for (const block of ['custom-xi-era', 'custom-xi-formation']) {
    if (countOf(raw, `class="${block}"`) !== 1) fail(slug, `${block} 블록이 정확히 하나 있어야 한다.`);
  }
  if (countOf(raw, 'class="custom-xi-honours"') !== 1) fail(slug, 'custom-xi-honours 블록이 정확히 하나 있어야 한다.');
  if (countOf(raw, 'class="custom-xi-decision"') < 1) fail(slug, '비선정 후보·선택 근거는 custom-xi-decision으로 적는다.');

  // 4) 선수 카드 내부 규격: h4 이름 · small 원어 · dl 표.
  const cards = raw.match(/<article class="custom-xi-player">[\s\S]*?<\/article>/g) ?? [];
  cards.forEach((card, i) => {
    const name = card.match(/<h4>([^<]*)<\/h4>/);
    if (!name) fail(slug, `${i + 1}번 선수 카드에 <h4> 이름이 없다(strong·em·b로 짜지 않는다).`);
    if (!/<small[^>]*>[^<]+<\/small>/.test(card)) fail(slug, `${name?.[1] ?? i + 1} 카드에 <small> 원어 표기가 없다.`);
    if (!/<dl><div><dt>/.test(card)) fail(slug, `${name?.[1] ?? i + 1} 카드에 <dl> 항목 표가 없다.`);
    if (!/width="\d+" height="\d+"/.test(card)) fail(slug, `${name?.[1] ?? i + 1} 카드 이미지에 width·height가 없다.`);
  });

  // 5) 숫자 그리드는 다섯 칸이며, 각 칸은 그 대회의 트로피 자산을 쓴다.
  const honours = raw.match(/<div class="custom-xi-honours"[\s\S]*?<\/div><\/div>/);
  if (honours) {
    const cells = countOf(honours[0], '<strong>');
    if (cells !== 5) fail(slug, `숫자 그리드는 다섯 칸이어야 한다(현재 ${cells}칸).`);
    if (honours[0].includes('about-champions-league-trophy')) {
      fail(slug, '다른 대회 칸에 챔피언스 리그 트로피 이미지를 돌려쓰지 않는다. /images/trophies/의 해당 대회 자산을 쓴다.');
    }
    const icons = countOf(honours[0], '/images/trophies/');
    if (icons !== 5) fail(slug, `숫자 그리드 다섯 칸 모두 /images/trophies/ 자산을 써야 한다(현재 ${icons}칸).`);
  }

  // 6) BGM 블록을 쓴다면 재생에 필요한 값이 있어야 한다.
  if (raw.includes('class="custom-xi-music"')) {
    if (!/data-youtube-id="[\w-]{6,}"/.test(raw)) fail(slug, 'BGM 블록에 data-youtube-id가 없다.');
    if (!/<iframe[^>]*title="[^"]+"/.test(raw)) fail(slug, 'BGM iframe에 title이 없다.');
  }
}

if (failures.length > 0) {
  console.error('축쿼드 구조 검수 실패');
  for (const f of failures) console.error(`- ${f}`);
  console.error('\n발행 중단: 기존 발행 편의 마크업과 대조해 규격을 맞춘 뒤 다시 실행하십시오.');
  process.exit(1);
}

console.log(`축쿼드 구조 검수 통과 (커스텀 베스트 11 ${checked}편, 그중 특별판 ${signature}편)`);
