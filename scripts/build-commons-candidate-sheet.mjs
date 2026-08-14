import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const queries = {
  kaka: 'intitle:Kaka',
  'van-basten': '"Marco van Basten" Milan',
  lineker: 'intitle:"Gary Lineker"',
  masopust: 'intitle:"Josef Masopust"',
  albert: 'intitle:"Florian Albert"',
  zlatan: 'Ibrahimovic PSG',
  stoichkov: 'Stoichkov Barcelona',
  zico: 'intitle:Zico',
  coluna: 'intitle:"Mario Coluna"',
  rummenigge: 'intitle:Rummenigge',
  neuer: 'intitle:"Manuel Neuer"',
  'nilton-santos': 'intitle:"Nilton Santos"',
  figueroa: '"Elias Figueroa" football',
  'ronaldo-r9': 'Ronaldo Brazil 2002 football',
  'thomas-muller': '"Thomas Muller" Bayern football',
  'kim-min-jae': '"Kim Min-jae" Bayern football',
};
const outDir = resolve('tmp/commons-candidates');
await mkdir(outDir, { recursive: true });
const ua = 'BBingeFC/1.0 (https://bbingefc.com/contact/)';

for (const [id, query] of Object.entries(queries)) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.search = new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrnamespace: '6', gsrsearch: query, gsrlimit: '12', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '500' });
  const json = await fetch(api, { headers: { 'User-Agent': ua } }).then(r => r.json());
  const pages = Object.values(json.query?.pages ?? {});
  const tiles = [];
  const records = [];
  for (const [index, page] of pages.entries()) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl) continue;
    const buffer = Buffer.from(await fetch(info.thumburl, { headers: { 'User-Agent': ua } }).then(r => r.arrayBuffer()));
    const safeTitle = page.title.replace(/[&<>"']/g, '');
    let preview;
    try {
      preview = await sharp(buffer).resize(360, 235, { fit: 'cover', position: 'attention' }).jpeg().toBuffer();
    } catch {
      continue;
    }
    const tile = await sharp({ create: { width: 360, height: 300, channels: 3, background: '#0d2038' } })
      .composite([
        { input: preview, top: 0, left: 0 },
        { input: Buffer.from(`<svg width="360" height="65"><rect width="360" height="65" fill="#0d2038"/><text x="10" y="22" fill="white" font-size="16">${index + 1}</text><text x="36" y="22" fill="white" font-size="12">${safeTitle.slice(0, 45)}</text></svg>`), top: 235, left: 0 },
      ]).jpeg().toBuffer();
    tiles.push({ input: tile, left: (tiles.length % 4) * 360, top: Math.floor(tiles.length / 4) * 300 });
    records.push({ n: index + 1, title: page.title, descriptionurl: info.descriptionurl });
  }
  const canvas = sharp({ create: { width: 1440, height: 900, channels: 3, background: '#071426' } }).composite(tiles);
  await canvas.jpeg({ quality: 88 }).toFile(resolve(outDir, `${id}.jpg`));
  await writeFile(resolve(outDir, `${id}.json`), JSON.stringify(records, null, 2));
  console.log(id);
}
