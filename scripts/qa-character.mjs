import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// 공식 캐릭터 삥지·삥맹 정본 페이지 검수: 자기소개서 두 장, 나이 자동 계산, 이미지 로딩,
// 헤더·푸터의 캐릭터 링크, 12px 미만 글자, 380/768/1440px 가로 넘침.
const base = process.env.QA_BASE || 'http://127.0.0.1:4321';
const out = process.env.QA_OUTPUT || mkdtempSync(join(tmpdir(), 'bbinge-character-'));
const route = '/about/character/';
console.log(`QA screenshots: ${out}`);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const width of [380, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal((await page.goto(base + route, { waitUntil: 'domcontentloaded' })).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.profile').count(), 2, '자기소개서 두 장');
    assert.equal(await page.locator('.profile-table tbody tr').count(), 16, '프로필 8줄씩');
    assert.match(await page.locator('.profile-table tbody tr:nth-child(2) td').first().innerText(), /2026년 9월 11일생 · (생후 \d+일|생후 \d+개월|만 \d+세)/, '나이 자동 계산');
    assert.equal(await page.locator('.post-card').count(), 1, '단체 프로필 카드');
    assert.match(await page.locator('.post-tags').innerText(), /#삥이FC #삥이 #삥지 #삥맹/, '해시태그');
    assert.equal(await page.locator('.lineup-grid figure').count(), 2, '라인업 두 캐릭터');
    for (const img of await page.locator('.character-page img').all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(el => el.decode().catch(() => {}));
    }
    const data = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      images: document.querySelectorAll('.character-page img').length,
      broken: [...document.querySelectorAll('.character-page img')].filter(img => !img.naturalWidth).length,
      footerLink: !!document.querySelector('footer a[href="/about/character/"]'),
      smallText: [...document.querySelectorAll('.character-page *')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 14).length,
    }));
    assert.equal(data.overflow, false, `page overflow at ${width}`);
    assert.equal(data.images, 6, '이미지 6장');
    assert.equal(data.broken, 0, '깨진 이미지');
    assert.equal(data.footerLink, true, '푸터 캐릭터 링크');
    assert.equal(data.smallText, 0, '14px 미만 글자');
    await page.screenshot({ path: `${out}/character-${width}.png`, fullPage: true });
  }
  // 홈에서 헤더 메뉴로 닿는지 확인한다.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('header a[href="/about/character/"]').count() > 0, true, '헤더 캐릭터 링크');
  console.log('PASS: 공식 캐릭터 삥지·삥맹 페이지 검수');
} finally {
  await browser.close();
}
