import { chromium } from 'playwright';
// 원정 다득점 축떡: 380/1440에서 가로 넘침, 깨진 이미지, 인용 앵커, 데이터 패널 렌더를 확인한다.
const base = process.env.QA_BASE || 'http://localhost:4321';
const url = `${base}/football-made-easy/away-goals-rule-abolition-uefa-data/`;
const browser = await chromium.launch();
const fails = [];
for (const width of [380, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  const r = await page.evaluate(async () => {
    for (const img of document.querySelectorAll('article img')) { img.loading = 'eager'; img.scrollIntoView(); await new Promise((ok) => setTimeout(ok, 80)); }
    await new Promise((ok) => setTimeout(ok, 800));
    const over = [...document.querySelectorAll('.ag-board,.ag-bars,.ag-et,.ag-cf,.ag-split,.ag-home,.ag-cases,.ag-legs,.ag-clubs,.ag-scope,.ag-timeline')].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.className);
    return {
      overflow: document.documentElement.scrollWidth - innerWidth,
      broken: [...document.querySelectorAll('article img')].filter((i) => !i.naturalWidth).map((i) => i.src),
      missingCites: [...document.querySelectorAll('a.cite')].map((a) => a.getAttribute('href')).filter((h) => !document.querySelector(h)),
      panels: ['.ag-board', '.ag-bars', '.ag-split', '.ag-et', '.ag-home', '.ag-cf', '.ag-timeline', '.ag-cases', '.ag-legs', '.ag-clubs', '.ag-scope'].map((s) => !!document.querySelector(s)),
      over,
      h1: document.querySelector('h1')?.textContent.trim(),
    };
  });
  console.log(width, JSON.stringify(r));
  if (r.overflow > 0 || r.broken.length || r.missingCites.length || r.panels.includes(false) || r.over.length) fails.push(`${width} ${JSON.stringify(r)}`);
  for (const sel of ['.ag-legs', '.ag-cases', '.ag-clubs', '.ag-scope', '.ag-timeline']) { const el = await page.$(sel); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: `${process.env.TEMP}/ag-${width}-${sel.slice(4)}.png` }); }
  await page.close();
}
await browser.close();
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log('원정 다득점 축떡 QA 통과');
