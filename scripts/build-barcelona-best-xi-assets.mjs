#!/usr/bin/env node
// 축쿼드 「FC 바르셀로나(바르사) 역대 베스트 11 선정」 자산 변환.
// 운영자가 준 원고 묶음(2.zip)의 PNG를 WebP로 옮기고 mp4를 미디어 폴더로 복사한다.
// 원본 파일 이름이 포지션으로 되어 있어 선수와 직접 대응하지 않으므로 카드를 열어 이름을 확인한 뒤
// 매핑을 여기에 고정한다(2026-09-18 확인). `센터백`이 쿠만, `센터백1`이 푸욜이다.
// 구단 문장은 운영자가 준 SVG를 public/images/clubs/fc-barcelona.svg에 따로 둔다.
//   사용법: node scripts/build-barcelona-best-xi-assets.mjs <원본 폴더>
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error('원본 폴더 경로를 인자로 주십시오.');
  process.exit(1);
}
const out = 'public/images/squads/fc-barcelona-all-time-best-xi';
const media = 'public/media/squads/fc-barcelona-best-xi';
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(media, { recursive: true });

const map = {
  '바르셀로나역대베스트11.png': 'fc-barcelona-best-xi-cover.webp',
  '바르사역대베스트11.png': 'final-header.webp',
  '바르사역대베스트11주전.png': 'formation.webp',
  '후보1.png': 'second-team.webp',
  '후보2.png': 'third-team.webp',
  '골키퍼.png': 'andoni-zubizarreta.webp',
  '센터백.png': 'ronald-koeman.webp',
  '센터백1.png': 'carles-puyol.webp',
  '레프트백.png': 'sergi-barjuan.webp',
  '라이트백.png': 'dani-alves.webp',
  '수비형미드필더.png': 'sergio-busquets.webp',
  '중앙미드필더.png': 'xavi-hernandez.webp',
  '공격형미드필더.png': 'andres-iniesta.webp',
  '레프트윙.png': 'ronaldinho.webp',
  '라이트윙.png': 'lionel-messi.webp',
  '세컨드스트라이커.png': 'kubala-laszlo.webp',
  '캄 데 레스코르츠(Camp de Les Corts).png': 'camp-de-les-corts.webp',
  '1.png': 'intro-1.webp',
  '2.png': 'intro-2.webp',
  '3.png': 'intro-3.webp',
  '4.png': 'intro-4.webp',
  '6.png': 'intro-6.webp',
};

const clips = { '호나우지뉴 vs 레알 마드리드 CF.mp4': 'ronaldinho-vs-real-madrid.mp4' };

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
fs.writeFileSync(
  path.resolve('docs/editorial/fc-barcelona-all-time-best-xi-asset-sizes.json'),
  `${JSON.stringify(sizes, null, 2)}\n`,
);
console.log(`\n이미지 ${Object.keys(map).length}개, 영상 ${Object.keys(clips).length}개 변환 완료.`);
