import { loadAndValidate } from './affiliate-products-lib.mjs';

const { catalog, usage, validation } = await loadAndValidate();
for (const warning of validation.warnings) console.warn(`경고: ${warning}`);
if (validation.errors.length) {
  console.error(`제휴상품 검증 실패 (${validation.errors.length}건)`);
  for (const error of validation.errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`제휴상품 검증 통과: 상품 ${catalog.products.length}개, 글 연결 ${usage.references.length}개`);
