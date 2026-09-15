import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 1955-58 인터시티스 페어스컵 4강·결승 편: 녹색 대진 카드 3개, 재경기·우승 칸, 일곱 경기 기록표, 문장·국기 로딩, 380/768/1440 가로 넘침.
const base = process.env.QA_BASE || 'http://127.0.0.1:4323';
const out = process.env.QA_OUT || mkdtempSync(join(tmpdir(), 'bbinge-fairs-final-'));
const path = '/archive/european-club/inter-cities-fairs-cup/1955-58-inter-cities-fairs-cup-semifinals-final/';
const browser = await chromium.launch({ headless: true });
console.log('Screenshots: ' + out);
try {
  for (const width of [380, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    assert.equal((await page.goto(base + path)).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('article.cup-record.cup-record--fairs').count(), 1, 'fairs variant class');
    assert.equal(await page.locator('.cup-tie').count(), 3, 'three tie cards');
    const bg = await page.locator('.cup-tie').first().evaluate((el) => getComputedStyle(el, '::before').backgroundImage);
    assert(bg.includes('rgb(10, 58, 31)') || bg.includes('#0a3a1f'), 'green gradient on tie card: ' + bg.slice(0, 80));
    const stages = await page.locator('.cup-tie-stage').allTextContents();
    assert.deepEqual(stages, ['1955-58 인터시티스 페어스컵 · 4강', '1955-58 인터시티스 페어스컵 · 4강', '1955-58 인터시티스 페어스컵 · 결승']);
    assert.equal(await page.locator('.cup-tie').nth(1).locator('.cup-replay dd').textContent(), '1 : 2');
    assert.equal(await page.locator('.cup-tie').nth(2).locator('.cup-advance dt').textContent(), '우승');
    assert.equal(await page.locator('.cup-tie').nth(2).locator('.cup-advance dd').textContent(), 'CF 바르셀로나');
    await page.locator('details.cup-record-table summary').first().click();
    assert.equal(await page.locator('.cup-match-scroll tbody tr').count(), 7, 'seven matches');
    await page.evaluate(async () => { for (const img of document.images) img.loading = 'eager'; await Promise.all([...document.querySelectorAll('.cup-tie img, .content-cover img')].map((img) => img.decode().catch(() => {}))); });
    const broken = await page.evaluate(() => [...document.querySelectorAll('.cup-tie img, .content-cover img')].filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.getAttribute('src')));
    assert.deepEqual(broken, [], 'all crests, flags and cover load');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal page overflow');
    const tieOverflow = await page.locator('.cup-tie').evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).length);
    assert.equal(tieOverflow, 0, 'tie cards fit');
    for (let i = 0; i < 3; i++) await page.locator('.cup-tie').nth(i).screenshot({ path: join(out, `tie-${i + 1}-${width}.png`) });
    console.log(JSON.stringify({ width, ties: 3, matches: 7, overflow: false }));
    await page.close();
  }
  console.log('FAIRS CUP 1955-58 SEMIFINALS-FINAL: PASS');
} finally { await browser.close(); }
