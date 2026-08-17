from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/images/football-made-easy/goalkeeper-handball-rules.png"
FONT_DIR = ROOT / "scripts/archive-cover/fonts"


def font(name: str, size: int):
    return ImageFont.truetype(str(FONT_DIR / name), size=size)


W, H = 1200, 675
img = Image.new("RGB", (W, H), "#F4F7FB")
draw = ImageDraw.Draw(img)

# Editorial split: penalty area / outside area.
draw.rounded_rectangle((38, 38, W - 38, H - 38), radius=28, fill="#191F28")
draw.rectangle((714, 38, W - 38, H - 38), fill="#236B3A")
draw.line((714, 38, 714, H - 38), fill="#FFFFFF", width=6)
draw.rectangle((714, 138, 1120, 537), outline="#DCEBDC", width=4)
draw.arc((635, 214, 793, 458), start=270, end=90, fill="#DCEBDC", width=4)

# Goalkeeper body and ball, intentionally diagrammatic rather than photographic.
gx, gy = 890, 318
draw.ellipse((gx - 49, gy - 177, gx + 49, gy - 79), fill="#F2C7A5")
draw.rounded_rectangle((gx - 86, gy - 88, gx + 86, gy + 92), radius=38, fill="#3182F6")
draw.line((gx - 74, gy - 28, gx - 174, gy + 17), fill="#F2C7A5", width=34)
draw.line((gx + 74, gy - 28, gx + 174, gy - 86), fill="#F2C7A5", width=34)
draw.ellipse((gx + 139, gy - 122, gx + 222, gy - 39), fill="#FFFFFF", outline="#191F28", width=8)
draw.line((gx - 49, gy + 82, gx - 88, gy + 188), fill="#F2F6FE", width=42)
draw.line((gx + 49, gy + 82, gx + 88, gy + 188), fill="#F2F6FE", width=42)

# Boundary/contact cue.
draw.line((696, 102, 696, 573), fill="#FFB020", width=6)
draw.polygon([(681, 122), (711, 122), (696, 91)], fill="#FFB020")
draw.rounded_rectangle((650, 558, 742, 596), radius=19, fill="#FFB020")
draw.text((672, 566), "선", font=font("Pretendard-SemiBold.ttf", 20), fill="#191F28")

draw.text((92, 92), "축떡 · 경기규칙 Q&A", font=font("Pretendard-SemiBold.ttf", 25), fill="#7EAFFF")
draw.text((92, 168), "골키퍼도", font=font("Pretendard-Black.ttf", 78), fill="#FFFFFF")
draw.text((92, 257), "핸드볼 반칙을", font=font("Pretendard-Black.ttf", 78), fill="#FFFFFF")
draw.text((92, 346), "할까?", font=font("Pretendard-Black.ttf", 78), fill="#FFFFFF")
draw.text((95, 476), "백패스 · 페널티지역 밖 · 8초 규정", font=font("Pretendard-SemiBold.ttf", 30), fill="#C8D2E0")
draw.text((95, 543), "IFAB LAWS OF THE GAME 2026/27", font=font("Pretendard-SemiBold.ttf", 19), fill="#7F8B9B")

OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT, format="PNG", optimize=True)
print(OUT)
