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
  await page.goto(`${base}/archive/european-club/european-cup/1955-56-european-cup/`,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.cup-tie').count(),12);
  assert.equal(await page.locator('.cup-participant-scroll tbody tr').count(),16);
  assert.equal(await page.getByText('통산 첫 유러피언컵 출전',{exact:true}).count(),16);
  const stageTables=page.locator('.cup-stage-scroll');
  assert.equal(await stageTables.count(),2);
  assert.equal(await stageTables.nth(0).locator('tbody tr').count(),16);
  assert.equal(await stageTables.nth(1).locator('tbody tr').count(),8);
  assert.equal(await page.getByText('통산 첫 16강 진출',{exact:true}).count(),16);
  assert.equal(await page.getByText('통산 첫 8강 진출',{exact:true}).count(),8);
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
   headingCount:document.querySelectorAll('h3.cup-match').length,
   slots:document.querySelectorAll('.cup-crest-slot').length,
   emptySlots:document.querySelectorAll('.cup-crest-slot:empty').length,
   countryFlags:document.querySelectorAll('.cup-country img.cup-flag').length,
   whiteSlots:[...document.querySelectorAll('.cup-crest-slot')].every(el=>getComputedStyle(el).backgroundColor==='rgb(255, 255, 255)'),
   bareFlags:[...document.querySelectorAll('.cup-flag-slot')].every(el=>getComputedStyle(el).backgroundColor==='rgba(0, 0, 0, 0)' && el.clientWidth===24 && el.clientHeight===16),
   uniformSlots:new Set([...document.querySelectorAll('.cup-crest-slot')].map(el=>`${el.clientWidth}x${el.clientHeight}`)).size===1
  }));
  assert.equal(data.overflow,false);assert.equal(data.flags,24);assert.equal(data.crests,24);assert.equal(data.sprite,false);assert.equal(data.clipped,0);assert(data.images);assert.equal(data.headingCount,12);
  assert.equal(data.slots,24);assert.equal(data.emptySlots,0);assert.equal(data.countryFlags,24);assert(data.whiteSlots);assert(data.bareFlags);assert(data.uniformSlots);
  for (const number of [1,2,8,10,12]) {
   const card=page.locator(`.cup-tie[data-tie$=":match-${number}"]`);
   await card.screenshot({path:`${out}/card-${width}-${number}.png`});
  }
  const details=page.locator('.cup-record-table');
  assert.equal(await details.count(),5);
  for (const [index,label] of [[0,'participants'],[1,'round-of-16'],[2,'round-of-16-results'],[3,'quarter-finals'],[4,'quarter-finals-results']]) {
   const table=details.nth(index);
   assert.equal(await table.evaluate(el=>el.open),false);
   await table.locator('summary').focus();await page.keyboard.press('Enter');assert(await table.evaluate(el=>el.open));
   await table.screenshot({path:`${out}/${label}-${width}.png`});
   const radii=await table.evaluate(el=>{
    const outer=getComputedStyle(el);
    const summary=getComputedStyle(el.querySelector(':scope > summary'));
    const last=getComputedStyle(el.lastElementChild);
    return {outer:parseFloat(outer.borderTopLeftRadius),summaryTop:parseFloat(summary.borderTopLeftRadius),summaryBottom:parseFloat(summary.borderBottomLeftRadius),lastBottom:parseFloat(last.borderBottomLeftRadius)};
   });
   assert(radii.outer>0);assert(radii.summaryTop>0);assert.equal(radii.summaryBottom,0);assert(radii.lastBottom>0);
  }
  const resultTables=page.locator('.cup-record-table').filter({has:page.getByText(/개 대진/)});
  assert.equal(await resultTables.count(),2);
  for (const name of ['스포르팅 CP','FK 파르티잔','RSC 안데를레흐트','세르베트 FC','로트바이스 에센','히버니언 FC','유고덴 IF','그바르디아 바르샤바','오르후스 GF','스타드 드 랭스','SK 라피트 빈','PSV 에인트호번','AC 밀란','1. FC 자르브뤼켄']) assert(await resultTables.getByText(name,{exact:false}).count()>0);
  const historicalSpainFlag=page.locator('img[src="/images/flags/es-1945.png"]');
  assert(await historicalSpainFlag.count()>0);
  assert(await historicalSpainFlag.evaluateAll(images=>images.every(img=>img.naturalWidth===120&&img.naturalHeight===80)));
  console.log(JSON.stringify({width,...data}));
 }
 const plain=await browser.newPage({javaScriptEnabled:false,viewport:{width:380,height:900}});
 await plain.goto(`${base}/archive/european-club/european-cup/1955-56-european-cup/`);
 assert.equal(await plain.locator('.cup-tie').count(),12);
 assert.equal(await plain.locator('.cup-stage-scroll').count(),2);
 assert.equal(await plain.getByText('통산 첫 유러피언컵 출전',{exact:true}).count(),16);
 console.log('No-JS static cards and milestone tables: PASS');
} finally {await browser.close();}
