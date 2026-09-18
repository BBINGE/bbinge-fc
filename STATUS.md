<!-- 자동 생성 파일이다. 손으로 고치지 않는다. `node scripts/build-status.mjs`(빌드가 자동 실행)가 다시 쓴다. -->
# 지금 어디까지 왔나

새 세션은 **이 파일을 제일 먼저 읽는다.** 여기 있는 숫자는 문서에 적어 둔 기억이 아니라 저장소를 직접 센 값이다.
고정 규칙은 `AGENTS.md` §1의 핵심 문서를, 작업 경위는 `HANDOFF.md`를 본다.

- 생성 시각: 2026. 9. 18. 23시 51분 24초 (KST)
- 이 파일을 만든 시점의 커밋: `03553aa` · 2026-09-18 22:50 · 교정: 인용문 순서를 번역문·원어·출처로 통일한다
- 작업 트리: 커밋 안 된 변경 7건
- **배포 확인:** `git log --oneline -1`의 해시와 https://bbinge-fc.pages.dev/deploy.json 의 `commit`이 같으면 반영 완료다. 이 파일은 빌드 때 만들어지므로 그 뒤의 커밋 한 개만큼 뒤처져 있을 수 있다.

## 열린 항목

- 없음. 운영자 확인(2026-09-18): 남은 무채색 괘선 21곳과 연표 레일은 그대로 두고, 네이버 클립 사이트 내 재생은 하지 않는다. 다음 발행 순서는 운영자가 그때그때 정하므로 AI가 먼저 잡지 않는다. 에디터 고도화는 중단 상태다.

> 이 목록만 사람이 적는다. `HANDOFF.md`의 `OPEN-ITEMS` 블록을 고치면 여기 반영된다. 비어 있으면 진행 중인 과제가 없다는 뜻이다.

## 발행 현황 — 글 84편

| 관 | 편수 |
|---|---|
| 축디 | 33 |
| 축세 | 10 |
| 축쿼드 · 커스텀 베스트 11 | 10 |
| 축행 | 10 |
| 축떡 | 7 |
| 축술 | 7 |
| H/L · FIFA 월드컵 | 5 |
| H/L · 유러피언컵 | 2 |

최근 발행 5편

- 2026-09-18 · 축쿼드 · 커스텀 베스트 11 · FC 바르셀로나(바르사) 역대 베스트 11 선정: 메시·차비·쿠벌러
- 2026-09-18 · 축쿼드 · 커스텀 베스트 11 · 아틀레티코(AT) 마드리드 역대 베스트 11 선정: 아라고네스·고딘·그리에즈만
- 2026-09-18 · 축세 · 1973년 칠레 군사 쿠데타와 피노체트 정권: 수용소가 된 축구장에서 빈 골대에 골 넣고 월드컵 간 Ssul
- 2026-09-17 · 축쿼드 · 커스텀 베스트 11 · 아틀레틱 클루브 역대 베스트 11 선정: 텔모 사라·피치치·이리바르
- 2026-09-16 · 축쿼드 · 커스텀 베스트 11 · 맷 버스비 시대 챔스 우승 맨체스터 유나이티드 베스트 11 선정

## 삥이 아카이브 — 60편

| 관 | 편수 |
|---|---|
| 대회관(대표팀) | 30 |
| 인물관 | 16 |
| 대회관(클럽) | 12 |
| 시상관 | 2 |

최근 발행 5편

- 2026-09-17 · 대회관(클럽)/copa-libertadores · 1948 남미 챔피언 오브 챔피언십 득점왕·득점 순위: 로베르토 카파렐리 7골
- 2026-09-17 · 대회관(클럽)/copa-libertadores · 1948 남미 챔피언 오브 챔피언십: 참가 구단과 최종 순위
- 2026-09-17 · 인물관/germany · 토르스텐 프링스(Torsten Frings) 프로필·스탯·역대 등번호: 2000년대 전차 군단의 만능 미드필더
- 2026-09-17 · 인물관/brazil · 호나우두 나자리우(Ronaldo Nazário) 프로필·스탯·역대 등번호: 경이로운 자, 센터 포워드의 완성형
- 2026-09-15 · 대회관(클럽)/inter-cities-fairs-cup · 1955-58 인터시티스 페어스컵 4강과 결승: 바젤 재경기, 스탬퍼드 브리지와 캄 노우

## 축쿼드 리그별 진행

- `germany` 역대 베스트 11 4편: bayer-leverkusen, borussia-dortmund, borussia-monchengladbach, bayern-munich
- `spain` 역대 베스트 11 3편: athletic-club, atletico-madrid, fc-barcelona
- 리그 순번 밖(시대 베스트 11) 3편: real-madrid-death-squad-best-xi, manchester-united-busby-best-xi, grande-inter-best-xi

> 축적 순서는 `Bundesliga → La Liga → Ligue 1 → Premier League → Serie A`, 리그 안에서는 구단 영문명 A→Z다. 상세는 `SQUAD_ARCHIVE_RULES.md`.

## 팝업관 — 3개

- `/popup/bayern-dungi/`
- `/popup/big-club-rivalries/`
- `/popup/european-comebacks/`

## 초안·미공개

- 없음

## 빌드가 막는 검사 14개

- `validate-editorial-risk-gate`
- `validate-editorial-writing --self-test`
- `validate-editorial-writing`
- `validate-player-archives`
- `validate-popup-names`
- `validate-squad-structure`
- `test-football-ties`
- `validate-site-identity`
- `test-policy-surfaces`
- `test-affiliate-products`
- `validate-affiliate-products`
- `validate-site-identity --built`
- `test-policy-surfaces --built`
- `validate-built-markdown`

> 실패하면 원고·표기·UI를 고친다. 검사를 완화해 통과시키지 않는다.

## 최근 커밋 12건

```
2026-09-18  03553aa  교정: 인용문 순서를 번역문·원어·출처로 통일한다
2026-09-18  5b64a50  디자인(축세): 헝가리 1956 편 인용문을 확정 형식에 맞춘다
2026-09-18  d850751  문서: 현재 위치를 저장소에서 직접 세는 STATUS.md를 만든다
2026-09-18  0e7f19e  문서: 손톱 전수 제거와 조사 누락 경위를 인수인계에 남긴다
2026-09-18  57c46e7  디자인: 손톱처럼 보이는 강조 막대를 사이트 전체에서 걷는다
2026-09-18  8e67e4f  디자인(축술): 토리노 기록 카드의 위쪽 막대를 걷고 브랜드 카드로 바꾼다
2026-09-18  6b03e58  문서: 좌측 막대 정리와 블록 재디자인 경위를 인수인계에 남긴다
2026-09-18  3e67711  디자인(축세): 정리 블록 여덟 곳을 잉크 블록으로 바꾼다
2026-09-18  91e21f2  디자인(축술): 서두 논지 블록 네 곳을 짙은 브랜드 블록으로 바꾼다
2026-09-18  f6c88c6  디자인(축디): 유니폼 노트 여덟 곳을 구단 색 브랜드 블록으로 바꾼다
2026-09-18  1758564  디자인(축디): 아스널 캐스트 노트를 브랜드 블록으로 시안 작업한다
2026-09-18  95d529a  디자인: 인용문을 네이버 블로그 형식으로 바꾼다
```
