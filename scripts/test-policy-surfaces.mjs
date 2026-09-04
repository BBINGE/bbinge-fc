import fs from 'node:fs';
import path from 'node:path';
import { onRequest, shouldRedirect } from '../functions/_middleware.js';
import { onRequestGet as getPrivacyRegion } from '../functions/api/privacy/region.js';

const root = process.cwd();
const builtMode = process.argv.includes('--built');
const failures = [];
const fail = (message) => failures.push(message);

const source = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const privacy = source('src/pages/privacy/index.astro');
const editorial = source('src/pages/editorial-policy/index.astro');
const layout = source('src/layouts/Layout.astro');
const controls = source('src/components/PrivacyControls.astro');

for (const signal of [
  '개인정보 보호법 제28조의8',
  '이전 근거</th>',
  '이전 국가</th>',
  '이전 항목</th>',
  '시기·방법</th>',
  '보유기간</th>',
  '거부와 영향</th>',
  '개인정보분쟁조정위원회',
  '개인정보침해신고센터',
  'Google Analytics 이벤트 2개월·사용자 14개월',
  'NAVER Analytics 1년',
  '본 사이트 또는 다른 사이트 이전 방문 기록을 기반으로',
  '방문 분석 수집·이용, Google 국외 이전, Google 광고 쿠키를 각각',
]) {
  if (!privacy.includes(signal)) fail(`개인정보처리방침 필수 공개 항목 누락: ${signal}`);
}

if (editorial.includes('본문 출처에 기존 발행물을 연결')) {
  fail('과거 NAVER 발행물을 본문 출처에 자동 연결하는 이전 규칙이 남아 있음');
}
if (!editorial.includes('사실·기록·인용을 검증하는 데 실제 사용한 자료')) {
  fail('개정판의 독립 검증 원칙이 누락됨');
}

for (const signal of ['pageUpdatedDate?: Date', "'@type': 'WebPage'", 'dateModified: pageUpdatedDate.toISOString()']) {
  if (!layout.includes(signal)) fail(`정책 페이지 WebPage 구조화 데이터 누락: ${signal}`);
}
for (const signal of ['bbfc_optional_data_choice_v2', "fetch('/api/privacy/region'", 'data-consent-analytics', 'data-consent-google-transfer', 'data-consent-ads', 'data-privacy-allow', 'data-privacy-customize', 'data-privacy-save', 'data-privacy-deny', "consentSurface === 'google-cmp'", 'showRevocationMessage', "params.get('privacy-settings')"]) {
  if (!controls.includes(signal)) fail(`선택 정보 처리 제어 누락: ${signal}`);
}

const redirectRequest = new Request('https://bbinge-fc.pages.dev/privacy/?from=test');
if (!shouldRedirect(redirectRequest)) fail('pages.dev 문서 주소를 canonical 호스트로 보내지 않음');
const redirectResponse = await onRequest({ request: redirectRequest, next: () => new Response('next') });
if (redirectResponse.status !== 301 || redirectResponse.headers.get('location') !== 'https://bbingefc.com/privacy/?from=test') {
  fail('pages.dev canonical 301이 경로와 쿼리를 보존하지 않음');
}

for (const url of [
  'https://bbinge-fc.pages.dev/api/privacy/region',
  'https://bbinge-fc.pages.dev/deploy.json',
  'https://bbinge-fc.pages.dev/favicon.ico',
  'https://bbingefc.com/privacy/',
]) {
  const response = await onRequest({ request: new Request(url), next: () => new Response(null, { status: 204 }) });
  if (response.status !== 204) fail(`리디렉션 예외 또는 canonical 호스트 통과 실패: ${url}`);
}

const requestFromCountry = (country) => {
  const request = new Request('https://bbingefc.com/');
  Object.defineProperty(request, 'cf', { value: { country } });
  return request;
};
const restricted = await getPrivacyRegion({ request: requestFromCountry('DE') });
const restrictedWithCmp = await getPrivacyRegion({ request: requestFromCountry('DE'), env: { GOOGLE_CMP_ACTIVE: 'true' } });
const unrestricted = await getPrivacyRegion({ request: requestFromCountry('KR') });
const unknown = await getPrivacyRegion({ request: new Request('https://bbingefc.com/') });
const restrictedRegion = await restricted.json();
const restrictedCmpRegion = await restrictedWithCmp.json();
const unrestrictedRegion = await unrestricted.json();
const unknownRegion = await unknown.json();
if (restrictedRegion.optionalScriptsAllowed !== false || restrictedRegion.consentSurface !== 'disabled') fail('CMP 활성 확인 전 EEA 접속이 fail-closed가 아님');
if (restrictedCmpRegion.optionalScriptsAllowed !== false || restrictedCmpRegion.consentSurface !== 'google-cmp') fail('CMP 활성 확인 뒤 EEA 접속이 Google CMP 경로로 분기되지 않음');
if (unrestrictedRegion.optionalScriptsAllowed !== true || unrestrictedRegion.consentSurface !== 'site') fail('한국 접속에서 사이트 선택 동의 기능이 차단됨');
if (unknownRegion.optionalScriptsAllowed !== false || unknownRegion.consentSurface !== 'disabled') fail('접속 국가 미확인 시 fail-closed가 아님');

if (failures.length) {
  failures.forEach((message) => console.error(`정책·개인정보 검수 실패: ${message}`));
  process.exit(1);
}

if (builtMode) {
  const expectedModified = new Date('2026-09-04T00:00:00+09:00').toISOString();
  for (const pathname of ['privacy', 'terms', 'editorial-policy']) {
    const html = source(`dist/${pathname}/index.html`);
    const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((match) => JSON.parse(match[1]));
    const pageSchema = schemas.find((schema) => schema['@type'] === 'WebPage');
    if (!pageSchema) fail(`빌드된 /${pathname}/에서 WebPage JSON-LD 누락`);
    if (pageSchema?.dateModified !== expectedModified) fail(`빌드된 /${pathname}/의 dateModified 불일치`);
    if (/src="https:\/\/(?:www\.googletagmanager\.com|pagead2\.googlesyndication\.com|wcs\.pstatic\.net)/.test(html)) {
      fail(`빌드된 /${pathname}/에 동의 전 외부 선택 스크립트가 정적으로 포함됨`);
    }
  }
}

if (failures.length) {
  failures.forEach((message) => console.error(`정책·개인정보 검수 실패: ${message}`));
  process.exit(1);
}

console.log(`정책·개인정보·canonical 호스트 검수 통과 (${builtMode ? '빌드 결과' : '소스'})`);
