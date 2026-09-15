import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// 밀라노 커플 축행: 산 시로·패션 거리·나빌리 사진을 역할별 비율로 잘라 WebP로 만든다. 출처는 원고 source-notes와 같다.
const outDir = path.resolve('public/images/pilgrimage/milan-san-siro-couple');
await mkdir(outDir, { recursive: true });

const sources = {
  stadiumInside: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/Milano_-_stadio_Giuseppe_Meazza_-_202209050049.jpeg/3840px-Milano_-_stadio_Giuseppe_Meazza_-_202209050049.jpeg',
  stadiumTowers: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/Milan_san_siro_stadium.jpg/3840px-Milan_san_siro_stadium.jpg',
  stadiumNight: 'https://upload.wikimedia.org/wikipedia/commons/2/23/The_San_Siro_Stadium_before_a_match_between_AC_Milan_and_SSC_Napoli_in_December_2021.jpg',
  m5Station: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Esterno_stazione_San_Siro_Stadio_%28metropolitana_di_Milano_linea_M5%29.JPG',
  montenapoleone: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/Via_Monte_Napoleone%2C_Milan%2C_Italy.jpg/3840px-Via_Monte_Napoleone%2C_Milan%2C_Italy.jpg',
  navigli: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/Milano_Naviglio_Grande_am_Abend_4.jpg/3840px-Milano_Naviglio_Grande_am_Abend_4.jpg',
  barLuce: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Fondazione_PRADA%2C_Via_Ripamonti_-_Largo_Isarco_area%2C_Bar_Luce%2C_50s_lifestyle_Milano_design_by_Wes_Anderson.jpg',
  gaeAulenti: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/Piazza_Gae_Aulenti_di_sera.jpg/3840px-Piazza_Gae_Aulenti_di_sera.jpg',
  galleria: 'https://images.pexels.com/photos/29655807/pexels-photo-29655807.jpeg?cs=srgb&fm=jpg',
  shopper: 'https://images.pexels.com/photos/974911/pexels-photo-974911.jpeg?cs=srgb&fm=jpg',
  hotelSenato: 'https://www.senatohotelmilano.it/media/homepage/Corte_interna_senato_hotel_milano_0.jpg',
  vlogPoster: 'https://i.ytimg.com/vi/O-0ITAaEkFE/maxresdefault.jpg',
};

async function fetchBuffer(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'BBingeFC/1.0 (sho36036@gmail.com)' }, redirect: 'follow' });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

const buffers = {};
for (const [key, url] of Object.entries(sources)) {
  buffers[key] = await fetchBuffer(url);
  await new Promise((resolve) => setTimeout(resolve, 600));
}

const out = (key, file, width, height, position = 'centre', quality = 88) =>
  sharp(buffers[key]).rotate().resize(width, height, { fit: 'cover', position }).webp({ quality }).toFile(path.join(outDir, file));

await out('stadiumInside', 'cover-stadium.webp', 1600, 900, 'centre', 90);
await out('stadiumTowers', 'card-towers.webp', 1200, 1200, 'centre', 89);
await out('stadiumTowers', 'sansiro-towers.webp', 1600, 900, 'centre');
await out('stadiumNight', 'sansiro-night.webp', 1200, 675, 'centre');
await out('m5Station', 'm5-san-siro-stadio.webp', 1600, 900, 'centre');
await out('montenapoleone', 'montenapoleone.webp', 1200, 1500, 'centre');
await out('galleria', 'galleria.webp', 1200, 1500, 'centre');
await out('shopper', 'shopping-day.webp', 1600, 1067, 'attention');
await out('navigli', 'navigli-evening.webp', 1600, 1067, 'centre');
await out('barLuce', 'bar-luce.webp', 1161, 801, 'centre');
await out('gaeAulenti', 'porta-nuova-night.webp', 1200, 675, 'centre');
await out('hotelSenato', 'hotel-senato.webp', 960, 540, 'centre');
await out('vlogPoster', 'matchday-vlog-poster.webp', 1280, 720, 'centre');

for (const file of ['cover-stadium', 'card-towers', 'shopping-day', 'navigli-evening']) {
  const meta = await sharp(path.join(outDir, `${file}.webp`)).metadata();
  console.log(`${file}: ${meta.width}x${meta.height}`);
}
