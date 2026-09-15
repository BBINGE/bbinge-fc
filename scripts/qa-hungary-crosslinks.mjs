import { chromium } from 'playwright';
// 헝가리 관련 글 사이 역링크(record-cta·journey-links)가 모두 살아 있고 380/1440에서 넘치지 않는지 확인한다.
const base = process.env.QA_BASE || 'http://localhost:4321';
const pages = {
  '/history/hungary-1956-revolution-golden-team-dissolution/': ['/tactics/hungary-golden-team-total-football-elo-rating/', '/pilgrimage/budapest-honeymoon-football-travel-10/'],
  '/tactics/hungary-golden-team-total-football-elo-rating/': ['/highlights/fifa-world-cup/1954-fifa-world-cup-final-west-germany-hungary/', '/history/hungary-1956-revolution-golden-team-dissolution/'],
  '/highlights/fifa-world-cup/1954-fifa-world-cup-final-west-germany-hungary/': ['/history/hungary-1956-revolution-golden-team-dissolution/', '/tactics/hungary-golden-team-total-football-elo-rating/'],
  '/archive/national-team/fifa-world-cup/1954-fifa-world-cup-best-xi/': ['/tactics/hungary-golden-team-total-football-elo-rating/', '/highlights/fifa-world-cup/1954-fifa-world-cup-final-west-germany-hungary/', '/history/hungary-1956-revolution-golden-team-dissolution/'],
  '/pilgrimage/budapest-honeymoon-football-travel-10/': ['/history/hungary-1956-revolution-golden-team-dissolution/', '/highlights/fifa-world-cup/1954-fifa-world-cup-final-west-germany-hungary/', '/highlights/fifa-world-cup/1938-fifa-world-cup-final-italy-hungary/'],
};
const browser = await chromium.launch();
const fails = [];
for (const width of [380, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  for (const [path, targets] of Object.entries(pages)) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    const r = await page.evaluate(async (targets) => {
      const out = { overflow: document.documentElement.scrollWidth - innerWidth, missing: [], badCards: [] };
      for (const t of targets) {
        const a = document.querySelector(`.record-cta[href="${t}"], .journey-links a[href="${t}"]`);
        if (!a) { out.missing.push(t); continue; }
        const img = a.querySelector('img');
        if (img) { img.loading = 'eager'; a.scrollIntoView(); await new Promise((ok) => setTimeout(ok, 300)); const b = img.getBoundingClientRect(); if (!img.naturalWidth || b.width > 90 || Math.abs(b.width - b.height) > 2 || getComputedStyle(a).display !== 'grid') out.badCards.push(`${t} img ${Math.round(b.width)}x${Math.round(b.height)} ${getComputedStyle(a).display}`); }
        const res = await fetch(t); if (!res.ok) out.missing.push(`${t} ${res.status}`);
      }
      return out;
    }, targets);
    if (r.overflow > 0) fails.push(`${width} ${path} overflow ${r.overflow}`);
    if (r.missing.length || r.badCards.length) fails.push(`${width} ${path} ${JSON.stringify(r)}`);
    if (width === 380 || path.includes('tactics')) { const el = await page.$('.record-cta'); if (el) { await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await el.screenshot({ path: `${process.env.TEMP}/cta-${width}-${path.split('/')[2].slice(0, 12)}.png` }); } }
  }
  await page.close();
}
await browser.close();
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log('헝가리 역링크 QA 통과');
