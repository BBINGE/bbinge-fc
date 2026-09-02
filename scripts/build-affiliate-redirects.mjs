import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadAndValidate, paths } from './affiliate-products-lib.mjs';

const { catalog, validation } = await loadAndValidate();
if (validation.errors.length) throw new Error(validation.errors.join('\n'));

const base = (await readFile(paths.publicRedirects, 'utf8')).trimEnd();
const generated = catalog.products
  .filter((product) => product.status === 'active')
  .map((product) => `/go/${product.id} ${product.affiliateUrl} 302`);
const existingSources = new Set(base.split(/\r?\n/).filter(Boolean).map((line) => line.trim().split(/\s+/)[0]));
for (const line of generated) {
  const source = line.split(' ')[0];
  if (existingSources.has(source)) throw new Error(`${source}가 public/_redirects와 중복됩니다.`);
}

const output = `${base}\n${generated.join('\n')}\n`;
const ruleCount = output.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('#')).length;
if (ruleCount > 2000) throw new Error(`Cloudflare Pages 정적 리디렉션 한도(2,000개)를 넘었습니다: ${ruleCount}개`);

await mkdir(path.dirname(paths.distRedirects), { recursive: true });
await writeFile(paths.distRedirects, output, 'utf8');
console.log(`dist/_redirects 생성 완료: /go 리디렉션 ${generated.length}개, 전체 규칙 ${ruleCount}개`);
