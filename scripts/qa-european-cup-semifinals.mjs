import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const base = process.env.QA_BASE || 'http://127.0.0.1:4321';
const out = mkdtempSync(join(tmpdir(), 'bbinge-semifinals-'));
const route = '/archive/european-club/european-cup/1955-56-european-cup-semifinals/';
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  const page = await browser.newPage();
  for (const width of [380, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const response = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.cup-tie').count(), 2);
    assert.equal(await page.locator('.cup-leg-results dt').filter({ hasText: '결승 진출' }).count(), 2);
    assert.equal(await page.locator('.archive-body h2').filter({ hasText: /^4강 [12]차전$/ }).count(), 2);
    for (const img of await page.locator('.content-cover img,.archive-body img').all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(el => el.decode());
    }
    const cover = page.locator('.content-cover img');
    assert((await cover.getAttribute('src')).includes('/1955-56-european-cup-semifinals/cover.webp'));
    assert(await cover.evaluate(el => Math.abs(el.clientWidth - el.clientHeight) <= 1));
    assert.equal(await page.locator('.cup-design').count(), 3);
    await page.locator('.content-cover').screenshot({ path: `${out}/cover-${width}.png` });
    await page.locator('.cup-tie').last().screenshot({ path: `${out}/card-${width}.png` });
    const firstBody = page.locator('.archive-body > p').first();
    await firstBody.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/prose-${width}.png` });
    const details = page.locator('.cup-record-table');
    assert.equal(await details.evaluate(el => el.open), false);
    await details.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert(await details.evaluate(el => el.open));
    await details.screenshot({ path: `${out}/table-${width}.png` });
    const checks = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      clipped: [...document.querySelectorAll('.cup-side,.cup-leg-results dt,.cup-leg-results dd')].filter(el => el.scrollWidth > el.clientWidth + 1).length,
      brokenAnchors: [...document.querySelectorAll('.archive-body a[href^="#"]')].filter(el => !document.getElementById(el.hash.slice(1))).length,
      brokenImages: [...document.querySelectorAll('.archive-body img,.content-cover img')].filter(el => !el.naturalWidth).length
    }));
    assert.deepEqual(checks, { overflow: false, clipped: 0, brokenAnchors: 0, brokenImages: 0 });
    console.log(JSON.stringify({ width, ...checks }));
  }
  const plain = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 380, height: 900 } });
  await plain.goto(base + route);
  assert.equal(await plain.locator('.cup-tie').count(), 2);
  await plain.locator('.cup-record-table summary').click();
  assert(await plain.locator('.cup-record-table').evaluate(el => el.open));
  console.log(`PASS including no-JS. Screenshots: ${out}`);
} finally { await browser.close(); }
