import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// 헝가리 1956 축세 사료 사진: Fortepan(CC BY-SA 3.0)과 네덜란드 국립문서보관소 Anefo(CC0) 원본을 흑백 사료 톤 그대로 WebP로 변환한다. 출처는 원고 source-notes와 같다.
const outDir = path.resolve('public/images/history/hungary-1956-revolution');
await mkdir(outDir, { recursive: true });

const sources = {
  'fortepan-93004-stalin-head': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/1956_a_budapesti_Szt%C3%A1lin-szobor_elgurult_feje_fortepan_93004.jpg/1280px-1956_a_budapesti_Szt%C3%A1lin-szobor_elgurult_feje_fortepan_93004.jpg',
  'fortepan-24571-radio-building': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Br%C3%B3dy_S%C3%A1ndor_utca_5-7.%2C_Magyar_R%C3%A1di%C3%B3._Fortepan_24571.jpg/1280px-Br%C3%B3dy_S%C3%A1ndor_utca_5-7.%2C_Magyar_R%C3%A1di%C3%B3._Fortepan_24571.jpg',
  'fortepan-261526-kocsis': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Kocsis_S%C3%A1ndor_Fortepan_261526.jpg/1280px-Kocsis_S%C3%A1ndor_Fortepan_261526.jpg',
  'anefo-908-1631-refugee-train': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/94/Aankomst_derde_groep_Hongaarse_vluchtelingen%2C_Bestanddeelnr_908-1631.jpg/1280px-Aankomst_derde_groep_Hongaarse_vluchtelingen%2C_Bestanddeelnr_908-1631.jpg',
  'anefo-908-1439-refugee-children-meal': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/54/Hongaarse_kinderen_in_jaarbeurshal_Aan_de_maaltijd%2C_Bestanddeelnr_908-1439.jpg/1280px-Hongaarse_kinderen_in_jaarbeurshal_Aan_de_maaltijd%2C_Bestanddeelnr_908-1439.jpg',
  'anefo-913-8513-puskas-1962-final': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Beufica_tegen_Real_Madrid_5-3_tweede_doelpunt_van_Puska%2C_Bestanddeelnr_913-8513.jpg/1280px-Beufica_tegen_Real_Madrid_5-3_tweede_doelpunt_van_Puska%2C_Bestanddeelnr_913-8513.jpg',
};

for (const [name, url] of Object.entries(sources)) {
  const response = await fetch(url, { headers: { 'User-Agent': 'BBingeFC/1.0 (sho36036@gmail.com)' } });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const info = await sharp(buffer).rotate().resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 86 }).toFile(path.join(outDir, `${name}.webp`));
  console.log(`${name}: ${info.width}x${info.height}`);
  await new Promise((resolve) => setTimeout(resolve, 600));
}
