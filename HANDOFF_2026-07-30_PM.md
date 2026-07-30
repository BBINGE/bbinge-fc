# bbinge-fc 인수인계문 — 2026-07-30 저녁 (검증 3단계 직전 멈춤)

> 집 Claude Code가 이어받기 위한 문서. 저장소 루트에 커밋됨.
> 오늘 아침 문서(매거진 UI 착수 전)는 낡음 — 이 문서가 최신.

---

## 0. 지금 어디서 멈췄나 ★ 집에서 여기부터

**매거진 UI 브랜치의 프로덕션 실배포 회귀 검증 3단계 중 마지막에서 멈춤.**

- 1단계 브랜치 프리뷰 배포 → **통과**
- 2단계 CMS OAuth 실로그인 → **통과** (프리뷰 URL에서 GitHub 로그인 성공, 콜백 문제 없었음)
- 3단계 write.astro 실발행 → **멈춤.** 에디터에서 사진 넣으려다 GitHub 404로 튕김.
  - 원인 추정: 사진 업로드 경로 문제 (GitHub Actions 쪽 경미한 장애도 진행 중이었음)
  - **해결 방향: 사진 빼고 텍스트만으로 발행 재시도.** 검증엔 사진 불필요.

### 집에서 할 일 (순서)
1. `git checkout feature/magazine-ui-category-tree && git pull`
2. write.astro 에디터 접속:
   `https://feature-magazine-ui-category.bbinge-fc.pages.dev/admin/write/`
   (프로덕션 아님 — 브랜치 프리뷰 URL. 아직 main 미머지)
3. **사진 없이** 텍스트만 테스트 글 1건 작성:
   - 제목/카테고리/slug/설명/태그 아무거나, 발행일 Now
   - **비공개(초안) 토글 ON** (커밋은 찍히되 사이트 노출 안 됨)
   - 본문 한 줄 (사진 넣지 말 것)
4. **발행** 클릭
5. 발행 성공해도 그걸 최종으로 치지 말 것 → **GitHub API로 저장소에 실제 커밋 찍혔는지 해시 확인** (브라우저 "성공" ≠ 실커밋)
6. 커밋 확인되면 → 테스트 글 삭제 → **그때 main 머지**

**주의: 3단계 통과 전 main 머지 금지.**

---

## 1. 오늘(07-30) 완료된 것

**브랜치: `feature/magazine-ui-category-tree`** (main 미머지)

- 매거진 UI 대공사 (트리 카테고리, catch-all 라우팅, 사이드바 트리, 히어로 2단, 4열 카드 피드, 인피드 광고 슬롯, 검색, 모바일 드로어) — 톤 판정 통과
- **Task 11 공유 버튼** — 링크복사 + 카카오(SDK 미등록, 폴백만) + X + 페북. 글 하단 배치. 커밋 `a9dd4d5`
- **정적 페이지 4종** — ABOUT + privacy + terms + contact. 푸터 3종 링크 상시노출. 커밋 `c3436e4`
  - 플레이스홀더 치환 완료: CONTACT_EMAIL=sho3603@naver.com, PUBLISH/EFFECTIVE_DATE=2026-07-30
- **ABOUT 저자 정의 확정** — 나열형, 텍스트만(링크 없음), 前/現 표기, 회사명 마스킹. 마스트헤드 + 약력/축구·스포츠/인증·등재/기획·마케팅 섹션
- **반응형 375px 전 페이지 통과** — 가로 오버플로 없음, 드로어 열림 정상
- 마지막 커밋: `c3436e4` (+ 프리뷰 트리거용 빈 커밋 `29359f32` 계열)

## 2. 검증 관련 확정 사실
- Cloudflare Preview branch 설정 = "All non-Production branches"로 켬 (원래 None이라 프리뷰 안 떴던 것 → 해결)
- 브랜치 프리뷰 URL: `https://feature-magazine-ui-category.bbinge-fc.pages.dev`
- write.astro 에디터 경로 `/admin/write/` 프리뷰에서 유효 확인
- CMS(`/admin/`)는 Sveltia 기본 폼 = 안 씀. 실사용 에디터는 write.astro.

## 3. 검증 끝난 뒤 남은 작업 (다음 트랙)
- **config.yml 필드 구성 개편** — 현재 write.astro/CMS 필드가 의료·블로그용(FAQ 등) 잔재. 축구 아카이브에 안 맞음. FAQ 걷어내고 표·인용 등 긴 학술 글용 도구 보강 필요. **구조 변경이라 검증·머지 후 별도 브랜치로.**
- 카카오 정식 공유(JS 키 등록) 여부 결정 — 지금은 폴백만
- 정적 페이지 실배포 도달성 확인 (푸터 링크 클릭)
- 백로그: Supabase 조회수→HOT 자동순위, 네이버 블로그 트리 전면 이식, 댓글/커뮤니티

## 4. 협업 구조 (유지)
- 관제탑(Claude 채팅) = 판단·검수·브리프. 코드 커밋 안 함.
- 실무자(Claude Code) = 지시를 코드/커밋/배포로 실행. GitHub API로 실물 검증.
- 원칙: ①표면증상≠근본원인 ②구조변경은 브랜치, 격리 단일파일만 main 직행 ③auth/callback 건드릴 땐 CMS 회귀테스트 선행 ④브라우저 "성공"≠실커밋(GitHub API 확인)

## 5. 운영 레퍼런스
- 저장소: github.com/BBINGE/bbinge-fc (Astro)
- 프로덕션: https://bbinge-fc.pages.dev · 프리뷰: 위 브랜치 URL
- 에디터: /admin/write/ · CMS: /admin/
- 자동배포: main push 시 Cloudflare 네이티브 + 이제 비프로덕션 브랜치도 프리뷰 자동배포
- `files.zip`(저장소): 정적페이지 초안 4종. 삭제 금지, .gitignore 반영, 커밋 제외.
