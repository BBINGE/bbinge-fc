import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// 팝업관 「유럽 대항전 역전극 모음.Zip」 구단 문장: UEFA.com 경기 기록의 팀 로고를 160px WebP로 저장한다(fetch-comebacks-sources.mjs 다음에 실행).
const { matches } = JSON.parse(await readFile('src/data/popup/comebacks-sources.json', 'utf8'));
const outDir = path.resolve('public/images/popup/comebacks/crests');
await mkdir(outDir, { recursive: true });
const logos = new Map();
for (const m of Object.values(matches)) for (const t of [m.home, m.away]) if (t.logo) logos.set(t.id, t.logo);
const crests = {};
for (const [id, url] of logos) {
  const res = await fetch(url, { headers: { 'User-Agent': 'BBingeFC/1.0 (sho36036@gmail.com)' } });
  if (!res.ok) { console.log(`로고 없음 ${id} ${res.status}`); continue; }
  const file = `uefa-${id}.webp`;
  await sharp(Buffer.from(await res.arrayBuffer())).resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 90 }).toFile(path.join(outDir, file));
  crests[id] = `/images/popup/comebacks/crests/${file}`;
}
await writeFile('src/data/popup/comebacks-crests.json', `${JSON.stringify(crests, null, 1)}\n`);
console.log(`문장 ${Object.keys(crests).length}/${logos.size}`);
