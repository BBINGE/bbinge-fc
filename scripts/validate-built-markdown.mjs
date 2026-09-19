// 빌드 결과에 마크다운 문법이 글자 그대로 남았는지 본다.
// 원고의 raw HTML 블록(aside·p·figcaption 등) 안에 쓴 마크다운 링크는 변환되지 않고 화면에 노출된다.
// 발행 전에는 눈에 잘 띄지 않아 빌드에서 막는다.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = 'dist';
const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
})(root);

const patterns = [
  ['마크다운 링크', /\[[^\][<>\n]{2,60}\]\((\/[^)\s"']*|https?:\/\/[^)\s"']*)\)/g],
  ['마크다운 이미지', /!\[[^\][<>\n]{0,60}\]\([^)\s"']+\)/g],
  // 원고의 소제목·강조가 HTML 블록과 같은 줄에 붙으면 변환되지 않고 글자로 남는다.
  ['마크다운 소제목', /#{2,4}\s[^\n<]{1,60}/g],
  ['마크다운 강조', /\*\*[^*\n<]{1,60}\*\*/g],
];

const hits = [];
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const main = html.split('<main')[1];
  if (!main) continue;
  // 스크립트와 JSON-LD는 본문이 아니다.
  const body = main.replace(/<script[\s\S]*?<\/script>/g, '');
  for (const [label, pattern] of patterns) {
    for (const match of body.matchAll(pattern)) {
      hits.push(`${file.split(path.sep).join('/')}: ${label} ${match[0].slice(0, 80)}`);
    }
  }
}

if (hits.length) {
  console.error('빌드 결과에 마크다운 문법이 글자로 남았다. raw HTML 안에서는 <a href>를 쓴다.');
  for (const hit of hits) console.error('  ' + hit);
  process.exit(1);
}

console.log(`마크다운 잔여 문법 검수 통과 (빌드 결과 ${files.length}개 문서)`);
