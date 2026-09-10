import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const base = process.env.QA_BASE || 'http://127.0.0.1:4323';
const output = mkdtempSync(join(tmpdir(), 'bbinge-nana-layout-'));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const width of [380, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal((await page.goto(base + '/culture/nana-ferragamo-cara-bag/')).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    for (const selector of ['.nc-video__copy h3', '.nc-shop__copy h2']) {
      const style = await page.locator(selector).evaluate(el => {
        const css = getComputedStyle(el);
        return { color: css.color, border: css.borderLeftWidth, padding: css.paddingLeft, margin: css.marginTop };
      });
      assert.equal(style.color, 'rgb(255, 255, 255)');
      assert.equal(style.border, '0px');
      assert.equal(style.padding, '0px');
      assert.equal(style.margin, selector.includes('h3') ? '14px' : '15px');
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.locator('.nc-shop').scrollIntoViewIfNeeded();
    await page.locator('.nc-shop img').evaluate(img => img.decode());
    await page.locator('.nc-shop').screenshot({ path: join(output, width + '-shop.png') });
    const video = page.locator('.nc-video');
    const trigger = video.locator('[data-inline-video-trigger]');
    const initialHeight = await video.locator('.nc-video__media').evaluate(el => el.clientHeight);
    assert.equal(await video.locator('iframe').getAttribute('src'), null);
    await trigger.click();
    await page.waitForFunction(() => document.querySelector('.nc-video').style.getPropertyValue('--inline-video-height'), null, { timeout: 30000 });
    const frame = page.frames().find(item => item.url().startsWith('https://www.instagram.com/reel/'));
    assert(frame, 'official Instagram frame loaded');
    const dimensions = await frame.evaluate(() => ({
      viewport: innerHeight,
      content: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
    }));
    assert(dimensions.content <= dimensions.viewport + 2, JSON.stringify(dimensions));
    const measuredHeight = await video.evaluate(el => el.style.getPropertyValue('--inline-video-height'));
    await page.evaluate(() => {
      const frame = document.querySelector('.nc-video iframe');
      for (const sample of [
        { origin: 'https://invalid.example', source: frame.contentWindow, data: JSON.stringify({ type: 'MEASURE', details: { height: 999 } }) },
        { origin: 'https://www.instagram.com', source: window, data: JSON.stringify({ type: 'MEASURE', details: { height: 999 } }) },
        { origin: 'https://www.instagram.com', source: frame.contentWindow, data: 'not-json' },
        { origin: 'https://www.instagram.com', source: frame.contentWindow, data: JSON.stringify({ type: 'MEASURE', details: { height: -1 } }) },
      ]) window.dispatchEvent(new MessageEvent('message', sample));
    });
    assert.equal(await video.evaluate(el => el.style.getPropertyValue('--inline-video-height')), measuredHeight);
    await video.screenshot({ path: join(output, width + '-video.png') });
    await video.locator('[data-inline-video-close]').click();
    assert.equal(await video.locator('iframe').getAttribute('src'), null);
    assert.equal(await video.locator('.nc-video__media').evaluate(el => el.clientHeight), initialHeight);
    assert(await trigger.evaluate(el => el === document.activeElement));
    console.log(width, 'PASS', dimensions);
  }
  console.log('Screenshots:', output);
} finally {
  await browser.close();
}
