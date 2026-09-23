// 로비 줄에 세우는 작은 삥지·삥맹을 만든다.
// 원본은 운영자가 직접 딴 투명 PNG(bbingji-front.png, bbingmaeng-front.png)이며 손대지 않는다.
// 두 장을 '같은 상자'로 잘라야 바닥선과 키 비율이 맞는다. 상자는 두 알파 경계의 합집합이다.
import sharp from 'sharp';
import path from 'node:path';

const DIR = 'public/images/brand/character';
const SOURCES = [
  ['bbingji-front.png', 'lobby-ji-240.webp'],
  ['bbingmaeng-front.png', 'lobby-maeng-240.webp'],
];
const HEIGHT = 240;

async function bbox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minx = info.width, miny = info.height, maxx = -1, maxy = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + 3] > 12) {
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
        if (y < miny) miny = y;
        if (y > maxy) maxy = y;
      }
    }
  }
  return { minx, miny, maxx, maxy };
}

const boxes = await Promise.all(SOURCES.map(([src]) => bbox(path.join(DIR, src))));
const box = {
  left: Math.min(...boxes.map((b) => b.minx)),
  top: Math.min(...boxes.map((b) => b.miny)),
  right: Math.max(...boxes.map((b) => b.maxx)),
  bottom: Math.max(...boxes.map((b) => b.maxy)),
};
const width = box.right - box.left + 1;
const height = box.bottom - box.top + 1;

for (const [src, out] of SOURCES) {
  await sharp(path.join(DIR, src))
    .extract({ left: box.left, top: box.top, width, height })
    .resize({ height: HEIGHT })
    .webp({ quality: 88, alphaQuality: 92 })
    .toFile(path.join(DIR, out));
  console.log(`${out}  ${Math.round((width / height) * HEIGHT)}x${HEIGHT}`);
}
