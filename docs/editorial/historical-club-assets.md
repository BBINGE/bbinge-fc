# 시즌별 구단 식별 자산

## 운영 계약

- `src/data/historical-clubs.json`: 구단 ID, 한국어·원어 이름, 국가, 검토된 시즌별 국기·문장.
- `src/data/cup-ties/{대회-시즌}.json`: 대진 ID, 단계, 두 팀, 각 차전 점수, 승인된 부제.
- 글에는 `<div data-football-tie="1955-56-european-cup:match-1"></div>`를 배치한다. `scripts/render-football-ties.mjs`가 빌드 시 정적 카드로 확장한다. 원고·이미지의 나머지 HTML은 그대로 보존한다.
- 국기와 로고는 독립 로컬 파일이다. 사용자 도판의 좌표, 배경색, 크기에 의존하지 않는다. 외부 핫링크·런타임 API·새 라이브러리 없음.
- 운영자 승인: 모든 팀 문장은 같은 크기의 흰색 라운드 칸에 표시한다. 당시 문장이 미확인인 팀은 **흰 칸을 비워 두고 운영자 제공을 기다린다**. 국기는 로고 유무와 관계없이 국가명 옆의 작은 흰색 칸에 표시한다. 현대 문장·임의 생성·도판 크롭·확대 국기로 대체하지 않는다.
- `seasons`는 실제 대조한 범위다. 자료의 연대표만 보고 수십 년 전체를 자동 승인하지 않는다. 다음 시즌을 추가할 때 국기와 해당 문장 도안을 검토하고 같은 파일에 시즌만 추가하면 재사용된다.
- 국기 누락, 파일 없음, 불명 구단, 모호한 복수 로고, 잘못된 점수는 빌드 실패. 합계 동률 대진은 재경기 등 결정 방식을 추가 구현·검증한 뒤 사용한다.
- 검수: `node scripts/test-football-ties.mjs`, 빌드 뒤 `node scripts/qa-football-ties.mjs`. QA 출력은 `QA_OUTPUT`, 검증 호스트는 `QA_BASE`로 지정한다.

## 1955-56 연결 완료: 5개 문장

확인일: 2026-09-09. 아래 기간은 자료의 표제이며 현재 표시 승인은 1955-56 시즌만이다. 유니폼에 실제 봉제한 배지와 구단 식별 문장을 동일하게 단정하지 않는다.

| 구단 | 파일 | 시기 근거·자산 원본 |
|---|---|---|
| 스포르팅 | sporting-1945.svg | [구단 공식 1945 도안 설명](https://www.sporting.pt/en/club/history/the-badge), [FootyLogos 1945-2001 SVG](https://assets.footylogos.com/logos/sporting-cp-logo-1945-2001-footylogos.svg) |
| 안데를레흐트 | anderlecht-1933.svg | [1933-1959 문장 표제](https://en.wikipedia.org/wiki/RSC_Anderlecht), [SVG 원본](https://upload.wikimedia.org/wikipedia/en/6/6a/Logo_Anderlecht_1933%E2%80%931959.svg). 다른 2차 자료의 종료 연도는 1981로 다르지만 이 도안의 1955년 포함 여부는 일치한다. |
| 레알 마드리드 | real-madrid-1941.svg | [FootyLogos 연혁](https://www.footylogos.com/logos/real-madrid), [1941-1997 SVG](https://cdn.prod.website-files.com/68f550992570ca0322737dc2/690295fe61632e9492815818_real-madrid-1941-1997-footballlogos-org.svg) |
| AC 밀란 | milan-1946.svg | [FootyLogos 연혁](https://www.footylogos.com/logos/ac-milan), [1946 이후 SVG](https://cdn.prod.website-files.com/68f550992570ca0322737dc2/6903a84725a188957b854735_ac-milan-1946-1976-footballlogos-org.svg). 종료 연도는 자료마다 다르므로 1970년대로 자동 확장하지 않는다. |
| 랭스 | reims-1931.svg | [Commons 파일 설명](https://commons.wikimedia.org/wiki/File:Escudo_stade_de_reims_1931.svg), [1931-1991 연혁](https://1000logos.net/stade-de-reims-logo/). SVG 안에 래스터가 포함되어 있어 순수 벡터라고 설명하지 않는다. |

5개 원본을 무변형 저장했다. 공개 글 하단에 FootyLogos·Commons·스포르팅 연혁을 연결했다. 개별 권리 통지나 에이전시 워터마크 신호 없음. 일반 불확실성은 C등급·NO ACTION이다.

## 현재 국기·팀명만 표시: 11개

파르티잔, 뵈뢰시 로보고, 세르베트, 에센, 히버니언, 유고덴, 그바르디아, 오르후스, 라피트, PSV, 자르브뤼켄.

- 라피트: [CF Classics](https://www.cfclassics.co/clubs/lists/crestevo/austria/rapidvienna/rapid-vienna-crest-evolution.htm)의 독립 SVG는 1960 이후 표제이므로 1955에 소급하지 않았다.
- PSV: [Football Kit Archive](https://www.footballkitarchive.com/psv-logo-history-t408/)와 [1000logos](https://1000logos.net/psv-logo/)에 1953-1960 도안이 있으나 채택할 독립 투명 파일까지 대조하지 못했다.
- 자르브뤼켄: [Saar Nostalgie](https://www.saar-nostalgie.de/fcs.htm)에 1955까지 문장이 보이지만 시즌 중 전환 시점과 사용할 독립 파일이 미확정이다.
- 파르티잔: 1955 전후 군대·스포츠단체 명칭 변화가 있어 이전 군대 문장이나 현대 문장을 대입하지 않았다.
- 나머지 구단도 팀 존재와 현재 로고를 확인한 것만으로 1955 도안을 승인하지 않는다. 추가 자료를 확보하면 해당 항목의 `crests`에 연결한다.

## 국기

- 기존 `/images/flags/`의 독립 SVG 재사용. 새 벨기에·덴마크·이탈리아 파일은 [flag-icons](https://github.com/lipis/flag-icons)의 4x3 SVG다.
- 자틀란트는 [1947-1956 자르 보호령 국기](https://en.wikipedia.org/wiki/Flag_of_the_Saar_Protectorate)를 연결했다. 기존 도판 속 후대 자를란트 주기는 사용자 원본 안에서만 보존하며 새 UI에는 소급하지 않는다.
- 유고슬라비아는 [1946-1992 국기](https://commons.wikimedia.org/wiki/File:Flag_of_Yugoslavia_(1946-1992).svg), 스페인은 기존 당시 민간기 자산을 사용한다. 헝가리도 문장 없는 삼색기이며 국장 포함 국기와 혼동하지 않는다.
- 국기·문장 비율은 `object-fit:contain`으로 보존한다. 네모난 도판 배경을 추가하거나 문장 내부의 흰색·검은색을 지우지 않는다.
