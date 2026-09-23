// 캐릭터 렌더의 흰 배경을 지워 투명 PNG로 만든다. 해상도와 3D 음영은 원본 그대로 둔다.
// 사용: node scripts/make-character-cutouts.mjs [파일명...]  (기본값은 아래 FILES)
// 몸통이 아이보리라 밝기만으로 자르면 몸이 파인다. 그래서 테두리에서 시작하는 채우기로
// 바깥과 이어진 밝은 영역만 배경으로 보고, 경계는 밝기에 따라 알파를 깎아 계단을 없앤다.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public/images/brand/character');
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

  const out = join(dir, `${name}.png`);
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toFile(out);
  console.log(`${name}.png ${W}x${H}`);
}
