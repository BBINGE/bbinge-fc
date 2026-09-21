import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';

// 빌드 결과(dist)의 모든 HTML·CSS에서 무거운 이미지를 가벼운 WebP 사본으로 바꿔 연결한다(운영자 승인, 2026-09-22).
// 원본 파일(public/images)은 그대로 두고 dist/_img에만 사본을 만든다. 화면 크기·배치는 바뀌지 않는다.
// 1) 작게 보이는 아이콘(width 속성 120px 이하, 40KB 이상): width 속성의 4배 WebP 한 장으로 src를 바꾼다(문장·국기·로고).
//    CSS가 속성보다 조금 크게 보여 주는 칸(팝업관 18px 속성 → 모바일 22px)과 3배 밀도 화면을 함께 덮는 배율이다.
// 사본 파일명에는 원본 이름을 남긴다(real-madrid-1941.<해시>-272.webp). 어떤 원본의 사본인지 화면·검수에서 바로 보이게 하기 위해서다.
// 2) 큰 사진·도판: 원본 해상도 WebP와 폭별 사본을 srcset으로 붙인다. PNG(운영자 도판·글자 많은 편집물)는 품질 90, 나머지는 85.
// 3) CSS 배경 url(): 원본 해상도 WebP 사본으로 바꾼다.
// 메인 카드는 optimize-home-images.mjs가 먼저 srcset을 붙이므로 srcset이 이미 있는 태그는 건너뛴다.
const distRoot = join(process.cwd(), 'dist');
const outputDir = '_img';
const outputRoot = join(distRoot, outputDir);
const rasterExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
const iconMaxWidth = 120;
const iconMinBytes = 40 * 1024;
const photoMinBytes = { '.png': 40 * 1024, '.svg': 40 * 1024, '.jpg': 96 * 1024, '.jpeg': 96 * 1024, '.webp': 96 * 1024 };
const photoWidths = [480, 960];
const maxRasterWidth = 2400;

if (!existsSync(join(distRoot, 'index.html'))) throw new Error('dist/index.html이 없습니다. Astro 빌드 뒤 실행하세요.');

async function walk(dir, predicate) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (path === outputRoot) continue;
      found.push(...await walk(path, predicate));
    } else if (predicate(entry.name)) {
      found.push(path);
    }
  }
  return found;
}

const sourceInfo = new Map();
function info(pathname) {
  if (!sourceInfo.has(pathname)) sourceInfo.set(pathname, readSource(pathname));
  return sourceInfo.get(pathname);
}

async function readSource(pathname) {
  const file = join(distRoot, decodeURI(pathname).replace(/^\//, ''));
  let result = null;
  if (existsSync(file)) {
    const buffer = await readFile(file);
    const ext = extname(pathname).toLowerCase();
    const meta = await sharp(buffer, ext === '.svg' ? { density: 72 } : {}).metadata().catch(() => null);
    if (meta?.width) {
      const stem = basename(decodeURI(pathname), ext).replace(/[^a-z0-9-]+/gi, '-').toLowerCase().slice(0, 60);
      result = { buffer, ext, bytes: buffer.length, width: meta.width, height: meta.height, hash: `${stem}.${createHash('sha1').update(buffer).digest('hex').slice(0, 12)}` };
    }
  }
  return result;
}

const made = new Map();
let madeBytes = 0;
// 같은 사본을 여러 태그가 동시에 요청해도 한 번만 만든다.
function webp(src, width) {
  const key = `${src.hash}-${width}`;
  if (!made.has(key)) made.set(key, encode(src, width, key));
  return made.get(key);
}

async function encode(src, width, key) {
  const url = `/${outputDir}/${key}.webp`;
  const input = src.ext === '.svg'
    ? sharp(src.buffer, { density: Math.min(2400, Math.ceil(72 * width / src.width)) })
    : sharp(src.buffer);
  const out = await input
    .resize({ width, withoutEnlargement: src.ext !== '.svg' })
    .webp({ quality: src.ext === '.png' || src.ext === '.svg' ? 90 : 85, effort: 4 })
    .toBuffer();
  await writeFile(join(outputRoot, `${key}.webp`), out);
  madeBytes += out.length;
  return { url, bytes: out.length, width };
}

await mkdir(outputRoot, { recursive: true });
const stats = { icons: 0, photos: 0, backgrounds: 0, files: 0 };

async function rewriteImgTag(tag) {
  const src = tag.match(/\ssrc="(\/[^"?#]+)"/)?.[1];
  if (!src || tag.includes(' srcset=')) return tag;
  const ext = extname(src).toLowerCase();
  if (!rasterExtensions.has(ext)) return tag;
  const source = await info(src);
  if (!source) return tag;
  const shown = Number(tag.match(/\swidth="(\d+)"/)?.[1] || 0);

  if (shown && shown <= iconMaxWidth) {
    if (source.bytes < iconMinBytes) return tag;
    const target = Math.min(shown * 4, ext === '.svg' ? shown * 4 : source.width);
    const copy = await webp(source, target);
    if (copy.bytes >= source.bytes) return tag;
    stats.icons += 1;
    return tag.replace(` src="${src}"`, ` src="${copy.url}"`);
  }

  if (source.bytes < photoMinBytes[ext]) return tag;
  const fullWidth = ext === '.svg' ? Math.min(maxRasterWidth, Math.max(shown * 2, 1200)) : Math.min(source.width, maxRasterWidth);
  const full = await webp(source, fullWidth);
  const smaller = [];
  for (const width of photoWidths.filter(w => w < fullWidth)) smaller.push(await webp(source, width));
  const candidates = full.bytes < source.bytes ? [...smaller, full] : [...smaller, { url: src, width: source.width }];
  if (candidates.length < 2 && candidates[0]?.url === src) return tag;
  stats.photos += 1;
  const srcset = candidates.map(c => `${c.url} ${c.width}w`).join(', ');
  // width 속성보다 CSS가 크게 보여 주는 칸이 있어 속성값으로 줄이지 않는다. 모바일은 화면 폭 전체, 그 이상은 1100px로 잡아
  // 어느 칸에서도 필요한 해상도보다 작은 사본이 골리지 않게 한다(흐려짐 방지가 용량보다 우선).
  const sizes = '(max-width: 700px) 100vw, 1100px';
  let next = tag.replace(` src="${src}"`, ` src="${src}" srcset="${srcset}"`);
  if (!next.includes(' sizes=')) next = next.replace(/\s*\/?>$/, ` sizes="${sizes}">`);
  return next;
}

async function rewriteBackgrounds(text) {
  const urls = [...new Set([...text.matchAll(/url\((['"]?)(\/[^'")?#]+\.(?:png|jpe?g|webp|svg))\1\)/gi)].map(m => m[2]))];
  for (const url of urls) {
    const source = await info(url);
    if (!source || source.bytes < iconMinBytes) continue;
    const width = source.ext === '.svg' ? Math.min(maxRasterWidth, Math.max(source.width, 1200)) : Math.min(source.width, maxRasterWidth);
    const copy = await webp(source, width);
    if (copy.bytes >= source.bytes) continue;
    text = text.split(`url(${url})`).join(`url(${copy.url})`)
      .split(`url('${url}')`).join(`url('${copy.url}')`)
      .split(`url("${url}")`).join(`url("${copy.url}")`);
    stats.backgrounds += 1;
  }
  return text;
}

for (const file of await walk(distRoot, name => name.endsWith('.html') || name.endsWith('.css'))) {
  const original = await readFile(file, 'utf8');
  let text = original;
  if (file.endsWith('.html')) {
    const tags = [...new Set([...text.matchAll(/<img\b[^>]*>/g)].map(m => m[0]))];
    const rewritten = await Promise.all(tags.map(rewriteImgTag));
    tags.forEach((tag, i) => { if (rewritten[i] !== tag) text = text.split(tag).join(rewritten[i]); });
  }
  text = await rewriteBackgrounds(text);
  if (text !== original) {
    await writeFile(file, text, 'utf8');
    stats.files += 1;
  }
}

const usedSources = (await Promise.all(sourceInfo.values())).filter(Boolean);
console.log(`사이트 이미지 최적화 완료: ${stats.files}개 파일 · 아이콘 ${stats.icons} · 사진 ${stats.photos} · 배경 ${stats.backgrounds} (태그·선언 기준)`);
console.log(`검토한 원본 ${usedSources.length}개 ${Math.round(usedSources.reduce((a, s) => a + s.bytes, 0) / 1048576)}MB · 만든 WebP ${made.size}개 ${Math.round(madeBytes / 1048576)}MB`);
