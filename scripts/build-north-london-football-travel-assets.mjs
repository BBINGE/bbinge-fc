import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// 북런던 축행: 에미레이츠·토트넘 홋스퍼 스타디움·하이버리·킹스크로스 사진을 역할별 비율로 잘라 WebP로 만든다. 출처는 원고 source-notes와 같다.
const outDir = path.resolve('public/images/pilgrimage/north-london-arsenal-tottenham');
await mkdir(outDir, { recursive: true });

const sources = {
  emiratesOutside: 'https://upload.wikimedia.org/wikipedia/commons/3/36/View_from_North_East_of_Arsenal%27s_Emirates_stadium%2C_London%2C_England.png',
  emiratesInside: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/Emirates_Stadium_Tour_%2828887603128%29.jpg/1920px-Emirates_Stadium_Tour_%2828887603128%29.jpg',
  arsenalStation: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Gillespie_Road_and_Arsenal_tube_station_-_geograph.org.uk_-_5258092.jpg',
  highburyAerial: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/London_Highbury_Square_-_Arsenal_stadium.jpg/1920px-London_Highbury_Square_-_Arsenal_stadium.jpg',
  spursOutside: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Tottenham_Hotspur_Stadium_overall_view.jpg/1920px-Tottenham_Hotspur_Stadium_overall_view.jpg',
  spursInside: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Spurs_stadium_south_stand_cropped.jpg/1920px-Spurs_stadium_south_stand_cropped.jpg',
  coalDrops: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Coal_Drops_Yard_%28view_from_the_south%29_2025-09-18.jpg/1920px-Coal_Drops_Yard_%28view_from_the_south%29_2025-09-18.jpg',
  granary: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/View_of_the_fountains_in_Granary_Square_-_geograph.org.uk_-_6023292.jpg/1920px-View_of_the_fountains_in_Granary_Square_-_geograph.org.uk_-_6023292.jpg',
  camden: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/Camden_Lock_Market_-_geograph.org.uk_-_8002344.jpg/1920px-Camden_Lock_Market_-_geograph.org.uk_-_8002344.jpg',
  greatNorthern: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Great_Northern_Hotel_%2816247872463%29.jpg/1920px-Great_Northern_Hotel_%2816247872463%29.jpg',
  maldron: 'https://media.maldronhotels.com/image/upload/f_jpg,c_auto,w_1600,q_auto,g_auto/v1709033825/maldron-hotel-finsbury-park-london/Friends_In_Restaurant-47_uqpmsm_ay5mam.jpg',
  vlogPoster: 'https://i.ytimg.com/vi/a1ei32N_yUI/maxresdefault.jpg',
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

await out('emiratesOutside', 'cover-emirates.webp', 1600, 900, 'centre', 90);
await out('emiratesOutside', 'card-emirates.webp', 1200, 1200, 'centre', 89);
await out('emiratesInside', 'emirates-inside.webp', 1600, 900, 'centre');
await out('arsenalStation', 'arsenal-station.webp', 1600, 900, 'centre');
await out('highburyAerial', 'highbury-square.webp', 1600, 1067, 'centre');
await out('spursOutside', 'spurs-stadium.webp', 1600, 900, 'centre');
await out('spursInside', 'spurs-inside.webp', 1600, 900, 'centre');
await out('coalDrops', 'coal-drops-yard.webp', 1600, 1067, 'centre');
await out('granary', 'granary-square.webp', 1200, 675, 'centre');
await out('camden', 'camden-market.webp', 1200, 1500, 'centre');
await out('greatNorthern', 'hotel-great-northern.webp', 1200, 675, 'centre');
await out('maldron', 'hotel-maldron.webp', 1200, 675, 'attention');
await out('vlogPoster', 'matchday-vlog-poster.webp', 1280, 720, 'centre');

for (const file of ['cover-emirates', 'card-emirates', 'spurs-inside', 'highbury-square']) {
  const meta = await sharp(path.join(outDir, `${file}.webp`)).metadata();
  console.log(`${file}: ${meta.width}x${meta.height}`);
}
