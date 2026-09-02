import assert from 'node:assert/strict';
import { validateCatalog } from './affiliate-products-lib.mjs';

const product = {
  id: 'shop-item-1',
  label: '테스트 상품',
  network: 'adpick',
  merchant: 'Example Shop',
  affiliateUrl: 'https://example.com/link',
  merchantUrl: 'https://shop.example.com/item/ABC1',
  merchantHost: 'shop.example.com',
  productCode: 'ABC1',
  status: 'active',
  soldOutMarkers: ['품절'],
};
const reference = {
  file: 'src/content/articles/test.md',
  line: 10,
  href: '/go/shop-item-1',
  id: 'shop-item-1',
  network: 'adpick',
  merchant: 'Example Shop',
  productCode: 'ABC1',
  rel: 'sponsored noopener',
};

const valid = validateCatalog({ version: 1, products: [product] }, { references: [reference], directAffiliateUrls: [] });
assert.deepEqual(valid.errors, []);
assert.deepEqual(valid.warnings, []);

const directUrl = validateCatalog({ version: 1, products: [product] }, {
  references: [reference],
  directAffiliateUrls: [{ file: reference.file, line: reference.line }],
});
assert.match(directUrl.errors.join('\n'), /직접 넣지 말고/);

const unknownId = validateCatalog({ version: 1, products: [product] }, {
  references: [{ ...reference, id: 'missing-item', href: '/go/missing-item' }],
  directAffiliateUrls: [],
});
assert.match(unknownId.errors.join('\n'), /중앙 목록에 없는 상품 ID/);

const mismatchedCode = validateCatalog({ version: 1, products: [product] }, {
  references: [{ ...reference, productCode: 'WRONG' }],
  directAffiliateUrls: [],
});
assert.match(mismatchedCode.errors.join('\n'), /data-affiliate-product/);

const paused = validateCatalog({ version: 1, products: [{ ...product, status: 'paused' }] }, {
  references: [reference],
  directAffiliateUrls: [],
});
assert.match(paused.errors.join('\n'), /paused 상태/);

console.log('제휴상품 규칙 자체 시험 통과: 정상·직접 링크·미등록 ID·상품 코드 불일치·중지 상태');
