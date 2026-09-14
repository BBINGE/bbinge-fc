import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 홈 층별 편성(2026-09-15): 최근 입고 · 층별 진열창 · 시즌 서가 · 소장 기록의 모든 썸네일 칸을 1:1 칸 규칙에 대조한다.
const base = process.env.QA_BASE || 'http://127.0.0.1:4323';
const out = process.env.QA_OUT || mkdtempSync(join(tmpdir(), 'bbinge-home-thumbs-'));
const browser = await chromium.launch({ headless: true });
console.log('Screenshots: ' + out);
const visibleArrivals = { 380: 8, 768: 8, 1024: 8, 1440: 10 };
try {
  const page = await browser.newPage();
  for (const width of [380, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal((await page.goto(base + '/')).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.lead-image,.lobby-hero').count(), 0, 'no single hero cover on the home');
    const arrivals = await page.locator('.arrival-card').evaluateAll(cards => cards.filter(card => card.offsetParent !== null).length);
    assert.equal(arrivals, visibleArrivals[width], `visible arrivals at ${width}`);
    assert.equal(await page.locator('.floor-card').count(), 8, 'floors 02F-09F');
    assert.equal(await page.locator('.shelf').count() >= 1, true, 'season shelf');
    assert.equal(await page.locator('.stack-row').count(), 12, 'stack list');
    const frames = page.locator('.arrival-thumb,.floor-thumb,.shelf-thumb,.stack-thumb');
    let checked = 0;
    for (const frame of await frames.all()) {
      if (!(await frame.isVisible())) continue;
      await frame.scrollIntoViewIfNeeded();
      await frame.locator('img').evaluate(img => img.decode());
      assert(await frame.evaluate(el => {
        const rect = el.getBoundingClientRect(), img = el.querySelector('img'), style = getComputedStyle(img);
        // 합의 규칙: 정사각형(비율 차 15% 이내) 편집물은 contain, 그 밖의 사진은 media-frame--fill + cover
        const nonSquare = Math.abs(img.naturalWidth / img.naturalHeight - 1) > 0.15;
        const expectedFit = nonSquare ? 'cover' : 'contain';
        return Math.abs(rect.width - rect.height) < 1 && el.classList.contains('media-frame--fill') === nonSquare && style.objectFit === expectedFit && ['none', '1'].includes(style.scale) && img.naturalWidth > 0;
      }), 'square frame, square editorial art kept whole, other photos filled, no inherited face zoom');
      checked += 1;
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal page overflow');
    const small = await page.evaluate(() => [...document.querySelectorAll('.home-magazine a')].filter(a => a.offsetParent !== null).flatMap(a => [a, ...a.querySelectorAll('*')]).filter(el => el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12).map(el => el.textContent.trim().slice(0, 20)));
    assert.deepEqual(small, [], 'clickable text must stay at 12px or larger');
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: join(out, `first-screen-${width}.png`) });
    await page.screenshot({ path: join(out, `full-${width}.png`), fullPage: true });
    const firstScreen = await page.evaluate(() => [...document.querySelectorAll('.arrival-card')].filter(c => c.offsetParent !== null && c.getBoundingClientRect().top < innerHeight).length);
    console.log(JSON.stringify({ width, arrivals, firstScreenCards: firstScreen, thumbnails: checked, cropContract: true, overflow: false }));
  }
  console.log('HOME THUMBNAILS: PASS');
} finally { await browser.close(); }
