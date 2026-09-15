import { chromium } from 'playwright';
// 헝가리 황금의 팀 읽기 동선: 여섯 편 모두 하단에 나머지 다섯 편 카드가 뜨고, 380/1440에서 넘치지 않는지 확인한다.
const base = process.env.QA_BASE || 'http://localhost:4321';
const pages = [
  '/tactics/hungary-golden-team-total-football-elo-rating/',
  '/history/1954-korea-world-cup-journey/',
  '/archive/national-team/fifa-world-cup/1954-fifa-world-cup-best-xi/',
  '/highlights/fifa-world-cup/1954-fifa-world-cup-final-west-germany-hungary/',
  '/history/hungary-1956-revolution-golden-team-dissolution/',
  '/pilgrimage/budapest-honeymoon-football-travel-10/',
];
const browser = await chromium.launch();
const fails = [];
for (const width of [380, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  for (const path of pages) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    const route = await page.$('.season-route--hungary');
    if (!route) { fails.push(`${width} ${path} route missing`); continue; }
    await route.scrollIntoViewIfNeeded();
    const r = await page.evaluate(async (path) => {
      const cards = [...document.querySelectorAll('.season-route--hungary .season-route__card')];
      cards.forEach((c) => (c.querySelector('img').loading = 'eager'));
      await new Promise((ok) => setTimeout(ok, 900));
      const hrefs = cards.map((c) => c.getAttribute('href'));
      const status = await Promise.all(hrefs.map(async (h) => (await fetch(h)).status));
      return { overflow: document.documentElement.scrollWidth - innerWidth, count: cards.length, self: hrefs.includes(path), broken: cards.filter((c) => !c.querySelector('img').naturalWidth).length, bad: status.filter((s) => s !== 200).length };
    }, path);
    if (r.overflow > 0 || r.count !== 5 || r.self || r.broken || r.bad) fails.push(`${width} ${path} ${JSON.stringify(r)}`);
    if (path.includes('1956') || (width === 380 && path.includes('tactics'))) await route.screenshot({ path: `${process.env.TEMP}/hu-route-${width}-${path.split('/')[1]}.png` });
  }
  await page.close();
}
await browser.close();
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log('헝가리 읽기 동선 QA 통과');
