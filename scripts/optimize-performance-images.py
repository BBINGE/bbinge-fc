from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]

TARGETS = {
    "public/images/highlights/1950-world-cup-final-cover.png": 1000,
    "public/images/football-made-easy/goalkeeper-handball-match.png": 1280,
    "public/images/squads/real-madrid-death-squad-best-xi/cover.png": 900,
    "public/images/archive/1941-copa-america/cover.png": 800,
    "public/images/archive/1942-copa-america/cover.png": 800,
    "public/images/archive/1945-copa-america/cover.png": 800,
    "public/images/archive/1946-copa-america/cover.png": 800,
    "public/images/archive/1947-copa-america/cover.png": 800,
    "public/images/archive/1949-copa-america/cover.png": 800,
    "public/images/archive/1950-fifa-world-cup-best-xi/cover.png": 800,
}


for relative_path, max_width in TARGETS.items():
    source = ROOT / relative_path
    destination = source.with_suffix(".webp")
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
        if image.width > max_width:
            height = round(image.height * max_width / image.width)
            image = image.resize((max_width, height), Image.Resampling.LANCZOS)
        image.save(destination, "WEBP", quality=78, method=6)
    print(f"{destination.relative_to(ROOT)}\t{destination.stat().st_size}")
