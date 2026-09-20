import { chromium } from 'playwright';
// 축쿼드 「레알 마드리드 CF 역대 베스트 11」: 380/1440에서 가로 넘침·깨진 이미지와
// 선수별 블록이 한 종류로 반복되지 않는지 확인한다. 디스테파노는 열거 블록,
// 푸슈카시는 두 시대 패널, 호날두는 시즌 표로 서로 다른 장치를 쓴다(운영자 지시, 2026-09-20).
const base = process.env.QA_BASE || 'http://localhost:4321';
const shotDir = process.env.QA_SHOTS || '';
const browser = await chromium.launch();
const fails = [];
for (const width of [380, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(`${base}/squads/custom-best-xi/real-madrid-all-time-best-xi/`, { waitUntil: 'networkidle' });
  const r = await page.evaluate(async () => {
    for (const img of document.querySelectorAll('img')) img.loading = 'eager';
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((ok) => setTimeout(ok, 1200));
    window.scrollTo(0, 0);
    const wide = [...document.querySelectorAll('.article-body *')]
      .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
      .map((el) => el.className || el.tagName);
    return {
      overflow: document.documentElement.scrollWidth - innerWidth,
      wide: [...new Set(wide)].slice(0, 6),
      broken: [...document.querySelectorAll('img')].filter((i) => i.complete && !i.naturalWidth).map((i) => i.getAttribute('src')),
      players: document.querySelectorAll('.madrid-player-art').length,
      litany: document.querySelectorAll('.madrid-litany').length,
      twolives: document.querySelectorAll('.madrid-twolives').length,
      season: document.querySelectorAll('.madrid-season tbody tr').length,
      seasonSum: [...document.querySelectorAll('.madrid-season tbody tr td:first-of-type')].reduce((a, td) => a + Number(td.textContent), 0),
      seasonFoot: Number(document.querySelector('.madrid-season tfoot td')?.textContent),
      candidates: document.querySelectorAll('.madrid-candidate-list li').length,
      cites: document.querySelectorAll('a.cite').length,
      sources: document.querySelectorAll('.source-notes li').length,
    };
  });
  if (shotDir) await page.screenshot({ path: `${shotDir}/rm-${width}.png`, fullPage: false });
  const want = { overflow: 0, players: 11, litany: 1, twolives: 1, season: 9, candidates: 30 };
  for (const [k, v] of Object.entries(want)) if (r[k] !== v) fails.push(`${width}px ${k}: ${r[k]} (기대 ${v})`);
  if (r.broken.length) fails.push(`${width}px 깨진 이미지 ${r.broken.length}개: ${r.broken.join(', ')}`);
  if (r.wide.length) fails.push(`${width}px 가로를 넘는 요소: ${r.wide.join(' / ')}`);
  if (r.seasonSum !== r.seasonFoot) fails.push(`${width}px 시즌 표 합계 불일치: ${r.seasonSum} vs ${r.seasonFoot}`);
  console.log(width, JSON.stringify(r));
  await page.close();
}
await browser.close();
if (fails.length) { console.error('실패:\n' + fails.join('\n')); process.exit(1); }
console.log('레알 마드리드 축쿼드 화면 검수 통과');
