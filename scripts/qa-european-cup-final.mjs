import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.env.QA_BASE || 'http://127.0.0.1:4321';
const out = mkdtempSync(join(tmpdir(), 'bbinge-final-qa-'));
const route = '/highlights/european-cup/1955-56-european-cup-final-real-madrid-stade-de-reims/';
const wc1934 = '/highlights/fifa-world-cup/1934-fifa-world-cup-final-italy-czechoslovakia/';
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
console.log(`Screenshots: ${out}`);

async function playback(page, clip) {
  await clip.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await page.waitForFunction(el => !el.paused && el.readyState >= 2 && el.currentTime > 0, await clip.elementHandle());
  const before = await clip.evaluate(el => el.currentTime);
  await page.waitForTimeout(300);
  const after = await clip.evaluate(el => el.currentTime);
  assert.notEqual(after, before, 'time must advance without clicking play');
  assert(await clip.evaluate(el => el.muted && el.loop && el.playsInline && el.controls && !el.error));
}

try {
  const page = await browser.newPage({ reducedMotion: 'no-preference' });
  for (const width of [380, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal((await page.goto(base + route, { waitUntil: 'domcontentloaded' })).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('h1').innerText(), '1955-56 유러피언컵 결승전 H/L: 레알 마드리드 CF vs 스타드 드 랭스');
    assert.equal(await page.locator('.european-cup-title-card strong').innerText(), 'LA PRIMERA');
    assert.equal(await page.locator('.european-cup-title-card strong').getAttribute('lang'), 'es');
    assert.equal(await page.locator('.european-cup-title-card small').innerText(), '라 프리메라; 스페인어로 ‘첫 번째’라는 뜻. 첫 유러피언컵 결승을 여는 이름.');
    const meaning = page.locator('.article-body > p').filter({ hasText: '레알 마드리드의 첫 유러피언컵 우승을 가리키는 표현이다.' });
    assert.equal(await meaning.count(), 1);
    assert(await meaning.evaluate(el => !!(document.querySelector('.european-cup-full-time').compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)));
    const teams = page.locator('.european-cup-match-board .match-board-teams > div, .european-cup-half-time .transition-team');
    assert.equal(await teams.count(), 4);
    for (const team of await teams.all()) {
      const crest = team.locator('.match-board-crest');
      assert.match(await crest.getAttribute('src'), /\.svg$/);
      await crest.evaluate(el => el.decode());
      assert(await team.evaluate(el => {
        const crest = el.querySelector('.match-board-crest').getBoundingClientRect();
        const name = el.querySelector('strong').getBoundingClientRect();
        const country = el.querySelector('.match-board-country').getBoundingClientRect();
        return crest.bottom <= name.top && name.bottom <= country.top;
      }));
      assert.equal(await crest.evaluate(el => getComputedStyle(el).objectFit), 'contain');
      await team.locator('.match-board-country img').evaluate(el => el.decode());
    }
    await page.locator('.european-cup-title-card').screenshot({ path: join(out, `title-${width}.png`) });
    await page.locator('.european-cup-match-board').screenshot({ path: join(out, `board-${width}.png`) });
    assert.deepEqual(await page.locator('.european-cup-half-time .transition-numbers > span').allTextContents(), ['2', '2']);
    await page.locator('.european-cup-half-time').screenshot({ path: join(out, `halftime-${width}.png`) });
    const clips = page.locator('video.highlight-clip');
    assert.equal(await clips.count(), 12);
    assert.equal(await page.locator('video[data-autoplay-on-view]').count(), 12);
    assert.deepEqual(await clips.evaluateAll(videos => videos.map(v => new URL(v.querySelector('source').src).pathname.split('/').pop())), [
      '01-leblond-6.mp4', '02-hidalgo-wing.mp4', '03-templin-10.mp4', '04-reims-crowd.mp4',
      '05-di-stefano-14.mp4', '06-rial-30.mp4', '07-hidalgo-62.mp4', '08-real-response.mp4',
      '09-marquitos-67.mp4', '10-rial-79.mp4', '11-madrid-crowd.mp4', '12-munoz-trophy.mp4',
    ]);
    for (const clip of await clips.all()) await playback(page, clip);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(() => [...document.querySelectorAll('video.highlight-clip')].every(v => v.paused));
    assert(await page.locator('.article-body img').count() > 0);
    for (const img of await page.locator('.article-body img,.content-cover img').all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(el => el.decode());
    }
    const checks = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      brokenImages: [...document.querySelectorAll('.article-body img,.content-cover img')].filter(el => !el.naturalWidth).length,
      brokenAnchors: [...document.querySelectorAll('.article-body a[href^="#"]')].filter(el => !document.getElementById(el.hash.slice(1))).length,
    }));
    assert.deepEqual(checks, { overflow: false, brokenImages: 0, brokenAnchors: 0 });
    for (const text of ['통산 첫 결승 진출', '통산 첫 유러피언컵 우승', '통산 첫 유러피언컵 준우승']) {
      assert(await page.getByText(text, { exact: true }).count() > 0, text);
    }
    await page.locator('.highlight-scene').first().screenshot({ path: join(out, `scene-${width}.png`) });
    await page.locator('.source-notes').screenshot({ path: join(out, `sources-${width}.png`) });
    console.log(JSON.stringify({ width, autoplay: 12, offscreenPaused: 12, ...checks }));
  }

  // Loop across the end, rather than checking only the loop attribute.
  const first = page.locator('video.highlight-clip').first();
  await playback(page, first);
  await first.evaluate(v => { v.currentTime = v.duration - 0.15; });
  await page.waitForFunction(v => v.currentTime < 1.5 && !v.paused, await first.elementHandle());
  const reduced = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 380, height: 1000 } });
  await reduced.goto(base + route);
  const reducedClip = reduced.locator('video.highlight-clip').first();
  await reducedClip.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await reduced.waitForTimeout(700);
  assert(await reducedClip.evaluate(el => el.paused && el.currentTime === 0));
  await reducedClip.evaluate(el => el.play());
  await reduced.waitForFunction(el => el.currentTime > 0, await reducedClip.elementHandle());
  await reduced.close();
  console.log('PASS looping, reduced motion, and manual playback');

  await page.goto(base + wc1934);
  assert.equal(await page.locator('video.highlight-clip').count(), 5);
  assert.match(await page.locator('meta[name="description"]').getAttribute('content'), /다섯 개/);
  await playback(page, page.locator('video.highlight-clip').first());
  console.log('PASS 1934: five videos, description, autoplay');

  for (const width of [380, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base + '/highlights/');
    const finalCard = page.locator('article').filter({ has: page.locator(`a[href="${route}"]`) });
    assert.equal(await finalCard.count(), 1);
    const cardImage = finalCard.locator('img').first();
    await cardImage.scrollIntoViewIfNeeded();
    await cardImage.evaluate(el => el.decode());
    assert.match(await cardImage.getAttribute('src'), /kopa-di-stefano.jpg$/);
    assert.match(await cardImage.getAttribute('alt'), /코파.*디스테파노.*악수/);
    assert.deepEqual(await cardImage.evaluate(el => [el.naturalWidth, el.naturalHeight]), [966, 966]);
    assert.match(await finalCard.innerText(), /12 SCENES/);
    const oldCard = page.locator('article').filter({ has: page.locator(`a[href="${wc1934}"]`) });
    assert.match(await oldCard.innerText(), /05 SCENES/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await finalCard.screenshot({ path: join(out, `card-${width}.png`) });
    console.log(`PASS H/L cards ${width}px: supplied thumbnail, alt, scene counts, no overflow`);
  }
  console.log(`PASS all checks against ${base}`);
} finally {
  await browser.close();
}
