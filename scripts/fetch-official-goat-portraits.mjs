import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const portraits = {
  'kim-min-jae': {
    url: 'https://img.fcbayern.com/image/upload/f_auto/q_auto/ar_1:1,c_fill,g_custom,w_768/v1785247484/cms/public/images/fcbayern-com/players/spielerportraits/teaser/minjae-kim.png',
    page: 'https://fcbayern.com/en/teams/first-team/minjae-kim', author: 'FC Bayern München', license: '© FC Bayern München',
  },
  stoichkov: {
    url: 'https://www.fcbarcelona.com/photo-resources/2019/04/01/fa55f68c-76b2-4f6b-bbc3-ade0550ec793/Hristo-Stoichkov-Optimized.JPG?height=1200&width=900',
    page: 'https://www.fcbarcelona.com/en/football/barca-legends/players/1054352/stoichkov', author: 'FC Barcelona', license: '© FC Barcelona',
  },
};
const manifestPath = resolve('src/data/goat-player-images.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const requestedIds = new Set(process.argv.slice(2));
for (const [id, item] of Object.entries(portraits)) {
  if (requestedIds.size && !requestedIds.has(id)) continue;
  const response = await fetch(item.url, { headers: { 'User-Agent': 'BBingeFC/1.0 (https://bbingefc.com/contact/)' } });
  if (!response.ok) throw new Error(`${id}: ${response.status}`);
  await writeFile(resolve(`public/images/goat/players/${id}.jpg`), Buffer.from(await response.arrayBuffer()));
  manifest.portraits[id] = { ...(manifest.portraits[id] ?? {}), src: `/images/goat/players/${id}.jpg`, commons: item.page, author: item.author, license: item.license };
}
manifest.updatedAt = new Date().toISOString();
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
