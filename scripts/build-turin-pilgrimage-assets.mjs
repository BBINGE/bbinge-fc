import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const outDir = path.resolve('public/images/pilgrimage/turin-two-museums');
await fs.mkdir(outDir, { recursive: true });

const downloads = [
  ['juventus-hall-of-fame.webp', 'https://www.juventus.com/images/image/private/t_editorial_landscape_12_desktop/f_auto/dev/p2ljygtjn8crb6e3tmoc.jpg'],
  ['juventus-hall-room.webp', 'https://www.juventus.com/images/image/private/t_editorial_landscape_8_desktop_mobile/f_auto/dev/almgu4nv1h9e5rjzi2nt.jpg'],
  ['juventus-museum-trophies.webp', 'https://www.juventus.com/images/image/private/t_editorial_landscape_12_desktop/f_auto/dev/a5wuwcccomfz6y4eu3w2.jpg'],
  ['filadelfia.webp', 'https://www.torinofc.it/sites/default/files/styles/scala_ritaglia_sedici_noni/public/8523212_medium.jpg?itok=XbKN7_69'],
  ['toro-aircraft-wheel.webp', 'https://cms2.turismotorino.org/assets/9c0c8a52-a191-4fca-a4e9-5ed48a802505?format=jpg&quality=85&width=1800'],
  ['toro-meroni-car.webp', 'https://cms2.turismotorino.org/assets/4fc55dc0-f7a1-4070-bd74-f01fd439fcdb?format=jpg&quality=85&width=1800'],
  ['toro-shirts.webp', 'https://cms2.turismotorino.org/assets/b2ed091b-d9d5-4aba-b80f-c3d9a8be065e?format=jpg&quality=85&width=1800'],
  ['superga-basilica.webp', 'https://cms2.turismotorino.org/assets/4019d7a9-4a24-4a6a-bd3a-74969857619c?format=jpg&quality=85&width=1800'],
];

for (const [name, url] of downloads) {
  const response = await fetch(url, { headers: { 'user-agent': 'BBingeFC editorial asset builder/1.0' } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const input = Buffer.from(await response.arrayBuffer());
  await sharp(input)
    .rotate()
    .resize({ width: 1800, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84 })
    .toFile(path.join(outDir, name));
}

await sharp('public/images/pilgrimage/turin-walk-of-fame/lingotto.jpg')
  .rotate()
  .resize({ width: 1800, height: 1200, fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 84 })
  .toFile(path.join(outDir, 'lingotto.webp'));

const generatedCover = process.argv[2];
if (generatedCover) {
  await sharp(generatedCover)
    .resize(1600, 900, { fit: 'cover', position: 'centre' })
    .webp({ quality: 88 })
    .toFile(path.join(outDir, 'turin-two-museums-cover.webp'));
  await sharp(generatedCover)
    .resize(1000, 1000, { fit: 'cover', position: 'centre' })
    .webp({ quality: 86 })
    .toFile(path.join(outDir, 'turin-two-museums-card.webp'));
} else {
  console.log('Cover conversion skipped. Pass a source image path as the first argument to rebuild it.');
}

const bbox = { west: 7.56, east: 7.79, north: 45.13, south: 45.015 };
const zoom = 12;
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
  create: { width: canvasWidth, height: canvasHeight, channels: 4, background: '#e9e7e1' },
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
  .resize(1400, 1000, { fit: 'fill' })
  .modulate({ saturation: 0.7, brightness: 1.04 })
  .webp({ quality: 86 })
  .toFile(path.join(outDir, 'turin-route-map-osm.webp'));

console.log(`Built Turin pilgrimage assets in ${outDir}`);
