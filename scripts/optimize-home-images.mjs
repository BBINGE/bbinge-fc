import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const distRoot = join(root, 'dist');
const homePath = join(distRoot, 'index.html');
const outputRoot = join(distRoot, '_home-images');
const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const widths = [320, 640, 960];
const minimumSourceBytes = 96 * 1024;

if (!existsSync(homePath)) {
  throw new Error('dist/index.html이 없습니다. Astro 빌드 뒤 실행하세요.');
}

let html = await readFile(homePath, 'utf8');
const imageTags = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g)];
const replacements = new Map();
const generated = new Map();

await mkdir(outputRoot, { recursive: true });

for (const match of imageTags) {
  const [tag, rawSource] = match;
  if (!rawSource.startsWith('/') || tag.includes(' srcset=')) continue;

  const sourcePathname = rawSource.split(/[?#]/, 1)[0];
  const extension = extname(sourcePathname).toLowerCase();
  if (!supportedExtensions.has(extension)) continue;

  const sourcePath = join(distRoot, sourcePathname.replace(/^\//, ''));
  if (!existsSync(sourcePath) || (await stat(sourcePath)).size < minimumSourceBytes) continue;

  let variants = generated.get(sourcePathname);
  if (!variants) {
    const metadata = await sharp(sourcePath).metadata();
    if (!metadata.width) continue;

    const basename = createHash('sha1').update(sourcePathname).digest('hex').slice(0, 12);
    variants = [];
    for (const width of widths.filter((candidate) => candidate < metadata.width)) {
      const filename = `${basename}-${width}.webp`;
      await sharp(sourcePath)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 78, effort: 5 })
        .toFile(join(outputRoot, filename));
      variants.push({ width, url: `/_home-images/${filename}` });
    }
    generated.set(sourcePathname, variants);
  }

  if (!variants.length) continue;
  const srcset = variants.map(({ width, url }) => `${url} ${width}w`).join(', ');
  let optimizedTag = tag.replace(` src="${rawSource}"`, ` src="${rawSource}" srcset="${srcset}"`);
  if (!optimizedTag.includes(' sizes=')) {
    optimizedTag = optimizedTag.replace(/>$/, ' sizes="(max-width: 700px) 46vw, (max-width: 1100px) 33vw, 320px">');
  }
  replacements.set(tag, optimizedTag);
}

for (const [original, optimized] of replacements) html = html.replaceAll(original, optimized);
await writeFile(homePath, html, 'utf8');

const sourceBytes = await Promise.all([...generated.keys()].map(async (pathname) =>
  (await stat(join(distRoot, pathname.replace(/^\//, '')))).size
));
const variantFiles = [...generated.values()].flat();
const variantBytes = await Promise.all(variantFiles.map(async ({ url }) =>
  (await stat(join(distRoot, url.replace(/^\//, '')))).size
));

console.log(`메인 이미지 최적화 완료: ${generated.size}개 원본, ${variantFiles.length}개 WebP 후보`);
console.log(`원본 합계 ${Math.round(sourceBytes.reduce((sum, size) => sum + size, 0) / 1024)}KB · 반응형 후보 합계 ${Math.round(variantBytes.reduce((sum, size) => sum + size, 0) / 1024)}KB`);
