#!/usr/bin/env node
// 화면 글자 하한 검수(2026-09-21, 운영자 결정).
// 운영자가 층 안내의 `CURRENT FLOOR`·`07F`(8px)와 축쿼드 목록 카드의 `글 읽기`(10px)를 보여주며
// "인간 눈에 잘 안 보인다"고 짚었다. 사이트 전체에서 12px 미만 글자를 12px로 올렸고, 그 재발을 막는 검수다.
// 1) `font-size: Npx`, Tailwind `text-[Npx]`, `font: … Npx/…`는 12px 미만을 쓰지 않는다.
// 2) `font-size: Nrem`과 `font: … Nrem/…`은 .75rem(12px) 미만을 쓰지 않는다.
// 3) `<small>`에 Tailwind 기본값이 거는 80%는 global.css의 `max(80%, 12px)`로 막는다.
// em 단위는 부모 크기에 따라 달라 소스로는 판정할 수 없다. 화면 확인은 DESIGN.md §9의 화면 검수를 따른다.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const MIN_PX = 12;
const MIN_REM = 0.75;
const root = process.cwd();
const srcDir = path.join(root, 'src');
const exts = new Set(['.astro', '.css', '.md', '.mdx', '.ts', '.js', '.mjs', '.svelte']);

const rules = [
  { re: /font-size\s*:\s*(\d+(?:\.\d+)?)px/g, min: MIN_PX, unit: 'px' },
  { re: /text-\[(\d+(?:\.\d+)?)px\]/g, min: MIN_PX, unit: 'px' },
  { re: /font\s*:\s*(?:[a-z0-9-]+\s+)*?(\d+(?:\.\d+)?)px(?=\s*[/\s])/gi, min: MIN_PX, unit: 'px' },
  { re: /font-size\s*:\s*(\d*\.\d+|\d+)rem/g, min: MIN_REM, unit: 'rem' },
  { re: /font\s*:\s*(?:[a-z0-9-]+\s+)*?(\d*\.\d+|\d+)rem(?=\s*[/\s])/gi, min: MIN_REM, unit: 'rem' },
];

function selfTest() {
  const bad = ['font-size:11px', 'font-size: 8.5px', 'class="text-[10px]"', 'font:700 10px/1.2 mono', 'font-size:.68rem', 'font:800 .7rem/1.2 system-ui'];
  const good = ['font-size:12px', 'font-size: 13.5px', 'class="text-[12px]"', 'font:700 12px/1.2 mono', 'font-size:.75rem', 'font-size:.7em', 'font:800 .75rem/1.2 system-ui'];
  const hits = (s) => rules.some(({ re, min }) => [...s.matchAll(new RegExp(re.source, re.flags))].some((m) => parseFloat(m[1]) < min));
  const failedBad = bad.filter((s) => !hits(s));
  const failedGood = good.filter((s) => hits(s));
  if (failedBad.length || failedGood.length) {
    console.error('글자 하한 검수 자체 시험 실패', { 잡지못함: failedBad, 잘못잡음: failedGood });
    process.exit(1);
  }
}

function* walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) yield* walk(p);
    else if (exts.has(path.extname(name))) yield p;
  }
}

selfTest();

const errors = [];
for (const file of walk(srcDir)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const { re, min, unit } of rules) {
    for (const m of text.matchAll(re)) {
      if (parseFloat(m[1]) >= min) continue;
      const line = text.slice(0, m.index).split('\n').length;
      errors.push(`${path.relative(root, file).replace(/\\/g, '/')}:${line}  ${m[0]}  (하한 ${min}${unit})`);
    }
  }
}

if (errors.length) {
  console.error(`화면 글자 하한 검수 실패: 12px 미만 글자 크기 ${errors.length}곳`);
  for (const e of errors.slice(0, 40)) console.error(`  ${e}`);
  if (errors.length > 40) console.error(`  … 외 ${errors.length - 40}곳`);
  console.error('DESIGN.md §2·§9를 따른다. 검사 기준을 낮추지 말고 원고·컴포넌트의 크기를 올린다.');
  process.exit(1);
}
console.log('화면 글자 하한 검수 통과 (12px 이상)');
