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

function affiliateTerminalResult(product, response, finalUrl, hops) {
  const status = response.status;
  if (status === 404 || status === 410) {
    return { status: 'alert', httpStatus: status, finalUrl, hops, issues: [issue('affiliate-link-dead', '제휴 링크 응답 오류', `리디렉션 도중 HTTP ${status}를 반환했습니다: ${finalUrl}`)] };
  }
  let parsed;
  try { parsed = new URL(finalUrl); } catch {}
  const reachedExpectedProduct = parsed?.hostname === product.merchantHost
    && finalUrl.toLocaleLowerCase().includes(product.productCode.toLocaleLowerCase());
  if (reachedExpectedProduct && (status < 400 || status === 403 || status === 429)) {
    return { status: 'healthy', httpStatus: status, finalUrl, hops, blockedAtMerchant: status === 403 || status === 429 };
  }
  if (status === 403 || status === 429) {
    return {
      status: 'warning', httpStatus: status, finalUrl, hops,
      issues: [issue('affiliate-chain-unverified', '제휴 이동 경로 자동 확인 제한', `리디렉션 도중 ${new URL(finalUrl).hostname}이 HTTP ${status}로 자동 확인을 막았습니다.`, 'warning')],
    };
  }
  return {
    status: 'alert', httpStatus: status, finalUrl, hops,
    issues: [issue('affiliate-destination-changed', '제휴 링크 목적지 변경', `상품 코드 ${product.productCode}가 있는 ${product.merchantHost} 페이지에 도착하지 못했습니다: ${finalUrl} (HTTP ${status})`)],
  };
}

async function checkAffiliate(product) {
  let currentUrl = product.affiliateUrl;
  const hops = [];
  try {
    for (let index = 0; index < 8; index += 1) {
      const response = await fetchWithTimeout(currentUrl, { method: 'HEAD', redirect: 'manual' });
      const location = response.headers.get('location');
      hops.push({ url: currentUrl, httpStatus: response.status, location });
      if (response.status >= 300 && response.status < 400 && location) {
        currentUrl = new URL(location, currentUrl).href;
        continue;
      }
      return affiliateTerminalResult(product, response, currentUrl, hops);
    }
    return { status: 'alert', hops, issues: [issue('affiliate-too-many-redirects', '제휴 링크 리디렉션 과다', 'HEAD 리디렉션이 8회를 넘었습니다.')] };
  } catch (error) {
    return {
      status: 'warning', hops,
      issues: [issue('affiliate-link-unverified', '제휴 링크 자동 확인 제한', `HEAD 확인 실패: ${error.name === 'AbortError' ? '시간 초과' : error.message}`, 'warning')],
    };
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

async function checkMerchantHttp(product) {
  try {
    const response = await fetchWithTimeout(product.merchantUrl, { redirect: 'follow' });
    const text = (await response.text()).slice(0, 2_000_000);
    return evaluateMerchant(product, response.status, response.url, text, 'http');
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

async function checkProduct(product, references, checkWithBrowser) {
  const affiliate = await checkAffiliate(product);

  let merchant = await checkMerchantHttp(product);
  if (merchant.status === 'needs-browser') merchant = await checkWithBrowser(product);
  const issues = [...(affiliate.issues ?? []), ...(merchant.issues ?? [])];
  return {
    id: product.id,
    label: product.label,
    productCode: product.productCode,
    articleReferences: references.filter((reference) => reference.id === product.id).map(({ file, line, href }) => ({ file, line, href })),
    affiliate,
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
