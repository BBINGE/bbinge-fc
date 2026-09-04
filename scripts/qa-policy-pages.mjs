import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const baseURL = process.argv[2] ?? 'http://127.0.0.1:4321';
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1440, height: 1000 },
];
const paths = ['/privacy/', '/terms/', '/editorial-policy/'];
const outputDirectory = path.join(os.tmpdir(), 'bbfc-policy-qa');
fs.mkdirSync(outputDirectory, { recursive: true });
const failures = [];
const browser = await chromium.launch({ headless: true });

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => {
    localStorage.removeItem('bbfc_optional_data_choice_v1');
    localStorage.removeItem('bbfc_optional_data_choice_v2');
  });
  await context.route('**/api/privacy/region', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ country: 'KR', regulatedRegion: false, consentSurface: 'site', optionalScriptsAllowed: true }),
  }));

  for (const pathname of paths) {
    const page = await context.newPage();
    await page.goto(`${baseURL}${pathname}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-privacy-panel]:not([hidden])');
    const metrics = await page.evaluate(() => {
      const panel = document.querySelector('[data-privacy-panel]');
      const buttons = [...document.querySelectorAll('[data-privacy-panel] button, .privacy-settings-button')]
        .filter((button) => button.getBoundingClientRect().height > 0);
      return {
        h1Count: document.querySelectorAll('h1').length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        panelOverflow: panel ? panel.scrollWidth - panel.clientWidth : -1,
        minimumButtonFont: Math.min(...buttons.map((button) => Number.parseFloat(getComputedStyle(button).fontSize))),
        minimumButtonHeight: Math.min(...buttons.map((button) => button.getBoundingClientRect().height)),
        panelHeight: panel?.getBoundingClientRect().height ?? 0,
        detailsHidden: document.querySelector('[data-privacy-details]')?.hidden,
      };
    });
    if (metrics.h1Count !== 1) failures.push(`${viewport.name} ${pathname}: H1 ${metrics.h1Count}개`);
    if (metrics.overflow !== 0) failures.push(`${viewport.name} ${pathname}: 가로 넘침 ${metrics.overflow}px`);
    if (metrics.panelOverflow > 0) failures.push(`${viewport.name} ${pathname}: 개인정보 패널 넘침 ${metrics.panelOverflow}px`);
    if (metrics.minimumButtonFont < 14) failures.push(`${viewport.name} ${pathname}: 버튼 최소 글자 ${metrics.minimumButtonFont}px`);
    if (metrics.minimumButtonHeight < 44) failures.push(`${viewport.name} ${pathname}: 버튼 최소 높이 ${metrics.minimumButtonHeight}px`);
    const summaryHeightLimit = viewport.name === 'mobile' ? 280 : 220;
    if (metrics.panelHeight > summaryHeightLimit) failures.push(`${viewport.name} ${pathname}: 첫 동의 배너 높이 ${metrics.panelHeight}px`);
    if (!metrics.detailsHidden) failures.push(`${viewport.name} ${pathname}: 첫 화면에서 상세 동의가 펼쳐짐`);
    if (pathname === '/privacy/' && viewport.name !== 'tablet') {
      await page.screenshot({ path: path.join(outputDirectory, `privacy-summary-${viewport.name}.png`), fullPage: false });
      await page.click('[data-privacy-customize]', { force: true });
      const detailMetrics = await page.evaluate(() => {
        const panel = document.querySelector('[data-privacy-panel]');
        const detail = document.querySelector('[data-privacy-details]');
        return {
          hidden: detail?.hidden,
          overflow: panel ? panel.scrollWidth - panel.clientWidth : -1,
          panelHeight: panel?.getBoundingClientRect().height ?? 0,
          viewportHeight: window.innerHeight,
        };
      });
      if (detailMetrics.hidden) failures.push(`${viewport.name}: 선택 설정이 열리지 않음`);
      if (detailMetrics.overflow > 0) failures.push(`${viewport.name}: 상세 동의 가로 넘침 ${detailMetrics.overflow}px`);
      if (viewport.name === 'mobile' && detailMetrics.panelHeight > detailMetrics.viewportHeight * .6) failures.push(`${viewport.name}: 상세 동의 높이 ${detailMetrics.panelHeight}px / 화면 ${detailMetrics.viewportHeight}px`);
      await page.screenshot({ path: path.join(outputDirectory, `privacy-details-${viewport.name}.png`), fullPage: false });
    }
    await page.close();
  }
  await context.close();
}

const denyContext = await browser.newContext({ viewport: viewports[0] });
await denyContext.addInitScript(() => {
  localStorage.removeItem('bbfc_optional_data_choice_v1');
  localStorage.removeItem('bbfc_optional_data_choice_v2');
});
await denyContext.route('**/api/privacy/region', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"country":"KR","regulatedRegion":false,"consentSurface":"site","optionalScriptsAllowed":true}' }));
const optionalRequests = [];
const denyPage = await denyContext.newPage();
denyPage.on('request', (request) => {
  if (/googletagmanager|googlesyndication|wcs\.pstatic/.test(request.url())) optionalRequests.push(request.url());
});
await denyPage.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
await denyPage.waitForSelector('[data-privacy-panel]:not([hidden])');
await denyPage.click('[data-privacy-deny]', { force: true });
await denyPage.waitForTimeout(150);
const savedChoice = await denyPage.evaluate(() => JSON.parse(localStorage.getItem('bbfc_optional_data_choice_v2') || '{}'));
if (!savedChoice.decided || savedChoice.analytics || savedChoice.googleTransfer || savedChoice.ads) failures.push('필수 기능만 사용 선택이 항목별로 저장되지 않음');
if (optionalRequests.length) failures.push('동의 전 선택 스크립트 요청이 발생함');
await denyContext.close();

const verifySeparatedChoice = async (name, choices, expectedProviders) => {
  const context = await browser.newContext({ viewport: viewports[0] });
  await context.addInitScript(() => localStorage.removeItem('bbfc_optional_data_choice_v2'));
  await context.route('**/api/privacy/region', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"country":"KR","regulatedRegion":false,"consentSurface":"site","optionalScriptsAllowed":true}' }));
  const requests = [];
  for (const pattern of ['**www.googletagmanager.com/**', '**pagead2.googlesyndication.com/**', '**wcs.pstatic.net/**']) {
    await context.route(pattern, (route) => {
      requests.push(route.request().url());
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });
  }
  const page = await context.newPage();
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-privacy-panel]:not([hidden])');
  await page.click('[data-privacy-customize]', { force: true });
  if (choices.analytics) await page.check('[data-consent-analytics]', { force: true });
  if (choices.googleTransfer) await page.check('[data-consent-google-transfer]', { force: true });
  if (choices.ads) await page.check('[data-consent-ads]', { force: true });
  await page.click('[data-privacy-save]', { force: true });
  await page.waitForTimeout(150);
  const providerTokens = ['googletagmanager.com', 'googlesyndication.com', 'wcs.pstatic.net'];
  for (const provider of providerTokens) {
    const requested = requests.some((url) => url.includes(provider));
    if (requested !== expectedProviders.includes(provider)) failures.push(`${name}: ${provider} 분리 동의 조건 불일치`);
  }
  await context.close();
};

await verifySeparatedChoice('방문 분석만 동의', { analytics: true }, ['wcs.pstatic.net']);
await verifySeparatedChoice('방문 분석·국외 이전 동의', { analytics: true, googleTransfer: true }, ['googletagmanager.com', 'wcs.pstatic.net']);
await verifySeparatedChoice('광고 쿠키만 동의', { ads: true }, []);
await verifySeparatedChoice('국외 이전·광고 쿠키 동의', { googleTransfer: true, ads: true }, ['googlesyndication.com']);

const allowContext = await browser.newContext({ viewport: viewports[0] });
await allowContext.addInitScript(() => {
  localStorage.removeItem('bbfc_optional_data_choice_v1');
  localStorage.removeItem('bbfc_optional_data_choice_v2');
});
await allowContext.route('**/api/privacy/region', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"country":"KR","regulatedRegion":false,"consentSurface":"site","optionalScriptsAllowed":true}' }));
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
await allowPage.click('[data-privacy-allow]', { force: true });
await allowPage.waitForTimeout(250);
const acceptedChoice = await allowPage.evaluate(() => JSON.parse(localStorage.getItem('bbfc_optional_data_choice_v2') || '{}'));
if (!acceptedChoice.decided || !acceptedChoice.analytics || !acceptedChoice.googleTransfer || !acceptedChoice.ads) failures.push('세 선택 동의가 각각 저장되지 않음');
for (const provider of ['googletagmanager.com', 'googlesyndication.com', 'wcs.pstatic.net']) {
  if (!allowedRequests.some((url) => url.includes(provider))) failures.push(`동의 후 ${provider} 스크립트 요청이 없음`);
}
await allowContext.close();

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  await context.route('**/api/privacy/region', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '{"country":"DE","regulatedRegion":true,"consentSurface":"google-cmp","optionalScriptsAllowed":false}',
  }));
  const requests = [];
  for (const pattern of ['**www.googletagmanager.com/**', '**pagead2.googlesyndication.com/**', '**wcs.pstatic.net/**']) {
    await context.route(pattern, (route) => {
      requests.push(route.request().url());
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });
  }
  const page = await context.newPage();
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(200);
  const metrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    sitePanelVisible: !document.querySelector('[data-privacy-panel]')?.hidden,
  }));
  if (metrics.overflow !== 0) failures.push(`${viewport.name} EEA CMP 경로: 가로 넘침 ${metrics.overflow}px`);
  if (metrics.sitePanelVisible) failures.push(`${viewport.name} EEA CMP 경로: 자체 선택 패널이 함께 노출됨`);
  if (!requests.some((url) => url.includes('googlesyndication.com'))) failures.push(`${viewport.name} EEA CMP 경로: Google CMP 호스트 요청이 없음`);
  if (requests.some((url) => url.includes('googletagmanager.com') || url.includes('wcs.pstatic.net'))) failures.push(`${viewport.name} EEA CMP 경로: 분석 스크립트가 요청됨`);
  await context.close();
}

await browser.close();

if (failures.length) {
  failures.forEach((failure) => console.error(`정책 화면 검수 실패: ${failure}`));
  process.exit(1);
}

console.log(`정책 화면 검수 통과: ${paths.length}페이지 × ${viewports.length}화면, 390·768·1366·1440px, 4개 분리 동의 조합·EEA Google CMP 분기·동의 전 0건·전체 동의 후 3개 제공자 로드`);
console.log(`검수 이미지: ${outputDirectory}`);
