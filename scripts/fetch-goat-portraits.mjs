import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const root = resolve('.');
const playersData = JSON.parse(await readFile(resolve(root, 'src/data/goat-players.json'), 'utf8'));
const outputDir = resolve(root, 'public/images/goat/players');
const manifestPath = resolve(root, 'src/data/goat-player-images.json');
const userAgent = 'BBingeFC/1.0 (https://bbingefc.com/contact/)';

await mkdir(outputDir, { recursive: true });

async function json(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': userAgent } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function normalized(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

async function findEntity(player) {
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'wbsearchentities', format: 'json', origin: '*', language: 'en',
    type: 'item', limit: '5', search: player.nameOriginal,
  });
  const result = await json(url);
  const wanted = normalized(player.nameOriginal);
  return result.search?.find((item) => normalized(item.label) === wanted)
    ?? result.search?.find((item) => (item.description || '').toLowerCase().includes('football'))
    ?? null;
}

async function entityImage(entityId) {
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.search = new URLSearchParams({ action: 'wbgetentities', format: 'json', origin: '*', ids: entityId, props: 'claims' });
  const data = await json(url);
  return data.entities?.[entityId]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value ?? null;
}

async function commonsInfo(filename) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query', format: 'json', origin: '*', prop: 'imageinfo',
    iiprop: 'url|extmetadata', iiurlwidth: '700', titles: `File:${filename}`,
  });
  const data = await json(url);
  const page = Object.values(data.query?.pages ?? {})[0];
  return page?.imageinfo?.[0] ?? null;
}

function plain(value = '') {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

const existing = await readFile(manifestPath, 'utf8').then(JSON.parse).catch(() => ({ portraits: {}, unresolved: [] }));
const portraits = { ...existing.portraits };
const unresolved = [];

for (const player of playersData.players) {
  if (portraits[player.id]?.src) continue;
  try {
    const entity = await findEntity(player);
    if (!entity) throw new Error('Wikidata 인물 미확인');
    const filename = await entityImage(entity.id);
    if (!filename) throw new Error('Commons 대표 사진 없음');
    const info = await commonsInfo(filename);
    if (!info?.thumburl) throw new Error('Commons 이미지 정보 없음');
    const sourceExt = extname(new URL(info.thumburl).pathname).toLowerCase();
    const extension = ['.jpg', '.jpeg', '.png', '.webp'].includes(sourceExt) ? sourceExt.replace('.jpeg', '.jpg') : '.jpg';
    const localName = `${player.id}${extension}`;
    const response = await fetch(info.thumburl, { headers: { 'User-Agent': userAgent } });
    if (!response.ok) throw new Error(`이미지 ${response.status}`);
    await writeFile(resolve(outputDir, localName), Buffer.from(await response.arrayBuffer()));
    const meta = info.extmetadata ?? {};
    portraits[player.id] = {
      src: `/images/goat/players/${localName}`,
      wikidata: `https://www.wikidata.org/wiki/${entity.id}`,
      commons: info.descriptionurl,
      author: plain(meta.Artist?.value || meta.Credit?.value || 'Wikimedia Commons contributor'),
      license: plain(meta.LicenseShortName?.value || meta.UsageTerms?.value || 'Commons 파일 페이지 참조'),
    };
    process.stdout.write(`✓ ${player.name} → ${entity.label}\n`);
  } catch (error) {
    unresolved.push({ id: player.id, name: player.name, reason: error.message });
    process.stdout.write(`- ${player.name}: ${error.message}\n`);
  }
}

await writeFile(manifestPath, `${JSON.stringify({ updatedAt: new Date().toISOString(), portraits, unresolved }, null, 2)}\n`, 'utf8');
console.log(`\n완료: 사진 ${Object.keys(portraits).length}명 / 미확정 ${unresolved.length}명`);
