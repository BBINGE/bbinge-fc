import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 밀라노 커플 축행: 지도 핀 14개·필터, 숙소 3곳, 사진 로딩, 영상 클릭 재생, 380/768/1440 가로 넘침.
const base = process.env.QA_BASE || 'http://127.0.0.1:4323';
const out = process.env.QA_OUT || mkdtempSync(join(tmpdir(), 'bbinge-milan-'));
const path = '/pilgrimage/milan-san-siro-couple-fashion-football-travel/';
const browser = await chromium.launch({ headless: true });
console.log('Screenshots: ' + out);
try {
  for (const width of [380, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    assert.equal((await page.goto(base + path, { waitUntil: 'networkidle' })).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('article.journey-article').count(), 1);
    await page.locator('[data-journey-live-map]').scrollIntoViewIfNeeded();
    await page.waitForSelector('.journey-live-map__marker', { timeout: 15000 });
    assert.equal(await page.locator('.journey-live-map__marker').count(), 14, 'fourteen map pins');
    await page.locator('[data-map-filter="stay"]').click();
    await page.waitForTimeout(600);
    const visibleStay = await page.locator('.journey-live-map__marker').evaluateAll((els) => els.filter((el) => getComputedStyle(el).display !== 'none' && el.style.display !== 'none').length);
    assert(visibleStay >= 3, 'stay filter shows hotels: ' + visibleStay);
    await page.locator('[data-journey-live-map]').screenshot({ path: join(out, `map-${width}.png`) });
    assert.equal(await page.locator('.journey-stay').count(), 3, 'three stays');
    await page.evaluate(async () => { for (const img of document.images) img.loading = 'eager'; await Promise.all([...document.querySelectorAll('.article-body img, .content-cover img')].map((img) => img.decode().catch(() => {}))); });
    const broken = await page.evaluate(() => [...document.querySelectorAll('.article-body img')].filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.getAttribute('src')));
    assert.deepEqual(broken, [], 'all images load');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal page overflow');
    const video = page.locator('.journey-ugc-video').first();
    await video.scrollIntoViewIfNeeded();
    await video.locator('.journey-ugc-video__poster').click();
    await page.waitForTimeout(500);
    const src = await video.locator('iframe').getAttribute('src');
    assert(src && src.includes('youtube-nocookie.com/embed/O-0ITAaEkFE'), 'video plays after click: ' + src);
    await page.locator('.journey-stays').screenshot({ path: join(out, `stays-${width}.png`) });
    await page.screenshot({ path: join(out, `top-${width}.png`) });
    assert.deepEqual(errors, [], 'no page errors');
    console.log(JSON.stringify({ width, pins: 14, stays: 3, overflow: false }));
    await page.close();
  }
  console.log('MILAN COUPLE TRAVEL: PASS');
} finally { await browser.close(); }
