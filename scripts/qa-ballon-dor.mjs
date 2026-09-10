import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readAwardEdition, resolveHistoricalIdentity } from './render-award-records.mjs';

const base = process.env.QA_BASE || 'http://127.0.0.1:4323';
const route = '/archive/awards/ballon-dor/1956-ballon-dor-stanley-matthews/';
const out = mkdtempSync(join(tmpdir(), 'bbinge-ballon-qa-'));
const data = readAwardEdition('1956-ballon-dor');
assert.equal(data.ranking.length, 24);
assert.equal(data.ranking.reduce((sum, row) => sum + row.points, 0), 240);
assert.throws(() => resolveHistoricalIdentity('blackpool', 2023));
const browser = await chromium.launch({ headless: true });
console.log('Screenshots: ' + out);
try {
  const page = await browser.newPage();
  for (const width of [380, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal((await page.goto(base + route)).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('h1').innerText(), '1956년 발롱도르 수상자 포디움 및 랭킹 정리: 스탠리 매슈스');
    assert.equal(await page.locator('.award-masthead strong').innerText(), '1956 BALLON D’OR');
    assert.match(await page.locator('.award-masthead-copy p').innerText(), /발롱도르;.*황금 공/);
    assert.equal(await page.locator('.content-cover').count(), 0);
    assert.deepEqual(await page.locator('.identity-stack').evaluateAll(stacks => stacks.map(s => s.children.length)), [4, 3, 4]);
    assert.deepEqual(await page.locator('.identity-stack').first().locator('.identity-row').evaluateAll(rows => rows.map(r => r.dataset.identityId)), ['uk', 'england', 'england-team', 'blackpool']);
    assert.equal(await page.locator('.award-ranking:not(.award-ballots) tbody tr').count(), 24);
    await page.locator('.award-table-shell summary').click();
    assert.equal(await page.locator('.award-ballots tbody tr').count(), 24);
    for (const img of await page.locator('.archive-body img').all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(el => el.decode());
    }
    assert(await page.locator('.award-cover').evaluate(el => !!(document.querySelector('#ranking').compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)));
    const checks = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      brokenAnchors: [...document.querySelectorAll('.archive-body a[href^="#"]')].filter(a => !document.getElementById(a.hash.slice(1))).length,
      brokenImages: [...document.querySelectorAll('.archive-body img')].filter(img => !img.naturalWidth).length,
    }));
    assert.deepEqual(checks, { overflow: false, brokenAnchors: 0, brokenImages: 0 });
    for (const [name, selector] of [['masthead','.award-masthead'],['matthews','.historical-identity'],['ranking','.award-table-shell'],['sources','.source-notes']]) {
      await page.locator(selector).first().screenshot({ path: join(out, name + '-' + width + '.png') });
    }
    await page.locator('.historical-identity').nth(1).screenshot({path:join(out, 'di-' + width + '.png')});
    await page.locator('.historical-identity').nth(2).screenshot({path:join(out, 'kopa-' + width + '.png')});
    console.log(JSON.stringify({width, ...checks}));
  }
  for (const path of ['/archive/awards/', '/archive/awards/ballon-dor/']) {
    assert.equal((await page.goto(base + path)).status(), 200);
    assert(await page.locator('a[href="' + route + '"]').count() > 0);
    assert(!String(await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
  }
  console.log('BALLON D’OR QA: PASS');
} finally { await browser.close(); }
