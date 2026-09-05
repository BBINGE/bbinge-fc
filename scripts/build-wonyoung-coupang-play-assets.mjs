import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const outputDir = path.resolve('public/images/culture/wonyoung-coupang-play');

const sources = {
  stadium: 'https://img.marieclairekorea.com//2025/08/mck_68abd23edc126-822x1024.jpg',
  closeup: 'https://img.marieclairekorea.com//2025/08/mck_68abd2736d565-822x1024.jpg',
  press: 'https://image.starnewskorea.com/21/2025/08/2025080110061260977_2.jpg',
  profile: 'https://www.sonymusic.co.jp/img/common/artist_image/77702000/77702730/profile/JANGWONYOUNG%201%28%ED%94%84%EB%A1%9C%ED%95%84%29.jpg',
  video: 'https://i.ytimg.com/vi/WzBxIbyCpdI/maxresdefault.jpg',
  product: 'https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_1200,h_1200/global/784326/01/mod01/fnd/KOR/fmt/png/MCFC-Home-Jersey-Replica',
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

await saveWebp('profile.webp', image.profile, {
  resize: { width: 1000, height: 1250, fit: 'cover', position: 'attention' },
});
await saveWebp('stadium-full.webp', image.stadium, { resize: { width: 986, withoutEnlargement: true } });
await saveWebp('closeup.webp', image.closeup, { resize: { width: 986, withoutEnlargement: true } });
await saveWebp('ball-portrait.webp', image.press, { resize: { width: 960, withoutEnlargement: true } });
await saveWebp('video-poster.webp', image.video, { resize: { width: 1280, height: 720, fit: 'cover' } });
await saveWebp('mcfc-light-blue.webp', image.product, { resize: { width: 1000, height: 1000, fit: 'cover' } });

const coverLeft = await sharp(image.stadium)
  .resize({ width: 800, height: 900, fit: 'cover', position: 'attention' })
  .toBuffer();
const coverRight = await sharp(image.closeup)
  .resize({ width: 800, height: 900, fit: 'cover', position: 'attention' })
  .toBuffer();
await sharp({
  create: { width: 1600, height: 900, channels: 3, background: '#d7f3ff' },
})
  .composite([
    { input: coverLeft, left: 0, top: 0 },
    { input: coverRight, left: 800, top: 0 },
    { input: Buffer.from('<svg width="4" height="900"><rect width="4" height="900" fill="#f7fbff" fill-opacity=".9"/></svg>'), left: 798, top: 0 },
  ])
  .webp({ quality: 90, effort: 5 })
  .toFile(path.join(outputDir, 'cover.webp'));

await saveWebp('card.webp', image.stadium, {
  resize: { width: 900, height: 900, fit: 'cover', position: 'attention' },
  quality: 90,
});

await writeFile(
  path.join(outputDir, 'sources.txt'),
  Object.entries(sources).map(([key, url]) => `${key}\t${url}`).join('\n') + '\n',
  'utf8',
);

console.log(`Built Wonyoung editorial assets in ${outputDir}`);
