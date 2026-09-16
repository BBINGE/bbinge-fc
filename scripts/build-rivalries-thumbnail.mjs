import { chromium } from 'playwright';
import sharp from 'sharp';

// 팝업관 「유럽 해외축구 빅클럽간 맞대결 역대전적 모음」 공유 썸네일(1200×630)과 목록 카드(1080×1080).
// 미리보기 서버의 Pretendard로 Chrome에서 그린다. 운영자가 썸네일을 만들면 교체한다.
// 실행: 빌드 후 QA_BASE=http://localhost:4323 node scripts/qa-with-chrome.mjs ./build-rivalries-thumbnail.mjs
const base = process.env.QA_BASE || 'http://localhost:4321';
const browser = await chromium.launch();

const draw = async (width, height, out, square) => {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(`${base}/popup/big-club-rivalries/`, { waitUntil: 'networkidle' });
  const data = await page.evaluate(() => {
    const card = document.querySelector('.rv-card');
    return {
      crests: [...card.querySelectorAll('.dg-crest img')].map((i) => i.getAttribute('src')),
      names: [...card.querySelectorAll('.dg-side strong')].map((s) => s.textContent),
      record: [...card.querySelectorAll('.dg-score strong b')].map((b) => b.textContent),
      total: document.querySelector('.dg-hero__counts b').textContent,
      dots: [...card.querySelectorAll('.rv-era__hit')].map((h) => ({
        x: parseFloat(h.style.getPropertyValue('--x')),
        r: h.classList.contains('is-a') ? 'a' : h.classList.contains('is-b') ? 'b' : 'd',
      })),
    };
  });
  await page.evaluate(({ d, square }) => {
    document.head.insertAdjacentHTML('beforeend', `<style>
      html,body{margin:0;background:#0a0f18}
      .t{position:fixed;inset:0;overflow:hidden;font-family:"Pretendard Variable",Pretendard,sans-serif;color:#fff;background:radial-gradient(120% 130% at 0% 0%,#1d3d6e 0%,#12233f 38%,#0d1524 66%,#0a0f18 100%)}
      .eb{position:absolute;left:70px;top:60px;display:flex;align-items:center;gap:14px;font-size:21px;font-weight:800;letter-spacing:.12em;color:rgba(255,255,255,.76)}
      .eb b{display:inline-grid;place-items:center;min-width:62px;height:36px;border-radius:999px;background:#3182f6;letter-spacing:.04em}
      .h{position:absolute;left:70px;top:${square ? 152 : 122}px;right:70px;margin:0;font-size:${square ? 72 : 60}px;line-height:1.08;font-weight:900;letter-spacing:-.055em}
      .h em{font-style:normal;color:#78dcff}
      .n{position:absolute;left:70px;top:${square ? 400 : 268}px;display:flex;align-items:baseline;gap:16px}
      .n strong{font-size:${square ? 220 : 128}px;line-height:.8;font-weight:900;letter-spacing:-.06em}
      .n span{font-size:${square ? 52 : 42}px;font-weight:800;color:#78dcff}
      .vs{position:absolute;left:70px;bottom:${square ? 250 : 112}px;display:flex;align-items:center;gap:${square ? 26 : 22}px}
      .vs .c{display:grid;place-items:center;width:${square ? 132 : 96}px;height:${square ? 132 : 96}px;border-radius:28px;background:#fff;box-shadow:0 16px 44px rgba(0,0,0,.4)}
      .vs .c img{width:74%;height:74%;object-fit:contain}
      .vs .sc{font-size:${square ? 62 : 50}px;font-weight:900;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
      .vs .sc i{font-style:normal;opacity:.4;margin:0 8px;font-size:.7em}
      .era{position:absolute;left:70px;right:70px;bottom:${square ? 130 : 52}px;height:${square ? 76 : 56}px}
      .era .ax{position:absolute;left:0;right:0;top:50%;height:2px;background:rgba(255,255,255,.16)}
      .era i{position:absolute;width:${square ? 13 : 10}px;height:${square ? 13 : 10}px;margin-left:-${square ? 6.5 : 5}px;border-radius:50%}
      .era i.a{top:${square ? 12 : 8}px;background:#fff}
      .era i.b{bottom:${square ? 12 : 8}px;background:#78dcff}
      .era i.d{top:50%;margin-top:-${square ? 6.5 : 5}px;background:transparent;border:2px solid rgba(255,255,255,.55)}
      .cap{position:absolute;left:70px;bottom:${square ? 86 : 20}px;font-size:${square ? 26 : 21}px;font-weight:700;color:rgba(255,255,255,.62)}
    </style>`);
    document.body.innerHTML = `<div class="t">
      <div class="eb"><b>01F</b> POP-UP STORE</div>
      <h1 class="h">유럽 빅클럽 맞대결<br><em>박빙인 것만</em> 모음</h1>
      <div class="n"><strong>${d.total}</strong><span>대진</span></div>
      <div class="vs">
        <span class="c"><img src="${d.crests[0]}"></span>
        <span class="sc">${d.record[0]}<i>·</i>${d.record[1]}<i>·</i>${d.record[2]}</span>
        <span class="c"><img src="${d.crests[1]}"></span>
      </div>
      <div class="era"><span class="ax"></span>${d.dots.map((p) => `<i class="${p.r}" style="left:${p.x}%"></i>`).join('')}</div>
      <div class="cap">${d.names[0]} 대 ${d.names[1]} · 1976-2026</div>
    </div>`;
  }, { d: data, square });
  await page.waitForTimeout(400);
  const shot = await page.screenshot({ type: 'png' });
  await sharp(shot).webp({ quality: 92 }).toFile(out);
  console.log(`${out} ${width}×${height}`);
  await page.close();
};

await draw(1200, 630, 'public/images/popup/rivalries/og.webp', false);
await draw(1080, 1080, 'public/images/popup/rivalries/card.webp', true);
await browser.close();
