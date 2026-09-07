import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const outDir = path.resolve('public/images/pilgrimage/kangin-metropolitano');
await mkdir(outDir, { recursive: true });

const sources = {
  stadiumCrowd: 'https://upload.wikimedia.org/wikipedia/commons/2/21/South_Stand_View_-_Atleti_vs_Real_Madrid_September_2025.jpg',
  metroEntrance: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Acceso_principal_renovado_a_la_estaci%C3%B3n_de_Metro_de_Madrid_de_Estadio_Metropolitano.jpg',
  metroPlatform: 'https://upload.wikimedia.org/wikipedia/commons/6/68/Andenes_de_la_estaci%C3%B3n_de_Estadio_Metropolitano_%28L7%29_de_Metro_de_Madrid.jpg',
  granViaNight: 'https://images.pexels.com/photos/15045249/pexels-photo-15045249.jpeg?cs=srgb&fm=jpg',
  madridTapas: 'https://images.pexels.com/photos/21327968/pexels-photo-21327968.jpeg?cs=srgb&fm=jpg',
  madridSunset: 'https://images.pexels.com/photos/5006030/pexels-photo-5006030.jpeg?cs=srgb&fm=jpg',
  hotelIlunion: 'https://www.ilunionhotels.com/content/dam/ilunion/es/media/hotels/ilunion-alcala-norte/galerias/restaurante/ilunion-alcalanorte-restaurante1.jpg',
  hotelPuertaAmerica: 'https://image-tc.galaxy.tf/wijpeg-bjlgdtd5cwc9gbt2ro4w5h1lt/ron-arad-7th-floor_standard.jpg?crop=0%2C1%2C1920%2C1440&width=1200',
  hotelOnlyYou: 'https://www.onlyyouhotels.com/content/imgsxml/galerias/panel_galeriatextogris/1/1454.jpg',
  vlogPoster: 'https://i.ytimg.com/vi/eHPJvPDuOfQ/maxresdefault.jpg',
};

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 BBingeFC/1.0' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

const buffers = {};
for (const [key, url] of Object.entries(sources)) {
  buffers[key] = await fetchBuffer(url);
  await new Promise((resolve) => setTimeout(resolve, 450));
}

for (const [key, buffer] of Object.entries(buffers)) {
  const meta = await sharp(buffer).metadata();
  console.log(`${key}: ${meta.width}x${meta.height}`);
}

await sharp(buffers.stadiumCrowd)
  .resize(1600, 900, { fit: 'cover', position: 'centre' })
  .webp({ quality: 90 })
  .toFile(path.join(outDir, 'cover-crowd.webp'));

await sharp(buffers.stadiumCrowd)
  .resize(1200, 1200, { fit: 'cover', position: 'attention' })
  .webp({ quality: 89 })
  .toFile(path.join(outDir, 'card-crowd.webp'));

await sharp(buffers.metroEntrance)
  .resize(1600, 900, { fit: 'cover', position: 'centre' })
  .webp({ quality: 88 })
  .toFile(path.join(outDir, 'metro-entrance.webp'));

await sharp(buffers.metroPlatform)
  .resize(1600, 900, { fit: 'cover', position: 'centre' })
  .webp({ quality: 88 })
  .toFile(path.join(outDir, 'metro-platform.webp'));

await sharp(buffers.granViaNight)
  .resize(1600, 1067, { fit: 'cover', position: 'south' })
  .webp({ quality: 88 })
  .toFile(path.join(outDir, 'gran-via-night.webp'));

await sharp(buffers.madridTapas)
  .resize(1200, 1500, { fit: 'cover', position: 'attention' })
  .webp({ quality: 88 })
  .toFile(path.join(outDir, 'madrid-tapas.webp'));

await sharp(buffers.madridSunset)
  .resize(1200, 1500, { fit: 'cover', position: 'attention' })
  .webp({ quality: 88 })
  .toFile(path.join(outDir, 'madrid-sunset-people.webp'));

await sharp(buffers.hotelIlunion)
  .resize(1200, 675, { fit: 'cover', position: 'attention' })
  .webp({ quality: 87 })
  .toFile(path.join(outDir, 'hotel-ilunion.webp'));

await sharp(buffers.hotelPuertaAmerica)
  .resize(1200, 675, { fit: 'cover', position: 'attention' })
  .webp({ quality: 87 })
  .toFile(path.join(outDir, 'hotel-puerta-america.webp'));

await sharp(buffers.hotelOnlyYou)
  .resize(1200, 675, { fit: 'cover', position: 'attention' })
  .webp({ quality: 87 })
  .toFile(path.join(outDir, 'hotel-only-you.webp'));

await sharp(buffers.vlogPoster)
  .resize(1280, 720, { fit: 'cover', position: 'attention' })
  .webp({ quality: 88 })
  .toFile(path.join(outDir, 'matchday-vlog-poster.webp'));
