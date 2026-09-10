import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve('dist');
const route = '/archive/national-team/copa-america/1956-copa-america-oscar-miguez/';
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + path + (path.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root)) throw Error('path');
    res.setHeader('Content-Type', ({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'})[extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.statusCode = 404; res.end(); }
});

await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  for (const width of [380, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.evaluate(() => { for (const image of document.images) image.loading = 'eager'; });
    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.waitForFunction(() => [...document.querySelectorAll('main img')].every((image) => image.complete), { timeout: 15000 });

    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(await page.locator('main img').evaluateAll((images) => images.filter((image) => !image.complete || !image.naturalWidth).map((image) => image.src)), []);
    assert.ok(await page.locator('main img.flag').count() >= 20);

    const notes = await page.locator('main .foreign-note').evaluateAll((items) => items.map((item) => ({
      text: item.textContent,
      lang: item.getAttribute('lang'),
      size: parseFloat(getComputedStyle(item).fontSize),
      parentSize: parseFloat(getComputedStyle(item.parentElement).fontSize),
      vertical: getComputedStyle(item).verticalAlign,
    })));

    for (const name of [
      'Óscar Omar Míguez Antón',
      'Víctor Hugo Bagnulo Fernández',
      'Guillermo Escalada Larriera',
      'Carlos Ariel Borges',
      'Javier Ambrois Campaña',
      'Daniel Enrique Hormazábal Silva',
    ]) {
      assert.equal(notes.filter((note) => note.text.includes(name)).length, 1, `first mention: ${name}`);
    }

    assert.ok(notes.every((note) => note.lang && note.size < note.parentSize && note.vertical !== 'super'));
    assert.ok(notes.some((note) => note.text.includes('centrofóbal;')));
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://bbingefc.com' + route);
    assert.equal(await page.locator('h1').textContent(), '1956 코파 아메리카 최우수 선수: 오스카르 미게스');
    assert.equal(await page.locator('h1').evaluate((heading) => getComputedStyle(heading).wordBreak), 'keep-all');

    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: process.env.COPA_QA_DIR + `/copa-1956-${width}.png`, fullPage: true });
    console.log(`PASS ${width}: images, SVG flags, title, canonical, no overflow`);
  }

  const html = await readFile(resolve(root, '.' + route, 'index.html'), 'utf8');
  assert.ok(html.includes('application/ld+json'));
  assert.ok(html.includes('1955-copa-america-enrique-hormazabal'));
  assert.ok(html.includes('1950-fifa-world-cup-best-xi'));
  assert.ok(html.includes('동시대 공식 MVP 시상으로 단정하지 않는다'));
  assert.ok(html.includes('자국에서 치른 다섯 번째 대회까지 다섯 번 모두 우승'));
  assert.ok(html.includes('AUF 장문 회고는 페루전 득점자를 미게스·보르헤스로 적지만'));

  for (const match of html.matchAll(/(?:src|href)="(\/images\/[^"?#]+)"/g)) {
    await readFile(resolve(root, '.' + match[1]));
  }

  for (const filename of ['sitemap-0.xml', 'rss.xml']) {
    assert.ok((await readFile(resolve(root, filename), 'utf8')).includes(route));
  }

  assert.deepEqual(errors, []);
  console.log('PASS local assets, series links, MVP scope, sitemap, RSS, structured data');
} finally {
  await browser.close();
  server.close();
}
