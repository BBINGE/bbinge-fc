import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// 리버풀 축행: 안필드·힐 디킨슨 스타디움·구디슨 파크·비틀스 코스 사진을 역할별 비율로 잘라 WebP로 만든다. 출처는 원고 source-notes와 같다.
const outDir = path.resolve('public/images/pilgrimage/liverpool-anfield-everton');
await mkdir(outDir, { recursive: true });

const c = (hash, file) => `https://thumb.wikimedia.org/wikipedia/commons/thumb/${hash}/${file}/1920px-${file}`;
const sources = {
  anfieldInside: c('1/1e', 'Anfield_stadium_in_May_2024.jpg'),
  anfieldAerial: c('f/f8', 'Liverpool_anfield_road_stadium.jpg'),
  kop: c('7/79', 'The_Kop%2C_Anfield_-_geograph.org.uk_-_7559768.jpg'),
  paisley: c('d/d2', 'Paisley_Gateway%2C_Anfield.jpg'),
  hdsOutside: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Hilldickinsonstadium.jpg',
  hdsInside: c('6/64', 'Interior_of_Hill_Dickinson_Stadium.jpg'),
  goodison: c('e/ed', 'Liverpool_fc_everton_stadium.jpg'),
  cavern: c('9/97', 'The_Cavern_Club_wall%2C_Mathew_Street%2C_Liverpool%2C_2011.jpg'),
  beatles: c('7/7f', 'Beatles_statue%2C_Pier_Head_2018-1.jpg'),
  albertDock: c('b/b7', 'Royal_Albert_Dock%2C_Liverpool_-_2024-06-15.jpg'),
  titanic: c('7/73', 'Titanic_Hotel_-_Stanley_Dock_-_Liverpool_-_geograph.org.uk_-_5724696.jpg'),
  hardDays: c('2/21', 'Hard_Days_Night_Hotel%2C_main_entrance%2C_Liverpool_2009.jpg'),
  vlogPoster: 'https://i.ytimg.com/vi/l1tneKMd4sE/maxresdefault.jpg',
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

await out('anfieldInside', 'cover-anfield.webp', 1600, 900, 'centre', 90);
await out('hdsOutside', 'card-hill-dickinson.webp', 1200, 1200, 'centre', 89);
await out('anfieldAerial', 'anfield-aerial.webp', 1600, 1067, 'centre');
await out('kop', 'the-kop.webp', 1600, 900, 'centre');
await out('paisley', 'paisley-gateway.webp', 1200, 675, 'centre');
await out('hdsOutside', 'hill-dickinson-stadium.webp', 1600, 900, 'centre');
await out('hdsInside', 'hill-dickinson-inside.webp', 1600, 900, 'centre');
await out('goodison', 'goodison-park.webp', 1600, 1067, 'centre');
await out('cavern', 'cavern-wall.webp', 1200, 1500, 'centre');
await out('beatles', 'beatles-statue.webp', 1200, 1500, 'centre');
await out('albertDock', 'royal-albert-dock.webp', 1200, 675, 'centre');
await out('titanic', 'hotel-titanic.webp', 1200, 675, 'centre');
await out('hardDays', 'hotel-hard-days-night.webp', 1200, 675, 'centre');
await out('vlogPoster', 'matchday-vlog-poster.webp', 1280, 720, 'centre');

for (const file of ['cover-anfield', 'card-hill-dickinson', 'hill-dickinson-inside']) {
  const meta = await sharp(path.join(outDir, `${file}.webp`)).metadata();
  console.log(`${file}: ${meta.width}x${meta.height}`);
}
