import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const categories = {
  kaka: 'Kaká', 'van-basten': 'Marco van Basten', lineker: 'Gary Lineker', masopust: 'Josef Masopust',
  albert: 'Flórián Albert', zlatan: 'Zlatan Ibrahimović', stoichkov: 'Hristo Stoichkov', zico: 'Zico',
  coluna: 'Mário Coluna', rummenigge: 'Karl-Heinz Rummenigge', neuer: 'Manuel Neuer', 'nilton-santos': 'Nílton Santos',
  keegan: 'Kevin Keegan', figueroa: 'Elías Figueroa', 'ronaldo-r9': 'Ronaldo (Brazilian footballer)',
  raul: 'Raúl González', 'thomas-muller': 'Thomas Müller', 'kim-min-jae': 'Kim Min-jae',
};
const outDir = resolve('tmp/commons-category');
await mkdir(outDir, { recursive: true });
const ua = 'BBingeFC/1.0 (https://bbingefc.com/contact/)';
async function categoryFiles(root) {
  const queue = [{ title: `Category:${root}`, depth: 0 }], seen = new Set(), files = [];
  while (queue.length && files.length < 80) {
    const current = queue.shift();
    if (seen.has(current.title)) continue;
    seen.add(current.title);
    const api = new URL('https://commons.wikimedia.org/w/api.php');
    api.search = new URLSearchParams({ action: 'query', format: 'json', origin: '*', list: 'categorymembers', cmtitle: current.title, cmtype: 'file|subcat', cmlimit: '100' });
    const json = await fetch(api, { headers: { 'User-Agent': ua } }).then(r => r.json());
    for (const member of json.query?.categorymembers ?? []) {
      if (member.ns === 6) files.push(member.title);
      else if (member.ns === 14 && current.depth < 2) queue.push({ title: member.title, depth: current.depth + 1 });
    }
  }
  return files.slice(0, 50);
}
for (const [id, category] of Object.entries(categories)) {
  const titles = await categoryFiles(category);
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.search = new URLSearchParams({ action: 'query', format: 'json', origin: '*', titles: titles.join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '450' });
  const json = await fetch(api, { headers: { 'User-Agent': ua } }).then(r => r.json());
  const pages = Object.values(json.query?.pages ?? {});
  const tiles = [], records = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl) continue;
    try {
      const buffer = Buffer.from(await fetch(info.thumburl, { headers: { 'User-Agent': ua } }).then(r => r.arrayBuffer()));
      const preview = await sharp(buffer).resize(300, 205, { fit: 'cover', position: 'attention' }).jpeg().toBuffer();
      const n = records.length + 1;
      const safeTitle = page.title.replace(/[&<>"']/g, '').slice(0, 38);
      const tile = await sharp({ create: { width: 300, height: 250, channels: 3, background: '#0d2038' } }).composite([
        { input: preview, top: 0, left: 0 },
        { input: Buffer.from(`<svg width="300" height="45"><rect width="300" height="45" fill="#0d2038"/><text x="8" y="20" fill="white" font-size="15">${n}</text><text x="30" y="20" fill="white" font-size="10">${safeTitle}</text></svg>`), top: 205, left: 0 },
      ]).jpeg().toBuffer();
      tiles.push({ input: tile, left: ((n - 1) % 5) * 300, top: Math.floor((n - 1) / 5) * 250 });
      records.push({ n, title: page.title, descriptionurl: info.descriptionurl });
    } catch {}
  }
  const height = Math.max(250, Math.ceil(records.length / 5) * 250);
  await sharp({ create: { width: 1500, height, channels: 3, background: '#071426' } }).composite(tiles).jpeg({ quality: 88 }).toFile(resolve(outDir, `${id}.jpg`));
  await writeFile(resolve(outDir, `${id}.json`), JSON.stringify(records, null, 2));
  console.log(id, records.length);
}
