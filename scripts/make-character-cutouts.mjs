// 캐릭터 렌더의 흰 배경을 지워 투명 PNG로 만든다. 해상도와 3D 음영은 원본 그대로 둔다.
// 사용: node scripts/make-character-cutouts.mjs [파일명...]  (기본값은 아래 FILES)
// 몸통이 아이보리라 밝기만으로 자르면 몸이 파인다. 그래서 테두리에서 시작하는 채우기로
// 바깥과 이어진 밝은 영역만 배경으로 보고, 경계는 밝기에 따라 알파를 깎아 계단을 없앤다.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public/images/brand/character');
// 바닥 그림자까지 지울 파일(사진 배경 위에 세우는 정면 컷)
const SHADOWLESS = new Set(['bbingji-front', 'bbingmaeng-front']);
const FILES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['bbingji-front', 'bbingmaeng-front', 'bbingji-ball', 'bbingmaeng-sweat', 'bbingji-face', 'bbingmaeng-face'];

// 배경은 중성 흰색(254,254,254)이고 몸통은 따뜻한 아이보리다(예: 252,246,241).
// 그래서 밝기만 보지 않고 "밝고 색기 없는" 화소만 배경으로 본다. 머리 위 하이라이트는 붉은기가 있어 살아남는다.
const isBg = (r, g, b) => Math.min(r, g, b) >= 249 && Math.max(r, g, b) - Math.min(r, g, b) <= 4;

for (const name of FILES) {
  const src = join(dir, `${name}.webp`);
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;

  // 테두리에서 시작해 바깥과 이어진 배경만 칠한다. 후드티의 흰 글자처럼 안쪽에 갇힌 흰색은 남는다.
  const outside = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop();
    if (outside[i]) continue;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    if (!isBg(r, g, b)) continue;
    outside[i] = 1;
    const x = i % W, y = (i - x) / W;
    if (x > 0) stack.push(i - 1);
    if (x < W - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - W);
    if (y < H - 1) stack.push(i + W);
  }

  // 바깥은 완전히 지운다. 반투명하게 남기면 흰 안개가 낀다.
  for (let i = 0; i < W * H; i++) if (outside[i]) data[i * 4 + 3] = 0;

  // 경계 한 겹만 흰색이 섞여 있다. 흰색에서 얼마나 멀어졌는지로 알파를 깎아 계단을 없앤다.
  for (let i = 0; i < W * H; i++) {
    if (outside[i]) continue;
    const x = i % W, y = (i - x) / W;
    const touching = (x > 0 && outside[i - 1]) || (x < W - 1 && outside[i + 1]) || (y > 0 && outside[i - W]) || (y < H - 1 && outside[i + W]);
    if (!touching) continue;
    const minc = Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    data[i * 4 + 3] = Math.round(255 * Math.min(1, Math.max(0, (250 - minc) / 6)));
  }

  // 사진 배경 위에 세우는 정면 컷은 바닥 그림자를 지운다.
  // ① 테두리에서 한 번 더 채운다. 이번에는 조금 느슨한 기준(아주 밝고 색기가 거의 없음)이라
  //    바깥으로 이어진 옅은 그림자 자락까지 지워진다. 머리 하이라이트는 붉은기(색기 11)가 있어 남는다.
  // ② 그래도 발밑에 남는 그림자 덩어리는, 열마다 몸이 끝나는 줄을 찾아 그 아래를 지운다.
  // 몸 안쪽을 건드리는 규칙은 쓰지 않는다. 손등과 다리 하이라이트가 파였던 적이 있다(2026-09-23).
  if (SHADOWLESS.has(name)) {
    const isFaint = (i) => {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      const minc = Math.min(r, g, b);
      return minc >= 243 && Math.max(r, g, b) - minc <= 8;
    };
    const seen = new Uint8Array(W * H);
    const stack = [];
    for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); }
    for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
    while (stack.length) {
      const i = stack.pop();
      if (seen[i] || !isFaint(i)) continue;
      seen[i] = 1;
      data[i * 4 + 3] = 0;
      const x = i % W, y = (i - x) / W;
      if (x > 0) stack.push(i - 1);
      if (x < W - 1) stack.push(i + 1);
      if (y > 0) stack.push(i - W);
      if (y < H - 1) stack.push(i + W);
    }

    const zone = Math.floor(H * 0.88);
    for (let x = 0; x < W; x++) {
      let bodyBottom = -1;
      for (let y = H - 1; y >= zone; y--) {
        const i = y * W + x;
        if (data[i * 4 + 3] < 40) continue;
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        if (Math.max(r, g, b) - Math.min(r, g, b) > 20) { bodyBottom = y; break; }
      }
      for (let y = Math.max(zone, bodyBottom + 1); y < H; y++) data[(y * W + x) * 4 + 3] = 0;
    }
  }

  // ③ 다리 사이에 낀 흰 쐐기. 발밑을 비운 뒤 그 빈 곳에서 위로 번져 올라가며 지운다.
  //    번지는 조건은 "밝고 색기 없음"이라 따뜻한 다리에서 멈추고, 검은 후드티(어둡다)를 통과하지 못해
  //    가슴 로고까지 올라가지 않는다.
  if (SHADOWLESS.has(name)) {
    const zone = Math.floor(H * 0.86);
    const seen = new Uint8Array(W * H);
    const stack = [];
    for (let y = zone; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (data[i * 4 + 3] === 0 && !seen[i]) { seen[i] = 1; stack.push(i); }
      }
    }
    while (stack.length) {
      const i = stack.pop();
      const x = i % W, y = (i - x) / W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > zone ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j < 0 || seen[j]) continue;
        const r = data[j * 4], g = data[j * 4 + 1], b = data[j * 4 + 2];
        const minc = Math.min(r, g, b);
        if (data[j * 4 + 3] !== 0 && (minc < 200 || Math.max(r, g, b) - minc > 14)) continue;
        seen[j] = 1;
        data[j * 4 + 3] = 0;
        stack.push(j);
      }
    }
  }

  // ④ 다리 사이 쐐기가 발끝에서 막혀 번지기로 닿지 않는 경우가 있다(삥지).
  //    아래 12%에는 다리와 발만 있으므로, 이 구간에서는 밝은 무채색을 연결과 무관하게 지운다.
  //    다리는 따뜻해서(색기 20 이상) 남는다. 이 규칙을 더 위로 올리면 손등과 로고가 파인다.
  if (SHADOWLESS.has(name)) {
    for (let y = Math.floor(H * 0.88); y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (data[i * 4 + 3] === 0) continue;
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        const minc = Math.min(r, g, b);
        if (minc >= 215 && Math.max(r, g, b) - minc <= 12) data[i * 4 + 3] = 0;
      }
    }
  }

  const out = join(dir, `${name}.png`);
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toFile(out);
  console.log(`${name}.png ${W}x${H}`);
}
