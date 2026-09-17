import { chromium } from 'playwright';
// 팝업관 「유럽 해외축구 빅클럽간 맞대결 역대전적 모음」: 380/1440에서 가로 넘침, 깨진 문장,
// 카드·표 개수, 연대 막대의 점 수가 상대전적(승+무+패)과 맞는지 확인한다.
const base = process.env.QA_BASE || 'http://localhost:4321';
const browser = await chromium.launch();
const fails = [];
for (const width of [380, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(`${base}/popup/big-club-rivalries/`, { waitUntil: 'networkidle' });
  const r = await page.evaluate(async () => {
    document.querySelectorAll('details.dg-more').forEach((d) => { d.open = true; });
    for (const img of document.querySelectorAll('img')) { img.loading = 'eager'; }
    window.scrollTo(0, document.body.scrollHeight); await new Promise((ok) => setTimeout(ok, 1500)); window.scrollTo(0, 0);
    const cards = [...document.querySelectorAll('.rv-card')];
    // 연대 막대 읽는 법(운영자 재지시, 2026-09-17): 흰 점은 그 경기에서 지지 않았다는 뜻이다.
    // 이긴 팀 줄에 점 하나, 무승부는 양쪽 줄에 하나씩. 그래서 위 줄은 A승+무, 아래 줄은 B승+무,
    // 전체는 경기 수 + 무승부 수가 된다. 두 팀의 점 색이 다르면 승패를 구분할 수 없으므로 같아야 한다.
    const badEra = cards.filter((c) => {
      const [aw, dr, bw] = [...c.querySelectorAll('.dg-score strong b')].map((b) => Number(b.textContent));
      const hits = [...c.querySelectorAll('.rv-era__hit')];
      const top = hits.filter((h) => h.classList.contains('is-a')).length;
      const bottom = hits.filter((h) => h.classList.contains('is-b')).length;
      const shades = new Set(hits.map((h) => `${getComputedStyle(h).backgroundColor}|${getComputedStyle(h).opacity}`));
      return top !== aw + dr || bottom !== bw + dr || hits.length !== aw + dr + bw + dr || shades.size > 1;
    }).map((c) => c.querySelector('.dg-card__stage').textContent);
    // 승패 차와 득실 차가 규칙을 지키는지 화면에서 다시 검산한다.
    const badRule = cards.filter((c) => {
      const [aw, dr, bw] = [...c.querySelectorAll('.dg-score strong b')].map((b) => Number(b.textContent));
      const goals = c.querySelector('.rv-facts b').textContent.split(':').map((n) => Number(n.trim()));
      const n = aw + dr + bw;
      return Math.abs(aw - bw) > 1 || Math.abs(goals[0] - goals[1]) >= n || n < 8;
    }).map((c) => c.querySelector('.dg-card__stage').textContent);
    return {
      overflow: document.documentElement.scrollWidth - innerWidth,
      broken: [...document.querySelectorAll('img')].filter((i) => i.complete && !i.naturalWidth).map((i) => i.getAttribute('src')),
      cards: cards.length,
      tableRows: document.querySelectorAll('.rv-more tbody tr').length,
      eraHits: document.querySelectorAll('.rv-era__hit').length,
      badEra,
      badRule,
      h1: document.querySelector('h1').textContent,
      cardOverflow: cards.filter((c) => c.scrollWidth > c.clientWidth + 1).length,
    };
  });
  console.log(width, JSON.stringify(r));
  if (r.overflow > 0 || r.broken.length || r.badEra.length || r.badRule.length || r.cardOverflow) fails.push(`${width} ${JSON.stringify(r)}`);
  await page.close();
}
await browser.close();
if (fails.length) { console.error('박빙 상대전적 QA 실패'); for (const f of fails) console.error(`- ${f}`); process.exit(1); }
console.log('박빙 상대전적 QA 통과');
