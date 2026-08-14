import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "tmp/goat-focus-audit"
OUTPUT.mkdir(parents=True, exist_ok=True)
audit = json.loads((ROOT / "src/data/player-photo-audit.json").read_text(encoding="utf-8"))
players = [player for player in audit["players"] if player["status"] == "focus-review"]

frames = {
    "desktop": (235, 200),
    "laptop": (235, 194),
    "tablet": (180, 146),
    "mobile": (86, 118),
}
font = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 15)
small = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 11)

def parse_position(value):
    x, y = value.replace("%", "").split()
    return float(x) / 100, float(y) / 100

def render_crop(image, size, position, extra_scale):
    width, height = size
    base_scale = max(width / image.width, height / image.height) * extra_scale
    rendered = image.resize((max(1, round(image.width * base_scale)), max(1, round(image.height * base_scale))), Image.Resampling.LANCZOS)
    px, py = parse_position(position)
    left = round((rendered.width - width) * px)
    top = round((rendered.height - height) * py)
    left = min(max(left, 0), max(rendered.width - width, 0))
    top = min(max(top, 0), max(rendered.height - height, 0))
    return rendered.crop((left, top, left + width, top + height))

for page in range(math.ceil(len(players) / 8)):
    chunk = players[page * 8:(page + 1) * 8]
    sheet = Image.new("RGB", (820, 8 * 235), "white")
    draw = ImageDraw.Draw(sheet)
    for row, player in enumerate(chunk):
        image = Image.open(ROOT / "public" / player["currentAsset"].lstrip("/")).convert("RGB")
        y = row * 235
        draw.text((8, y + 8), player["id"], fill="black", font=font)
        draw.text((8, y + 31), player["targetYears"], fill="#555", font=small)
        x = 120
        for breakpoint, size in frames.items():
            crop = render_crop(image, size, player["photoPosition"][breakpoint], float(player["photoScale"][breakpoint]))
            preview = crop.copy()
            preview.thumbnail((160, 180))
            sheet.paste(preview, (x, y + 28))
            draw.text((x, y + 7), breakpoint, fill="#244a70", font=small)
            x += 172
    sheet.save(OUTPUT / f"focus-audit-{page + 1}.jpg", quality=90)

print(f"반응형 포커스 시트 {math.ceil(len(players) / 8)}개 생성: {len(players)}명")
