import { chromium } from 'playwright';
import { readFile, access } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist');
const server=createServer(async(req,res)=>{try{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(root,'.'+p+(p.endsWith('/')?'index.html':''));if(!file.startsWith(root))throw Error('path');res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [380,768,1440]){
  await page.setViewportSize({width,height:1000});
  await page.goto(base+'/archive/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.archive-new__lead').count(),1);
  assert.equal(await page.locator('.archive-new__next li').count(),3);
  assert.equal(await page.locator('.reading-path li').count(),4);
  const total=await page.locator('[data-library-hall]').count();
  for(const filter of ['people','competitions','awards','all']){
   await page.locator(`[data-library-filter="${filter}"]`).click();
   const expected=filter==='all'?total:await page.locator(`[data-library-hall="${filter}"]`).count();
   assert.equal(await page.locator('[data-library-hall]:visible').count(),expected);
   assert.equal(await page.locator('[data-library-count]').textContent(),`${expected}편`);
   assert.equal(await page.locator('.archive-library__empty').isVisible(),expected===0);
  }
  // 서가 필터가 헤더 바로 아래에 고정되는지 확인한다.
  await page.locator('.archive-library').evaluate(e=>window.scrollTo(0,e.getBoundingClientRect().top+scrollY+240));
  const top=await page.locator('.archive-library__filters').evaluate(e=>e.getBoundingClientRect().top);
  assert.ok(Math.abs(top-(width<768?56:64))<2,`sticky ${width}: ${top}`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(process.env.ARCHIVE_QA_SCREENSHOTS){
   await page.locator('.archive-new').scrollIntoViewIfNeeded();await page.waitForTimeout(650);await page.locator('.archive-new').screenshot({path:`.discovery-new-${width}.png`});
   await page.locator('.reading-path').scrollIntoViewIfNeeded();await page.waitForTimeout(650);await page.locator('.reading-path').screenshot({path:`.discovery-path-${width}.png`});
  }
  console.log(`PASS ${width}: latest, path, all filters, sticky, overflow`);
 }
 await page.goto(base+'/archive/reading-paths/',{waitUntil:'networkidle'});
 for(const link of await page.locator('.reading-path a').evaluateAll(as=>as.map(a=>a.getAttribute('href'))))await access(resolve(root,'.'+link+'index.html'));
 const sitemap=await readFile(resolve(root,'sitemap-0.xml'),'utf8');assert.ok(sitemap.includes('/archive/reading-paths/'));
 const reduced=await browser.newPage({reducedMotion:'reduce'});await reduced.goto(base+'/archive/');await reduced.locator('.reading-path').scrollIntoViewIfNeeded();assert.equal(await reduced.locator('.archive-discovery').evaluate(e=>e.getAnimations({subtree:true}).length),0);await reduced.close();
 const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto(base+'/archive/');assert.ok(await nojs.locator('[data-library-hall]:visible').count()>0);assert.equal(await nojs.locator('[data-library-filter="people"]').getAttribute('href'),'/archive/legends/');await nojs.close();
 assert.deepEqual(errors,[]);console.log('PASS reading links, sitemap, reduced motion, no-JS fallback, runtime errors');
} finally {await browser.close();server.close();}
