import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const outDir = path.resolve('public/images/culture/atletico-kangin-suga-home-kit');
await mkdir(outDir, { recursive: true });

const sources = {
  suga: 'https://pbs.twimg.com/media/HL3GtuaXEAA9b3O.jpg?name=orig',
  kangin: 'https://image.starnewskorea.com/cdn-cgi/image/f=auto,w=1200,h=1600,fit=cover,q=high,sharpen=2/21/2026/08/2026080605594789044_1.jpg',
  kanginVogue: 'https://img.vogue.co.kr/vogue/2023/08/style_64dd8bc9a76b6-1120x1400.jpg',
  kanginPoint: 'https://www.telemadrid.es/2026/08/04/noticias/internacional/_2913318761_56422342_1300x731.jpg',
  kanginGoal: 'https://www.telemadrid.es/2026/08/19/deportes/_2917818274_56546431_1300x731.jpg',
  kanginPresentation: 'https://pimg.mk.co.kr/news/cms/202608/18/news-p.v1.20260818.a7b49d71d8374e9faa328108f366c0c3_R.jpg',
  nike: 'https://static.nike.com/a/images/t_web_pdp_936_v2/f_auto,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/54ba756f-bd72-476a-b3c1-2d71e6eb4ae3/ATM+M+NK+DF+JSY+SS+STAD+HM.png',
  stadiumProduct: 'https://shop.atleticodemadrid.com/on/demandware.static/-/Sites-atm-master-catalog/default/dw24332f3d/New%20Folder/II1893-101.jpg',
  matchProduct: 'https://shop.atleticodemadrid.com/on/demandware.static/-/Sites-atm-master-catalog/default/dw59595213/II2740-101.jpg',
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

await sharp(buffers.kanginVogue)
  .resize(1120, 1400, { fit: 'cover', position: 'center' })
  .webp({ quality: 90 })
  .toFile(path.join(outDir, 'kangin-profile-vogue.webp'));

await sharp(buffers.kanginPoint)
  .resize({ width: 1500, withoutEnlargement: true })
  .webp({ quality: 89 })
  .toFile(path.join(outDir, 'kangin-point.webp'));

await sharp(buffers.kanginGoal)
  .resize({ width: 1600, withoutEnlargement: true })
  .webp({ quality: 89 })
  .toFile(path.join(outDir, 'kangin-goal.webp'));

await sharp(buffers.kanginPresentation)
  .resize({ width: 1500, withoutEnlargement: true })
  .webp({ quality: 89 })
  .toFile(path.join(outDir, 'kangin-presentation.webp'));

await sharp(buffers.nike)
  .resize(1200, 1500, { fit: 'cover', position: 'center' })
  .webp({ quality: 89 })
  .toFile(path.join(outDir, 'nike-stadium-look.webp'));

await sharp(buffers.nike)
  .extract({ left: 186, top: 220, width: 1500, height: 1000 })
  .resize(1500, 1000)
  .webp({ quality: 90 })
  .toFile(path.join(outDir, 'shirt-detail.webp'));

await sharp(buffers.stadiumProduct)
  .resize(1000, 1000, { fit: 'contain', background: '#f2f2f2' })
  .webp({ quality: 89 })
  .toFile(path.join(outDir, 'product-stadium.webp'));

await sharp(buffers.matchProduct)
  .resize(1000, 1000, { fit: 'contain', background: '#f2f2f2' })
  .webp({ quality: 89 })
  .toFile(path.join(outDir, 'product-match.webp'));
