import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT_PATH = ROOT / "src/data/player-photo-audit.json"
FOCUS_PATH = ROOT / "src/data/image-focal-points.json"

rejected = {
    "andrade": "현역 연도 사진이지만 구단·대표팀 선수 사진 맥락을 확인하기 어려운 실내 사진.",
    "didi": "정장 차림 사진으로 허용 구단·대표팀 전성기 사진 여부를 확인하기 어려움.",
    "nilton-santos": "트로피 전달 행사 구도로 경기·선수 프로필 사진 기준에 부적합.",
    "seeler": "정장 차림 이동·행사 사진으로 전성기 선수 사진 기준에 부적합.",
    "fritz-walter": "실제 촬영일이 목표 구간 이후인 정장 사진.",
    "greaves": "정장 차림 이동·행사 사진으로 전성기 유니폼을 확인할 수 없음.",
    "blokhin": "정장 차림 이동 사진으로 디나모 키이우·소련 전성기 사진 여부를 확인하기 어려움.",
    "park-ji-sung": "현역 시기이지만 구단·대표팀 유니폼이 아닌 홍보성 인물 사진.",
    "kroos": "현역 시기 인터뷰 사진으로 레알 마드리드·독일 대표팀 선수 사진 맥락을 확인하기 어려움.",
    "son-heung-min": "목표 전성기 구간 이후 촬영된 시상 관련 사진.",
    "leonidas": "어두운 복수 인물 사진으로 얼굴 식별이 불안정함.",
    "coluna": "경기 장면에서 얼굴이 숙여져 반응형 카드의 눈·코·입 중심을 확보할 수 없음.",
    "zico": "원본에서 선수가 너무 작아 모바일 카드용 얼굴 중심 크롭을 확보할 수 없음.",
    "masopust": "Responsive crops do not keep the face inside the frame.",
    "rummenigge": "The face remains too small in the full-body action composition.",
    "platini": "The face remains too small for stable eye-nose-mouth framing.",
    "socrates": "The face remains too small in the full-body action composition.",
    "keegan": "The face remains too small for stable responsive framing.",
    "ronaldinho": "The face leaves the frame at multiple breakpoints.",
    "scholes": "The face remains too small for stable responsive framing.",
    "shevchenko": "The face remains too small for stable responsive framing.",
    "thomas-muller": "The head remains clipped at the top across breakpoints.",
    "henry": "The downward-facing action pose does not provide a stable facial profile.",
}

manual_focus = {
    "masopust": ({"desktop": "27% 5%", "laptop": "27% 6%", "tablet": "27% 7%", "mobile": "27% 8%"}, {"desktop": 1.55, "laptop": 1.55, "tablet": 1.5, "mobile": 1.45}),
    "rummenigge": ({"desktop": "44% 16%", "laptop": "44% 17%", "tablet": "44% 18%", "mobile": "44% 19%"}, {"desktop": 1.8, "laptop": 1.8, "tablet": 1.72, "mobile": 1.65}),
    "platini": ({"desktop": "50% 18%", "laptop": "50% 19%", "tablet": "50% 20%", "mobile": "50% 21%"}, {"desktop": 1.35, "laptop": 1.35, "tablet": 1.3, "mobile": 1.25}),
    "socrates": ({"desktop": "50% 18%", "laptop": "50% 19%", "tablet": "50% 20%", "mobile": "50% 21%"}, {"desktop": 1.35, "laptop": 1.35, "tablet": 1.3, "mobile": 1.25}),
    "keegan": ({"desktop": "78% 18%", "laptop": "78% 19%", "tablet": "78% 20%", "mobile": "78% 21%"}, {"desktop": 1.8, "laptop": 1.8, "tablet": 1.72, "mobile": 1.65}),
    "ronaldinho": ({"desktop": "31% 8%", "laptop": "31% 9%", "tablet": "31% 10%", "mobile": "31% 11%"}, {"desktop": 1.55, "laptop": 1.55, "tablet": 1.5, "mobile": 1.45}),
    "scholes": ({"desktop": "51% 16%", "laptop": "51% 17%", "tablet": "51% 18%", "mobile": "51% 19%"}, {"desktop": 1.45, "laptop": 1.45, "tablet": 1.4, "mobile": 1.35}),
    "shevchenko": ({"desktop": "57% 10%", "laptop": "57% 11%", "tablet": "57% 12%", "mobile": "57% 13%"}, {"desktop": 1.7, "laptop": 1.7, "tablet": 1.62, "mobile": 1.55}),
    "thomas-muller": ({"desktop": "9% 0%", "laptop": "9% 1%", "tablet": "9% 2%", "mobile": "9% 3%"}, {"desktop": 1.45, "laptop": 1.45, "tablet": 1.4, "mobile": 1.35}),
}

audit = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))
points = json.loads(FOCUS_PATH.read_text(encoding="utf-8"))["points"]
for player in audit["players"]:
    if player["id"] in rejected:
        player["status"] = "missing"
        player["notes"] = rejected[player["id"]]
        player["review"]["identityConfirmed"] = True
        player["review"]["clubOrNationalTeamConfirmed"] = False
        continue
    if player["status"] != "visual-review":
        continue
    player["status"] = "focus-review"
    player["review"]["identityConfirmed"] = True
    player["review"]["clubOrNationalTeamConfirmed"] = True
    point = points.get(player.get("currentAsset", ""), {"x": 50, "y": 28, "faceWidth": 32})
    x = float(point.get("x", 50))
    y = float(point.get("y", 28))
    face_width = max(float(point.get("faceWidth", 32)), 1)
    scale = round(min(1.55, max(1.0, 32 / face_width)), 2)
    player["photoPosition"] = {
        "desktop": f"{x:g}% {y:g}%",
        "laptop": f"{x:g}% {min(y + 1, 60):g}%",
        "tablet": f"{x:g}% {min(y + 2, 60):g}%",
        "mobile": f"{x:g}% {min(y + 3, 60):g}%",
    }
    player["photoScale"] = {
        "desktop": scale,
        "laptop": scale,
        "tablet": max(1.0, round(scale - 0.03, 2)),
        "mobile": max(1.0, round(scale - 0.06, 2)),
    }
    if player["id"] in manual_focus:
        player["photoPosition"], player["photoScale"] = manual_focus[player["id"]]
    player["notes"] = "전성기 연도·선수 유니폼·라이선스 확인. 반응형 얼굴 포커스 최종 검수 필요."

AUDIT_PATH.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"포커스 검수 대상: {sum(p['status'] == 'focus-review' for p in audit['players'])}명")
