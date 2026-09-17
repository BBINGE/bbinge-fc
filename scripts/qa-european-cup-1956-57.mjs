import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// 1956-57 유러피언컵 본선 편 화면 검수: 18개 대진 카드, 재경기 3건, 누적 표, 모바일 넘침.
const base = process.env.QA_BASE || 'http://127.0.0.1:4321';
const out = process.env.QA_OUTPUT || mkdtempSync(join(tmpdir(), 'bbinge-cup-5657-qa-'));
const path = '/archive/club/european-cup/1956-57-european-cup/';
console.log(`QA screenshots: ${out}`);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const width of [380, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.cup-tie').count(), 18);
    assert.equal(await page.locator('.cup-leg-results--replay').count(), 3);
    assert.equal(await page.locator('.cup-participant-scroll tbody tr').count(), 22);
    assert.equal(await page.getByText('통산 두 번째 유러피언컵 출전', { exact: true }).count(), 4);
    const stageTables = page.locator('.cup-stage-scroll');
    assert.equal(await stageTables.count(), 2);
    assert.equal(await stageTables.nth(0).locator('tbody tr').count(), 16);
    assert.equal(await stageTables.nth(1).locator('tbody tr').count(), 8);
    for (const card of await page.locator('.cup-tie').all()) {
      await card.scrollIntoViewIfNeeded();
      await card.locator('img').evaluateAll(async (images) => { await Promise.all(images.map((img) => img.decode())); });
    }
    for (const img of await page.locator('.archive-body figure img').all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(async (el) => { if (!el.complete) await new Promise((r) => el.addEventListener('load', r, { once: true })); });
    }
    const data = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      clipped: [...document.querySelectorAll('.cup-side,.cup-leg-results dd,.cup-leg-results dt')].filter((el) => el.scrollWidth > el.clientWidth + 1).length,
      tieImages: [...document.querySelectorAll('.cup-tie img')].every((img) => img.naturalWidth > 0),
      figures: [...document.querySelectorAll('.archive-body figure img')].map((img) => img.naturalWidth > 0),
      flags: document.querySelectorAll('.cup-tie img.cup-flag').length,
      crests: document.querySelectorAll('.cup-club-crest').length,
      slots: document.querySelectorAll('.cup-crest-slot').length,
      uniformSlots: new Set([...document.querySelectorAll('.cup-crest-slot')].map((el) => `${el.clientWidth}x${el.clientHeight}`)).size === 1,
      replayOverlap: [...document.querySelectorAll('.cup-leg-results--replay')].some((dl) => {
        const boxes = [...dl.children].map((el) => el.getBoundingClientRect());
        return boxes.some((a, i) => boxes.some((b, j) => i < j && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
      }),
      headings: document.querySelectorAll('h3.cup-match').length,
      smallText: [...document.querySelectorAll('.cup-tie *')].filter((el) => el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 11).length,
    }));
    assert.equal(data.overflow, false, `page overflow at ${width}`);
    assert.equal(data.clipped, 0, `clipped text at ${width}`);
    assert(data.tieImages);
    assert(data.figures.every(Boolean) && data.figures.length === 6, `figures at ${width}: ${data.figures}`);
    assert.equal(data.flags, 36);
    assert.equal(data.slots, 36);
    assert.equal(data.crests, 36);
    assert(data.uniformSlots);
    assert.equal(data.replayOverlap, false);
    assert.equal(data.headings, 18);
    assert.equal(data.smallText, 0);
    for (const number of [1, 2, 3, 4, 6, 8, 9, 10, 13, 14, 15]) {
      await page.locator(`.cup-tie[data-tie$=":match-${number}"]`).screenshot({ path: `${out}/card-${width}-${number}.png` });
    }
    const details = page.locator('.cup-record-table');
    assert.equal(await details.count(), 6);
    for (let i = 0; i < 6; i++) {
      const table = details.nth(i);
      assert.equal(await table.evaluate((el) => el.open), false);
      await table.locator('summary').focus();
      await page.keyboard.press('Enter');
      assert(await table.evaluate((el) => el.open));
      await table.screenshot({ path: `${out}/table-${width}-${i}.png` });
    }
    const afterOpen = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(afterOpen, false, `overflow after opening tables at ${width}`);
    console.log(JSON.stringify({ width, ...data, figures: data.figures.length }));
  }
  const plain = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 380, height: 900 } });
  await plain.goto(`${base}${path}`);
  assert.equal(await plain.locator('.cup-tie').count(), 18);
  assert.equal(await plain.locator('.cup-replay dt').count(), 3);
  console.log('No-JS static cards: PASS');
} finally {
  await browser.close();
}
