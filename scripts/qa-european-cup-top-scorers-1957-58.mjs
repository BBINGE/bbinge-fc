import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// 1957-58 유러피언컵 득점 순위 화면 검수: 득점표 10행·문장·국기, 도판, 읽기 동선, 12px 미만 글자, 380/768/1440px 가로 넘침.
const base = process.env.QA_BASE || 'http://127.0.0.1:4321';
const out = process.env.QA_OUTPUT || mkdtempSync(join(tmpdir(), 'bbinge-scorers-5758-'));
const route = '/archive/club/european-cup/1957-58-european-cup-top-scorers/';
console.log(`QA screenshots: ${out}`);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const width of [380, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal((await page.goto(base + route, { waitUntil: 'domcontentloaded' })).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    const table = page.locator('.archive-body table').first();
    assert.equal(await table.locator('tbody tr').count(), 10, '득점자 10행');
    assert.equal(await table.locator('.cup-result-crest img').count(), 10, '클럽 문장 10개');
    for (const img of await page.locator('.content-cover img, .archive-body img').all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(el => el.decode());
    }
    const data = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      broken: [...document.querySelectorAll('.archive-body img, .content-cover img')].filter(img => !img.naturalWidth).length,
      brokenAnchors: [...document.querySelectorAll('.archive-body a[href^="#"]')].filter(a => !document.getElementById(a.hash.slice(1))).length,
      routes: [...document.querySelectorAll('.season-route__card')].map(a => a.getAttribute('href')),
      smallText: [...document.querySelectorAll('.archive-body table *')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12).length,
    }));
    assert.equal(data.overflow, false, `page overflow at ${width}`);
    assert.equal(data.broken, 0);
    assert.equal(data.brokenAnchors, 0);
    assert.equal(data.smallText, 0);
    for (const href of ['/archive/club/european-cup/1957-58-european-cup/', '/archive/club/european-cup/1957-58-european-cup-semifinals/', '/highlights/european-cup/1957-58-european-cup-final-real-madrid-milan/']) {
      assert(data.routes.includes(href), '읽기 동선 ' + href);
    }
    assert(!data.routes.includes(route), '읽기 동선은 현재 글을 빼고 보여 준다');
    await table.screenshot({ path: `${out}/table-${width}.png` });
    console.log(JSON.stringify({ width, overflow: data.overflow, broken: data.broken, routes: data.routes.length, smallText: data.smallText }));
  }
  console.log('1957-58 TOP SCORERS QA: PASS');
} finally {
  await browser.close();
}
