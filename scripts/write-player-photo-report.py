import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
AUDIT_PATH = ROOT / "src/data/player-photo-audit.json"
REPORT_PATH = ROOT / "GOAT_PHOTO_AUDIT_REPORT.md"

players = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))["players"]
counts = Counter(player["status"] for player in players)


def names(status):
    return ", ".join(player["player"] for player in players if player["status"] == status)


report = f"""# GOAT 선수 사진 감사 보고서

기준 파일: `bbinge_fc_goat_photo_targets_136.xlsx`

## 결과

- 확보 완료: {counts['ready']}명
- 미확보: {counts['missing']}명
- 라이선스 확인 필요: {counts['license-review']}명
- 전체: {len(players)}명

`ready`는 원본 출처와 라이선스, 목표 전성기 구간, 허용 구단 또는 대표팀, 네 가지 반응형 구도를 모두 확인한 사진만 뜻한다. 기준을 하나라도 확정하지 못한 사진은 사이트에 연결하지 않았다.

## 확보 완료 선수

{names('ready')}

## 라이선스 확인 필요

{names('license-review') or '없음'}

Hristo Stoichkov 후보는 FC Barcelona 페이지의 저작권 표기만 확인되어 재사용 라이선스를 확정할 수 없다. 따라서 사이트에는 연결하지 않았다.

## 미확보 및 판별 보류

{names('missing')}

미확보에는 전성기 연도 불일치, 촬영 연도 미상, 허용 구단 판별 불가, 은퇴 후·행사·시상식 구도, 얼굴이 너무 작거나 반응형 카드에서 잘리는 사진이 포함된다. 세부 판정과 원본 URL은 `src/data/player-photo-audit.json`의 각 선수 `notes`, `sourceVerification`, `review`에서 확인할 수 있다.

## 구현

- 통과 사진은 `public/images/goat/players/{{player-id}}.webp` 규칙으로 정리했다.
- 선수 데이터에서 desktop, laptop, tablet, mobile별 `photoPosition`과 `photoScale`을 읽는다.
- `?debugPhotoFocus=1`을 붙이면 카드에 현재 포커스 좌표와 배율을 표시한다.
- `?debugPhotoFocus=1&debugPlayers=pele,maradona`처럼 두 ID를 지정하면 검수 대상을 고정할 수 있다.
"""

REPORT_PATH.write_text(report, encoding="utf-8")
print(f"Wrote {REPORT_PATH.name}: {dict(counts)}")
