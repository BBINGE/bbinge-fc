import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve('dist');
const route = '/archive/national-team/copa-america/1955-copa-america-enrique-hormazabal/';
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + path + (path.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root)) throw Error('path');
    res.setHeader('Content-Type', ({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'})[extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  for (const width of [380, 768, 1440]) {
    await page.setViewportSize({width, height:1000});
    await page.goto(base + route, {waitUntil:'networkidle'});
    await page.evaluate(() => { for (const img of document.images) img.loading = 'eager'; });
    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.waitForFunction(() => [...document.querySelectorAll('main img')].every(i => i.complete), {timeout:15000});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(await page.locator('main img').evaluateAll(xs => xs.filter(x => !x.complete || !x.naturalWidth).map(x => x.src)), []);
    assert.ok(await page.locator('main img.flag').count() >= 20);
    const notes = await page.locator('main .foreign-note').evaluateAll(xs => xs.map(x => ({text:x.textContent,lang:x.getAttribute('lang'),size:parseFloat(getComputedStyle(x).fontSize),parentSize:parseFloat(getComputedStyle(x.parentElement).fontSize),vertical:getComputedStyle(x).verticalAlign})));
    for (const name of ['Daniel Enrique Hormazábal Silva', 'Manuel Jesús Muñoz Muñoz', 'Jorge Robledo Oliver', 'René Orlando Meléndez Brito', 'Jaime Caupolicán Ramírez Banda', 'Guillermo Antonio Stábile', 'Rodolfo Joaquín Micheli', 'Óscar Gómez Sánchez']) {
      assert.equal(notes.filter(n => n.text.includes(name)).length, 1, `first mention: ${name}`);
    }
    assert.ok(notes.every(n => n.lang && n.size < n.parentSize && n.vertical !== 'super'));
    assert.ok(notes.some(n => n.text.includes('Estadio;')));
    assert.ok(notes.some(n => n.text.includes('volante;')));
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://bbingefc.com' + route);
    assert.equal(await page.locator('h1').textContent(), '1955 코파 아메리카 최우수 선수: 엔리케 오르마사발');
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({path:process.env.COPA_QA_DIR + `/copa-1955-${width}.png`, fullPage:true});
    console.log(`PASS ${width}: images, SVG flags, title, canonical, no overflow`);
  }
  const html = await readFile(resolve(root, '.' + route, 'index.html'), 'utf8');
  assert.ok(html.includes('application/ld+json'));
  assert.ok(html.includes('1953-copa-america-heriberto-herrera'));
  for (const match of html.matchAll(/(?:src|href)="(\/images\/[^"?#]+)"/g)) await readFile(resolve(root, '.' + match[1]));
  for (const filename of ['sitemap-0.xml', 'rss.xml']) assert.ok((await readFile(resolve(root, filename), 'utf8')).includes(route));
  assert.deepEqual(errors, []);
  console.log('PASS local assets, previous article, sitemap, RSS, structured data');
} finally { await browser.close(); server.close(); }
