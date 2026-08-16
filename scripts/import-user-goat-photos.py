import argparse
import hashlib
import io
import json
import unicodedata
import zipfile
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
AUDIT_PATH = ROOT / "src/data/player-photo-audit.json"
IMAGES_PATH = ROOT / "src/data/goat-player-images.json"
OUTPUT_DIR = ROOT / "public/images/goat/players"

PLAYER_IDS = {
    "arthur friedenreich": "friedenreich",
    "giuseppe meazza": "meazza",
    "hector scarone": "scarone",
    "jose leandro andrade": "andrade",
    "jose nasazzi": "nasazzi",
    "leonidas da silva": "leonidas",
    "matthias sindelar": "sindelar",
    "ricardo zamora": "zamora",
    "stanley matthews": "matthews",
    "valentino mazzola": "mazzola-valentino",
    "zizinho": "zizinho",
    "xdhtyum233bgrdgu3dbu8p-1200-80": "keegan",
}

SKIP_FILENAMES = {
    "berti vogts": "감독 시기로 보이는 사진",
    "carlos alberto torres": "허용 전성기 구단이 아닌 New York Cosmos 사진",
    "enzo francescoli": "목표 전성기보다 뒤의 River Plate 후기 사진",
    "kenny dalglish": "뒷모습이라 반응형 얼굴 포커싱 불가",
    "didier drogba": "목표 전성기 이후인 Chelsea 2014–15 우승 사진",
    "roberto baggio": "등을 보인 구도라 반응형 얼굴 포커싱 불가",
    "samuel eto'o": "목표 전성기보다 훨씬 뒤의 Cameroon 사진",
    "thierry henry": "목표 전성기 이후인 Arsenal 복귀 시기 사진",
}

PREFERRED_CLUB_ADDITIONS = {
    "thuram": "파르마 칼초 1913",
    "buffon": "파르마 칼초 1913",
    "cannavaro": "파르마 칼초 1913",
}

CACHE_REVISIONS = {
    "buffon": "2",
}

FOCUS = {
    "friedenreich": (50, 23, 1.0),
    "meazza": (50, 17, 1.28),
    "scarone": (52, 24, 1.22),
    "andrade": (50, 20, 1.0),
    "nasazzi": (50, 16, 1.25),
    "leonidas": (50, 17, 1.0),
    "sindelar": (50, 18, 1.0),
    "zamora": (50, 18, 1.12),
    "matthews": (50, 16, 1.0),
    "mazzola-valentino": (43, 28, 1.3),
    "zizinho": (54, 20, 1.08),
    "di-stefano": (48, 20, 1.45),
    "bobby-charlton": (43, 20, 1.35),
    "fontaine": (50, 18, 1.25),
    "varela": (32, 18, 1.18),
    "pele": (58, 20, 1.22),
    "puskas": (50, 18, 1.15),
    "passarella": (50, 20, 1.18),
    "hugo-sanchez": (32, 19, 1.32),
    "gerd-muller": (62, 19, 1.22),
    "keegan": (55, 19, 1.25),
    "iniesta": (55, 19, 1.3),
    "cafu": (36, 19, 1.32),
    "batistuta": (30, 19, 1.32),
    "baresi": (62, 19, 1.3),
    "thuram": (38, 19, 1.3),
    "matthaus": (66, 19, 1.28),
    "figo": (50, 19, 1.22),
    "kahn": (42, 19, 1.3),
    "ronaldinho": (56, 19, 1.22),
    "gerrard": (72, 19, 1.28),
}


def normalized_stem(filename):
    stem = Path(filename).stem
    decomposed = unicodedata.normalize("NFKD", stem)
    return "".join(char for char in decomposed if not unicodedata.combining(char)).lower()


def responsive_focus(player_id):
    x, y, scale = FOCUS.get(player_id, (50, 18, 1.0))
    return (
        {
            "desktop": f"{x}% {y}%",
            "laptop": f"{x}% {y + 1}%",
            "tablet": f"{x}% {y + 2}%",
            "mobile": f"{x}% {y + 3}%",
        },
        {
            "desktop": scale,
            "laptop": scale,
            "tablet": max(1, round(scale - 0.03, 2)),
            "mobile": max(1, round(scale - 0.06, 2)),
        },
    )


parser = argparse.ArgumentParser()
parser.add_argument("zip_path", type=Path)
parser.add_argument("--mark-focus-reviewed", action="store_true")
args = parser.parse_args()

audit = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))
players = {player["id"]: player for player in audit["players"]}
player_names = {normalized_stem(player["player"]): player["id"] for player in audit["players"]}
for player_id, club in PREFERRED_CLUB_ADDITIONS.items():
    if club not in players[player_id]["preferredClubs"]:
        players[player_id]["preferredClubs"].append(club)
images = json.loads(IMAGES_PATH.read_text(encoding="utf-8"))
portraits = images["portraits"]
imported = []
skipped = []

with zipfile.ZipFile(args.zip_path) as archive:
    for member in archive.infolist():
        if member.is_dir() or Path(member.filename).suffix.lower() not in {
            ".jpg", ".jpeg", ".png", ".webp",
        }:
            continue
        key = normalized_stem(member.filename)
        if key in SKIP_FILENAMES:
            skipped.append(f"{Path(member.filename).stem}: {SKIP_FILENAMES[key]}")
            continue
        player_id = PLAYER_IDS.get(key) or player_names.get(key)
        if not player_id:
            raise ValueError(f"Unmatched player filename: {member.filename}")

        destination = OUTPUT_DIR / f"{player_id}.webp"
        source_bytes = archive.read(member)
        photo_version = hashlib.sha256(source_bytes).hexdigest()[:12]
        if player_id in CACHE_REVISIONS:
            photo_version = photo_version[:11] + CACHE_REVISIONS[player_id]
        with Image.open(io.BytesIO(source_bytes)) as image:
            image = ImageOps.exif_transpose(image).convert("RGB")
            image.thumbnail((1800, 2400), Image.Resampling.LANCZOS)
            image.save(destination, "WEBP", quality=88, method=6)

        position, scale = responsive_focus(player_id)
        player = players[player_id]
        player.update({
            "sourceUrl": "",
            "license": "사용자 제공 · 출처 및 라이선스 확인 필요",
            "status": "user-provided",
            "notes": "사용자가 선수 시절 사진으로 제공. 화면 적용 완료, 원본 출처와 라이선스 확인 대기.",
            "currentAsset": f"/images/goat/players/{player_id}.webp",
            "photoVersion": photo_version,
            "sourceAuthor": "사용자 제공",
            "photoPosition": position,
            "photoScale": scale,
        })
        player["review"].update({
            "identityConfirmed": True,
            "licenseConfirmed": False,
            "desktopChecked": args.mark_focus_reviewed,
            "laptopChecked": args.mark_focus_reviewed,
            "tabletChecked": args.mark_focus_reviewed,
            "mobileChecked": args.mark_focus_reviewed,
        })
        portraits[player_id].update({
            "src": f"/images/goat/players/{player_id}.webp?v={photo_version}",
            "author": "사용자 제공",
            "license": "출처 및 라이선스 확인 필요",
            "commons": "",
        })
        imported.append(player_id)

AUDIT_PATH.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
IMAGES_PATH.write_text(json.dumps(images, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Imported {len(imported)} user-provided photos: {', '.join(imported)}")
if skipped:
    print("Skipped photos:")
    for reason in skipped:
        print(f"- {reason}")
