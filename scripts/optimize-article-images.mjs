import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import sharp from 'sharp';

// 글·아카이브 페이지의 첫 이미지 두 장(표지와 그 바로 아래 큰 사진·도판)에 폭별 WebP 후보를 붙인다.
// 원본 파일은 그대로 두고 빌드 결과(dist)에만 전송용 사본을 만든다. 메인은 optimize-home-images.mjs가 맡는다.
// 원본 폭의 WebP도 후보에 넣는다. 고밀도 화면이 가장 큰 후보를 고를 때 무거운 PNG·JPG 원본으로 돌아가지 않게 하기 위해서다.
const root = process.cwd();
const distRoot = join(root, 'dist');
const outputRoot = join(distRoot, '_article-images');
const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const widths = [480, 800, 1200];
const minimumSourceBytes = 96 * 1024;
const imagesPerPage = 2;
const sizes = '(max-width: 1100px) 100vw, 1100px';

if (!existsSync(join(distRoot, 'index.html'))) {
  throw new Error('dist/index.html이 없습니다. Astro 빌드 뒤 실행하세요.');
}

async function htmlFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('_')) continue;
      found.push(...await htmlFiles(path));
    } else if (entry.name === 'index.html' && dir !== distRoot) {
      found.push(path);
    }
  }
  return found;
}

await mkdir(outputRoot, { recursive: true });
const generated = new Map();
let pagesChanged = 0;

async function variantsFor(sourcePathname) {
  if (generated.has(sourcePathname)) return generated.get(sourcePathname);
  const sourcePath = join(distRoot, sourcePathname.replace(/^\//, ''));
  let variants = [];
  if (existsSync(sourcePath) && (await stat(sourcePath)).size >= minimumSourceBytes) {
    const { width: sourceWidth } = await sharp(sourcePath).metadata();
    if (sourceWidth) {
      const basename = createHash('sha1').update(sourcePathname).digest('hex').slice(0, 12);
      const targets = [...widths.filter((width) => width < sourceWidth), sourceWidth];
      for (const width of targets) {
        const filename = `${basename}-${width}.webp`;
        await sharp(sourcePath)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 80, effort: 4 })
          .toFile(join(outputRoot, filename));
        variants.push({ width, url: `/_article-images/${filename}` });
      }
      // 원본 폭 사본이 원본보다 크면(이미 잘 압축된 WebP) 그 후보는 빼고 원본을 쓴다.
      const full = variants.at(-1);
      const fullPath = join(distRoot, full.url.replace(/^\//, ''));
      if ((await stat(fullPath)).size >= (await stat(sourcePath)).size) {
        await rm(fullPath);
        variants = [...variants.slice(0, -1), { width: sourceWidth, url: sourcePathname }];
      }
    }
  }
  generated.set(sourcePathname, variants);
  return variants;
}

for (const file of await htmlFiles(distRoot)) {
  let html = await readFile(file, 'utf8');
  const mainStart = html.indexOf('<main');
  if (mainStart < 0) continue;
  const tags = [...html.slice(mainStart).matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].slice(0, imagesPerPage);
  let changed = false;
  for (const [tag, rawSource] of tags) {
    if (!rawSource.startsWith('/') || tag.includes(' srcset=')) continue;
    const sourcePathname = rawSource.split(/[?#]/, 1)[0];
    if (!supportedExtensions.has(extname(sourcePathname).toLowerCase())) continue;
    const variants = await variantsFor(sourcePathname);
    if (variants.length < 2) continue;
    const srcset = variants.map(({ width, url }) => `${url} ${width}w`).join(', ');
    let optimized = tag.replace(` src="${rawSource}"`, ` src="${rawSource}" srcset="${srcset}"`);
    if (!optimized.includes(' sizes=')) optimized = optimized.replace(/\s*\/?>$/, ` sizes="${sizes}">`);
    html = html.replace(tag, optimized);
    changed = true;
  }
  if (changed) {
    await writeFile(file, html, 'utf8');
    pagesChanged += 1;
  }
}

const sources = [...generated.entries()].filter(([, variants]) => variants.length >= 2);
const sourceBytes = await Promise.all(sources.map(async ([pathname]) => (await stat(join(distRoot, pathname.replace(/^\//, '')))).size));
const largestBytes = await Promise.all(sources.map(async ([, variants]) => (await stat(join(distRoot, variants.at(-1).url.replace(/^\//, '')))).size));
console.log(`글 이미지 최적화 완료: ${pagesChanged}개 페이지, ${sources.length}개 원본`);
console.log(`원본 합계 ${Math.round(sourceBytes.reduce((a, b) => a + b, 0) / 1024)}KB · 원본 폭 WebP 합계 ${Math.round(largestBytes.reduce((a, b) => a + b, 0) / 1024)}KB`);
