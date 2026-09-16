import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// 팝업관 「유럽 해외축구 빅클럽간 맞대결 역대전적 모음(박빙인 것만, 2026년 버전)」 구단 문장.
// UEFA.com 경기 기록의 팀 로고를 160px WebP로 저장한다(fetch-rivalries-sources.mjs 다음에 실행).
const { rivalries } = JSON.parse(await readFile('src/data/popup/rivalries-sources.json', 'utf8'));
const outDir = path.resolve('public/images/popup/rivalries/crests');
await mkdir(outDir, { recursive: true });

const logos = new Map();
for (const r of rivalries) for (const [club, url] of Object.entries(r.crests)) if (url) logos.set(club, url);

const crests = {};
for (const [club, url] of logos) {
  const res = await fetch(url, { headers: { 'User-Agent': 'BBingeFC/1.0 (sho36036@gmail.com)' } });
  if (!res.ok) { console.log(`로고 없음 ${club} ${res.status}`); continue; }
  const file = `${club.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.webp`;
  await sharp(Buffer.from(await res.arrayBuffer()))
    .resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, file));
  crests[club] = `/images/popup/rivalries/crests/${file}`;
}
await writeFile('src/data/popup/rivalries-crests.json', `${JSON.stringify(crests, null, 1)}\n`);
console.log(`문장 ${Object.keys(crests).length}/${logos.size}`);
