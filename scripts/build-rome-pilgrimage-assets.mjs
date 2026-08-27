import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const outDir = path.resolve('public/images/pilgrimage/rome-football-city');
await fs.mkdir(outDir, { recursive: true });

const editorialDownloads = [
  {
    name: 'rome-trevi-night.webp',
    url: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Fountain_Trevi_Night_20251112.jpg',
    width: 1200,
    height: 1600,
  },
  {
    name: 'rome-pincio-sunset.webp',
    url: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Sunset%20in%20Rome%20%2853306759500%29.jpg',
    width: 1400,
    height: 1050,
  },
  {
    name: 'rome-trastevere-cafe.webp',
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Roma_Trastevere_%2852345941595%29.jpg',
    width: 1400,
    height: 1050,
  },
];

for (const asset of editorialDownloads) {
  const output = path.join(outDir, asset.name);
  try {
    if (!process.argv.includes('--force')) {
      await fs.access(output);
      continue;
    }
  } catch {}
  const response = await fetch(asset.url, { headers: { 'user-agent': 'BBingeFC editorial asset builder/1.0' } });
  if (!response.ok) throw new Error(`${response.status} ${asset.url}`);
  const input = Buffer.from(await response.arrayBuffer());
  await sharp(input)
    .rotate()
    .resize(asset.width, asset.height, { fit: 'cover', position: 'centre' })
    .webp({ quality: 86 })
    .toFile(output);
}

if (process.argv.includes('--editorial-only')) {
  console.log(`Built Rome editorial assets in ${outDir}`);
  process.exit(0);
}

const downloads = [
  ['as-roma-foundation.webp', 'https://media.asroma.com/prod/images/original/3a00596bf5fb-as-roma-storia-2.webp'],
  ['lazio-founders.jpg', 'https://mediaverse.sslazio.hiway.media/VMFS1/FILES/public/upload/63b2e9be/1900_Bigiarelli-Giacomo.jpg'],
  ['lazio-farnesina.jpg', 'https://mediaverse.sslazio.hiway.media/VMFS1/FILES/public/upload/63b30a22/1912_Vittoria.jpg'],
  ['flaminio-project.jpg', 'https://mediaverse.sslazio.hiway.media/VMFS1/FILES/public/upload/698f0f80/flaminio.jpg'],
  ['foro-italico.jpg', 'https://www.turismoroma.it/sites/default/files/Foro%20Italico%20-%20Stadio%20dei%20Marmi.jpg'],
  ['testaccio.jpg', 'https://www.turismoroma.it/sites/default/files/TESTACCIO%20COP.jpg'],
  ['ponte-milvio.jpg', 'https://www.turismoroma.it/sites/default/files/Ponte%20Milvio%40Z%C3%A8tema.jpg'],
];

for (const [name, url] of downloads) {
  const response = await fetch(url, { headers: { 'user-agent': 'BBingeFC editorial asset builder/1.0' } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const input = Buffer.from(await response.arrayBuffer());
  await sharp(input)
    .rotate()
    .resize({ width: 1800, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84 })
    .toFile(path.join(outDir, name.replace(/\.(?:jpg|jpeg|png)$/i, '.webp')));
}

const generatedCover = process.argv[2];
if (generatedCover) {
  await sharp(generatedCover)
    .resize(1600, 900, { fit: 'cover', position: 'centre' })
    .webp({ quality: 88 })
    .toFile(path.join(outDir, 'rome-two-clubs-cover.webp'));
} else {
  console.log('Cover conversion skipped. Pass a source image path as the first argument to rebuild it.');
}

const bbox = { west: 12.42, east: 12.52, north: 41.95, south: 41.86 };
const zoom = 13;
const tileSize = 256;
const scale = 2 ** zoom;
const lonToPixel = (lon) => ((lon + 180) / 360) * scale * tileSize;
const latToPixel = (lat) => {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * scale * tileSize;
};

const left = lonToPixel(bbox.west);
const right = lonToPixel(bbox.east);
const top = latToPixel(bbox.north);
const bottom = latToPixel(bbox.south);
const minTileX = Math.floor(left / tileSize);
const maxTileX = Math.floor(right / tileSize);
const minTileY = Math.floor(top / tileSize);
const maxTileY = Math.floor(bottom / tileSize);
const canvasWidth = (maxTileX - minTileX + 1) * tileSize;
const canvasHeight = (maxTileY - minTileY + 1) * tileSize;
const tiles = [];

for (let y = minTileY; y <= maxTileY; y += 1) {
  for (let x = minTileX; x <= maxTileX; x += 1) {
    const response = await fetch(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`, {
      headers: { 'user-agent': 'BBingeFC/1.0 (https://bbingefc.com)' },
    });
    if (!response.ok) throw new Error(`${response.status} OSM tile ${x}/${y}`);
    tiles.push({
      input: Buffer.from(await response.arrayBuffer()),
      left: (x - minTileX) * tileSize,
      top: (y - minTileY) * tileSize,
    });
  }
}

const mosaic = await sharp({
  create: { width: canvasWidth, height: canvasHeight, channels: 4, background: '#eee7dc' },
})
  .composite(tiles)
  .png()
  .toBuffer();

await sharp(mosaic)
  .extract({
    left: Math.round(left - minTileX * tileSize),
    top: Math.round(top - minTileY * tileSize),
    width: Math.max(1, Math.round(right - left)),
    height: Math.max(1, Math.round(bottom - top)),
  })
  .resize(1200, 1200, { fit: 'fill' })
  .modulate({ saturation: 0.72, brightness: 1.04 })
  .webp({ quality: 86 })
  .toFile(path.join(outDir, 'rome-route-map-osm.webp'));

console.log(`Built Rome pilgrimage assets in ${outDir}`);
