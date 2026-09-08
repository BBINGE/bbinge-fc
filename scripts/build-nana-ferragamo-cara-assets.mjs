import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const sourceDir = path.join(root, 'scripts', 'article-assets', 'nana-ferragamo-cara');
const outputDir = path.join(root, 'public', 'images', 'culture', 'nana-ferragamo-cara');

const productSources = {
  front: 'https://prcdn.freetls.fastly.net/release_image/90078/63/90078-63-fd851f78debc6b0f0249e5ca8d53d668-3900x3900.jpg?auto=webp&bg-color=fff&fit=bounds&format=jpeg&height=1350&quality=85%2C65&width=1950',
  open: 'https://prcdn.freetls.fastly.net/release_image/90078/63/90078-63-291be0ee0e37077f0cef3c46e68c4bf1-3900x3900.jpg?auto=webp&bg-color=fff&fit=bounds&format=jpeg&height=1350&quality=85%2C65&width=1950',
  craft: 'https://prcdn.freetls.fastly.net/release_image/90078/63/90078-63-b82ed627a624dff64336e9e5355e8a7f-896x896.png?auto=webp&bg-color=fff&fit=bounds&format=jpeg&height=1350&quality=85%2C75&width=1950',
  colors: 'https://prcdn.freetls.fastly.net/release_image/90078/63/90078-63-ba4afc53ec2ec8601038794ddc9f2e5b-3900x3900.jpg?auto=webp&bg-color=fff&fit=bounds&format=jpeg&height=1350&quality=85%2C65&width=1950',
};

async function download(url, fileName) {
  const target = path.join(sourceDir, fileName);
  try {
    await fs.access(target);
    return target;
  } catch {}

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
  return target;
}

async function webp(input, output, width, height, fit = 'cover', position = 'attention') {
  await sharp(input)
    .resize(width, height, { fit, position, background: '#f4efe6' })
    .webp({ quality: 86, effort: 6 })
    .toFile(path.join(outputDir, output));
}

await fs.mkdir(outputDir, { recursive: true });

const nana = path.join(sourceDir, 'ferragamo-official-nana.jpg');
const profile = path.join(sourceDir, 'nana-official-laka-portrait.jpg');
const downloaded = {};
for (const [name, url] of Object.entries(productSources)) {
  downloaded[name] = await download(url, `ferragamo-cara-${name}.jpg`);
}

await webp(nana, 'nana-full.webp', 1200, 1600, 'cover', 'centre');
await sharp(profile)
  .resize(960, 1200, { fit: 'cover', position: 'attention' })
  .webp({ quality: 88, effort: 6 })
  .toFile(path.join(outputDir, 'profile.webp'));

await webp(downloaded.front, 'cara-front.webp', 1000, 1000, 'cover', 'centre');
await webp(downloaded.open, 'cara-open.webp', 1000, 1000, 'cover', 'centre');
await webp(downloaded.craft, 'cara-craft.webp', 1000, 1000, 'cover', 'centre');
await webp(downloaded.colors, 'cara-colors.webp', 1000, 1000, 'cover', 'centre');

const coverLeft = await sharp(nana)
  .extract({ left: 0, top: 0, width: 2160, height: 2400 })
  .resize(840, 900, { fit: 'cover', position: 'centre' })
  .webp({ quality: 90 })
  .toBuffer();
const coverRight = await sharp(nana)
  .extract({ left: 180, top: 1160, width: 1800, height: 1600 })
  .resize(760, 900, { fit: 'cover', position: 'centre' })
  .webp({ quality: 90 })
  .toBuffer();
await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#061936' } })
  .composite([
    { input: coverLeft, left: 0, top: 0 },
    { input: coverRight, left: 840, top: 0 },
    {
      input: Buffer.from('<svg width="1600" height="900"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0.42" stop-color="#061936" stop-opacity="0"/><stop offset="0.51" stop-color="#061936" stop-opacity=".4"/><stop offset="0.58" stop-color="#061936" stop-opacity="0"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/></svg>'),
      left: 0,
      top: 0,
    },
  ])
  .webp({ quality: 88, effort: 6 })
  .toFile(path.join(outputDir, 'cover.webp'));

const cardTop = await sharp(nana)
  .extract({ left: 360, top: 180, width: 1800, height: 1800 })
  .resize(1000, 1000)
  .webp({ quality: 88 })
  .toBuffer();
await sharp(cardTop)
  .composite([{
    input: Buffer.from('<svg width="1000" height="1000"><defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset=".62" stop-color="#061936" stop-opacity="0"/><stop offset="1" stop-color="#061936" stop-opacity=".52"/></linearGradient></defs><rect width="1000" height="1000" fill="url(#v)"/></svg>'),
    left: 0,
    top: 0,
  }])
  .webp({ quality: 88, effort: 6 })
  .toFile(path.join(outputDir, 'card.webp'));

await sharp(downloaded.craft)
  .resize(1280, 720, { fit: 'cover', position: 'centre' })
  .webp({ quality: 84, effort: 6 })
  .toFile(path.join(outputDir, 'video-poster.webp'));

console.log(`Built Nana × Ferragamo Cara assets in ${outputDir}`);
