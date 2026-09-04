import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const baseURL = process.argv[2] ?? 'http://127.0.0.1:4321';
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 1000 },
];
const paths = ['/privacy/', '/terms/', '/editorial-policy/'];
const outputDirectory = path.join(os.tmpdir(), 'bbfc-policy-qa');
fs.mkdirSync(outputDirectory, { recursive: true });
const failures = [];
const browser = await chromium.launch({ headless: true });

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => localStorage.removeItem('bbfc_optional_data_choice_v1'));
  await context.route('**/api/privacy/region', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ country: 'KR', optionalScriptsAllowed: true }),
  }));

  for (const pathname of paths) {
    const page = await context.newPage();
    await page.goto(`${baseURL}${pathname}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-privacy-panel]:not([hidden])');
    const metrics = await page.evaluate(() => {
      const panel = document.querySelector('[data-privacy-panel]');
      const buttons = [...document.querySelectorAll('[data-privacy-panel] button:not([hidden]), [data-privacy-settings]')];
      return {
        h1Count: document.querySelectorAll('h1').length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        panelOverflow: panel ? panel.scrollWidth - panel.clientWidth : -1,
        minimumButtonFont: Math.min(...buttons.map((button) => Number.parseFloat(getComputedStyle(button).fontSize))),
      };
    });
    if (metrics.h1Count !== 1) failures.push(`${viewport.name} ${pathname}: H1 ${metrics.h1Count}개`);
    if (metrics.overflow !== 0) failures.push(`${viewport.name} ${pathname}: 가로 넘침 ${metrics.overflow}px`);
    if (metrics.panelOverflow > 0) failures.push(`${viewport.name} ${pathname}: 개인정보 패널 넘침 ${metrics.panelOverflow}px`);
    if (metrics.minimumButtonFont < 13) failures.push(`${viewport.name} ${pathname}: 버튼 최소 글자 ${metrics.minimumButtonFont}px`);
    if (pathname === '/privacy/' && viewport.name !== 'tablet') {
      await page.screenshot({ path: path.join(outputDirectory, `privacy-${viewport.name}.png`), fullPage: false });
    }
    await page.close();
  }
  await context.close();
}

const denyContext = await browser.newContext({ viewport: viewports[0] });
await denyContext.addInitScript(() => localStorage.removeItem('bbfc_optional_data_choice_v1'));
await denyContext.route('**/api/privacy/region', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"country":"KR","optionalScriptsAllowed":true}' }));
const optionalRequests = [];
const denyPage = await denyContext.newPage();
denyPage.on('request', (request) => {
  if (/googletagmanager|googlesyndication|wcs\.pstatic/.test(request.url())) optionalRequests.push(request.url());
});
await denyPage.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
await denyPage.waitForSelector('[data-privacy-panel]:not([hidden])');
await denyPage.click('[data-privacy-deny]');
await denyPage.waitForTimeout(150);
const savedChoice = await denyPage.evaluate(() => localStorage.getItem('bbfc_optional_data_choice_v1'));
if (savedChoice !== 'deny') failures.push('필수 기능만 사용 선택이 저장되지 않음');
if (optionalRequests.length) failures.push('동의 전 선택 스크립트 요청이 발생함');
await denyContext.close();

const allowContext = await browser.newContext({ viewport: viewports[0] });
await allowContext.addInitScript(() => localStorage.removeItem('bbfc_optional_data_choice_v1'));
await allowContext.route('**/api/privacy/region', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"country":"KR","optionalScriptsAllowed":true}' }));
const allowedRequests = [];
for (const pattern of ['**www.googletagmanager.com/**', '**pagead2.googlesyndication.com/**', '**wcs.pstatic.net/**']) {
  await allowContext.route(pattern, (route) => {
    allowedRequests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });
}
const allowPage = await allowContext.newPage();
await allowPage.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
await allowPage.waitForSelector('[data-privacy-panel]:not([hidden])');
await allowPage.click('[data-privacy-allow]');
await allowPage.waitForTimeout(250);
const acceptedChoice = await allowPage.evaluate(() => localStorage.getItem('bbfc_optional_data_choice_v1'));
if (acceptedChoice !== 'allow') failures.push('선택 정보 처리 동의가 저장되지 않음');
for (const provider of ['googletagmanager.com', 'googlesyndication.com', 'wcs.pstatic.net']) {
  if (!allowedRequests.some((url) => url.includes(provider))) failures.push(`동의 후 ${provider} 스크립트 요청이 없음`);
}
await allowContext.close();

await browser.close();

if (failures.length) {
  failures.forEach((failure) => console.error(`정책 화면 검수 실패: ${failure}`));
  process.exit(1);
}

console.log(`정책 화면 검수 통과: ${paths.length}페이지 × ${viewports.length}화면, 390·768·1440px, 동의 전 0건·동의 후 3개 제공자 로드`);
console.log(`검수 이미지: ${outputDirectory}`);
