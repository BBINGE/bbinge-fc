import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// 팝업관 「바이언 둔기론」 구단 문장: ESPN 경기 기록의 팀 로고를 160px WebP로 저장한다(fetch-bayern-dungi-sources.mjs 다음에 실행).
const { matches } = JSON.parse(await readFile('src/data/popup/bayern-dungi-sources.json', 'utf8'));
const outDir = path.resolve('public/images/popup/bayern-dungi/crests');
await mkdir(outDir, { recursive: true });
const logos = new Map([['FC Bayern München', 'https://a.espncdn.com/i/teamlogos/soccer/500/132.png']]);
for (const m of matches) if (m.opponentLogoEspn && !logos.has(m.opponentSource)) logos.set(m.opponentSource, m.opponentLogoEspn);
const crests = {};
for (const [team, url] of logos) {
  const id = url.match(/\/(\d+)\.png/)?.[1] ?? team.replace(/\W+/g, '-').toLowerCase();
  const file = `espn-${id}.webp`;
  const res = await fetch(url);
  if (!res.ok) { console.log(`로고 없음: ${team} ${res.status}`); continue; }
  await sharp(Buffer.from(await res.arrayBuffer())).resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 90 }).toFile(path.join(outDir, file));
  crests[team] = `/images/popup/bayern-dungi/crests/${file}`;
}
await writeFile('src/data/popup/bayern-dungi-crests.json', `${JSON.stringify(crests, null, 1)}\n`);
console.log(`문장 ${Object.keys(crests).length}개`);
