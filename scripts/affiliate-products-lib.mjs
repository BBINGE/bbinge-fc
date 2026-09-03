import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const paths = {
  projectRoot,
  catalog: path.join(projectRoot, 'src', 'data', 'affiliate-products.json'),
  articles: path.join(projectRoot, 'src', 'content', 'articles'),
  publicRedirects: path.join(projectRoot, 'public', '_redirects'),
  distRedirects: path.join(projectRoot, 'dist', '_redirects'),
};

export async function loadAffiliateCatalog() {
  const raw = await readFile(paths.catalog, 'utf8');
  const catalog = JSON.parse(raw);
  if (!catalog || catalog.version !== 1 || !Array.isArray(catalog.products)) {
    throw new Error('affiliate-products.json은 version 1과 products 배열이 필요합니다.');
  }
  return catalog;
}

async function walkMarkdown(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkMarkdown(target));
    if (entry.isFile() && entry.name.endsWith('.md')) files.push(target);
  }
  return files;
}

function parseAttributes(openingTag) {
  const attributes = new Map();
  const pattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of openingTag.matchAll(pattern)) {
    attributes.set(match[1], match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

export async function collectAffiliateReferences() {
  const references = [];
  const directAffiliateUrls = [];
  for (const filename of await walkMarkdown(paths.articles)) {
    const source = await readFile(filename, 'utf8');
    const relativeFile = path.relative(projectRoot, filename).replaceAll('\\', '/');
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/https?:\/\/(?:www\.)?bitl\.bz\//i.test(line)) {
        directAffiliateUrls.push({ file: relativeFile, line: index + 1 });
      }
    });

    for (const match of source.matchAll(/<a\b[^>]*\bdata-affiliate-link\b[^>]*>/gi)) {
      const attributes = parseAttributes(match[0]);
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      const href = attributes.get('href') ?? '';
      const idMatch = href.match(/^\/go\/([a-z0-9][a-z0-9-]*)\/?$/);
      references.push({
        file: relativeFile,
        line,
        href,
        id: idMatch?.[1] ?? null,
        network: attributes.get('data-affiliate-network') ?? '',
        merchant: attributes.get('data-affiliate-merchant') ?? '',
        productCode: attributes.get('data-affiliate-product') ?? '',
        rel: attributes.get('rel') ?? '',
      });
    }
  }
  return { references, directAffiliateUrls };
}

export function validateCatalog(catalog, usage) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  const activeStatuses = new Set(['active', 'paused', 'retired']);
  const departments = new Set(['luxury', 'outfit', 'uniform']);

  for (const product of catalog.products) {
    const prefix = product?.id ? `[${product.id}]` : '[ID 없음]';
    if (!/^[a-z0-9][a-z0-9-]*$/.test(product?.id ?? '')) errors.push(`${prefix} id는 소문자 kebab-case여야 합니다.`);
    if (ids.has(product?.id)) errors.push(`${prefix} id가 중복됐습니다.`);
    ids.add(product?.id);
    if (!departments.has(product?.department)) errors.push(`${prefix} department는 luxury, outfit, uniform 중 하나여야 합니다.`);
    for (const field of ['label', 'network', 'merchant', 'affiliateUrl', 'merchantUrl', 'merchantHost', 'productCode', 'status']) {
      if (typeof product?.[field] !== 'string' || !product[field].trim()) errors.push(`${prefix} ${field} 값이 필요합니다.`);
    }
    for (const field of ['affiliateUrl', 'merchantUrl']) {
      try {
        const url = new URL(product?.[field]);
        if (url.protocol !== 'https:') errors.push(`${prefix} ${field}는 HTTPS 주소여야 합니다.`);
      } catch {
        errors.push(`${prefix} ${field}가 올바른 URL이 아닙니다.`);
      }
    }
    try {
      if (new URL(product.merchantUrl).hostname !== product.merchantHost) {
        errors.push(`${prefix} merchantUrl의 호스트와 merchantHost가 다릅니다.`);
      }
    } catch {}
    if (!activeStatuses.has(product?.status)) errors.push(`${prefix} status는 active, paused, retired 중 하나여야 합니다.`);
    if (!Array.isArray(product?.soldOutMarkers)) errors.push(`${prefix} soldOutMarkers는 배열이어야 합니다.`);
  }

  for (const item of usage.directAffiliateUrls) {
    errors.push(`${item.file}:${item.line} 글에 bitl.bz 주소를 직접 넣지 말고 /go/상품ID를 사용하세요.`);
  }

  const byId = new Map(catalog.products.map((product) => [product.id, product]));
  const usedIds = new Set();
  for (const reference of usage.references) {
    const prefix = `${reference.file}:${reference.line}`;
    if (!reference.id) {
      errors.push(`${prefix} 제휴 카드 href는 /go/상품ID 형식이어야 합니다.`);
      continue;
    }
    usedIds.add(reference.id);
    const product = byId.get(reference.id);
    if (!product) {
      errors.push(`${prefix} 중앙 목록에 없는 상품 ID ${reference.id}를 사용했습니다.`);
      continue;
    }
    if (product.status !== 'active') errors.push(`${prefix} ${reference.id}는 현재 ${product.status} 상태입니다.`);
    if (reference.network !== product.network) errors.push(`${prefix} data-affiliate-network가 중앙 목록과 다릅니다.`);
    if (reference.merchant !== product.merchant) errors.push(`${prefix} data-affiliate-merchant가 중앙 목록과 다릅니다.`);
    if (reference.productCode !== product.productCode) errors.push(`${prefix} data-affiliate-product가 중앙 목록과 다릅니다.`);
    if (!reference.rel.split(/\s+/).includes('sponsored')) errors.push(`${prefix} rel=\"sponsored\"가 필요합니다.`);
  }

  for (const product of catalog.products) {
    if (product.status === 'active' && !usedIds.has(product.id)) warnings.push(`[${product.id}] 사용 중인 글이 없습니다.`);
  }
  return { errors, warnings };
}

export async function loadAndValidate() {
  const catalog = await loadAffiliateCatalog();
  const usage = await collectAffiliateReferences();
  const validation = validateCatalog(catalog, usage);
  return { catalog, usage, validation };
}
