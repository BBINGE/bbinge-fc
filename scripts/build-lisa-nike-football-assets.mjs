import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const outDir = path.resolve('public/images/culture/lisa-nike-football');
await mkdir(outDir, { recursive: true });

const sources = {
  profileA: 'https://nmp.about.nike.com/about/prod/2be5c200-0978-458c-ab3c-46b1fe749ad7/lisa-manopal-blackpink-nike-2.jpg?m=eyJlZGl0cyI6eyJqcGVnIjp7InF1YWxpdHkiOjEwMH0sIndlYnAiOnsicXVhbGl0eSI6MTAwfSwiZXh0cmFjdCI6eyJsZWZ0IjowLCJ0b3AiOjAsIndpZHRoIjozMjAwLCJoZWlnaHQiOjE4MDF9LCJyZXNpemUiOnsid2lkdGgiOjkwMH19fQ%3D%3D&s=532e0287ea7f32ef1128dc91cda91ef751f7d2fab1acbc0197b527afcae8ff67',
  profileB: 'https://nmp.about.nike.com/about/prod/2be5c200-0978-458c-ab3c-46b1fe749ad7/lisa-manopal-blackpink-nike-3.jpg?m=eyJlZGl0cyI6eyJqcGVnIjp7InF1YWxpdHkiOjEwMH0sIndlYnAiOnsicXVhbGl0eSI6MTAwfSwiZXh0cmFjdCI6eyJsZWZ0IjowLCJ0b3AiOjAsIndpZHRoIjoyMTE2LCJoZWlnaHQiOjMyMDB9LCJyZXNpemUiOnsid2lkdGgiOjE5MjB9fX0%3D&s=31c3e7481bbe9d2fcc16bfd36199b8042f542486b83514aec9fe0daa804146a9',
  filmPoster: 'https://i.ytimg.com/vi/IyZ1WIua_1s/maxresdefault.jpg',
  goalsPoster: 'https://i.ytimg.com/vi/safzyuZNCGI/maxresdefault.jpg',
  pap0: 'https://igcazquhkwxtqsaqpznx.supabase.co/storage/v1/object/public/media/ig-articles/18396747796082446/0.jpg',
  pap1: 'https://igcazquhkwxtqsaqpznx.supabase.co/storage/v1/object/public/media/ig-articles/18396747796082446/1.jpg',
  pap2: 'https://igcazquhkwxtqsaqpznx.supabase.co/storage/v1/object/public/media/ig-articles/18396747796082446/2.jpg',
  pap3: 'https://igcazquhkwxtqsaqpznx.supabase.co/storage/v1/object/public/media/ig-articles/18396747796082446/3.jpg',
  pap4: 'https://igcazquhkwxtqsaqpznx.supabase.co/storage/v1/object/public/media/ig-articles/18396747796082446/4.jpg',
  pap5: 'https://igcazquhkwxtqsaqpznx.supabase.co/storage/v1/object/public/media/ig-articles/18396747796082446/5.jpg',
  pap6: 'https://igcazquhkwxtqsaqpznx.supabase.co/storage/v1/object/public/media/ig-articles/18396747796082446/6.jpg',
};

async function fetchBuffer(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 BBingeFC/1.0' } });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

const buffers = Object.fromEntries(await Promise.all(
  Object.entries(sources).map(async ([key, url]) => [key, await fetchBuffer(url)]),
));

for (const [key, buffer] of Object.entries(buffers)) {
  const meta = await sharp(buffer).metadata();
  console.log(`${key}: ${meta.width}x${meta.height}`);
}

await sharp(buffers.pap0).resize(1600, 900, { fit: 'cover', position: 'attention' }).webp({ quality: 88 }).toFile(path.join(outDir, 'cover.webp'));
await sharp(buffers.profileA).resize(900, 900, { fit: 'cover', position: 'attention' }).webp({ quality: 87 }).toFile(path.join(outDir, 'card.webp'));
await sharp(buffers.profileB).resize(800, 1000, { fit: 'cover', position: 'attention' }).webp({ quality: 87 }).toFile(path.join(outDir, 'profile.webp'));
await sharp(buffers.filmPoster).resize(1280, 720, { fit: 'cover', position: 'attention' }).webp({ quality: 86 }).toFile(path.join(outDir, 'video-rip-the-script.webp'));
await sharp(buffers.goalsPoster).resize(1280, 720, { fit: 'cover', position: 'attention' }).webp({ quality: 86 }).toFile(path.join(outDir, 'video-goals.webp'));
await sharp(buffers.pap2).extract({ left: 0, top: 0, width: 1080, height: 760 }).webp({ quality: 88 }).toFile(path.join(outDir, 'dress-sketch.webp'));
await sharp(buffers.pap3).webp({ quality: 88 }).toFile(path.join(outDir, 'vapor-flatlay.webp'));
await sharp(buffers.pap4).webp({ quality: 88 }).toFile(path.join(outDir, 'dress-top-detail.webp'));
await sharp(buffers.pap5).webp({ quality: 88 }).toFile(path.join(outDir, 'dress-skirt-detail.webp'));
