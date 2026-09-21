import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadAndValidate, paths } from './affiliate-products-lib.mjs';

const outputArgument = process.argv.find((argument) => argument.startsWith('--output='));
const outputPath = outputArgument
  ? path.resolve(paths.projectRoot, outputArgument.slice('--output='.length))
  : path.join(paths.projectRoot, 'affiliate-monitor-report.json');
const timeoutMs = 20_000;
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36 BBingeAffiliateMonitor/1.0';

function issue(code, title, detail, severity = 'error') {
  return { code, title, detail, severity };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, headers: { 'user-agent': userAgent, ...options.headers } });
  } finally {
    clearTimeout(timer);
  }
}

function contextContainsMarker(text, product) {
  const normalized = text.replace(/\s+/g, ' ');
  const lowered = normalized.toLocaleLowerCase('ko');
  const windows = [];
  for (const anchor of [product.productCode, product.label].filter(Boolean)) {
    const index = lowered.indexOf(anchor.toLocaleLowerCase('ko'));
    if (index >= 0) windows.push(normalized.slice(Math.max(0, index - 800), index + anchor.length + 2500));
  }
  if (!windows.length) return null;
  return (product.soldOutMarkers ?? []).find((marker) => windows.some((window) => window.includes(marker))) ?? null;
}

function evaluateMerchant(product, status, finalUrl, text, source) {
  const issues = [];
  if (status === 404 || status === 410) {
    issues.push(issue('merchant-page-dead', '상품 페이지 응답 오류', `공식 상품 페이지가 HTTP ${status}를 반환했습니다.`));
    return { status: 'alert', httpStatus: status, finalUrl, source, issues };
  }
  if (status >= 400 || status === 0) return { status: 'needs-browser', httpStatus: status, finalUrl, source, issues: [] };

  let parsed;
  try { parsed = new URL(finalUrl); } catch {}
  if (!parsed || parsed.hostname !== product.merchantHost) {
    issues.push(issue('merchant-host-changed', '상품 페이지 목적지 변경', `최종 주소가 예상 쇼핑몰(${product.merchantHost})이 아닙니다: ${finalUrl}`));
  }
  const codePresent = finalUrl.toLocaleLowerCase().includes(product.productCode.toLocaleLowerCase())
    || text.toLocaleLowerCase().includes(product.productCode.toLocaleLowerCase());
  if (!codePresent) issues.push(issue('product-code-missing', '상품 코드 소실', `최종 주소와 본문에서 상품 코드 ${product.productCode}를 찾지 못했습니다.`));
  const marker = contextContainsMarker(text, product);
  if (marker) issues.push(issue('sold-out-marker', '품절·판매 종료 문구 발견', `상품명 또는 상품 코드 주변에서 “${marker}” 문구를 발견했습니다. 실제 판매 상태 확인이 필요합니다.`));
  return { status: issues.length ? 'alert' : 'healthy', httpStatus: status, finalUrl, source, issues };
}

async function checkMerchantHead(product) {
  try {
    const response = await fetchWithTimeout(product.merchantUrl, { method: 'HEAD', redirect: 'follow' });
    const status = response.status;
    if (status === 404 || status === 410) {
      return { status: 'alert', httpStatus: status, finalUrl: response.url, source: 'head', issues: [issue('merchant-page-dead', '상품 페이지 응답 오류', `공식 상품 페이지가 HTTP ${status}를 반환했습니다.`)] };
    }
    if (status >= 400) return null;
    let parsed;
    try { parsed = new URL(response.url); } catch {}
    const reachedProduct = parsed?.hostname === product.merchantHost
      && response.url.toLocaleLowerCase().includes(product.productCode.toLocaleLowerCase());
    if (!reachedProduct) {
      return { status: 'alert', httpStatus: status, finalUrl: response.url, source: 'head', issues: [issue('merchant-host-changed', '상품 페이지 목적지 변경', `상품 코드 ${product.productCode}가 있는 ${product.merchantHost} 페이지가 아닌 곳으로 이동했습니다: ${response.url}`)] };
    }
    return { status: 'healthy', httpStatus: status, finalUrl: response.url, source: 'head', bodyUnverified: true, issues: [] };
  } catch {
    return null;
  }
}

async function checkMerchantHttp(product) {
  try {
    const response = await fetchWithTimeout(product.merchantUrl, { redirect: 'follow' });
    const text = (await response.text()).slice(0, 2_000_000);
    const result = evaluateMerchant(product, response.status, response.url, text, 'http');
    if (result.status !== 'needs-browser') return result;
    // 아디다스는 본문 GET을 403으로 막지만 HEAD에는 답한다. 페이지 소멸·목적지 변경은 HEAD로 잡는다.
    const head = await checkMerchantHead(product);
    return head ?? result;
  } catch (error) {
    return { status: 'needs-browser', source: 'http', reason: error.name === 'AbortError' ? 'HTTP 확인 시간 초과' : error.message, issues: [] };
  }
}

async function createBrowser() {
  const { chromium } = await import('playwright');
  return chromium.launch({ headless: true });
}

async function checkMerchantBrowser(browser, product) {
  const page = await browser.newPage({ userAgent, locale: 'ko-KR' });
  try {
    const response = await page.goto(product.merchantUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(3000);
    const text = (await page.locator('body').innerText({ timeout: 10_000 })).slice(0, 500_000);
    const status = response?.status() ?? 0;
    if (!status) throw new Error('브라우저에서 HTTP 응답을 받지 못했습니다.');
    const result = evaluateMerchant(product, status, page.url(), text, 'browser');
    if (result.status === 'needs-browser') throw new Error(`브라우저도 HTTP ${status}를 반환했습니다.`);
    return result;
  } catch (error) {
    return {
      status: 'warning',
      source: 'browser',
      issues: [issue('merchant-unverified', '상품 페이지 자동 확인 제한', `일반 요청과 브라우저 재확인 모두 차단됐습니다: ${error.message}`, 'warning')],
    };
  } finally {
    await page.close();
  }
}

function blockedMerchantWarning(host, detail) {
  return {
    status: 'warning',
    source: 'browser-host-cache',
    issues: [issue('merchant-unverified', '상품 페이지 자동 확인 제한', `${host}의 첫 브라우저 재확인이 차단돼 같은 판매처의 나머지 상품은 본문 검사를 생략했습니다. ${detail}`, 'warning')],
  };
}

// 애드픽 단축 주소(affiliateUrl)는 자동으로 열지 않는다. 스크립트 요청도 애드픽 클릭으로 집계되고,
// 데이터센터 IP의 정기 반복 클릭은 부정 클릭으로 보일 수 있다(운영자 결정, 2026-09-21).
// 품절·404·목적지 변경은 판매처 상품 주소만으로 잡는다.
async function checkProduct(product, references, checkWithBrowser) {
  let merchant = await checkMerchantHttp(product);
  if (merchant.status === 'needs-browser') merchant = await checkWithBrowser(product);
  const issues = [...(merchant.issues ?? [])];
  return {
    id: product.id,
    label: product.label,
    productCode: product.productCode,
    articleReferences: references.filter((reference) => reference.id === product.id).map(({ file, line, href }) => ({ file, line, href })),
    merchant,
    status: issues.some((item) => item.severity === 'error') ? 'alert' : issues.length ? 'warning' : 'healthy',
    issues,
  };
}

const { catalog, usage, validation } = await loadAndValidate();
if (validation.errors.length) throw new Error(`중앙 목록 검증 실패:\n${validation.errors.join('\n')}`);

let browserPromise;
const getBrowser = () => (browserPromise ??= createBrowser());
const blockedMerchantHosts = new Map();
const merchantHostProbes = new Map();
async function checkWithBrowser(product) {
  if (blockedMerchantHosts.has(product.merchantHost)) {
    return blockedMerchantWarning(product.merchantHost, blockedMerchantHosts.get(product.merchantHost));
  }
  if (merchantHostProbes.has(product.merchantHost)) {
    await merchantHostProbes.get(product.merchantHost);
    if (blockedMerchantHosts.has(product.merchantHost)) {
      return blockedMerchantWarning(product.merchantHost, blockedMerchantHosts.get(product.merchantHost));
    }
  }
  const probe = (async () => checkMerchantBrowser(await getBrowser(), product))();
  merchantHostProbes.set(product.merchantHost, probe);
  try {
    const result = await probe;
    if (result.status === 'warning' && result.issues?.some((entry) => entry.code === 'merchant-unverified')) {
      blockedMerchantHosts.set(product.merchantHost, result.issues[0].detail);
    }
    return result;
  } finally {
    merchantHostProbes.delete(product.merchantHost);
  }
}

const activeProducts = catalog.products.filter((item) => item.status === 'active');
const items = new Array(activeProducts.length);
let nextIndex = 0;
async function worker() {
  while (nextIndex < activeProducts.length) {
    const index = nextIndex;
    nextIndex += 1;
    items[index] = await checkProduct(activeProducts[index], usage.references, checkWithBrowser);
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}
try {
  await Promise.all(Array.from({ length: Math.min(5, activeProducts.length) }, () => worker()));
} finally {
  if (browserPromise) await (await browserPromise).close();
}

const alerts = items.flatMap((item) => item.issues.filter((entry) => entry.severity === 'error').map((entry) => ({ productId: item.id, productLabel: item.label, ...entry })));
const warnings = items.flatMap((item) => item.issues.filter((entry) => entry.severity === 'warning').map((entry) => ({ productId: item.id, productLabel: item.label, ...entry })));
const report = {
  schemaVersion: 1,
  checkedAt: new Date().toISOString(),
  summary: { checked: items.length, healthy: items.filter((item) => item.status === 'healthy').length, alerts: alerts.length, warnings: warnings.length },
  alerts,
  warnings,
  items,
};
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`제휴상품 감시 완료: ${items.length}개 확인, 알림 ${alerts.length}건, 참고 ${warnings.length}건`);
console.log(`보고서: ${outputPath}`);
