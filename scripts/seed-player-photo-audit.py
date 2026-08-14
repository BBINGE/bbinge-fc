import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT_PATH = ROOT / "src/data/player-photo-audit.json"
IMAGES_PATH = ROOT / "src/data/goat-player-images.json"

audit = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))
portraits = json.loads(IMAGES_PATH.read_text(encoding="utf-8"))["portraits"]
for player in audit["players"]:
    candidate = portraits.get(player["id"])
    if not candidate:
        continue
    player["currentAsset"] = candidate.get("src", "")
    player["sourceUrl"] = candidate.get("commons", "")
    player["license"] = candidate.get("license", "")
    player["sourceAuthor"] = candidate.get("author", "")
    player["status"] = "license-review" if candidate.get("license", "").startswith("©") else "era-review"

AUDIT_PATH.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"기존 후보 연결 완료: {sum(bool(p.get('currentAsset')) for p in audit['players'])}명")
