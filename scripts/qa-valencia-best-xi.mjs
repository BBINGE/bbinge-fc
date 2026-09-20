import { chromium } from 'playwright';
// 축쿼드 「발렌시아 CF 역대 베스트 11」: 380/1440에서 가로 넘침·깨진 이미지와 클립 다섯 개,
// 선수별 블록이 한 종류로 반복되지 않는지 확인한다(켐페스 열거 블록, 페르난도 기록 칸,
// 카니사레스 두 칸 클립). 규칙은 SQUAD_ARCHIVE_RULES.md 4-3.
const base = process.env.QA_BASE || 'http://localhost:4321';
const shotDir = process.env.QA_SHOTS || '';
const browser = await chromium.launch();
const fails = [];
for (const width of [380, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(`${base}/squads/custom-best-xi/valencia-cf-all-time-best-xi/`, { waitUntil: 'networkidle' });
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
      players: document.querySelectorAll('.valencia-player-art').length,
      clips: document.querySelectorAll('video.highlight-clip').length,
      litany: document.querySelectorAll('.valencia-litany').length,
      record: document.querySelectorAll('.valencia-record > div').length,
      quotes: document.querySelectorAll('.valencia-quote').length,
      candidates: document.querySelectorAll('.valencia-candidate-list li').length,
      crest: [...document.querySelectorAll('img')].filter((i) => (i.getAttribute('src') || '').includes('valencia.svg')).length,
      cites: document.querySelectorAll('a.cite').length,
      sources: document.querySelectorAll('.source-notes li').length,
      noteGap: (() => { const n = document.querySelector('p.valencia-note'); if (!n) return null; const p = n.previousElementSibling; return Math.round(n.getBoundingClientRect().top - p.getBoundingClientRect().bottom); })(),
    };
  });
  if (shotDir) await page.screenshot({ path: `${shotDir}/valencia-${width}.png` });
  const want = { overflow: 0, players: 11, clips: 5, litany: 1, record: 4, quotes: 5, candidates: 15, crest: 2 };
  for (const [k, v] of Object.entries(want)) if (r[k] !== v) fails.push(`${width}px ${k}: ${r[k]} (기대 ${v})`);
  // 정정 주석이 음수 여백으로 위 블록을 파고들지 않는지 본다(2026-09-21 사고).
  if (r.noteGap !== null && r.noteGap < 8) fails.push(`${width}px 정정 주석이 위 블록과 ${r.noteGap}px로 겹치거나 붙는다`);
  if (r.broken.length) fails.push(`${width}px 깨진 이미지 ${r.broken.length}개: ${r.broken.join(', ')}`);
  if (r.wide.length) fails.push(`${width}px 가로를 넘는 요소: ${r.wide.join(' / ')}`);
  console.log(width, JSON.stringify(r));
  await page.close();
}
await browser.close();
if (fails.length) { console.error('실패:\n' + fails.join('\n')); process.exit(1); }
console.log('발렌시아 축쿼드 화면 검수 통과');
