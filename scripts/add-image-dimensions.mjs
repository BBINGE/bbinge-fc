// 원고의 <img>에 실제 파일 크기를 width/height로 넣는다. 레이아웃이 밀리는 것(CLS)을 막는다.
// 속성만 더하고 문장·구조는 건드리지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const dirs = ['src/content/articles', 'src/content/archive', 'src/content/popup'];
const files = [];
for (const d of dirs) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) if (f.endsWith('.md')) files.push(path.join(d, f));
}

const dimCache = new Map();
async function dims(src) {
  if (dimCache.has(src)) return dimCache.get(src);
  const clean = src.split('?')[0].split('#')[0];
  if (!clean.startsWith('/images/')) return null;
  const p = 'public' + decodeURIComponent(clean);
  if (!fs.existsSync(p)) { dimCache.set(src, null); return null; }
  try {
    const m = await sharp(fs.readFileSync(p)).metadata();
    const v = m.width && m.height ? { w: m.width, h: m.height } : null;
    dimCache.set(src, v);
    return v;
  } catch { dimCache.set(src, null); return null; }
}

let patched = 0, skipped = [], touched = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const tags = [...src.matchAll(/<img\b[^>]*>/g)];
  let next = src;
  let fileHits = 0;
  for (const m of tags) {
    const tag = m[0];
    if (/\swidth\s*=/.test(tag) && /\sheight\s*=/.test(tag)) continue;
    const s = (tag.match(/\ssrc="([^"]+)"/) || [])[1];
    if (!s) continue;
    const d = await dims(s);
    if (!d) { skipped.push(path.basename(file) + '  ' + s); continue; }
    // src 속성 바로 뒤에 넣어 읽기 좋게 둔다. 이미 한쪽만 있는 경우는 없는 쪽만 채운다.
    let out = tag;
    if (!/\swidth\s*=/.test(out)) out = out.replace(/(\ssrc="[^"]+")/, `$1 width="${d.w}"`);
    if (!/\sheight\s*=/.test(out)) out = out.replace(/(\swidth="\d+")/, `$1 height="${d.h}"`);
    if (out === tag) continue;
    next = next.replace(tag, out);
    patched += 1;
    fileHits += 1;
  }
  if (fileHits) { fs.writeFileSync(file, next); touched += 1; }
}

console.log(`원고 ${touched}개 파일에서 img ${patched}개에 크기를 넣었다`);
if (skipped.length) {
  console.log(`크기를 못 읽어 건너뛴 것 ${skipped.length}개`);
  [...new Set(skipped)].slice(0, 12).forEach((s) => console.log('   ' + s));
}
