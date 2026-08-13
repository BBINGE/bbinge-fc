# BBinge FC — 공용 인수인계

최종 갱신: 2026-08-13

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
- 컴포넌트: Header, Footer, HomeHero, CategorySidebar, ArticleCardGrid, CategoryArticleList, RelatedList, ShareButtons, AdSlot, InfoPage
- Pretendard 서브셋 폰트, Tailwind, sitemap 통합, robots.txt
- GA4·AdSense 삽입 자리 주석 처리 (`Layout.astro` 88–89행, `AdSlot.astro`)
- Sveltia CMS 관리자 + GitHub OAuth + 6시간 예약 배포

글 현황:

- `src/content/articles/`에 3개 파일이 있으나 `supurga-pilgrimage.md`는 본문 자리표시자이고 나머지 2개는 발행 흐름 시험 산출물이다. 공개용 실콘텐츠 투입은 아직 시작 전이다.

## 5. 남은 주요 작업

### 2026-08-13 운영자 결정 — 개발보다 콘텐츠 전환 우선

- 최초 사업 목표는 **AdSense 달러 수익에 빠르게 도달하는 것**이다. 운영자는 방대한 기존 NAVER 블로그 아카이브, 카드뉴스 이미지, 축구사 자료와 신규 기획을 보유하고 있지만 본업(COO) 때문에 직접 편집·발행할 시간이 부족하다.
- TipTap 자체 에디터 고도화는 당분간 **중단·후순위화**한다. 이미 구현한 코드는 보존하되 유튜브 블록, 완전한 네이버형 편집 경험 등에 추가 시간을 쓰지 않는다.
- NAVER 블로그에는 HTML 모드가 없으므로 단순 HTML 추출·이전이 아니라, 운영자가 제공하는 원문·이미지를 Claude Code/Codex가 삥이FC용 콘텐츠로 **재구성·디벨롭**한다.
- 목표 흐름: `원문·카드뉴스·기획 투입 → AI 구조화·편집 → HTML/마크다운 생성 → 로컬 미리보기 → 운영자 검수 → main 커밋·배포`.
- 운영자는 주제·핵심 주장·사실 판단·최종 승인에 집중한다. AI는 서식, 이미지 경로, 메타데이터, 출처, 내부 링크, SEO, 빌드와 배포를 담당한다. 운영자가 쓴 확정 문장과 관점은 요청 없이 바꾸지 않는다.
- 초기 콘텐츠 포트폴리오는 기존 자산 재개발을 중심으로 하고, 아카이브형·대중형·고밀도 대표 칼럼을 서로 다른 호흡으로 운영한다. 모든 글을 대표 칼럼 수준으로 수작업하지 않는다.
- 검색 등록(Google Search Console, NAVER Search Advisor), GA4, AdSense는 기초 페이지와 실제 콘텐츠가 어느 정도 축적되고 `bbingefc.com` 연결을 검증한 뒤 진행한다. 지금 당장 등록 작업을 우선하지 않는다.
- 다음 작업자는 새 UI나 편집기 기능을 먼저 제안하지 말고, 운영자가 전달하는 첫 실제 콘텐츠 묶음을 사이트 형식으로 전환하는 일부터 시작한다.

### 보존된 에디터 구현 상태 — 당분간 후순위

- 블로그 에디터 시스템 — `EDITOR_SPEC.md` v1.1, §6 진행 상황:
  - 1단계(2026-07-28): `/admin/write/`에 TipTap(오픈소스 위지윅) 이식. §2 명시 기능 전부 활성화, 마크다운 문법 미노출.
  - 2단계는 R2 대신 **GitHub `public/images/` 직접 커밋 방식**으로 대체 확정(운영자 결정, 2026-07-29). R2 인프라는 도입하지 않음.
  - 4단계(2026-07-29): 카테고리를 `src/data/categories.json` 데이터 파일로 분리. `content.config.ts`가 이 파일에서 slug 목록을 읽어 zod 스키마를 만듦. Sveltia CMS(`/admin`)에 "설정 → 카테고리" 파일 컬렉션 추가, 글쓰기 화면의 카테고리 필드는 `relation` 위젯으로 이 설정을 참조. 기존 축세·축행·축겜·축디 값 그대로 유지.
  - 5단계(2026-07-29): `/admin/write/`에 발행 패널 완성.
    - 카테고리 선택(위 categories.json 기반 select), slug(제목에서 자동 생성 + 직접 수정 가능, 한 번 수정하면 자동 갱신 중단), 설명, 태그(쉼표 구분), 발행일(datetime-local, 예약 발행용), 초안 체크박스.
    - 자동저장: 입력 변경 시 800ms 디바운스로 `localStorage`(`bbfc-write-autosave-v1`)에 저장, 새로고침 시 복원. "임시 초고 지우고 새로 시작" 버튼으로 초기화.
    - 로그인: 기존 Sveltia CMS와 동일한 GitHub OAuth 핸드셰이크(`functions/auth.js`/`callback.js`, `window.postMessage` 프로토콜)를 재사용. 팝업으로 로그인 → 토큰을 `localStorage`(`bbfc-gh-token`)에 저장.
    - 사진 삽입: 파일 선택 즉시 GitHub Contents API로 `public/images/{timestamp-파일명}`에 커밋하고 반환 경로(`/images/...`)를 에디터에 삽입. 미리보기(data URL)는 더 이상 저장 형식으로 쓰지 않음.
    - 발행: TipTap HTML → `turndown`(+`turndown-plugin-gfm`)으로 마크다운 변환(밑줄·형광펜·위아래첨자·글자색/크기/폰트·정렬은 markdown에 없는 서식이라 Astro가 지원하는 raw HTML로 보존) → frontmatter 조립 → GitHub Contents API로 `src/content/articles/{slug}.md` 커밋. 발행 성공 시 자동저장 초고 삭제.
    - `public/admin/config.yml`의 `backend.repo`를 개명된 저장소명 `BBINGE/bbinge-fc`로 정정(기존 `bbinge-fc-`는 자동 리다이렉트되지만 새 에디터 코드는 정확한 이름 사용).
    - **로컬 dev 서버(localhost)에서는 실제 GitHub 로그인·발행이 동작하지 않음** — OAuth 콜백이 배포 도메인 기준이라 실제 검증은 `bbinge-fc.pages.dev`(또는 커스텀 도메인) 배포본에서만 가능. 로컬에서는 폼 로직·자동저장·마크다운 변환 로직만 확인됨.
  - 미완료: §6 3단계(유튜브 임베드), 6단계(발행 흐름 실사용 검증). **운영자가 다시 지시하기 전에는 이어서 구현하지 않는다.** Sveltia CMS와 기존 `/admin/write/` 코드는 삭제하지 않고 보존한다.

- 디자인 구현 — `DESIGN.md` v1.0 §4의 메인/카테고리 목록/글 상세 3개 페이지 모두 구현 완료, 380/768/1280px 검증 완료(2026-07-28).
  - 메인(`/`): 헤더 → GOAT 배너 → 대표글+리스트 2단 → 최신글 3열 그리드
  - 카테고리 목록(`/[category]/`): 카테고리명 24px + 글 수, 썸네일 120px 가로형 리스트 행(`CategoryArticleList.astro`), AdSlot은 5번째 행 뒤(5건 이하면 목록 끝)
  - 글 상세(`/[category]/[slug]/`): 좌측 사이드바 제거, 본문 680px 중앙, 제목 24px, 메타(날짜·읽는 시간 — 본문 글자 수 기반 추정), 본문 하단 같은 카테고리 최신 글 3건 리스트(`RelatedList.astro`) + AdSlot
  - 카테고리 4색(`CategoryColor`)은 폐기 완료, 라벨 텍스트+블루 하나로 통일
  - 더 이상 쓰이지 않는 `MagazineShell`·`Sidebar`·`CategoryNav`·`ArticleGrid`·`ArticleCard` 컴포넌트 삭제
- GOAT 32강 토너먼트 (`/play/`) — `GOAT_SPEC.md` §1·§2·§5 구현 완료(2026-07-28). 136명 풀에서 `drawAllocation`(3/7/7/10/5)대로 32명 시드 추첨 → 32강~결승 단판 토너먼트 → 결과 화면(우승 카드·4강 요약·공유 URL). `?seed=`로 동일 대진 재현, localStorage로 새로고침 대비 진행 저장, 공유 링크(`?seed=&w=&f4=`)를 열면 읽기 전용 결과 미리보기 후 같은 대진으로 플레이 가능. 페이지 전용 인라인 스크립트라 다른 페이지 번들에 영향 없음(약 50KB, 예산 200KB 이내). D1 투표 통계(§3)·완주자 게시판(§4)은 이번 범위에서 제외 — 다음 작업 대상.
- 실제 글 투입: 수페르가 순례 글 본문 채우기부터 시작, 카테고리별 초기 글 라인업 확정
- about 페이지 — 흰 계열 개인 공식 사이트형 에디토리얼로 개편(2026-08-12). 1200px 비대칭 히어로, 컬러 프로필, `@삥이` 워터마크, SKILL 태그, 이력 2트랙, 공식 로고형 온라인 권위 카드, 주요 의뢰인·성과 패널, 네이버·인스타그램·이메일 CTA를 적용. 히어로와 이력 사이의 편지형 `나는 왜 축구를 쓰는가` 섹션에는 운영자 완성 원고를 `footballLetter` 배열에 문단 단위로 수록했으며(2026-08-13), 우측에 월드컵 트로피 이미지를 10% 농도의 장식 워터마크로 배치했다. 로고 자산은 `public/images/about-logos/`에 영문 파일명으로 보관하고 48px 원형 슬롯 안에서 비율을 유지한다. 온라인 권위 문구는 `플랫폼 + 활동/자격 + (계정명·보충정보)` 형식을 사용하며 복수 계정은 가운데점으로 구분한다. NAVER 인물검색과 인플루언서 공인은 별도 카드이며, 브런치 작가(@삥이)와 티스토리 저자(@BBingStory)도 서로 다른 삥이 계열 브랜드로 별도 표시한다. 확정 이력·성과 본문은 유지. 로컬 380/768/1440px에서 가로 넘침 없음, Pretendard 및 스크롤 순차 등장 확인.
- 신뢰·의무 페이지(2026-08-13): 개인정보처리방침·이용약관·문의 페이지를 실제 운영 상태에 맞게 정비하고, 취재·콘텐츠 제작·출처·정정·광고 독립성 원칙(`/editorial-policy/`)을 추가. 공개 원칙에서는 운영자가 글·이미지·영상 전반을 직접 기획·조사·집필·편집하고 최종 책임을 진다는 제작 기준을 밝힘. 공통 푸터에 콘텐츠 탐색·정책·문의 동선을 통합하고 WebSite·Person 구조화 데이터를 추가함.
- 도메인 `bbingefc.com` 구매 완료(운영자 확인, 2026-08-13). astro.config와 `site.ts`, robots.txt에 선반영되어 있음. Cloudflare Pages 실제 연결 및 HTTPS·canonical 확인은 콘텐츠·기초 페이지 구축 후 진행 예정.
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
