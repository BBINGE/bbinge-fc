import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT_PATH = ROOT / "src/data/player-photo-audit.json"
audit = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))

for player in audit["players"]:
    verification = player.get("sourceVerification", {})
    target_years = [int(value) for value in re.findall(r"(?<!\d)(?:18|19|20)\d{2}(?!\d)", player["targetYears"])]
    source_text = " ".join([
        verification.get("dateTimeOriginal", ""),
        verification.get("description", ""),
        verification.get("pageTitle", ""),
    ])
    source_years = [int(value) for value in re.findall(r"(?<!\d)(?:18|19|20)\d{2}(?!\d)", source_text)]
    year_matches = bool(target_years) and any(min(target_years) <= year <= max(target_years) for year in source_years)
    player["review"]["eraConfirmed"] = year_matches
    if player["review"]["licenseConfirmed"] and year_matches:
        player["status"] = "visual-review"
        player["notes"] = "원문 연도는 목표 구간과 일치. 유니폼·전성기 맥락과 얼굴 구도 육안 확인 필요."
    else:
        player["status"] = "missing" if player["review"]["licenseConfirmed"] else "license-review"
        player["notes"] = "기존 사진은 목표 전성기 연도와 일치가 확인되지 않아 연결 금지. 새 후보 필요."

AUDIT_PATH.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("연도 대조 분류 완료")
