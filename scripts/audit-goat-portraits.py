import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
players = json.loads((ROOT / 'src/data/goat-players.json').read_text(encoding='utf-8'))['players']
manifest = json.loads((ROOT / 'src/data/goat-player-images.json').read_text(encoding='utf-8'))['portraits']
font = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', 18)
small = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', 14)
out_dir = ROOT / 'tmp' / 'goat-audit'
out_dir.mkdir(parents=True, exist_ok=True)

for page in range((len(players) + 23) // 24):
    sheet = Image.new('RGB', (1600, 1320), 'white')
    draw = ImageDraw.Draw(sheet)
    for slot, player in enumerate(players[page * 24:(page + 1) * 24]):
        col, row = slot % 6, slot // 6
        x, y = col * 266, row * 330
        entry = manifest.get(player['id'], {})
        src = entry.get('src', '')
        path = ROOT / 'public' / src.lstrip('/') if src else None
        if path and path.exists():
            try:
                im = Image.open(path).convert('RGB')
                scale = max(250 / im.width, 245 / im.height)
                im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
                left = max(0, (im.width - 250) // 2)
                top = max(0, (im.height - 245) // 4)
                sheet.paste(im.crop((left, top, left + 250, top + 245)), (x + 8, y + 8))
            except Exception:
                draw.rectangle((x + 8, y + 8, x + 258, y + 253), fill='#152c49')
        else:
            draw.rectangle((x + 8, y + 8, x + 258, y + 253), fill='#152c49')
            draw.text((x + 78, y + 110), 'NO IMAGE', fill='white', font=font)
        draw.text((x + 8, y + 260), f"{page * 24 + slot + 1:03} {player['id']}", fill='black', font=small)
        draw.text((x + 8, y + 282), player['name'], fill='black', font=font)
        draw.text((x + 8, y + 308), ' · '.join(player.get('clubs', []))[:34], fill='#45566b', font=small)
    path = out_dir / f'goat-audit-{page + 1}.jpg'
    sheet.save(path, quality=90)
    print(path)
