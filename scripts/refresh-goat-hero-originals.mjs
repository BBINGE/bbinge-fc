import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const files = {
  cristiano: 'Cristiano Ronaldo Croatia v Portugal 2 July 2026-075 (cropped).jpg',
  messi: 'Leo Messi Argentina v Egypt 7 July 2026-1.jpg',
};
const userAgent = 'BBingeFC/1.0 (https://bbingefc.com/contact/)';

for (const [id, filename] of Object.entries(files)) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    prop: 'imageinfo',
    iiprop: 'url',
    titles: `File:${filename}`,
  });
  const payload = await fetch(api, { headers: { 'User-Agent': userAgent } }).then((response) => response.json());
  const page = Object.values(payload.query?.pages ?? {})[0];
  const originalUrl = page?.imageinfo?.[0]?.url;
  if (!originalUrl) throw new Error(`${id}: Commons 원본 URL을 찾지 못했습니다.`);
  const response = await fetch(originalUrl, { headers: { 'User-Agent': userAgent } });
  if (!response.ok) throw new Error(`${id}: ${response.status}`);
  await writeFile(resolve(`public/images/goat/players/${id}.jpg`), Buffer.from(await response.arrayBuffer()));
  console.log(`${id}: original downloaded`);
}
