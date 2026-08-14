import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const replacements = {
  zico: 'Zico panini card 79.jpg',
  platini: 'Platini juventus2 (cropped).jpg',
  coluna: 'Mario Coluna (1965).jpg',
};
const manifestPath = resolve('src/data/goat-player-images.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const userAgent = 'BBingeFC/1.0 (https://bbingefc.com/contact/)';

function plain(value = '') {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

for (const [id, filename] of Object.entries(replacements)) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query', format: 'json', origin: '*', prop: 'imageinfo',
    iiprop: 'url|extmetadata', iiurlwidth: '900', titles: `File:${filename}`,
  });
  const payload = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': userAgent } }).then((response) => response.json());
  const page = Object.values(payload.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info?.thumburl) throw new Error(`${id}: Commons 사진을 찾지 못함`);
  const image = await fetch(info.thumburl, { headers: { 'User-Agent': userAgent } });
  if (!image.ok) throw new Error(`${id}: 이미지 ${image.status}`);
  const localPath = resolve(`public/images/goat/players/${id}.jpg`);
  await writeFile(localPath, Buffer.from(await image.arrayBuffer()));
  const meta = info.extmetadata ?? {};
  manifest.portraits[id] = {
    ...manifest.portraits[id],
    src: `/images/goat/players/${id}.jpg`,
    commons: info.descriptionurl,
    author: plain(meta.Artist?.value || meta.Credit?.value || 'Wikimedia Commons contributor'),
    license: plain(meta.LicenseShortName?.value || meta.UsageTerms?.value || 'Commons 파일 페이지 참조'),
  };
  console.log(`${id}: ${filename}`);
}

manifest.updatedAt = new Date().toISOString();
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
