import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// 1958 발롱도르 화면 검수: 포디움 3명, 정체성 행 9개(서독·DFB 1950 메달·로트바이스 에센 포함), 순위표 26행, 투표 내역,
// 이미지 로딩, 읽기 동선(베스트 11·결승 H/L), 12px 미만 글자, 380/768/1440px 가로 넘침.
const base = process.env.QA_BASE || 'http://127.0.0.1:4321';
const out = process.env.QA_OUTPUT || mkdtempSync(join(tmpdir(), 'bbinge-bdo-1958-'));
const route = '/archive/awards/ballon-dor/1958-ballon-dor-raymond-kopa/';
console.log(`QA screenshots: ${out}`);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const width of [380, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal((await page.goto(base + route, { waitUntil: 'domcontentloaded' })).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.award-podium > a').count(), 3, '포디움 3명');
    assert.equal(await page.locator('.historical-identity .identity-row').count(), 9, '정체성 행 9개');
    assert.match(await page.locator('[data-identity-id="west-germany-team"] img').getAttribute('src'), /germany-1950/, '1950-1962 DFB 메달(빌드가 WebP 사본으로 바꿀 수 있음)');
    assert.equal(await page.locator('table.award-ranking:not(.award-ballots) tbody tr').count(), 26, '순위 26행');
    assert.equal(await page.locator('table.award-ballots tbody tr').count(), 26, '투표 내역 26행');
    await page.locator('.award-table-shell details summary').click();
    for (const img of await page.locator('.archive-body img').all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(el => el.decode().catch(() => {}));
    }
    const data = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      broken: [...document.querySelectorAll('.archive-body img')].filter(img => !img.naturalWidth).length,
      brokenAnchors: [...document.querySelectorAll('.archive-body a[href^="#"]')].filter(a => !document.getElementById(a.hash.slice(1))).length,
      routes: [...document.querySelectorAll('.season-route__card')].map(a => a.getAttribute('href')),
      smallText: [...document.querySelectorAll('.award-ranking *, .historical-identity *, .award-achievements *, .award-podium *')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12).length,
    }));
    assert.equal(data.overflow, false, `page overflow at ${width}`);
    assert.equal(data.broken, 0);
    assert.equal(data.brokenAnchors, 0);
    assert.equal(data.smallText, 0);
    assert.deepEqual(data.routes, ['/archive/club/european-cup/1957-58-european-cup-tournament-best-xi/', '/highlights/european-cup/1957-58-european-cup-final-real-madrid-milan/'], '발롱도르 동선');
    await page.locator('.historical-identity').nth(1).screenshot({ path: `${out}/identity-rahn-${width}.png` });
    await page.locator('.award-podium').screenshot({ path: `${out}/podium-${width}.png` });
    console.log(JSON.stringify({ width, ...data, routes: data.routes.length }));
  }
  console.log('1958 BALLON D’OR QA: PASS');
} finally {
  await browser.close();
}
