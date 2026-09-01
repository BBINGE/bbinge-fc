import path from 'node:path';
import sharp from 'sharp';

const assetDir = path.resolve('public/images/tactics/football-manager-change');

async function fetchBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

const [managerSource, benchSource, videoSource] = await Promise.all([
  fetchBuffer('https://live.staticflickr.com/3583/3302000320_fa8a78f3ca_o.jpg'),
  fetchBuffer('https://upload.wikimedia.org/wikipedia/commons/4/43/Fussballtrainer-18-09-2005.jpg'),
  fetchBuffer('https://i.ytimg.com/vi/HQjWeYhIne0/maxresdefault.jpg'),
]);

const coverOverlay = Buffer.from(`
<svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#07111c" stop-opacity=".16"/>
      <stop offset=".48" stop-color="#07111c" stop-opacity=".48"/>
      <stop offset="1" stop-color="#07111c" stop-opacity=".96"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset=".56" stop-color="#07111c" stop-opacity="0"/>
      <stop offset="1" stop-color="#07111c" stop-opacity=".84"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#shade)"/>
  <rect width="1200" height="1200" fill="url(#floor)"/>
  <line x1="682" y1="116" x2="1115" y2="116" stroke="#69c8ff" stroke-width="7"/>
  <text x="682" y="92" fill="#69c8ff" font-family="Arial, sans-serif" font-size="18" font-weight="800" letter-spacing="3.4">TACTICS · THE MANAGER EFFECT</text>
  <text x="682" y="248" fill="#ffffff" font-family="Malgun Gothic, Noto Sans KR, sans-serif" font-size="76" font-weight="800" letter-spacing="-4">
    <tspan x="682" dy="0">감독을</tspan>
    <tspan x="682" dy="90">바꾸면</tspan>
    <tspan x="682" dy="90">팀도</tspan>
    <tspan x="682" dy="90">바뀌는가</tspan>
  </text>
  <text x="682" y="675" fill="#dce7ef" font-family="Malgun Gothic, Noto Sans KR, sans-serif" font-size="27" font-weight="600" letter-spacing="-1">전술보다 먼저 움직이는 것</text>
  <text x="682" y="1087" fill="#ffffff" font-family="Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="3">BBINGE FC · FOOTBALL TACTICS</text>
</svg>`);

const base = sharp(managerSource)
  .extract({ left: 520, top: 0, width: 2448, height: 2448 })
  .resize(1200, 1200, { fit: 'cover' })
  .modulate({ saturation: 0.72, brightness: 0.82 })
  .sharpen();

const cover = await base.clone().composite([{ input: coverOverlay }]).webp({ quality: 90 }).toBuffer();
await sharp(cover).toFile(path.join(assetDir, 'cover.webp'));
await sharp(cover).resize(1000, 1000).webp({ quality: 88 }).toFile(path.join(assetDir, 'card.webp'));

await sharp(benchSource)
  .resize(1500, 774, { fit: 'cover', position: 'centre' })
  .webp({ quality: 86 })
  .toFile(path.join(assetDir, 'two-coaching-staffs.webp'));

await sharp(videoSource)
  .resize(1280, 720, { fit: 'cover', position: 'centre' })
  .webp({ quality: 86 })
  .toFile(path.join(assetDir, 'new-manager-bounce-video.webp'));
