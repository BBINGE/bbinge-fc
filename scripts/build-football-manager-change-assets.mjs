import path from 'node:path';
import sharp from 'sharp';

const assetDir = path.resolve('public/images/tactics/football-manager-change');

async function fetchBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

const [managerSource, benchSource, videoSource, paperFigureSource] = await Promise.all([
  fetchBuffer('https://live.staticflickr.com/3583/3302000320_fa8a78f3ca_o.jpg'),
  fetchBuffer('https://upload.wikimedia.org/wikipedia/commons/4/43/Fussballtrainer-18-09-2005.jpg'),
  fetchBuffer('https://i.ytimg.com/vi/HQjWeYhIne0/maxresdefault.jpg'),
  fetchBuffer('https://journals.plos.org/plosone/article/figure/image?download=&id=10.1371/journal.pone.0212634.g002&size=large'),
]);

const base = sharp(managerSource)
  .extract({ left: 408, top: 0, width: 2448, height: 2448 })
  .resize(1920, 1920, { fit: 'cover' })
  .modulate({ saturation: 0.92, brightness: 0.96 })
  .sharpen();

const cover = await base.clone().webp({ quality: 92 }).toBuffer();
await sharp(cover).toFile(path.join(assetDir, 'cover-photo.webp'));
await sharp(cover).resize(1200, 1200).webp({ quality: 90 }).toFile(path.join(assetDir, 'card-photo.webp'));

await sharp(benchSource)
  .resize(1500, 774, { fit: 'cover', position: 'centre' })
  .webp({ quality: 86 })
  .toFile(path.join(assetDir, 'two-coaching-staffs.webp'));

await sharp(videoSource)
  .resize(1280, 720, { fit: 'cover', position: 'centre' })
  .webp({ quality: 86 })
  .toFile(path.join(assetDir, 'new-manager-bounce-video.webp'));

await sharp(paperFigureSource)
  .resize({ width: 1800, withoutEnlargement: true })
  .webp({ quality: 92 })
  .toFile(path.join(assetDir, 'paper-league-rank-figure.webp'));
