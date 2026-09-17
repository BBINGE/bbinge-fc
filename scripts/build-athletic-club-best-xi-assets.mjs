#!/usr/bin/env node
// 축쿼드 「아틀레틱 클루브 역대 베스트 11 선정」 자산 변환.
// 운영자가 준 원고 묶음(당시원고.zip)의 PNG·JPG를 WebP로 옮긴다.
// 원본 파일 이름이 포지션(센터백·센터포워드2)으로 되어 있어 원고 번호와 직접 대응하지 않으므로
// 각 카드를 열어 이름을 확인한 뒤 매핑을 여기에 고정한다(2026-09-17 확인).
// 구단 문장과 리그 로고는 이 스크립트가 만들지 않는다. 공식 SVG를 public/images/clubs/athletic-club.svg와
// public/images/leagues/laliga-logo.svg에 따로 두고 쓴다(운영자 지시, 2026-09-17).
//   사용법: node scripts/build-athletic-club-best-xi-assets.mjs <원본 폴더>
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error('원본 폴더 경로를 인자로 주십시오.');
  process.exit(1);
}
const out = 'public/images/squads/athletic-club-all-time-best-xi';
fs.mkdirSync(out, { recursive: true });

const map = {
  '썸네일.png': 'athletic-club-best-xi-cover.webp',
  '어슬레틱빌바오역대베스트11상단.png': 'final-header.webp',
  '어슬레틱빌바오역대베스트11명단.png': 'formation.webp',
  '어슬레틱빌바오역대베스트11후보.png': 'second-team.webp',
  '골키퍼.png': 'jose-angel-iribar.webp',
  '센터백.png': 'jesus-garay.webp',
  '센터백2.png': 'andoni-goikoetxea.webp',
  '레프트백.png': 'aitor-larrazabal.webp',
  '라이트백.png': 'jose-orue.webp',
  '수비형미드필더.png': 'jose-maria-belauste.webp',
  '공격형미드필더.png': 'julen-guerrero.webp',
  '레프트윙.png': 'agustin-gainza.webp',
  '라이트미드필더.png': 'jose-luis-panizo.webp',
  '센터포워드.png': 'pichichi.webp',
  '센터포워드2.png': 'telmo-zarra.webp',
  '마라도나와 고이코에체아.png': 'maradona-goikoetxea.webp',
  '왼쪽은 귀사솔라, 오른쪽은 이리바르.png': 'guisasola-iribar.webp',
  '1920년 8월 28일, 라 푸리아의 탄생.png': 'la-furia-1920.webp',
  '게레로.jpg': 'julen-guerrero-photo.webp',
};

const sizes = {};
for (const [from, to] of Object.entries(map)) {
  const p = path.join(src, from);
  if (!fs.existsSync(p)) {
    console.error(`원본이 없다: ${from}`);
    process.exit(1);
  }
  const info = await sharp(p).webp({ quality: 86 }).toFile(path.join(out, to));
  sizes[to] = `${info.width}x${info.height}`;
  console.log(`${String(info.width)}x${String(info.height)}  ${(info.size / 1024).toFixed(0).padStart(4)}KB  ${to}`);
}
// 크기 표는 배포되는 public/이 아니라 편집 기록 폴더에 남긴다.
fs.writeFileSync(
  path.resolve('docs/editorial/athletic-club-all-time-best-xi-asset-sizes.json'),
  `${JSON.stringify(sizes, null, 2)}\n`,
);
console.log(`\n자산 ${Object.keys(map).length}개 변환 완료.`);
