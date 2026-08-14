import html
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT_PATH = ROOT / "src/data/player-photo-audit.json"
API = "https://commons.wikimedia.org/w/api.php"

audit = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))
commons_players = [p for p in audit["players"] if "commons.wikimedia.org/wiki/File:" in p.get("sourceUrl", "")]
title_to_player = {}
for player in commons_players:
    title = "File:" + urllib.parse.unquote(player["sourceUrl"].split("/wiki/File:", 1)[1]).replace("_", " ")
    title_to_player[title] = player

def clean(value):
    value = html.unescape(value or "")
    return re.sub(r"<[^>]+>", " ", value).replace("\n", " ").strip()

for offset in range(0, len(title_to_player), 40):
    titles = list(title_to_player)[offset:offset + 40]
    params = urllib.parse.urlencode({
        "action": "query", "format": "json", "formatversion": "2",
        "prop": "imageinfo", "iiprop": "url|extmetadata", "titles": "|".join(titles),
    })
    request = urllib.request.Request(f"{API}?{params}", headers={"User-Agent": "BBingeFC-photo-audit/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        pages = json.load(response)["query"]["pages"]
    for page in pages:
        player = title_to_player.get(page.get("title"))
        if not player:
            continue
        info = (page.get("imageinfo") or [{}])[0]
        metadata = info.get("extmetadata", {})
        value = lambda key: clean(metadata.get(key, {}).get("value", ""))
        live_license = value("LicenseShortName")
        player["sourceVerification"] = {
            "pageTitle": page.get("title", ""),
            "canonicalUrl": info.get("descriptionurl", player["sourceUrl"]),
            "originalUrl": info.get("url", ""),
            "licenseShortName": live_license,
            "licenseUrl": value("LicenseUrl"),
            "artist": value("Artist"),
            "credit": value("Credit"),
            "description": value("ImageDescription"),
            "dateTimeOriginal": value("DateTimeOriginal"),
            "categories": value("Categories"),
            "verifiedAt": "2026-08-15",
        }
        player["review"]["licenseConfirmed"] = bool(live_license) and live_license.lower() not in {"copyrighted", "fair use"}
        if not player["review"]["licenseConfirmed"]:
            player["status"] = "license-review"

AUDIT_PATH.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
verified = sum(bool(p.get("sourceVerification")) for p in audit["players"])
licensed = sum(p["review"]["licenseConfirmed"] for p in audit["players"])
print(f"Commons 원문 확인: {verified}명 / 라이선스 표기 확인: {licensed}명")
