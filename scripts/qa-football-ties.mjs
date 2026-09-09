import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const base=process.env.QA_BASE || 'http://127.0.0.1:4321';
const out=process.env.QA_OUTPUT || mkdtempSync(join(tmpdir(),'bbinge-cup-qa-'));
console.log(`QA screenshots: ${out}`);
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 for (const width of [380,768,1440]) {
  await page.setViewportSize({width,height:1000});
  await page.goto(`${base}/archive/european-club/european-cup/1955-56-european-cup/`,{waitUntil:'networkidle'});
  assert.equal(await page.locator('.cup-tie').count(),12);
  for (const card of await page.locator('.cup-tie').all()) {
   await card.scrollIntoViewIfNeeded();
   await card.locator('img').evaluateAll(async images=>{await Promise.all(images.map(img=>img.decode()));});
  }
  const data=await page.evaluate(()=>({
   overflow:document.documentElement.scrollWidth>innerWidth,
   flags:document.querySelectorAll('.cup-tie img.cup-flag').length,
   crests:document.querySelectorAll('.cup-club-crest').length,
   sprite:!!document.querySelector('[style*="background-position"]'),
   clipped:[...document.querySelectorAll('.cup-side,.cup-leg-results dd')].filter(el=>el.scrollWidth>el.clientWidth+1).length,
   images:[...document.querySelectorAll('.cup-tie img')].every(img=>img.naturalWidth>0),
   headingCount:document.querySelectorAll('h3.cup-match').length
  }));
  assert.equal(data.overflow,false);assert.equal(data.flags,24);assert.equal(data.crests,8);assert.equal(data.sprite,false);assert.equal(data.clipped,0);assert(data.images);assert.equal(data.headingCount,12);
  for (const number of [1,2,8,10,12]) {
   const card=page.locator(`.cup-tie[data-tie$=":match-${number}"]`);
   await card.screenshot({path:`${out}/card-${width}-${number}.png`});
  }
  const table=page.locator('.cup-record-table').first();
  await table.locator('summary').focus();await page.keyboard.press('Enter');assert(await table.evaluate(el=>el.open));
  await table.screenshot({path:`${out}/table-${width}.png`});
  console.log(JSON.stringify({width,...data}));
 }
 const plain=await browser.newPage({javaScriptEnabled:false,viewport:{width:380,height:900}});
 await plain.goto(`${base}/archive/european-club/european-cup/1955-56-european-cup/`);
 assert.equal(await plain.locator('.cup-tie').count(),12);
 console.log('No-JS static cards: PASS');
} finally {await browser.close();}
