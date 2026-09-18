#!/usr/bin/env node
// 축쿼드 「아틀레티코(AT) 마드리드 역대 베스트 11 선정」 자산 변환.
// 운영자가 준 원고 묶음(센터백_2.zip)의 PNG를 WebP로 옮기고 mp4를 미디어 폴더로 복사한다.
// 원본 파일 이름이 포지션(센터백·중앙미드필더_2)으로 되어 있어 선수와 직접 대응하지 않으므로
// 전술판과 각 카드를 열어 이름을 확인한 뒤 매핑을 여기에 고정한다(2026-09-18 확인).
// 영상 1~8번은 네이버 원문의 <video> 등장 순서(1.gif~8.gif)와 일치한다. 1~4는 서두 2x2,
// 5~8은 그리에즈만 절 2x2다.
// 구단 문장은 이 스크립트가 만들지 않는다. 박빙 팝업이 이미 쓰고 있는 사이트 자산
// public/images/popup/rivalries/crests/atleti-esp.webp를 그대로 쓴다.
//   사용법: node scripts/build-atletico-madrid-best-xi-assets.mjs <원본 폴더>
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error('원본 폴더 경로를 인자로 주십시오.');
  process.exit(1);
}
const out = 'public/images/squads/atletico-madrid-all-time-best-xi';
const media = 'public/media/squads/atletico-madrid-best-xi';
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(media, { recursive: true });

const map = {
  '아틀레티코마드리드역대베스트11_2.png': 'atletico-madrid-best-xi-cover.webp',
  '아틀레티코마드리드역대베스트11상단.png': 'final-header.webp',
  '아틀레티코마드리드역대베스트11.png': 'formation.webp',
  '아틀레티코마드리드역대베스트11후보.png': 'second-team.webp',
  '골키퍼.png': 'jan-oblak.webp',
  '센터백.png': 'juan-carlos-arteche.webp',
  '센터백_2.png': 'diego-godin.webp',
  '레프트백.png': 'isacio-calleja.webp',
  '라이트백.png': 'feliciano-rivilla.webp',
  '중앙미드필더.png': 'adelardo-rodriguez.webp',
  '중앙미드필더_2.png': 'luis-aragones.webp',
  '중앙미드필더_3.png': 'koke.webp',
  '레프트윙.png': 'enrique-collar.webp',
  '세컨드스트라이커.png': 'antoine-griezmann.webp',
  '센터포워드.png': 'jose-eulogio-garate.webp',
  '1964년, 에스파냐 무적 함대.png': 'spain-1964.webp',
  '라스로사스데마드리드 광장에 위치한 루이스 아라고네스의 묘.png': 'aragones-grave.webp',
};

// 영상은 재인코딩하지 않고 그대로 옮긴다. 이름은 확인한 장면만 내용으로 적고,
// 네이버 원문의 video 등장 순서와 같다(2026-09-18 운영자 화면으로 확인).
const clips = {
  '1.mp4': 'suarez-title-tears.mp4',
  '2.mp4': 'campeones-metropolitano.mp4',
  '3.mp4': 'herrera-farewell.mp4',
  '4.mp4': 'gracias-luis.mp4',
  '5.mp4': 'griezmann-smile.mp4',
  '6.mp4': 'griezmann-celebration-blue.mp4',
  '7.mp4': 'griezmann-carrasco-koke.mp4',
  '8.mp4': 'griezmann-match-wide.mp4',
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
for (const [from, to] of Object.entries(clips)) {
  const p = path.join(src, from);
  if (!fs.existsSync(p)) {
    console.error(`원본이 없다: ${from}`);
    process.exit(1);
  }
  fs.copyFileSync(p, path.join(media, to));
  console.log(`${(fs.statSync(p).size / 1024).toFixed(0).padStart(4)}KB  media/${to}`);
}
// 크기 표는 배포되는 public/이 아니라 편집 기록 폴더에 남긴다.
fs.writeFileSync(
  path.resolve('docs/editorial/atletico-madrid-all-time-best-xi-asset-sizes.json'),
  `${JSON.stringify(sizes, null, 2)}\n`,
);
console.log(`\n이미지 ${Object.keys(map).length}개, 영상 ${Object.keys(clips).length}개 변환 완료.`);
