# 아카이브 표지 렌더러

코파 아메리카 아카이브 표지를 Photoshop 없이 773×773 PNG로 생성한다.

```powershell
python scripts/archive-cover/render.py `
  --year 1927 `
  --photo public/images/archive/1927-copa-america/manuel-seoane.jpg `
  --stamp public/images/archive/1927-copa-america/peru-1927-stamp.jpg `
  --trophy scripts/archive-cover/assets/copa-trophy-source.png `
  --top '#7A263A' `
  --bottom '#C45A68' `
  --focus-x 0.5 `
  --focus-y 0.08 `
  --zoom 1.12 `
  --output public/images/archive/1927-copa-america/cover.png
```

- `--photo`: 검증된 실제 역사 사진. 인물 중심의 세로 사진을 권장한다.
- `--stamp`: 해당 연도·개최국과 연결되는 우표나 공식 기념물. 생략할 수 있다.
- `--top`, `--bottom`: 좌측 패널의 위·아래 색상.
- `--focus-x`, `--focus-y`: 인물의 얼굴과 시선에 맞춘 사진 초점. 0에서 1 사이 값이다.
- `--zoom`: 사진 확대율. 인물 사진마다 표지에서 얼굴 크기를 확인해 조정한다.
- `--mvp-x`, `--mvp-y`, `--mvp-width`, `--mvp-height`: 수작업 표지에서 계측한 MVP 박스. 기본값 `24, 520, 362, 154`는 1080px 작업 좌표이며 특별한 이유가 없으면 연도별로 바꾸지 않는다. `코파 아메리카`와 MVP는 `x=24~386`의 좌우선을 공유한다.
- 확정한 연도별 값은 `presets/{연도}.json`에 남긴다. 1927년 기준은 `focusX 0.5`, `focusY 0.1`, `zoom 1.42`다.
- 첫 렌더링 때 3개 확대율 후보를 동시에 만들고 한 번만 육안 비교한다. 후보를 한 장씩 순차 생성하지 않는다. 렌더링은 장당 약 1초 이내이며 Photoshop을 실행하지 않는다.
- 고정 트로피 원판은 기존 PSD의 사진 레이어에서 한 번 분리한 자산이다.
- 표지의 주 타이포는 Pretendard로 통일한다. 연도는 ExtraLight, `코파 아메리카`는 SemiBold, MVP는 Black을 사용한다. 저장소에 포함한 정적 TTF와 `Pretendard-LICENSE.txt`는 공식 Pretendard 1.3.9 배포본이다. 서명은 기존 Gmarket Sans Medium을 유지한다.
- MVP에 외곽선을 덧대지 않는다. 흰색에서 아주 옅은 회색으로 내려가는 미세한 세로 그라데이션만 적용한다. 굵기를 획으로 보강하면 M·V 내부 공간과 모서리가 둥글게 뭉개진다.
- `코파 아메리카`는 목표 폭에 맞춰 가로로 늘리지 않는다. Pretendard SemiBold의 자연 비율로 높이를 정하고 남는 1px 안팎의 오차만 자간으로 분배해 MVP와 같은 좌우선에 맞춘다.

표지 사진과 우표의 출처·저작권 상태는 각 원고의 `출처와 기록 기준`에 남긴다.
