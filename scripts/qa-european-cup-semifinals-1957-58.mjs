import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// 1957-58 유러피언컵 4강 편 화면 검수: 대진 카드 2개(득점자 줄), 4강 진출 누적 표, 네 경기 기록표, 도판 두 장, 읽기 동선, 넘침.
const base = process.env.QA_BASE || 'http://127.0.0.1:4321';
const out = process.env.QA_OUTPUT || mkdtempSync(join(tmpdir(), 'bbinge-semifinals-5758-'));
const route = '/archive/club/european-cup/1957-58-european-cup-semifinals/';
console.log(`QA screenshots: ${out}`);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const width of [380, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const response = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.cup-tie').count(), 2);
    assert.equal(await page.locator('.cup-stage-scroll tbody tr').count(), 4);
    assert.equal(await page.getByText('통산 세 번째 4강 진출', { exact: true }).count(), 1);
    assert.equal(await page.getByText('통산 두 번째 4강 진출', { exact: true }).count(), 2);
    assert.equal(await page.getByText('통산 첫 4강 진출', { exact: true }).count(), 1);
    assert.equal(await page.locator('.cup-leg-results dt').filter({ hasText: '결승 진출' }).count(), 2);
    assert.equal(await page.locator('.cup-tie-goals').count(), 2, '4강 카드 득점자 줄');
    assert.equal(await page.locator('.archive-body h2').filter({ hasText: /^4강 [12]차전$/ }).count(), 2);
    assert.equal(await page.locator('.cup-design').count(), 2);
    for (const img of await page.locator('.content-cover img,.archive-body img').all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(el => el.decode());
    }
    const cover = page.locator('.content-cover img');
    assert(await cover.evaluate(el => Math.abs(el.clientWidth - el.clientHeight) <= 1), '표지 1:1');
    const details = page.locator('.cup-record-table');
    await details.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert(await details.evaluate(el => el.open));
    const data = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      tableScroll: [...document.querySelectorAll('.cup-match-scroll')].some(el => el.scrollWidth > el.clientWidth + 1),
      broken: [...document.querySelectorAll('.archive-body img, .content-cover img')].filter(img => !img.naturalWidth).length,
      route: document.querySelectorAll('.season-route__card').length,
      smallText: [...document.querySelectorAll('.cup-tie *, .cup-match-scroll *')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12).length,
    }));
    assert.equal(data.overflow, false, `page overflow at ${width}`);
    assert.equal(data.tableScroll, false, `match table horizontal scroll at ${width}`);
    assert.equal(data.broken, 0);
    assert(data.route >= 1, '1957-58 읽기 동선');
    assert.equal(data.smallText, 0);
    await page.locator('.cup-tie').first().screenshot({ path: `${out}/card-${width}-1.png` });
    await page.locator('.cup-tie').last().screenshot({ path: `${out}/card-${width}-2.png` });
    await details.screenshot({ path: `${out}/table-${width}.png` });
    console.log(JSON.stringify({ width, ...data }));
  }
  console.log('1957-58 SEMIFINALS QA: PASS');
} finally {
  await browser.close();
}
