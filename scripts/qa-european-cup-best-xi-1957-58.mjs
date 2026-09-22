import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// 1957-58 유러피언컵 베스트 11 화면 검수: 전술판 11명(5·2·3·1)·선수 카드 11장·문장, 이미지 로딩, 읽기 동선 4장, 12px 미만 글자, 380/768/1440px 가로 넘침.
const base = process.env.QA_BASE || 'http://127.0.0.1:4321';
const out = process.env.QA_OUTPUT || mkdtempSync(join(tmpdir(), 'bbinge-bestxi-5758-'));
const route = '/archive/club/european-cup/1957-58-european-cup-tournament-best-xi/';
console.log(`QA screenshots: ${out}`);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const width of [380, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal((await page.goto(base + route, { waitUntil: 'domcontentloaded' })).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    const counts = await page.evaluate(() => ['forwards', 'halves-two', 'backs-three', 'keeper'].map(c => document.querySelectorAll(`.best-xi-line.${c} > div`).length));
    assert.deepEqual(counts, [5, 2, 3, 1], '전술판 5·2·3·1');
    assert.equal(await page.locator('.best-xi-player').count(), 11, '선수 카드 11장');
    assert.equal(await page.locator('.best-xi-player .club-crest').count(), 11, '카드 문장 11개');
    for (const img of await page.locator('.content-cover img, .archive-body img').all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(el => el.decode());
    }
    const data = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      broken: [...document.querySelectorAll('.archive-body img, .content-cover img')].filter(img => !img.naturalWidth).length,
      brokenAnchors: [...document.querySelectorAll('.archive-body a[href^="#"]')].filter(a => !document.getElementById(a.hash.slice(1))).length,
      routes: [...document.querySelectorAll('.season-route__card')].map(a => a.getAttribute('href')),
      smallText: [...document.querySelectorAll('.best-xi *, .best-xi-roster *')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12).length,
    }));
    assert.equal(data.overflow, false, `page overflow at ${width}`);
    assert.equal(data.broken, 0);
    assert.equal(data.brokenAnchors, 0);
    assert.equal(data.smallText, 0);
    assert.equal(data.routes.length, 4, '읽기 동선 4장');
    assert(!data.routes.includes(route), '읽기 동선은 현재 글을 빼고 보여 준다');
    await page.locator('.best-xi').screenshot({ path: `${out}/board-${width}.png` });
    await page.locator('.best-xi-roster').screenshot({ path: `${out}/roster-${width}.png` });
    console.log(JSON.stringify({ width, counts, ...data, routes: data.routes.length }));
  }
  console.log('1957-58 BEST XI QA: PASS');
} finally {
  await browser.close();
}
