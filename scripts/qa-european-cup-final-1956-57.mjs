import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 1956-57 유러피언컵 결승 H/L 화면 검수: 제목·부제 카드, 대진·하프타임 문장, 15개 영상 자동 재생,
// 결과 썸네일의 마지막 배치, 누적 표, 읽기 동선, H/L 목록 카드, 380/768/1440px 가로 넘침.
const base = process.env.QA_BASE || 'http://localhost:4321';
const out = mkdtempSync(join(tmpdir(), 'bbinge-final-5657-qa-'));
const route = '/highlights/european-cup/1956-57-european-cup-final-real-madrid-fiorentina/';
const clipsExpected = [
  '01-captains-pennants.mp4', '02-julinho-right.mp4', '03-gento-magnini.mp4', '04-gento-box.mp4',
  '05-julinho-turnover.mp4', '06-sarti-save.mp4', '07-bernabeu-crowd.mp4', '08-mateos-foul-69.mp4',
  '09-di-stefano-penalty-69.mp4', '10-madrid-celebration.mp4', '11-fiorentina-chance.mp4', '12-segato-challenge.mp4',
  '13-gento-run.mp4', '14-gento-75.mp4', '15-munoz-trophy.mp4',
];
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
console.log(`Screenshots: ${out}`);

async function playback(page, clip) {
  await clip.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await page.waitForFunction(el => !el.paused && el.readyState >= 2 && el.currentTime > 0, await clip.elementHandle(), { timeout: 15000 });
  assert(await clip.evaluate(el => el.muted && el.loop && el.playsInline && el.controls && !el.error));
}

try {
  const page = await browser.newPage({ reducedMotion: 'no-preference' });
  for (const width of [380, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal((await page.goto(base + route, { waitUntil: 'domcontentloaded' })).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('h1').innerText(), '1956-57 유러피언컵 결승전 H/L: 레알 마드리드 CF vs AC 피오렌티나');
    assert.equal(await page.locator('.european-cup-title-card strong').innerText(), 'LA SEGUNDA');
    assert.equal(await page.locator('.european-cup-title-card strong').getAttribute('lang'), 'es');
    assert.equal(await page.locator('.content-cover').count(), 0, '결과를 암시하지 않도록 표지 사진은 숨긴다');
    const teams = page.locator('.european-cup-match-board .match-board-teams > div, .european-cup-half-time .transition-team');
    assert.equal(await teams.count(), 4);
    for (const team of await teams.all()) {
      const crest = team.locator('.match-board-crest');
      assert.match(await crest.getAttribute('src'), /(real-madrid-1941|fiorentina-1950)\.svg$/);
      await crest.evaluate(el => el.decode());
      assert(await team.evaluate(el => {
        const c = el.querySelector('.match-board-crest').getBoundingClientRect();
        const n = el.querySelector('strong').getBoundingClientRect();
        const f = el.querySelector('.match-board-country').getBoundingClientRect();
        return c.bottom <= n.top && n.bottom <= f.top;
      }), 'crest → name → country 순서');
    }
    assert.equal(await page.locator('.european-cup-match-board').innerText().then(t => /2-0|2 - 0/.test(t)), false, '경기 전 카드는 결과를 공개하지 않는다');
    assert.deepEqual(await page.locator('.european-cup-half-time .transition-numbers > span').allTextContents(), ['0', '0']);
    const clips = page.locator('video.highlight-clip');
    assert.equal(await clips.count(), 15);
    assert.equal(await page.locator('video[data-autoplay-on-view]').count(), 15);
    assert.deepEqual(await clips.evaluateAll(v => v.map(x => new URL(x.querySelector('source').src).pathname.split('/').pop())), clipsExpected);
    for (const clip of await clips.all()) await playback(page, clip);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(() => [...document.querySelectorAll('video.highlight-clip')].every(v => v.paused));
    for (const img of await page.locator('.article-body img').all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(el => el.decode());
    }
    const checks = await page.evaluate(() => {
      const thumb = [...document.querySelectorAll('.article-body img')].find(i => i.src.includes('final-thumbnail'));
      const poster = document.querySelector('.european-cup-full-time.poster-1957');
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        brokenImages: [...document.querySelectorAll('.article-body img')].filter(el => !el.naturalWidth).length,
        brokenAnchors: [...document.querySelectorAll('.article-body a[href^="#"]')].filter(el => !document.getElementById(el.hash.slice(1))).length,
        thumbAfterPoster: !!(thumb && poster && (poster.compareDocumentPosition(thumb) & Node.DOCUMENT_POSITION_FOLLOWING)),
        thumbAfterLastClip: !!(thumb && (document.querySelector('video.highlight-clip:last-of-type') || [...document.querySelectorAll('video.highlight-clip')].pop()).compareDocumentPosition(thumb) & Node.DOCUMENT_POSITION_FOLLOWING),
        posterBg: poster ? getComputedStyle(poster, '::before').backgroundImage.includes('1956-57-european-cup-final-thumbnail') : false,
        routeCards: [...document.querySelectorAll('a')].filter(a => a.closest('[class*="route"]')).map(a => a.getAttribute('href')),
      };
    });
    assert.equal(checks.overflow, false);
    assert.equal(checks.brokenImages, 0);
    assert.equal(checks.brokenAnchors, 0);
    assert(checks.thumbAfterPoster && checks.thumbAfterLastClip, '결과 썸네일은 원고 마지막');
    assert(checks.posterBg, '풀타임 포스터 배경');
    for (const href of ['/archive/club/european-cup/1956-57-european-cup/', '/archive/club/european-cup/1956-57-european-cup-semifinals/']) {
      assert(checks.routeCards.includes(href), 'reading route ' + href);
    }
    assert(!checks.routeCards.includes(route), '읽기 동선은 현재 글을 빼고 보여 준다');
    for (const text of ['통산 두 번째 결승 진출', '통산 첫 결승 진출', '통산 두 번째 유러피언컵 우승', '통산 첫 유러피언컵 준우승']) {
      assert(await page.getByText(text, { exact: true }).count() > 0, text);
    }
    await page.locator('.european-cup-match-board').screenshot({ path: join(out, `board-${width}.png`) });
    await page.locator('.european-cup-half-time').screenshot({ path: join(out, `halftime-${width}.png`) });
    await page.locator('.european-cup-full-time').screenshot({ path: join(out, `fulltime-${width}.png`) });
    await page.locator('.european-cup-team-photos').screenshot({ path: join(out, `photos-${width}.png`) });
    console.log(JSON.stringify({ width, clips: 15, overflow: checks.overflow, brokenImages: checks.brokenImages }));
  }

  for (const width of [380, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base + '/highlights/');
    const card = page.locator('article').filter({ has: page.locator(`a[href="${route}"]`) });
    assert.equal(await card.count(), 1);
    const img = card.locator('img').first();
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(el => el.decode());
    assert.match(await img.getAttribute('src'), /1956-57-european-cup-final-thumbnail/);
    assert.match(await card.innerText(), /15 SCENES/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await card.screenshot({ path: join(out, `card-${width}.png`) });
    await page.locator('main').first().screenshot({ path: join(out, `highlights-top-${width}.png`), clip: undefined }).catch(() => {});
    console.log(`PASS H/L card ${width}px`);
  }

  for (const id of ['1956-57-european-cup', '1956-57-european-cup-semifinals']) {
    await page.goto(base + `/archive/club/european-cup/${id}/`);
    assert(await page.locator(`a[href="${route}"]`).count() > 0, id + ' → 결승 H/L 동선');
  }
  console.log(`PASS all checks against ${base}`);
} finally {
  await browser.close();
}
