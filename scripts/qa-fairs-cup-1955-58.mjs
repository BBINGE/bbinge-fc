import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 1955-58 인터시티스 페어스컵 본선 편: 녹색 톤, 경기별 득점자, 조별 순위표 4개, 참가 12팀 표, 문장·국기 로딩, 380/768/1440 가로 넘침.
const base = process.env.QA_BASE || 'http://127.0.0.1:4323';
const out = process.env.QA_OUT || mkdtempSync(join(tmpdir(), 'bbinge-fairs-'));
const path = '/archive/club/inter-cities-fairs-cup/1955-58-inter-cities-fairs-cup/';
const browser = await chromium.launch({ headless: true });
console.log('Screenshots: ' + out);
try {
  for (const width of [380, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    assert.equal((await page.goto(base + path)).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('article.cup-record.cup-record--fairs').count(), 1, 'fairs variant class');
    assert.equal(await page.locator('.cup-group').count(), 4, 'four group cards');
    const bg = await page.locator('.cup-group').first().evaluate((el) => getComputedStyle(el, '::before').backgroundImage);
    assert(bg.includes('rgb(10, 58, 31)') || bg.includes('#0a3a1f'), 'green gradient on group card: ' + bg.slice(0, 80));
    const winners = await page.locator('.cup-group-table tr.is-winner .cup-result-name').allTextContents();
    assert.deepEqual(winners, ['CF 바르셀로나', '버밍엄 시티 FC', '로잔 스포르', '런던 XI']);
    assert.equal(await page.locator('.cup-group-table tr.is-withdrawn').count(), 2, 'Wien XI and Köln XI withdrawn');
    assert.equal(await page.locator('.cup-group-goals--home').count(), 15, 'scorer lines on every match except 0-0');
    const goalOverflow = await page.locator('.cup-group-matches li').evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).length);
    assert.equal(goalOverflow, 0, 'match rows with scorers fit');
    await page.locator('details.cup-record-table summary').first().click();
    assert.equal(await page.locator('.cup-participant-scroll tbody tr').count(), 12, 'twelve entrants');
    await page.evaluate(async () => { for (const img of document.images) img.loading = 'eager'; await Promise.all([...document.querySelectorAll('.cup-group img, .cup-participant-scroll img')].map((img) => img.decode().catch(() => {}))); });
    const broken = await page.evaluate(() => [...document.querySelectorAll('.cup-group img, .cup-participant-scroll img, .content-cover img')].filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.getAttribute('src')));
    assert.deepEqual(broken, [], 'all crests, flags and cover load');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal page overflow');
    const groupOverflow = await page.locator('.cup-group').evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).length);
    assert.equal(groupOverflow, 0, 'group cards fit');
    await page.locator('.cup-group').first().screenshot({ path: join(out, `group-a-${width}.png`) });
    await page.locator('.cup-group').nth(2).screenshot({ path: join(out, `group-c-${width}.png`) });
    await page.locator('.cup-group').nth(3).screenshot({ path: join(out, `group-d-${width}.png`) });
    await page.locator('.cup-participant-scroll').screenshot({ path: join(out, `entrants-${width}.png`) });
    console.log(JSON.stringify({ width, groups: 4, entrants: 12, overflow: false }));
    await page.close();
  }
  console.log('FAIRS CUP 1955-58: PASS');
} finally { await browser.close(); }
