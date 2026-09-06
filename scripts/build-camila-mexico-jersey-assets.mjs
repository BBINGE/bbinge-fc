import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const outputDir = path.resolve('public/images/culture/camila-mexico-jersey');

const sources = {
  street01: 'https://cdn.mos.cms.futurecdn.net/rZnU57iphYe4LVBvHCx2Pj.jpg',
  street02: 'https://cdn.mos.cms.futurecdn.net/k4LCnSeJDnPVXegFhkLas9.jpg',
  street03: 'https://media.vogue.mx/photos/6a4536f481de6b441af3a3f0/master/w_1600,c_limit/camila-cabello-con%20camiseta-de-la-seleccion-mexicana.jpg',
  profile: 'https://www.universal-music.co.jp/camila-cabello/wp-content/uploads/sites/4061/2024/03/12.jpg',
  video: 'https://i.ytimg.com/vi/59MldmTRnKk/maxresdefault.jpg',
  product: 'https://assets.adidas.com/images/h_2000,f_auto,q_auto,fl_lossy,c_fill,g_auto/fa62522ed3474701bef3bc74aa78b9d0_9366/Mexico_26_Home_Authentic_Jersey_Green_KA3994_41_detail.jpg',
};

async function download(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 BBingeFC editorial asset builder' },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function saveWebp(name, input, options = {}) {
  await sharp(input)
    .resize(options.resize)
    .webp({ quality: options.quality ?? 88, effort: 5 })
    .toFile(path.join(outputDir, name));
}

await mkdir(outputDir, { recursive: true });
const entries = await Promise.all(Object.entries(sources).map(async ([key, url]) => [key, await download(url)]));
const image = Object.fromEntries(entries);

for (const key of ['street01', 'street02', 'street03']) {
  const metadata = await sharp(image[key]).metadata();
  console.log(`${key}: ${metadata.width}x${metadata.height}`);
  await saveWebp(`${key.replace('street', 'street-')}.webp`, image[key], {
    resize: { width: 1200, withoutEnlargement: true },
  });
}

await saveWebp('profile.webp', image.profile, {
  resize: { width: 1000, height: 1250, fit: 'cover', position: 'attention' },
  quality: 90,
});
await saveWebp('video-poster.webp', image.video, {
  resize: { width: 1280, height: 720, fit: 'cover' },
});
await saveWebp('mexico-26-home-authentic.webp', image.product, {
  resize: { width: 1000, height: 1000, fit: 'cover', position: 'attention' },
});

const coverLeft = await sharp(image.street01)
  .resize({ width: 800, height: 900, fit: 'cover', position: 'attention' })
  .toBuffer();
const coverRight = await sharp(image.street02)
  .resize({ width: 800, height: 900, fit: 'cover', position: 'attention' })
  .toBuffer();
await sharp({
  create: { width: 1600, height: 900, channels: 3, background: '#0c3b28' },
})
  .composite([
    { input: coverLeft, left: 0, top: 0 },
    { input: coverRight, left: 800, top: 0 },
    { input: Buffer.from('<svg width="4" height="900"><rect width="4" height="900" fill="#e7c890" fill-opacity=".92"/></svg>'), left: 798, top: 0 },
  ])
  .webp({ quality: 90, effort: 5 })
  .toFile(path.join(outputDir, 'cover.webp'));

await saveWebp('card.webp', image.street01, {
  resize: { width: 900, height: 900, fit: 'cover', position: 'attention' },
  quality: 90,
});

await writeFile(
  path.join(outputDir, 'sources.txt'),
  Object.entries(sources).map(([key, url]) => `${key}\t${url}`).join('\n') + '\n',
  'utf8',
);

console.log(`Built Camila Cabello editorial assets in ${outputDir}`);
