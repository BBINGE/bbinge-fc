import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const outDir = path.resolve('public/images/culture/atletico-kangin-suga-home-kit');
await mkdir(outDir, { recursive: true });

const sources = {
  suga: 'https://pbs.twimg.com/media/HL3GtuaXEAA9b3O.jpg?name=orig',
  kangin: 'https://image.starnewskorea.com/cdn-cgi/image/f=auto,w=1200,h=1600,fit=cover,q=high,sharpen=2/21/2026/08/2026080605594789044_1.jpg',
  nike: 'https://static.nike.com/a/images/t_web_pdp_936_v2/f_auto,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/54ba756f-bd72-476a-b3c1-2d71e6eb4ae3/ATM+M+NK+DF+JSY+SS+STAD+HM.png',
};

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 BBingeFC/1.0' },
  });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

const buffers = Object.fromEntries(await Promise.all(
  Object.entries(sources).map(async ([key, url]) => [key, await fetchBuffer(url)]),
));

for (const [key, buffer] of Object.entries(buffers)) {
  const meta = await sharp(buffer).metadata();
  console.log(`${key}: ${meta.width}x${meta.height}`);
}

await sharp(buffers.suga)
  .extract({ left: 0, top: 150, width: 1440, height: 810 })
  .resize(1600, 900)
  .webp({ quality: 89 })
  .toFile(path.join(outDir, 'cover.webp'));

await sharp(buffers.kangin)
  .extract({ left: 100, top: 145, width: 1000, height: 1000 })
  .resize(1000, 1000)
  .webp({ quality: 88 })
  .toFile(path.join(outDir, 'card.webp'));

await sharp(buffers.kangin)
  .resize({ width: 1200 })
  .webp({ quality: 89 })
  .toFile(path.join(outDir, 'kangin-portrait.webp'));

await sharp(buffers.nike)
  .resize(1200, 1500, { fit: 'cover', position: 'center' })
  .webp({ quality: 89 })
  .toFile(path.join(outDir, 'nike-stadium-look.webp'));

await sharp(buffers.nike)
  .extract({ left: 186, top: 220, width: 1500, height: 1000 })
  .resize(1500, 1000)
  .webp({ quality: 90 })
  .toFile(path.join(outDir, 'shirt-detail.webp'));

