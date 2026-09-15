import { chromium } from 'playwright';
import sharp from 'sharp';

// 팝업관 「바이언 둔기론」 공유 썸네일(1200×630)과 팝업관 목록용 정사각 카드(1080×1080). 미리보기 서버에서 Pretendard를 불러와 그린다.
// 실행: 빌드 후 미리보기 서버를 띄우고 QA_BASE=http://localhost:4323 node scripts/qa-with-chrome.mjs ./build-bayern-dungi-thumbnail.mjs
const base = process.env.QA_BASE || 'http://localhost:4321';
const total = Number(process.env.DUNGI_TOTAL || 188);
const browser = await chromium.launch();
const draw = async (width, height, out, square) => {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(`${base}/popup/`, { waitUntil: 'networkidle' });
  await page.evaluate(({ total, square }) => {
    const hits = [51, 52, 55, 57, 60].map((m) => `<i style="left:${(m / 94) * 100}%"></i>`).join('');
    document.head.insertAdjacentHTML('beforeend', `<style>
      html,body{margin:0;background:#0b0d14}
      .t{position:fixed;inset:0;overflow:hidden;font-family:"Pretendard Variable",Pretendard,sans-serif;color:#fff;background:radial-gradient(110% 120% at 100% 0%,#b0061a 0%,#5c0710 34%,#1a0508 64%,#0b0d14 100%)}
      .t:before{content:"";position:absolute;right:-120px;top:-120px;width:560px;height:560px;border-radius:50%;border:2px solid rgba(255,255,255,.1);box-shadow:0 0 0 70px rgba(255,255,255,.03)}
      .eb{position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:14px;font-size:22px;font-weight:800;letter-spacing:.12em;color:rgba(255,255,255,.78)}
      .eb b{display:inline-grid;place-items:center;min-width:64px;height:38px;border-radius:999px;background:#d20515;color:#fff;letter-spacing:.04em}
      .h{position:absolute;left:72px;top:${square ? 170 : 132}px;margin:0;font-size:${square ? 112 : 112}px;line-height:1;font-weight:900;letter-spacing:-.06em}
      .s{position:absolute;left:76px;top:${square ? 312 : 266}px;font-size:${square ? 42 : 38}px;font-weight:750;letter-spacing:-.04em;color:rgba(255,255,255,.86)}
      .n{position:absolute;left:70px;bottom:${square ? 250 : 60}px;display:flex;align-items:baseline;gap:14px}
      .n strong{font-size:${square ? 250 : 190}px;line-height:.8;font-weight:900;letter-spacing:-.06em;font-variant-numeric:tabular-nums}
      .n span{font-size:${square ? 56 : 44}px;font-weight:800;color:#ff9aa2}
      .c{position:absolute;right:${square ? 72 : 80}px;top:${square ? 70 : 150}px;display:grid;place-items:center;width:${square ? 196 : 250}px;height:${square ? 196 : 250}px;border-radius:44px;background:#fff;box-shadow:0 18px 50px rgba(0,0,0,.35)}
      .c img{width:74%;height:74%;object-fit:contain}
      .tl{position:absolute;right:${square ? 72 : 80}px;${square ? 'left:72px;bottom:96px' : 'bottom:80px;width:440px'};height:84px}
      .tl .bang{position:absolute;top:0;left:${(55 / 94) * 100}%;transform:translateX(-50%);font-size:34px;font-weight:900;color:#ff9aa2;letter-spacing:-.04em}
      .tl .line{position:absolute;left:0;right:0;top:62px;height:4px;background:rgba(255,255,255,.3)}
      .tl i{position:absolute;top:44px;width:12px;height:40px;margin-left:-6px;border-radius:3px;background:#fff;box-shadow:0 0 18px rgba(255,255,255,.5)}
      .tl em{position:absolute;top:92px;font-style:normal;font-size:18px;color:rgba(255,255,255,.6)}
    </style>`);
    document.body.innerHTML = `<div class="t"><p class="eb"><b>01F</b>POP-UP STORE · BBINGE FC</p><h1 class="h">바이언 둔기론</h1><p class="s">역대 대승 참사 모음 2010-2026</p><div class="n"><strong>${total}</strong><span>경기 ㄷㄷ</span></div><div class="c"><img src="/images/popup/bayern-dungi/crests/espn-132.webp" alt=""></div><div class="tl"><span class="bang">꽈광</span><span class="line"></span>${hits}<em style="left:0">0'</em><em style="left:47%">45'</em><em style="right:0">90'</em></div></div>`;
  }, { total, square });
  await page.waitForTimeout(800);
  const buf = await page.screenshot({ type: 'png' });
  await sharp(buf).webp({ quality: 88 }).toFile(out);
  await page.close();
};
await draw(1200, 630, 'public/images/popup/bayern-dungi/og.webp', false);
await draw(1080, 1080, 'public/images/popup/bayern-dungi/card.webp', true);
await browser.close();
console.log('썸네일 완료');
