# BBinge FC — Codex/AI 작업 규칙

이 저장소에서 작업하는 모든 AI 에이전트는 작업 전에 다음 파일을 순서대로 처음부터 끝까지 읽는다.

1. `BBINGE_FC_BRIEF.md` — 프로젝트의 단일 설계 기준 (브랜드·구조·성능 원칙)
2. `CLAUDE.md` — 장기 운영 규칙
3. `HANDOFF.md` — 현재 구현 상태·운영 방법·남은 작업

## 작업 시작

```powershell
git fetch origin
git status --short --branch
git log -10 --oneline
```

- 기준 브랜치는 `main`이다.
- 원격보다 뒤처졌고 로컬 변경이 없다면 `git pull --ff-only origin main`으로 최신화한다.
- 사용자의 변경이나 출처가 불분명한 변경은 덮어쓰거나 삭제하지 않는다.
- 공개 저장소이므로 비밀번호, 토큰, API 키, OAuth 시크릿, 배포 훅 URL을 파일에 기록하지 않는다. 비밀값은 Cloudflare Pages 환경변수와 GitHub Secrets에만 존재한다.

## 작업 중

- 사용자는 개발 초보다. 사용자가 직접 해야 하는 일이 있으면 프로그램 이름, 클릭 위치, 실행 명령을 순서대로 설명한다.
- 브리프의 기술 스택(Astro + Cloudflare Pages, 백엔드 없음, Tailwind)을 임의로 바꾸지 않는다.
- 확정된 브랜드 문구, 카테고리 구조, 운영자가 작성한 글 본문을 요청 없이 수정하지 않는다.
- 논의·질문은 구현 승인으로 간주하지 않는다.
- CMS(`public/admin/`, `functions/`)를 수정할 때는 Sveltia CMS 설정과 GitHub OAuth 흐름의 호환성을 함께 확인한다.

## 작업 종료

1. `npm run build`가 성공하는지 확인한다.
2. PC·태블릿·모바일(380px 우선) 화면을 검증한다.
3. 운영 상태나 절차가 달라졌다면 같은 작업에서 `HANDOFF.md`도 갱신한다.
4. 한국어 커밋 메시지로 커밋하고 `main`에 push한다.
5. Cloudflare Pages 배포 결과(https://bbinge-fc.pages.dev)를 확인한다.

## 개발 서버

Claude Code에서 개발 서버는 백그라운드 모드로 실행한다:

```
astro dev --background
```

관리: `astro dev stop`, `astro dev status`, `astro dev logs`
