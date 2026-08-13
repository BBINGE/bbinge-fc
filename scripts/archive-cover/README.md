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
- 고정 트로피 원판은 기존 PSD의 사진 레이어에서 한 번 분리한 자산이다.
- 글꼴은 [G마켓 공식 배포 페이지](https://news.gmarket.com/fonts/)의 Gmarket Sans TTF를 사용한다. 공식 안내에 따라 수정과 재배포가 허용된다.

표지 사진과 우표의 출처·저작권 상태는 각 원고의 `출처와 기록 기준`에 남긴다.
