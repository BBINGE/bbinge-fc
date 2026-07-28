# BBinge FC — 공용 인수인계

최종 갱신: 2026-07-28

대상: Claude, Codex 및 이후 유지보수 담당자

저장소: https://github.com/BBINGE/bbinge-fc (공개, 2026-07-27 전환. 구 주소 `bbinge-fc-`는 자동 리다이렉트됨)

배포 주소: https://bbinge-fc.pages.dev

기준 브랜치: `main`

이 파일은 집·회사 PC와 Claude·Codex 사이에서 공유하는 현재 상태 문서다. 정적인 커밋 번호를 최신 상태로 믿지 말고 작업 시작 때 반드시 `git fetch`, `git status`, `git log`로 확인한다.

## 1. 작업 시작 절차

```powershell
git fetch origin
git status --short --branch
git log -10 --oneline
```

로컬 변경이 없고 `main`이 원격보다 뒤처졌다면:

```powershell
git pull --ff-only origin main
```

그다음 `BBINGE_FC_BRIEF.md`, `CLAUDE.md`, 이 파일을 읽는다. 로컬 변경이 있으면 출처를 확인하기 전에는 pull, 덮어쓰기, 삭제를 하지 않는다.

## 2. 배포·인프라 구조

- Cloudflare Pages가 `main` push 시 자동 빌드·배포한다.
- GitHub Actions `scheduled-deploy.yml`이 6시간마다 Cloudflare 배포 훅을 호출한다 (예약 발행 글 반영 목적. 월 빌드 한도 관리를 위해 2시간→6시간으로 완화, 2026-07-28). 훅 URL은 GitHub Secrets `CLOUDFLARE_DEPLOY_HOOK`에만 있다.
- CMS 로그인용 GitHub OAuth는 Cloudflare Pages Functions(`functions/auth.js`, `functions/callback.js`)가 처리한다. `GITHUB_OAUTH_CLIENT_ID`와 시크릿은 Cloudflare 환경변수에만 있다.
- 비밀값은 어떤 것도 저장소에 없다. 새로 추가하지도 않는다.

## 3. 글 작성·발행 흐름 (Sveltia CMS)

1. `https://bbinge-fc.pages.dev/admin/` 접속 → GitHub 계정으로 로그인
2. "글" 컬렉션에서 작성 (제목, 설명, 카테고리, 태그, 발행일, 초안 여부, 본문 마크다운)
3. 저장하면 `src/content/articles/{slug}.md`로 GitHub `main`에 직접 커밋된다
4. push가 곧 발행이다 — Cloudflare가 자동 재빌드하며, `draft: true`인 글은 사이트에 노출되지 않는다
5. 미래 날짜(`pubDate`) 글은 6시간 주기 예약 배포가 시간이 되면 반영한다

CMS 설정: `public/admin/config.yml` (Sveltia CMS, GitHub backend, 한국어 UI, 구글 검색결과 미리보기 패널 포함). 로컬에서 글을 직접 만들 때도 같은 frontmatter 형식을 따른다.

## 4. 현재 구현 상태

구현됨:

- 사이트 골격: 메인(`/`), 카테고리 목록(`/[category]/`), 글 상세(`/[category]/[slug]/`), GOAT 토너먼트(`/play/`), about, contact, privacy
- 4개 카테고리 확정: history(축세·축구로 보는 세계사)·pilgrimage(축행·축구로 가는 세계여행)·play(축겜·축구로 노는 게임)·culture(축디·축구로 보는 OOTD) — `src/config/categories.ts`. URL 슬러그는 영문 유지, 표시명만 한글. `/play/`는 카테고리 글 목록이 아니라 GOAT 도구 전용 페이지
- 컴포넌트: Header, Footer, GoatBanner, FeaturedSplit, LatestGrid, CategoryArticleList, RelatedList, AdSlot
- Pretendard 서브셋 폰트, Tailwind, sitemap 통합, robots.txt
- GA4·AdSense 삽입 자리 주석 처리 (`Layout.astro` 88–89행, `AdSlot.astro`)
- Sveltia CMS 관리자 + GitHub OAuth + 6시간 예약 배포

글 현황:

- `supurga-pilgrimage.md` 1건 — 본문은 자리표시자. 실제 원고는 운영자가 직접 작성 예정 (기존 발행 칼럼 보유)

## 5. 남은 주요 작업

- 디자인 구현 — `DESIGN.md` v1.0 §4의 메인/카테고리 목록/글 상세 3개 페이지 모두 구현 완료, 380/768/1280px 검증 완료(2026-07-28).
  - 메인(`/`): 헤더 → GOAT 배너 → 대표글+리스트 2단 → 최신글 3열 그리드
  - 카테고리 목록(`/[category]/`): 카테고리명 24px + 글 수, 썸네일 120px 가로형 리스트 행(`CategoryArticleList.astro`), AdSlot은 5번째 행 뒤(5건 이하면 목록 끝)
  - 글 상세(`/[category]/[slug]/`): 좌측 사이드바 제거, 본문 680px 중앙, 제목 24px, 메타(날짜·읽는 시간 — 본문 글자 수 기반 추정), 본문 하단 같은 카테고리 최신 글 3건 리스트(`RelatedList.astro`) + AdSlot
  - 카테고리 4색(`CategoryColor`)은 폐기 완료, 라벨 텍스트+블루 하나로 통일
  - 더 이상 쓰이지 않는 `MagazineShell`·`Sidebar`·`CategoryNav`·`ArticleGrid`·`ArticleCard` 컴포넌트 삭제
- GOAT 32강 토너먼트 (`/play/`) — `GOAT_SPEC.md` §1·§2·§5 구현 완료(2026-07-28). 136명 풀에서 `drawAllocation`(3/7/7/10/5)대로 32명 시드 추첨 → 32강~결승 단판 토너먼트 → 결과 화면(우승 카드·4강 요약·공유 URL). `?seed=`로 동일 대진 재현, localStorage로 새로고침 대비 진행 저장, 공유 링크(`?seed=&w=&f4=`)를 열면 읽기 전용 결과 미리보기 후 같은 대진으로 플레이 가능. 페이지 전용 인라인 스크립트라 다른 페이지 번들에 영향 없음(약 50KB, 예산 200KB 이내). D1 투표 통계(§3)·완주자 게시판(§4)은 이번 범위에서 제외 — 다음 작업 대상.
- 실제 글 투입: 수페르가 순례 글 본문 채우기부터 시작, 카테고리별 초기 글 라인업 확정
- about 페이지 — 저자 소개·포트폴리오·연락 CTA 골격 완성(2026-07-28). 본문 원고와 문의 이메일 주소는 운영자 투입 대기(자리표시 문구를 교체하면 됨)
- 도메인 `bbingefc.com` 구매·연결 — astro.config와 `site.ts`에 이미 선반영되어 있어 pages.dev 상태에서는 canonical·sitemap이 미구매 도메인을 가리킨다. 도메인 연결 전 AdSense 심사를 넣으려면 이 값을 pages.dev로 임시 조정할지 결정 필요
- AdSense 심사 신청 (privacy 페이지·콘텐츠 분량 확보 후), GA4·Search Console 등록
- 글 페이지와 도구 페이지의 JS 번들 분리 검증 (도구 구현 시점에)

## 6. 검증 기준

- `npm run build` 성공
- 380px 모바일 우선, 768px 태블릿, 데스크톱
- 글 페이지 JS 최소화 유지
- 내부 링크와 카테고리 라우팅
- CMS 변경 시 /admin 로그인·저장·커밋 흐름 확인
- Cloudflare Pages 실제 배포 확인

## 7. 작업 종료 절차

1. 변경 파일과 사용자 기존 변경을 구분한다.
2. `npm run build`와 화면 검증을 수행한다.
3. 운영 상태·절차·남은 작업이 달라졌으면 이 파일을 갱신한다.
4. 비밀값이 staging에 없는지 확인한다.
5. 한국어 커밋 메시지로 커밋한다.
6. `git push origin main`
7. Cloudflare Pages 배포 결과를 확인한다.

## 8. 다른 PC에서 처음 시작

```powershell
git clone https://github.com/BBINGE/bbinge-fc.git bbinge-fc
cd bbinge-fc
npm install
npm run dev
```

Claude 또는 Codex에 보낼 첫 문장:

```text
저장소 루트의 AGENTS.md, BBINGE_FC_BRIEF.md, CLAUDE.md, HANDOFF.md를
처음부터 끝까지 읽고, git status와 최근 커밋, 원격 브랜치 상태를 확인한 뒤
현재 상태에서 이어서 작업해줘.
```
