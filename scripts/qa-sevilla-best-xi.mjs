import { chromium } from 'playwright';
// 축쿼드 「세비야 FC 역대 베스트 11」: 380/1440에서 가로 넘침·깨진 이미지와 클립 다섯 개,
// 선수별 블록이 한 종류로 반복되지 않는지 확인한다(캄파날 두 사람의 계보 칸, 히메네스 기록 칸,
// 나바스 대회별 출전 표, 기예르모 캄파날 열거 블록). 규칙은 SQUAD_ARCHIVE_RULES.md 4-3.
// 나바스 표의 합계 줄이 대회별 출전을 더한 값과 같은지도 더해 본다.
const base = process.env.QA_BASE || 'http://localhost:4321';
const shotDir = process.env.QA_SHOTS || '';
const browser = await chromium.launch();
const fails = [];
for (const width of [380, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(`${base}/squads/custom-best-xi/sevilla-fc-all-time-best-xi/`, { waitUntil: 'networkidle' });
  const r = await page.evaluate(async () => {
    for (const img of document.querySelectorAll('img')) img.loading = 'eager';
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((ok) => setTimeout(ok, 1200));
    window.scrollTo(0, 0);
    const wide = [...document.querySelectorAll('.article-body *')]
      .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
      .map((el) => el.className || el.tagName);
    const ledger = document.querySelector('.sevilla-ledger');
    const rows = ledger ? [...ledger.querySelectorAll('tbody td')].map((td) => Number(td.textContent)) : [];
    const total = ledger ? Number(ledger.querySelector('tfoot td')?.textContent) : null;
    const notes = [...document.querySelectorAll('p.sevilla-note')].map((n) => {
      const p = n.previousElementSibling;
      return Math.round(n.getBoundingClientRect().top - p.getBoundingClientRect().bottom);
    });
    return {
      overflow: document.documentElement.scrollWidth - innerWidth,
      wide: [...new Set(wide)].slice(0, 6),
      broken: [...document.querySelectorAll('img')].filter((i) => i.complete && !i.naturalWidth).map((i) => i.getAttribute('src')),
      players: document.querySelectorAll('.sevilla-player-art').length,
      clips: document.querySelectorAll('video.highlight-clip').length,
      lineage: document.querySelectorAll('.sevilla-lineage > div').length,
      record: document.querySelectorAll('.sevilla-record > div').length,
      litany: document.querySelectorAll('.sevilla-litany').length,
      quotes: document.querySelectorAll('.sevilla-quote').length,
      notes: notes.length,
      candidates: document.querySelectorAll('.sevilla-candidate-list li').length,
      ledgerSum: rows.reduce((a, b) => a + b, 0),
      ledgerTotal: total,
      cites: [...document.querySelectorAll('a.cite')].filter((a) => !document.querySelector(a.getAttribute('href'))).length,
      sources: document.querySelectorAll('.source-notes li').length,
      minNoteGap: notes.length ? Math.min(...notes) : null,
    };
  });
  if (shotDir) await page.screenshot({ path: `${shotDir}/sevilla-${width}.png` });
  const want = { overflow: 0, players: 11, clips: 5, lineage: 2, record: 4, litany: 1, quotes: 2, notes: 3, candidates: 15, ledgerTotal: 705, cites: 0, sources: 16 };
  for (const [k, v] of Object.entries(want)) if (r[k] !== v) fails.push(`${width}px ${k}: ${r[k]} (기대 ${v})`);
  if (r.ledgerSum !== r.ledgerTotal) fails.push(`${width}px 나바스 표 합계가 맞지 않는다: 더한 값 ${r.ledgerSum}, 합계 줄 ${r.ledgerTotal}`);
  if (r.minNoteGap !== null && r.minNoteGap < 8) fails.push(`${width}px 정정 주석이 위 블록과 ${r.minNoteGap}px로 겹치거나 붙는다`);
  if (r.broken.length) fails.push(`${width}px 깨진 이미지 ${r.broken.length}개: ${r.broken.join(', ')}`);
  if (r.wide.length) fails.push(`${width}px 가로를 넘는 요소: ${r.wide.join(' / ')}`);
  console.log(width, JSON.stringify(r));
  await page.close();
}
await browser.close();
if (fails.length) { console.error('실패:\n' + fails.join('\n')); process.exit(1); }
console.log('세비야 축쿼드 화면 검수 통과');
