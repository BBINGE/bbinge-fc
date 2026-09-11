import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.env.QA_BASE || 'http://127.0.0.1:4323';
const out = mkdtempSync(join(tmpdir(), 'bbinge-home-thumbs-'));
const browser = await chromium.launch({ headless: true });
console.log('Screenshots: ' + out);
try {
  const page = await browser.newPage();
  for (const width of [380, 768, 1024, 1440]) {
    await page.setViewportSize({width, height:1000});
    assert.equal((await page.goto(base + '/')).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    const frames = page.locator('.lead-image,.desk-thumb,.latest-thumb,.more-image');
    assert.equal(await frames.count(), 22);
    assert.equal(await page.locator('.lead-image .lead-badge').count(), 0, 'new badge must not obscure the thumbnail lettering');
    for (const frame of await frames.all()) {
      await frame.scrollIntoViewIfNeeded();
      await frame.locator('img').evaluate(img => img.decode());
      assert(await frame.evaluate(el => {
        const rect = el.getBoundingClientRect(), img = el.querySelector('img'), style = getComputedStyle(img);
        // 합의 규칙: 정사각형(비율 차 15% 이내) 편집물은 contain, 그 밖의 사진은 media-frame--fill + cover
        const nonSquare = Math.abs(img.naturalWidth / img.naturalHeight - 1) > 0.15;
        const expectedFit = nonSquare ? 'cover' : 'contain';
        return Math.abs(rect.width - rect.height) < 1 && el.classList.contains('media-frame--fill') === nonSquare && style.objectFit === expectedFit && ['none','1'].includes(style.scale) && img.naturalWidth > 0;
      }), 'square frame, square editorial art kept whole, other photos filled, no inherited face zoom');
    }
    for (const label of await page.locator('.desk-number').all()) {
      assert((await label.boundingBox()).height < 36, 'number must not become a full-height strip');
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (width <= 900) assert(await page.locator('.lead-copy').evaluate(el => el.getBoundingClientRect().top >= document.querySelector('.lead-image').getBoundingClientRect().bottom));
    await page.locator('.desk-edition').screenshot({path:join(out, 'latest-' + width + '.png')});
    await page.locator('.lead-story').screenshot({path:join(out, 'lead-' + width + '.png')});
    console.log(JSON.stringify({width, thumbnails:await frames.count(), square:true, cropContract:true, overflow:false}));
  }
  console.log('HOME THUMBNAILS: PASS');
} finally { await browser.close(); }
