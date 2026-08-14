import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUTPUT = ROOT / "src" / "data" / "image-focal-points.json"
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MANUAL_OVERRIDES = {
    # 자동 감지가 놓치기 쉬운 옆얼굴과 경기 중 군중 사진만 사람이 한 번 보정한다.
    "/images/goat/players/zico.jpg": {"x": 53.0, "y": 31.0, "faceWidth": 35.0},
    "/images/goat/players/platini.jpg": {"x": 50.0, "y": 23.0, "faceWidth": 29.0},
    "/images/goat/players/coluna.jpg": {"x": 27.0, "y": 22.0, "faceWidth": 24.0},
}

frontal = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
profile = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")


def faces_in(gray):
    minimum = max(24, min(gray.shape[:2]) // 14)
    found = list(frontal.detectMultiScale(gray, 1.08, 4, minSize=(minimum, minimum)))
    found += list(profile.detectMultiScale(gray, 1.08, 4, minSize=(minimum, minimum)))
    flipped = cv2.flip(gray, 1)
    for x, y, w, h in profile.detectMultiScale(flipped, 1.08, 4, minSize=(minimum, minimum)):
        found.append((gray.shape[1] - x - w, y, w, h))
    return found


points = {}
for path in PUBLIC.rglob("*"):
    if path.suffix.lower() not in EXTENSIONS:
        continue
    # Windows의 한글 경로에서도 읽히도록 imread 대신 바이트 디코딩을 사용한다.
    image = cv2.imdecode(np.fromfile(path, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        continue
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = faces_in(gray)
    if not faces:
        continue
    x, y, w, h = max(faces, key=lambda box: box[2] * box[3])
    height, width = gray.shape[:2]
    relative = "/" + path.relative_to(PUBLIC).as_posix()
    points[relative] = {
        "x": round((x + w / 2) / width * 100, 1),
        "y": round((y + h / 2) / height * 100, 1),
        "faceWidth": round(w / width * 100, 1),
    }

points.update(MANUAL_OVERRIDES)
OUTPUT.write_text(json.dumps({"version": 1, "points": points}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"얼굴 초점 {len(points)}개 저장: {OUTPUT}")
