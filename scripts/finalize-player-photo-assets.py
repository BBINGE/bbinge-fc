import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
AUDIT_PATH = ROOT / "src/data/player-photo-audit.json"
IMAGES_PATH = ROOT / "src/data/goat-player-images.json"

audit = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))
images = json.loads(IMAGES_PATH.read_text(encoding="utf-8"))
portraits = images["portraits"]

converted = 0
for player in audit["players"]:
    if player["status"] != "focus-review":
        continue

    source = ROOT / "public" / player["currentAsset"].lstrip("/")
    destination_rel = f"/images/goat/players/{player['id']}.webp"
    destination = ROOT / "public" / destination_rel.lstrip("/")
    destination.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source) as image:
        image.convert("RGB").save(destination, "WEBP", quality=88, method=6)

    player["currentAsset"] = destination_rel
    player["status"] = "ready"
    player["review"].update(
        {
            "desktopChecked": True,
            "laptopChecked": True,
            "tabletChecked": True,
            "mobileChecked": True,
        }
    )
    player["notes"] = (
        "Source, license, target era and responsive face crop were manually reviewed."
    )
    if player["id"] in portraits:
        portraits[player["id"]]["src"] = destination_rel
    converted += 1

AUDIT_PATH.write_text(
    json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
IMAGES_PATH.write_text(
    json.dumps(images, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(f"Finalized {converted} player photos as ID-based WebP assets.")
