import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const outDir = path.resolve('public/images/culture/jhope-world-cup-look');
await mkdir(outDir, { recursive: true });

const sources = {
  fullLook: 'https://media.vogue.co.jp/photos/6a68a5f542cfe78efd7d247a/master/w_1600,c_limit/GettyImages-2287232140.jpg',
  movement: 'https://img.vogue.co.kr/vogue/2026/07/style_6a5f193d87d42-1400x933.jpg',
  team: 'https://img.vogue.co.kr/vogue/2026/07/style_6a5f195f123ed-1165x1400.jpg',
  profile: 'https://phinf.wevpstatic.net/MjAyNjAzMjBfNjQg/MDAxNzczOTc4OTk1Nzc0.DvrKVxi7ZImzILUypYpLWtTPwLbzfOyGaftHr1IYuVQg.XrJvuQt7x-hVoj_CukW9Tq0twmsykNAmp9bACk94dQEg.JPEG/6b061914-aa48-4a7e-8f83-9226c54d42d7.jpeg?type=w670',
  protocolProduct: 'https://protocol-index.com/web/product/small/202604/b305fad5fd02c69c320737a543760cd1.png',
  jlsProduct: 'https://online.john-lawrence-sullivan.com/cdn/shop/files/IMG_0814.jpg?v=1766202289&width=2272',
  videoPoster: 'https://i.ytimg.com/vi/_bhYr1BpByY/maxresdefault.jpg',
};

async function fetchBuffer(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 BBingeFC/1.0' } });
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

await sharp(buffers.fullLook).resize(1600, 900, { fit: 'cover', position: 'center' }).webp({ quality: 89 }).toFile(path.join(outDir, 'cover.webp'));
await sharp(buffers.fullLook).resize(1000, 1000, { fit: 'cover', position: 'right' }).webp({ quality: 88 }).toFile(path.join(outDir, 'card.webp'));
await sharp(buffers.profile).resize(800, 800, { fit: 'cover', position: 'attention' }).webp({ quality: 88 }).toFile(path.join(outDir, 'profile.webp'));
await sharp(buffers.fullLook).resize(1600, 1067, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 89 }).toFile(path.join(outDir, 'full-look.webp'));
await sharp(buffers.fullLook).extract({ left: 785, top: 50, width: 650, height: 800 }).webp({ quality: 89 }).toFile(path.join(outDir, 'jersey-belts.webp'));
await sharp(buffers.fullLook).extract({ left: 690, top: 335, width: 830, height: 700 }).webp({ quality: 89 }).toFile(path.join(outDir, 'denim-shoes.webp'));
await sharp(buffers.movement).resize(1400, 933, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toFile(path.join(outDir, 'movement.webp'));
await sharp(buffers.team).resize(1165, 1400, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toFile(path.join(outDir, 'team.webp'));
await sharp(buffers.protocolProduct).resize(1000, 1000, { fit: 'contain', background: '#f7f7f5' }).webp({ quality: 88 }).toFile(path.join(outDir, 'protocol-referee-jersey.webp'));
await sharp(buffers.jlsProduct).resize(1000, 1000, { fit: 'cover', position: 'center' }).webp({ quality: 88 }).toFile(path.join(outDir, 'jls-washed-wide-denim.webp'));
await sharp(buffers.videoPoster).resize(1280, 720, { fit: 'cover', position: 'center' }).webp({ quality: 87 }).toFile(path.join(outDir, 'video-poster.webp'));
