import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// 원정 다득점 축떡 이미지: 2015년 2월 17일 UEFA 챔피언스 리그 16강 1차전 파리 생제르맹 1-1 첼시(Wikimedia Commons, @cfcunofficial (Chelsea Debs), CC BY-SA 2.0).
const outDir = path.resolve('public/images/football-made-easy/away-goals');
await mkdir(outDir, { recursive: true });
const titles = {
  set: 'File:PSG 1 Chelsea 1 Champions League round of 16 1st leg (15962283604).jpg',
  fans: 'File:PSG 1 Chelsea 1 Champions League round of 16 1st leg (16583015621).jpg',
};
const api = new URL('https://commons.wikimedia.org/w/api.php');
Object.entries({ action: 'query', titles: Object.values(titles).join('|'), prop: 'imageinfo', iiprop: 'url', iiurlwidth: '1920', format: 'json' }).forEach(([k, v]) => api.searchParams.set(k, v));
const pages = Object.values((await (await fetch(api, { headers: { 'User-Agent': 'BBingeFC/1.0 (sho36036@gmail.com)' } })).json()).query.pages);
const load = async (title) => {
  const url = pages.find((p) => p.title === title).imageinfo[0].thumburl;
  return Buffer.from(await (await fetch(url, { headers: { 'User-Agent': 'BBingeFC/1.0 (sho36036@gmail.com)' } })).arrayBuffer());
};
const set = await load(titles.set);
await sharp(set).resize(1600, 900, { fit: 'cover', position: 'centre' }).webp({ quality: 84 }).toFile(path.join(outDir, 'psg-chelsea-2015-set-piece.webp'));
await sharp(set).resize(1080, 1080, { fit: 'cover', position: 'centre' }).webp({ quality: 84 }).toFile(path.join(outDir, 'psg-chelsea-2015-set-piece-card.webp'));
const fans = await load(titles.fans);
await sharp(fans).resize({ width: 1600 }).webp({ quality: 82 }).toFile(path.join(outDir, 'psg-chelsea-2015-parc-des-princes.webp'));
for (const f of ['psg-chelsea-2015-set-piece.webp', 'psg-chelsea-2015-set-piece-card.webp', 'psg-chelsea-2015-parc-des-princes.webp']) console.log(f, await sharp(path.join(outDir, f)).metadata().then((m) => `${m.width}x${m.height}`));
