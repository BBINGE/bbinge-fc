import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// 팝업관 「유럽 빅클럽 박빙 상대전적」 원자료 수집(운영자 확정, 2026-09-16).
// 범위: UEFA 공식 기록 전체 시즌의 유러피언컵·UEFA 챔피언스 리그(1), 유러피언 컵위너스컵(2), UEFA컵·UEFA 유로파 리그(14).
// 국내 리그·컵 맞대결은 UEFA 기록 밖이라 세지 않는다. 인터시티스 페어스컵과 UEFA 컨퍼런스 리그도 대상이 아니다.
// 박빙: 맞대결 6경기 이상 + 승패 차 1 이내 + 득실 차가 맞대결 수보다 작음. 승부차기로 갈린 경기는 UEFA 기록대로 무승부로 센다.
const outDir = path.resolve('src/data/popup');
await mkdir(outDir, { recursive: true });
const UA = { 'User-Agent': 'BBingeFC/1.0 (sho36036@gmail.com)' };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getJson = async (url) => {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const res = await fetch(url, { headers: UA });
      return JSON.parse(await res.text());
    } catch (error) {
      if (attempt === 5) throw new Error(`수집 실패: ${url} ${error.message}`);
      await sleep(1500 * attempt);
    }
  }
};

// 본문에서 「강팀」으로 분류한 구단(운영자 확정, 2026-09-16). 키는 UEFA 기록의 영문 표기와 국가 코드다.
const BIG_CLUBS = {
  'Arsenal|ENG': '아스널 FC', 'Chelsea|ENG': '첼시 FC', 'Liverpool|ENG': '리버풀 FC', 'Man Utd|ENG': '맨체스터 유나이티드 FC',
  'Man City|ENG': '맨체스터 시티 FC', 'Tottenham|ENG': '토트넘 홋스퍼 FC', 'Leeds|ENG': '리즈 유나이티드 AFC', 'Everton|ENG': '에버턴 FC',
  'Barcelona|ESP': 'FC 바르셀로나', 'Atleti|ESP': '클루브 아틀레티코 데 마드리드', 'Real Madrid|ESP': '레알 마드리드 CF',
  'Valencia|ESP': '발렌시아 CF', 'Sevilla|ESP': '세비야 FC',
  'Inter|ITA': 'FC 인테르나치오날레 밀라노', 'Milan|ITA': 'AC 밀란', 'Roma|ITA': 'AS 로마', 'Juventus|ITA': '유벤투스 FC',
  'Napoli|ITA': 'SSC 나폴리', 'Lazio|ITA': 'SS 라치오', 'Fiorentina|ITA': 'ACF 피오렌티나',
  'Atalanta|ITA': '아탈란타 BC', 'Parma|ITA': '파르마 칼치오 1913',
  'Bayern München|GER': 'FC 바이에른 뮌헨', 'B. Dortmund|GER': '보루시아 도르트문트', 'Leipzig|GER': 'RB 라이프치히',
  'Leverkusen|GER': '바이어 04 레버쿠젠', 'Frankfurt|GER': '아인트라흐트 프랑크푸르트', 'Hamburg|GER': '함부르크 SV',
  'Paris|FRA': '파리 생제르맹 FC', 'Marseille|FRA': '올랭피크 드 마르세유', 'Lyon|FRA': '올랭피크 리옹',
  'Monaco|FRA': 'AS 모나코 FC', 'St Etienne|FRA': 'AS 생테티엔', 'Reims|FRA': '스타드 드 랭스',
  'Benfica|POR': 'SL 벤피카', 'Porto|POR': 'FC 포르투', 'Sporting CP|POR': '스포르팅 CP',
  'Ajax|NED': 'AFC 아약스', 'PSV|NED': 'PSV 에인트호번', 'Feyenoord|NED': '페예노르트 로테르담',
  'Celtic|SCO': '셀틱 FC', 'Rangers|SCO': '레인저스 FC',
  'Galatasaray|TUR': '갈라타사라이 SK', 'Fenerbahçe|TUR': '페네르바흐체 SK',
  'Anderlecht|BEL': 'RSC 안데를레흐트', 'Club Brugge|BEL': '클뤼프 브뤼허 KV',
  'Olympiacos|GRE': '올림피아코스 FC', 'Panathinaikos|GRE': '파나티나이코스 FC',
  'Dynamo Kyiv|UKR': 'FC 디나모 키이우', 'Shakhtar|UKR': 'FC 샤흐타르 도네츠크',
  'Spartak Moskva|RUS': 'FC 스파르타크 모스크바', 'CSKA Moskva|RUS': 'PFC CSKA 모스크바', 'Zenit|RUS': 'FC 제니트 상트페테르부르크',
  'Crvena Zvezda|SRB': '츠르베나 즈베즈다', 'Sparta Praha|CZE': 'AC 스파르타 프라하', 'Dinamo Zagreb|CRO': 'GNK 디나모 자그레브',
};

const MIN_MATCHES = 6;
const COMPETITIONS = { 1: 'ucl', 2: 'cwc', 14: 'uel' };
const clubKey = (team) => `${team.internationalName}|${team.countryCode}`;

const matches = [];
const seenClubs = new Set();
for (const comp of Object.keys(COMPETITIONS)) {
  for (let year = 1955; year <= 2026; year += 1) {
    for (let offset = 0; ; offset += 500) {
      const page = await getJson(`https://match.uefa.com/v5/matches?competitionId=${comp}&seasonYear=${year}&limit=500&offset=${offset}&order=ASC`);
      if (!Array.isArray(page) || !page.length) break;
      for (const m of page) {
        if (m.status !== 'FINISHED' || !m.score?.total || !m.homeTeam?.id || !m.awayTeam?.id) continue;
        const home = clubKey(m.homeTeam);
        const away = clubKey(m.awayTeam);
        seenClubs.add(home);
        seenClubs.add(away);
        if (!BIG_CLUBS[home] || !BIG_CLUBS[away]) continue;
        matches.push({
          id: m.id,
          competition: COMPETITIONS[comp],
          seasonYear: Number(m.seasonYear ?? m.matchday?.seasonYear ?? 0),
          date: m.kickOffTime.date,
          round: m.round?.metaData?.type ?? null,
          leg: m.leg?.number ?? null,
          home: { key: home, id: m.homeTeam.id, logo: m.homeTeam.bigLogoUrl ?? m.homeTeam.mediumLogoUrl ?? null },
          away: { key: away, id: m.awayTeam.id, logo: m.awayTeam.bigLogoUrl ?? m.awayTeam.mediumLogoUrl ?? null },
          score: m.score.total,
          penalty: m.score.penalty ?? null,
          aggregateWinner: m.winner?.aggregate?.team?.id ?? null,
          aggregateReason: m.winner?.aggregate?.reason ?? null,
        });
      }
      if (page.length < 500) break;
    }
  }
  console.log(`${COMPETITIONS[comp]} 누적 맞대결 ${matches.length}경기`);
}

const missing = Object.keys(BIG_CLUBS).filter((k) => !seenClubs.has(k));
if (missing.length) console.log(`UEFA 기록에서 찾지 못한 구단: ${missing.join(', ')}`);

// 대진별로 묶는다. 순서는 항상 두 키를 정렬해 고정한다.
const pairs = new Map();
for (const m of matches) {
  const [a, b] = [m.home.key, m.away.key].sort();
  const key = `${a}::${b}`;
  const pair = pairs.get(key) ?? { a, b, matches: [], crests: {} };
  pair.matches.push(m);
  pair.crests[m.home.key] ??= m.home.logo;
  pair.crests[m.away.key] ??= m.away.logo;
  pairs.set(key, pair);
}

const rivalries = [];
for (const [key, pair] of pairs) {
  if (pair.matches.length < MIN_MATCHES) continue;
  const sorted = [...pair.matches].sort((x, y) => x.date.localeCompare(y.date));
  let aWin = 0, bWin = 0, draw = 0, aGoals = 0, bGoals = 0;
  for (const m of sorted) {
    const aHome = m.home.key === pair.a;
    const ag = aHome ? m.score.home : m.score.away;
    const bg = aHome ? m.score.away : m.score.home;
    aGoals += ag;
    bGoals += bg;
    if (ag > bg) aWin += 1; else if (bg > ag) bWin += 1; else draw += 1;
  }
  const n = sorted.length;
  const tight = Math.abs(aWin - bWin) <= 1 && Math.abs(aGoals - bGoals) < n;
  if (!tight) continue;
  rivalries.push({
    key,
    a: pair.a,
    b: pair.b,
    crests: pair.crests,
    matches: n,
    record: { aWin, draw, bWin },
    goals: { a: aGoals, b: bGoals },
    first: sorted[0].date,
    last: sorted.at(-1).date,
    competitions: sorted.reduce((acc, m) => ({ ...acc, [m.competition]: (acc[m.competition] ?? 0) + 1 }), {}),
    legs: sorted.map((m) => ({
      id: m.id, competition: m.competition, seasonYear: m.seasonYear, date: m.date, round: m.round, leg: m.leg,
      home: m.home.key, away: m.away.key, score: m.score, penalty: m.penalty,
      aggregateWinner: m.aggregateWinner, aggregateReason: m.aggregateReason,
    })),
  });
}
rivalries.sort((x, y) => y.matches - x.matches || x.first.localeCompare(y.first));

const payload = {
  fetchedAt: new Date().toISOString(),
  rule: { minMatches: MIN_MATCHES, winDiff: 1, goalDiff: '맞대결 수 미만', competitions: Object.values(COMPETITIONS) },
  clubs: BIG_CLUBS,
  missingClubs: missing,
  rivalries,
};
await writeFile(path.join(outDir, 'rivalries-sources.json'), `${JSON.stringify(payload, null, 1)}\n`);
console.log(`박빙 대진 ${rivalries.length}개 (카드 ${rivalries.filter((r) => r.matches >= 8).length}개, 표 ${rivalries.filter((r) => r.matches < 8).length}개) 저장 완료`);
