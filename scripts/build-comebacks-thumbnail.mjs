import { chromium } from 'playwright';
import sharp from 'sharp';

// 팝업관 「유럽 대항전 역전극 모음.Zip」 공유 썸네일(1200×630)과 목록 카드(1080×1080). 미리보기 서버의 Pretendard로 Chrome에서 그린다.
// 실행: 빌드 후 QA_BASE=http://localhost:4323 node scripts/qa-with-chrome.mjs ./build-comebacks-thumbnail.mjs
const base = process.env.QA_BASE || 'http://localhost:4321';
const total = Number(process.env.COMEBACK_TOTAL || 58);
const browser = await chromium.launch();
const draw = async (width, height, out, square) => {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(`${base}/popup/`, { waitUntil: 'networkidle' });
  await page.evaluate(({ total, square }) => {
    const x = (m) => (m / 94) * 100;
    document.head.insertAdjacentHTML('beforeend', `<style>
      html,body{margin:0;background:#0a1628}
      .t{position:fixed;inset:0;overflow:hidden;font-family:"Pretendard Variable",Pretendard,sans-serif;color:#fff;background:radial-gradient(110% 120% at 100% 0%,#2a64d8 0%,#16335e 34%,#0d1f3c 62%,#0a1628 100%)}
      .t:before{content:"";position:absolute;right:-120px;top:-120px;width:560px;height:560px;border-radius:50%;border:2px solid rgba(255,255,255,.1);box-shadow:0 0 0 70px rgba(255,255,255,.03)}
      .eb{position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:14px;font-size:22px;font-weight:800;letter-spacing:.12em;color:rgba(255,255,255,.78)}
      .eb b{display:inline-grid;place-items:center;min-width:64px;height:38px;border-radius:999px;background:#3182f6;color:#fff;letter-spacing:.04em}
      .h{position:absolute;left:72px;top:${square ? 170 : 128}px;margin:0;font-size:${square ? 100 : 96}px;line-height:1.02;font-weight:900;letter-spacing:-.06em}
      .s{position:absolute;left:76px;top:${square ? 400 : 342}px;font-size:${square ? 40 : 34}px;font-weight:750;letter-spacing:-.04em;color:rgba(255,255,255,.86)}
      .n{position:absolute;left:70px;bottom:${square ? 250 : 44}px;display:flex;align-items:baseline;gap:14px}
      .n strong{font-size:${square ? 250 : 160}px;line-height:.8;font-weight:900;letter-spacing:-.06em}
      .n span{font-size:${square ? 56 : 44}px;font-weight:800;color:#78dcff}
      .c{position:absolute;display:grid;place-items:center;border-radius:36px;background:#fff;box-shadow:0 18px 50px rgba(0,0,0,.35)}
      .c img{width:74%;height:74%;object-fit:contain}
      .c1{right:${square ? 72 : 300}px;top:${square ? 70 : 130}px;width:${square ? 180 : 190}px;height:${square ? 180 : 190}px}
      .c2{right:${square ? 72 : 84}px;top:${square ? 270 : 130}px;width:${square ? 180 : 190}px;height:${square ? 180 : 190}px}
      .c small{position:absolute;bottom:-40px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:22px;font-weight:800;color:rgba(255,255,255,.85)}
      .tl{position:absolute;${square ? 'left:72px;right:72px;bottom:96px' : 'right:84px;bottom:84px;width:470px'};height:84px}
      .tl .shade{position:absolute;left:0;top:44px;height:40px;width:${x(79)}%;border-radius:4px;background:repeating-linear-gradient(135deg,rgba(0,0,0,.55) 0 8px,rgba(0,0,0,.4) 8px 16px)}
      .tl .line{position:absolute;left:0;right:0;top:62px;height:4px;background:rgba(255,255,255,.3)}
      .tl i{position:absolute;top:44px;width:12px;height:40px;margin-left:-6px;border-radius:3px;background:#fff;box-shadow:0 0 18px rgba(255,255,255,.5)}
      .tl u{position:absolute;top:56px;width:16px;height:16px;margin-left:-8px;border:3px solid #c7dcff;border-radius:50%;text-decoration:none}
      .tl .bang{position:absolute;top:0;transform:translateX(-50%);font-size:32px;font-weight:900;color:#78dcff;letter-spacing:-.04em}
    </style>`);
    // 안필드 2018-19 4강 2차전: 1차전 0-3을 안고 7·54·56·79분 네 골로 뒤집었다.
    const marks = [7, 54, 56, 79].map((m) => `<i style="left:${x(m)}%"></i>`).join('');
    document.body.innerHTML = `<div class="t"><p class="eb"><b>01F</b>POP-UP STORE · BBINGE FC</p><h1 class="h">유럽 대항전<br>역전극 모음</h1><p class="s">이스탄불의 기적부터 안필드까지</p><div class="n"><strong>${total}</strong><span>경기 ㄷㄷ</span></div>${square ? '' : ''}<div class="c c1"><img src="/images/popup/comebacks/crests/uefa-7889.webp" alt=""></div><div class="c c2"><img src="/images/popup/comebacks/crests/uefa-50080.webp" alt=""></div><div class="tl"><span class="shade"></span><span class="line"></span>${marks}<span class="bang" style="left:${x(56)}%;color:#fff;font-size:24px">동점</span><span class="bang" style="left:${x(79)}%">역전</span></div></div>`;
  }, { total, square });
  await page.waitForTimeout(800);
  await sharp(await page.screenshot({ type: 'png' })).webp({ quality: 88 }).toFile(out);
  await page.close();
};
await draw(1200, 630, 'public/images/popup/comebacks/og.webp', false);
await draw(1080, 1080, 'public/images/popup/comebacks/card.webp', true);
await browser.close();
console.log('역전극 썸네일 완료');
