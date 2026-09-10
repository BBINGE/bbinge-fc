import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readAwardEdition, resolveHistoricalIdentity } from './render-award-records.mjs';

const base = process.env.QA_BASE || 'http://127.0.0.1:4323';
const route = '/archive/awards/ballon-dor/1956-ballon-dor-stanley-matthews/';
const out = mkdtempSync(join(tmpdir(), 'bbinge-ballon-qa-'));
const data = readAwardEdition('1956-ballon-dor');
const statLedger = JSON.parse(readFileSync('docs/editorial/1956-ballon-dor-stat-ledger.json', 'utf8'));
const sumGames = games => [games.length, games.reduce((n, game) => n + game.goals, 0)];
const statExpectations = [
  {id:212779, season:[37,3], club:[34,4], national:[5,1], total:[39,5], values:['37경기 3골','36경기 3골','1경기 0골','34경기 4골','5경기 1골','39경기 5골']},
  {id:135778, season:[37,29], club:[40,39], national:[0,0], total:[40,39], values:['37경기 29골','30경기 24골','7경기 5골','40경기 39골','0경기','40경기 39골','6경기 4골']},
  {id:170730, season:[42,9], club:[35,10], national:[1,0], total:[36,10], values:['42경기 9골','30경기 5골','5경기 4골','7경기 0골','22경기 6골','13경기 4골','35경기 10골','1경기 0골','36경기 10골']},
];
for (const expected of statExpectations) {
  const games = statLedger.players.find(player => player.id === expected.id).games;
  assert.equal(new Set(games.map(game => game.id)).size, games.length, 'no duplicated appearance');
  assert(games.every(game => Number.isInteger(game.goals) && game.goals >= 0));
  const annual = games.filter(game => game.date.startsWith('1956'));
  assert.deepEqual(sumGames(games.filter(game => game.season === 1955 && !game.national)), expected.season);
  assert.deepEqual(sumGames(annual.filter(game => !game.national)), expected.club);
  assert.deepEqual(sumGames(annual.filter(game => game.national)), expected.national);
  assert.deepEqual(sumGames(annual), expected.total);
}
assert.deepEqual(sumGames(statLedger.crossChecks.kopaReims), [22,6]);
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
    assert.equal(await page.locator('.award-podium a').nth(2).locator('span').innerText(), '스타드 드 랭스\n레알 마드리드 CF');
    const season = page.locator('.award-season-results');
    assert.equal(await season.locator('h2').innerText(), '1955-56 시즌 우승팀');
    assert.deepEqual(await season.locator('dd').allTextContents(), ['레알 마드리드 CF', '스타드 드 랭스', 'AC 밀란 · 히버니언 FC']);
    assert(await season.evaluate(el => !!(el.compareDocumentPosition(document.querySelector('#award-rules')) & Node.DOCUMENT_POSITION_FOLLOWING)));
    assert(!/(^|\s)(나는|내가)\s/m.test(await page.locator('.archive-body').innerText()));
    const achievements = page.locator('.award-achievements');
    assert.equal(await achievements.count(), 3);
    for (const [index, card] of (await achievements.all()).entries()) {
      assert.deepEqual(await card.locator('h3').allTextContents(), ['팀 성적', '개인 수상·기록', '개인 스탯']);
      assert((await card.locator('li').count()) >= 9);
      assert.deepEqual(await card.locator('.award-stat-list strong').allTextContents(), statExpectations[index].values);
      assert(!(await card.locator('li').allTextContents()).some(text => /다\.|기록은|합산하지/.test(text)), 'record panels are lists, not explanatory prose');
      assert(await card.locator('h3').evaluateAll(headings => headings.every(el => parseFloat(getComputedStyle(el).marginTop) === 0)), 'no inherited heading whitespace');
      assert(await card.evaluate(el => [...el.querySelectorAll('li')].every(li => li.scrollWidth <= li.clientWidth + 1)), 'all achievement rows fit');
      if (width <= 600) assert(await card.locator('.award-stat-list li').evaluateAll(rows => rows.every(row => row.querySelector('strong').getBoundingClientRect().top >= row.querySelector('span').getBoundingClientRect().bottom - 1)), 'mobile stat values consistently follow their labels');
      await card.screenshot({path:join(out, 'records-' + index + '-' + width + '.png')});
    }
    assert.match(await achievements.nth(0).innerText(), /36경기 3골/);
    assert.match(await achievements.nth(1).innerText(), /37경기 29골/);
    assert.match(await achievements.nth(2).innerText(), /42경기 9골/);
    assert.deepEqual(await page.locator('.award-nationality').nth(11).locator('span').allTextContents(), ['브라질', '이탈리아(수상 기록상 분류)']);
    await season.screenshot({path:join(out, 'season-results-' + width + '.png')});
    assert.deepEqual(await page.locator('.identity-stack').evaluateAll(stacks => stacks.map(s => s.children.length)), [4, 3, 4]);
    assert.deepEqual(await page.locator('.identity-stack').first().locator('.identity-row').evaluateAll(rows => rows.map(r => r.dataset.identityId)), ['uk', 'england', 'england-team', 'blackpool']);
    assert.equal(await page.locator('.historical-identity em').count(), 0);
    for (const stack of await page.locator('.identity-stack').all()) {
      const lefts = await stack.locator('.identity-row > div').evaluateAll(rows => rows.map(row => row.getBoundingClientRect().left));
      assert(lefts.every(left => Math.abs(left - lefts[0]) < 1), 'identity text start lines match');
    }
    for (const flag of await page.locator('[data-identity-kind$="country"] .identity-art').all()) {
      assert(await flag.evaluate(el => {
        const box = el.getBoundingClientRect(), row = el.closest('.identity-row').getBoundingClientRect();
        return box.top > row.top && box.bottom < row.bottom && parseFloat(getComputedStyle(el).borderRadius) >= 7;
      }), 'flag stays inside its own rounded frame and row');
    }
    assert.equal(await page.locator('.award-ranking:not(.award-ballots) tbody tr').count(), 24);
    const toggle = page.locator('.award-table-shell summary');
    const details = page.locator('.award-table-shell details');
    assert(await toggle.locator('.award-toggle-closed').isVisible());
    assert.equal(await toggle.locator('svg').evaluate(el => getComputedStyle(el).animationName), 'award-toggle-nudge');
    await toggle.focus();
    await page.keyboard.press('Enter');
    assert(await details.evaluate(el => el.open));
    assert(await toggle.locator('.award-toggle-open').isVisible());
    await page.keyboard.press('Space');
    assert(!(await details.evaluate(el => el.open)));
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await toggle.locator('svg').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await toggle.screenshot({path:join(out, 'toggle-' + width + '.png')});
    await toggle.click();
    const banner = page.locator('.award-reading');
    const expectedThumbnail = readFileSync('src/content/articles/1955-56-european-cup-final-real-madrid-stade-de-reims.md','utf8').match(/^cardImage: '([^']+)'/m)[1];
    assert.equal(await banner.locator('img').getAttribute('src'), expectedThumbnail);
    assert.equal(await banner.locator('.award-reading-action').innerText(), '경기 복원 보기');
    assert.match(await banner.evaluate(el => getComputedStyle(el).backgroundImage), /linear-gradient/);
    await banner.locator('img').scrollIntoViewIfNeeded();
    await banner.locator('img').evaluate(el => el.decode());
    assert(await banner.evaluate(el => [...el.querySelectorAll('*')].every(child => child.scrollWidth <= child.clientWidth + 1)), 'banner content fits');
    await banner.screenshot({path:join(out, 'reading-cta-' + width + '.png')});
    assert.equal(await page.locator('.award-ballots tbody tr').count(), 24);
    for (const table of await page.locator('.award-ranking').all()) {
      const detailed = await table.evaluate(el => el.classList.contains('award-ballots'));
      for (const [index, row] of (await table.locator('tbody tr').all()).entries()) {
        const record = data.ranking[index];
        assert.equal(await row.locator('.award-player').innerText(), record.name + '\n' + record.original);
        assert.equal(await row.locator('.award-points strong').innerText(), String(record.points));
        if (detailed) {
          assert.deepEqual(await row.locator('.award-vote').allTextContents(), record.votes.map(String));
          assert.equal(await row.locator('.award-voters').innerText(), record.votes.reduce((a,b) => a+b, 0) + '명');
        } else {
          assert.deepEqual(await row.locator('.award-nationality span').allTextContents(), record.nationalities ?? [record.country]);
          assert.deepEqual(await row.locator('.award-clubs span').allTextContents(), record.clubs);
        }
      }
      assert(await table.evaluate(el => {
        const wrap = el.closest('.award-table-wrap'), shell = el.closest('.award-table-shell').getBoundingClientRect();
        return wrap.scrollWidth <= wrap.clientWidth + 1 && [...el.querySelectorAll('tbody tr > *')].every(cell => {
          const box = cell.getBoundingClientRect();
          return box.left >= shell.left - 1 && box.right <= shell.right + 1 && cell.scrollWidth <= cell.clientWidth + 1 && box.width > 0 && box.height > 0;
        });
      }), 'every table cell fits without clipping or horizontal scrolling');
    }
    for (const img of await page.locator('.archive-body img').all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(el => el.decode());
    }
    for (const flag of await page.locator('[data-identity-kind$="country"] .identity-art').all()) {
      assert(await flag.evaluate(el => {
        const image = el.querySelector('img'), box = image.getBoundingClientRect();
        return Math.abs(box.width / box.height - image.naturalWidth / image.naturalHeight) < .02;
      }), 'flag frame follows source proportions without letterboxing');
    }
    assert.match(await page.locator('.identity-uk').evaluate(el => getComputedStyle(el).backgroundImage), /gb\.svg/);
    assert.match(await page.locator('.identity-england').evaluate(el => getComputedStyle(el).backgroundImage), /gb-eng\.svg/);
    assert.match(await page.locator('.identity-real-madrid').first().evaluate(el => getComputedStyle(el).backgroundImage), /125deg/);
    assert(await page.locator('.award-cover').evaluate(el => !!(document.querySelector('#ranking').compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)));
    const checks = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      brokenAnchors: [...document.querySelectorAll('.archive-body a[href^="#"]')].filter(a => !document.getElementById(a.hash.slice(1))).length,
      brokenImages: [...document.querySelectorAll('.archive-body img')].filter(img => !img.naturalWidth).length,
    }));
    assert.deepEqual(checks, { overflow: false, brokenAnchors: 0, brokenImages: 0 });
    for (const [name, selector] of [['masthead','.award-masthead'],['podium','.award-podium'],['matthews','.historical-identity'],['ranking','.award-table-shell'],['sources','.source-notes']]) {
      await page.locator(selector).first().screenshot({ path: join(out, name + '-' + width + '.png') });
    }
    await page.locator('.historical-identity').nth(1).screenshot({path:join(out, 'di-' + width + '.png')});
    await page.locator('.historical-identity').nth(2).screenshot({path:join(out, 'kopa-' + width + '.png')});
    await page.locator('.award-ballots').screenshot({path:join(out, 'ballots-' + width + '.png')});
    console.log(JSON.stringify({width, ...checks}));
  }
  for (const path of ['/archive/awards/', '/archive/awards/ballon-dor/']) {
    assert.equal((await page.goto(base + path)).status(), 200);
    assert(await page.locator('a[href="' + route + '"]').count() > 0);
    assert(!String(await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
  }
  await page.goto(base + route);
  await page.locator('.award-reading').click();
  await page.waitForURL('**/highlights/european-cup/1955-56-european-cup-final-real-madrid-stade-de-reims/');
  assert.match(await page.locator('h1').innerText(), /1955-56 유러피언컵 결승전 H\/L/);
  console.log('BALLON D’OR QA: PASS');
} finally { await browser.close(); }
