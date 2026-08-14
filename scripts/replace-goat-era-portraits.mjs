import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const replacements = {
  leonidas: 'Leônidas da Silva 01.jpg',
  figueroa: 'Elias figueroa inter.jpg',
  'kim-min-jae': 'FC RB Salzburg gegen FC Bayern München (2026-01-06 Testspiel) 39.jpg',
  kaka: 'Kaka 355 280 px.jpg',
  'van-basten': 'Marco van Basten 1990-1992.jpg',
  zlatan: 'PSG-Shakhter15 (11).jpg',
  'ronaldo-r9': 'Ronaldo 2002 cropped.jpg',
  zico: 'Zico flamengo elgrafico.jpg',
  platini: 'Platini juventus2 (cropped).jpg',
  coluna: 'Mario Coluna (1965).jpg',
  masopust: 'Bobby Moore vs Josef Masopust 1963.jpg',
  'thomas-muller': 'Thomas Müller 2013.jpg',
  albert: 'Florian Albert en 1966.jpg',
  lineker: 'EK voetbal in West Duitsland Engeland tegen Nederland 1-3, Bestanddeelnr 934-2662.jpg',
  keegan: 'FC Zürich against Liverpool - Kevin Keegan.jpg',
  raul: 'Raul Gonzalez 10mar2007.jpg',
  puskas: 'Puskas 1954.png',
  'puskas-banner': 'Ferenc Puskás, Estadio, 1954-03-27 (567).jpg',
  cannavaro: 'Fabio Cannavaro.jpg',
  gerrard: 'Steven Gerrard.jpg',
  francescoli: 'Enzo Francescoli 1984.jpg',
  socrates: 'Socrates elgrafico 1983.jpg',
  dalglish: 'Kenny Dalglish 1980s (cropped).jpg',
  blokhin: 'Oleg Blokhin 1977.jpg',
  ronaldinho: 'Ronaldinho.jpg',
  cantona: 'Cantona, Eric.jpg',
  neuer: 'Матч «Динамо» - «Баварія» 1-2. 23 листопада 2021 року — 1297009.jpg',
  'roberto-carlos': 'Roberto Carlos Corinthians.jpg',
  rummenigge: 'FC Bayern Munchen tegen Aston Villa 0-1 Europa Cup I Rummennige in aktie, Bestanddeelnr 932-1815.jpg',
  'nilton-santos': 'Nilton Santos na Seleção Brasileira.jpg',
  thuram: 'Lilian Thuram 2007.jpg',
  maldini: 'Maldini2008.JPG',
  shevchenko: 'Andriy Shevchenko - 2004 - AC Milan (1).jpg',
  zidane: 'Zinedine zidane 2005 cropped.jpg',
};
const requestedIds = new Set(process.argv.slice(2));
const manifestPath = resolve('src/data/goat-player-images.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const userAgent = 'BBingeFC/1.0 (https://bbingefc.com/contact/)';

function plain(value = '') {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

for (const [id, filename] of Object.entries(replacements)) {
  if (requestedIds.size && !requestedIds.has(id)) continue;
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
  const extension = filename.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
  const localPath = resolve(`public/images/goat/players/${id}.${extension}`);
  await writeFile(localPath, Buffer.from(await image.arrayBuffer()));
  const meta = info.extmetadata ?? {};
  manifest.portraits[id] = {
    ...manifest.portraits[id],
    src: `/images/goat/players/${id}.${extension}`,
    commons: info.descriptionurl,
    author: plain(meta.Artist?.value || meta.Credit?.value || 'Wikimedia Commons contributor'),
    license: plain(meta.LicenseShortName?.value || meta.UsageTerms?.value || 'Commons 파일 페이지 참조'),
  };
  manifest.updatedAt = new Date().toISOString();
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`${id}: ${filename}`);
}

manifest.updatedAt = new Date().toISOString();
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
