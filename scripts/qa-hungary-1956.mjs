import { chromium } from 'playwright';
const base = process.env.QA_BASE || 'http://localhost:4321';
const url = `${base}/history/hungary-1956-revolution-golden-team-dissolution/`;
const browser = await chromium.launch();
const fails = [];
for (const width of [380, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  const r = await page.evaluate(async () => {
    for (const img of document.querySelectorAll('article img')) { img.loading = 'eager'; img.scrollIntoView(); await new Promise((ok) => setTimeout(ok, 60)); }
    await new Promise((ok) => setTimeout(ok, 800));
    const broken = [...document.querySelectorAll('article img')].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src);
    const missingCites = [...document.querySelectorAll('a.cite')].map((a) => a.getAttribute('href')).filter((h) => !document.querySelector(h));
    const pairCols = [...document.querySelectorAll('.evidence-pair')].map((p) => getComputedStyle(p).gridTemplateColumns.split(' ').length);
    return { overflow: document.documentElement.scrollWidth - innerWidth, broken, missingCites, stamps: document.querySelectorAll('.scene-stamp').length, quotes: document.querySelectorAll('.source-quote').length, pairCols, now: !!document.querySelector('.scene-stamp--now + .prose-ending, .scene-stamp--now ~ .prose-ending') };
  });
  console.log(width, JSON.stringify(r));
  if (r.overflow > 0) fails.push(`${width} overflow ${r.overflow}`);
  if (r.broken.length) fails.push(`${width} broken ${r.broken}`);
  if (r.missingCites.length) fails.push(`${width} cites ${r.missingCites}`);
  if (!r.now) fails.push('scene-stamp--now not before ending');
  await page.screenshot({ path: `${process.env.TEMP}/hu-${width}.png`, fullPage: false });
  await page.close();
}
await browser.close();
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log('헝가리 1956 QA 통과');
