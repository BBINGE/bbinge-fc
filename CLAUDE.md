# BBinge FC — 장기 운영 규칙

Claude와 다른 AI 도구는 이 파일을 읽은 뒤 반드시 `BBINGE_FC_BRIEF.md`와 `HANDOFF.md`도 처음부터 끝까지 읽는다. 설계 기준은 브리프가, 현재 상태는 `HANDOFF.md`가 우선하며, 이 파일은 쉽게 바뀌지 않는 운영 원칙을 정의한다.

## 프로젝트와 사용자

- BBinge FC (FC = Football Culture) — 축구를 경기가 아니라 문화(역사·공간·유니폼·서사)로 다루는 개인 매거진 사이트.
- 운영자: 삥이(박성호). 기획·카피·콘텐츠 전부 운영자가 결정하며, 운영자는 개발자가 아니다.
- 저장소: `https://github.com/BBINGE/bbinge-fc` (구 주소 `bbinge-fc-`는 저장소 이름 변경 후 자동 리다이렉트됨)
- 배포: `https://bbinge-fc.pages.dev` (Cloudflare Pages, `main` 자동 배포 + 2시간 주기 예약 배포)
- 목표 도메인: `bbingefc.com` (미구매 — astro.config와 site.ts에 선반영되어 있음)
- 기술: Astro 정적 빌드 + Tailwind CSS + 마크다운 콘텐츠 컬렉션. 프레임워크·유료 서비스를 임의로 도입하지 않는다.

## 가장 중요한 금지 사항

- 운영자가 작성한 글 본문·확정 카피를 요청 없이 수정·요약·재작성하지 않는다.
- 실시간 뉴스성 콘텐츠(이적설, 경기 결과)를 다루는 기능·글을 추가하지 않는다. 이 사이트의 정체성은 "AI가 요약할 수 없는 역사·관점·경험"이다.
- 브리프의 기술 스택과 4개 카테고리 구조(history/pilgrimage/play/culture)를 임의로 바꾸지 않는다.
- 비밀번호, GitHub 토큰, OAuth 클라이언트 시크릿, Cloudflare 배포 훅 URL, API 키를 저장소 파일이나 문서에 기록하지 않는다.
- 큰 구조 변경, 라이브러리 도입, 배포·저장 방식 변경은 이유를 설명하고 승인받는다.

## 브리프와 실제의 확정된 차이

브리프 v1.0 §2는 "관리자 UI 불필요"라고 했으나, 운영자 승인 하에 Sveltia CMS(`/admin`)가 추가되었다. 브라우저에서 글을 작성해 GitHub에 직접 커밋하는 구조이며, 이 결정은 유지한다. 이 외의 브리프 이탈은 승인 없이 만들지 않는다.

## 콘텐츠와 검색 원칙

- 시맨틱 HTML, 페이지별 title/description, OG 태그, sitemap(@astrojs/sitemap), robots.txt를 유지한다.
- 글 페이지는 JavaScript 최소화, 도구 페이지에만 스크립트를 싣는다. 두 번들을 분리한다.
- 모바일 퍼스트: 모든 화면은 380px 폭에서 먼저 검수한다.
- AdSense·GA4는 승인 전까지 주석 자리만 유지한다(`Layout.astro`, `AdSlot.astro`).
- URL slug는 영문 소문자·숫자·하이픈만 사용하며 발행 후 바꾸지 않는다.

## 작업·검증 원칙

- 시작 시 `AGENTS.md` 절차대로 Git 상태와 최근 커밋을 확인한다.
- 변경 후 `npm run build` 성공을 확인한다.
- 작업 결과는 한국어 커밋 메시지로 커밋하고 push한다.
- 운영 상태나 절차가 바뀌면 `HANDOFF.md`도 함께 갱신한다.
- 사용자가 직접 해야 하는 단계가 생기면 열 프로그램 → 클릭 위치 → 입력값 → 완료 확인 순서로 설명한다.
