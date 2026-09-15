import { chromium } from 'playwright';
// 팝업관 「유럽 대항전 역전극 모음.Zip」: 380/1440에서 가로 넘침, 깨진 문장, 카드·표 개수, 타임라인 표시 수가 차전 스코어와 맞는지 확인한다.
const base = process.env.QA_BASE || 'http://localhost:4321';
const browser = await chromium.launch();
const fails = [];
for (const width of [380, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(`${base}/popup/european-comebacks/`, { waitUntil: 'networkidle' });
  const r = await page.evaluate(async () => {
    document.querySelectorAll('details.dg-more').forEach((d) => { d.open = true; });
    for (const img of document.querySelectorAll('img')) { img.loading = 'eager'; }
    window.scrollTo(0, document.body.scrollHeight); await new Promise((ok) => setTimeout(ok, 1500)); window.scrollTo(0, 0);
    const legs = [...document.querySelectorAll('.dg-leg')];
    const badTimeline = legs.filter((leg) => { const [f, a] = leg.querySelector("header b").textContent.split(" ")[0].split("-").map(Number); return leg.querySelectorAll('.dg-hit').length !== f || leg.querySelectorAll('.dg-conceded').length !== a; }).map((l) => l.getAttribute('aria-label'));
    return {
      overflow: document.documentElement.scrollWidth - innerWidth,
      broken: [...document.querySelectorAll('img')].filter((i) => i.complete && !i.naturalWidth).map((i) => i.getAttribute('src')),
      cards: document.querySelectorAll('.dg-card').length, legs: legs.length, tableRows: document.querySelectorAll('.dg-more tbody tr').length,
      badTimeline, h1: document.querySelector('h1').textContent,
      cardOverflow: [...document.querySelectorAll('.dg-card')].filter((c) => c.scrollWidth > c.clientWidth + 1).length,
    };
  });
  console.log(width, JSON.stringify(r));
  if (r.overflow > 0 || r.broken.length || r.badTimeline.length || r.cardOverflow) fails.push(`${width} ${JSON.stringify(r)}`);
  await page.screenshot({ path: `${process.env.TEMP}/cb-${width}-top.png` });
  const card = await page.$('.dg-card.is-featured'); await card.screenshot({ path: `${process.env.TEMP}/cb-${width}-featured.png` });
  const cards = await page.$$('.dg-grid .dg-card');
  await cards[Math.min(3, cards.length - 1)].screenshot({ path: `${process.env.TEMP}/cb-${width}-card.png` });
  const lewa = await page.$('.dg-card:has(time[datetime="2016-03-08"])'); if (lewa) await lewa.screenshot({ path: `${process.env.TEMP}/cb-${width}-lewa.png` });
  const more = await page.$('.dg-more'); await more.screenshot({ path: `${process.env.TEMP}/cb-${width}-more.png` });
  await page.close();
}
await browser.close();
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log('역전극 QA 통과');
