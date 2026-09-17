import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Astro moves bundled modules into dist/.prerender; source data stays at the build root.
const root = pathToFileURL(resolve(process.cwd()) + '/');
const readJson = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const clubs = readJson('src/data/historical-clubs.json');
const europeanCupHistory = readJson('src/data/european-cup-seasons.json');
const europeanCupScorers = readJson('src/data/european-cup-scorers.json');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));

const stageMeta = {
  competition: { label: '대회 출전', noun: '출전' },
  // 1956-57 시즌부터 존재한 공식 예선. 이전 시즌에는 소급하지 않는다.
  'preliminary-round': { label: '예선 출전', noun: '예선 출전' },
  'round-of-16': { label: '16강 진출', noun: '16강 진출' },
  'quarter-finals': { label: '8강 진출', noun: '8강 진출' },
  'semi-finals': { label: '4강 진출', noun: '4강 진출' },
  final: { label: '결승 진출', noun: '결승 진출' },
  champions: { label: '대회 우승', noun: '유러피언컵 우승' },
  'runners-up': { label: '대회 준우승', noun: '유러피언컵 준우승' }
};

function ordinal(count) {
  if (count === 1) return '첫';
  const native = ['', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
  return native[count - 1] ? `${native[count - 1]} 번째` : `${count}번째`;
}

function validateHistory() {
  const seenSeasons = new Set();
  for (const [index, record] of europeanCupHistory.seasons.entries()) {
    if (!/^\d{4}-\d{2}$/.test(record.season) || seenSeasons.has(record.season)) throw new Error(`Invalid or duplicate European Cup season: ${record.season}`);
    if (index > 0 && europeanCupHistory.seasons[index - 1].season >= record.season) throw new Error(`European Cup seasons must be chronological: ${record.season}`);
    seenSeasons.add(record.season);
    const entrants = record.entrants.map(entry => entry.club);
    if (new Set(entrants).size !== entrants.length) throw new Error(`Duplicate European Cup entrant: ${record.season}`);
    if (record.entrants.some(entry => typeof entry.background !== 'string' || entry.background.length === 0)) throw new Error(`Missing European Cup entrant background: ${record.season}`);
    for (const id of entrants) resolveClub(id, record.season);
    for (const [stage, ids] of Object.entries(record.stages)) {
      if (!stageMeta[stage] || new Set(ids).size !== ids.length || ids.some(id => !entrants.includes(id))) throw new Error(`Invalid European Cup stage: ${record.season}, ${stage}`);
    }
  }
}

export function resolveClub(id, season) {
  const club = clubs[id];
  if (!club) throw new Error(`Unknown historical club: ${id}`);
  const select = kind => {
    const candidates = club[kind].filter(asset => asset.seasons.includes(season));
    if (candidates.length > 1) throw new Error(`Ambiguous ${kind}: ${id}, ${season}`);
    const asset = candidates[0];
    if (asset && (!asset.src.startsWith('/images/') || asset.src.includes('..') || !existsSync(new URL(`public${asset.src}`, root)))) throw new Error(`Missing local ${kind}: ${id}`);
    return asset;
  };
  const flag = select('flags');
  if (!flag) throw new Error(`Unreviewed historical flag: ${id}, ${season}`);
  return { ...club, flag, crest: select('crests') };
}

export function renderTie(collection, id) {
  if (!/^[a-z0-9-]+$/.test(collection) || !/^match-\d+$/.test(id)) throw new Error('Invalid football tie key');
  const data = readJson(`src/data/cup-ties/${collection}.json`);
  const tie = data.ties[id];
  if (!tie) throw new Error(`Unknown tie: ${collection}:${id}`);
  if (tie.legs.length !== 2 || tie.legs.some(leg => leg.length !== 2 || leg.some(score => !Number.isInteger(score) || score < 0))) throw new Error(`Invalid two-leg result: ${id}`);
  const left = resolveClub(tie.left, data.season);
  const right = resolveClub(tie.right, data.season);
  const total = [0, 1].map(side => tie.legs.reduce((sum, leg) => sum + leg[side], 0));
  const level = total[0] === total[1];
  // 원정 다득점 규정이 없던 시절, 합계 동률은 재경기로 가렸다. 재경기는 동률 대진에만 둔다.
  const playoff = tie.playoff;
  if (level && !playoff) throw new Error(`Level aggregate needs a recorded replay: ${id}`);
  if (!level && playoff) throw new Error(`Replay recorded for a decided aggregate: ${id}`);
  if (playoff && (playoff.length !== 2 || playoff.some(score => !Number.isInteger(score) || score < 0) || playoff[0] === playoff[1])) throw new Error(`Invalid replay result: ${id}`);
  const winner = (playoff ? playoff[0] > playoff[1] : total[0] > total[1]) ? left : right;
  const image = (asset, cls, alt, width, height) => `<img class="${cls}" src="${escape(asset.src)}" alt="${escape(alt)}" width="${width}" height="${height}" loading="lazy" decoding="async" />`;
  const team = club => `<div class="cup-side"><div class="cup-crest-slot"${club.crest ? '' : ' aria-hidden="true"'}>${club.crest ? image(club.crest, 'cup-club-crest', `${club.name} 로고`, 68, 68) : ''}</div><strong>${escape(club.name)}</strong><span class="cup-original">${escape(club.original)}</span><span class="cup-country"><span class="cup-flag-slot">${image(club.flag, 'cup-flag', `${club.country} 국기`, 24, 16)}</span>${escape(club.country)}</span></div>`;
  // 결승도 두 경기로 치른 대회(1955-58 페어스컵)는 진출 칸 대신 우승 칸을 둔다.
  const advanceLabel = { '예선': '16강 진출', '16강': '8강 진출', '8강': '4강 진출', '4강': '결승 진출', '결승': '우승' }[tie.stage];
  if (!advanceLabel) throw new Error(`Unsupported knockout stage: ${tie.stage}`);
  const competition = data.competition || '유러피언컵';
  const legFacts = tie.legs.map((leg, i) => `<div><dt>${tie.stage === '4강' || tie.stage === '결승' ? `${tie.stage} ` : ''}${i + 1}차전</dt><dd>${leg[0]} : ${leg[1]}</dd></div>`).join('');
  const facts = playoff ? `${legFacts}<div class="cup-replay"><dt>재경기</dt><dd>${playoff[0]} : ${playoff[1]}</dd></div>` : legFacts;
  const aggregateNote = playoff ? '재경기로 결정' : '두 경기 결과';
  // 득점자 줄(페어스컵 4강·결승, 유러피언컵 4강 대진): 차전마다 [왼쪽, 오른쪽] 득점 목록. 'N분' 개수가 스코어와 맞지 않으면 빌드를 멈춘다.
  const goalRows = tie.goals ? [...tie.goals.map((goals, i) => [`${tie.stage === '4강' || tie.stage === '결승' ? `${tie.stage} ` : ''}${i + 1}차전`, goals, tie.legs[i]]), ...(playoff ? [['재경기', tie.playoffGoals, playoff]] : [])] : [];
  for (const [label, goals, score] of goalRows) {
    if (!Array.isArray(goals) || goals.length !== 2) throw new Error(`Missing scorers: ${id} ${label}`);
    goals.forEach((list, side) => { const count = list.join(' ').match(/\d+분/g)?.length ?? 0; if (count !== score[side]) throw new Error(`Scorer count mismatch: ${id} ${label}`); });
  }
  const goalList = list => list.length ? list.map(goal => `<span class="cup-goal">${escape(goal)}</span>`).join(', ') : '<span class="cup-goal-none">득점 없음</span>';
  const goalsHtml = goalRows.length ? `<div class="cup-tie-goals" aria-label="차전별 득점자">${goalRows.map(([label, goals]) => `<div class="cup-goal-row"><p class="cup-goal-side cup-goal-side--left"><span class="cup-goal-team">${escape(left.name)}</span>${goalList(goals[0])}</p><p class="cup-goal-leg">${escape(label)}</p><p class="cup-goal-side cup-goal-side--right"><span class="cup-goal-team">${escape(right.name)}</span>${goalList(goals[1])}</p></div>`).join('')}</div>` : '';
  return `<section class="cup-tie" aria-labelledby="${id}" data-tie="${collection}:${id}"><p class="cup-tie-stage">${escape(data.season)} ${escape(competition)} · ${escape(tie.stage)}</p><h3 class="cup-match" id="${id}">${escape(left.name)} vs ${escape(right.name)}</h3><div class="cup-scoreboard">${team(left)}<div class="cup-aggregate"><span>합계</span><strong>${total[0]}<i>:</i>${total[1]}</strong><small>${aggregateNote}</small></div>${team(right)}</div><dl class="cup-leg-results${playoff ? ' cup-leg-results--replay' : ''}">${facts}<div class="cup-advance"><dt>${advanceLabel}</dt><dd>${escape(winner.name)}</dd></div></dl>${goalsHtml}<p class="cup-match-deck">${escape(tie.deck)}</p></section>`;
}

// 접이식 결과표: 대진 JSON에서 만들어 카드와 같은 로고·국기·팀명을 쓴다. 재경기 대진이 있는 단계만 재경기 열을 연다.
export function renderResultTable(collection, stage) {
  if (!/^[a-z0-9-]+$/.test(collection)) throw new Error('Invalid football results key');
  const data = readJson(`src/data/cup-ties/${collection}.json`);
  const ties = Object.entries(data.ties).filter(([, tie]) => tie.stage === stage);
  if (ties.length === 0) throw new Error(`No ties for results table: ${collection}:${stage}`);
  const hasReplay = ties.some(([, tie]) => tie.playoff);
  const image = (asset, cls, width, height) => `<img class="${cls}" src="${escape(asset.src)}" alt="" width="${width}" height="${height}" loading="lazy" decoding="async" />`;
  const team = (club, withFlag = true) => `<span class="cup-result-team"><span class="cup-result-crest">${club.crest ? image(club.crest, '', 28, 28) : ''}</span><span class="cup-result-name">${escape(club.name)}</span>${withFlag ? image(club.flag, 'cup-result-flag', 20, 14) : ''}</span>`;
  const rows = ties.map(([id, tie]) => {
    // renderTie와 같은 검증을 거친 결과만 표에 싣는다.
    renderTie(collection, id);
    const left = resolveClub(tie.left, data.season);
    const right = resolveClub(tie.right, data.season);
    const total = [0, 1].map(side => tie.legs.reduce((sum, leg) => sum + leg[side], 0));
    const winner = (tie.playoff ? tie.playoff[0] > tie.playoff[1] : total[0] > total[1]) ? left : right;
    const legs = tie.legs.map((leg, i) => `<td class="cup-result-score" data-label="${i + 1}차전">${leg[0]}-${leg[1]}</td>`).join('');
    const replay = hasReplay ? `<td class="cup-result-score" data-label="재경기">${tie.playoff ? `${tie.playoff[0]}-${tie.playoff[1]}` : '<span class="cup-result-empty" aria-label="재경기 없음">·</span>'}</td>` : '';
    return `<tr><td class="cup-result-match">${team(left)}${team(right)}</td>${legs}${replay}<td class="cup-result-score cup-result-total" data-label="합계">${total[0]}-${total[1]}</td><td class="cup-result-winner" data-label="진출">${team(winner, false)}</td></tr>`;
  }).join('');
  const label = `${data.season} ${data.competition} ${stage} ${ties.length}개 대진 결과 표`;
  return `<div class="cup-result-scroll" tabindex="0" role="region" aria-label="${escape(label)}"><table class="cup-result-table${hasReplay ? ' has-replay' : ''}"><thead><tr><th scope="col">대진</th><th scope="col">1차전</th><th scope="col">2차전</th>${hasReplay ? '<th scope="col">재경기</th>' : ''}<th scope="col">합계</th><th scope="col">진출</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function renderEuropeanCupMilestone(season, stage) {
  if (!/^\d{4}-\d{2}$/.test(season) || !stageMeta[stage]) throw new Error('Invalid European Cup milestone key');
  validateHistory();
  const seasonIndex = europeanCupHistory.seasons.findIndex(record => record.season === season);
  if (seasonIndex < 0) throw new Error(`Unknown European Cup season: ${season}`);
  const record = europeanCupHistory.seasons[seasonIndex];
  const meta = stageMeta[stage];
  const entries = stage === 'competition' ? record.entrants : record.stages[stage]?.map(club => ({ club }));
  if (!entries) throw new Error(`Unrecorded European Cup stage: ${season}, ${stage}`);
  const countFor = id => europeanCupHistory.seasons.slice(0, seasonIndex + 1).filter(item => {
    const ids = stage === 'competition' ? item.entrants.map(entry => entry.club) : (item.stages[stage] ?? []);
    return ids.includes(id);
  }).length;
  const image = (asset, cls, alt, width, height) => `<img class="${cls}" src="${escape(asset.src)}" alt="${escape(alt)}" width="${width}" height="${height}" loading="lazy" decoding="async" />`;
  const rows = entries.map(entry => {
    const club = resolveClub(entry.club, season);
    const crest = club.crest ? image(club.crest, '', '', 32, 32) : '';
    const flag = image(club.flag, '', '', 20, 14);
    const name = entry.displayName ?? club.name;
    const count = countFor(entry.club);
    if (stage === 'competition') return `<tr><td><span class="cup-participant-country">${image(club.flag, '', '', 28, 20)}${escape(club.country)}</span></td><td><span class="cup-entrant-club">${crest}${escape(name)}</span></td><td>통산 ${ordinal(count)} 유러피언컵 출전</td><td>${escape(entry.background)}</td></tr>`;
    return `<tr><td><span class="cup-entrant-club">${crest}${escape(name)}</span></td><td><span class="cup-entrant-country">${escape(club.country)}${flag}</span></td><td>통산 ${ordinal(count)} ${escape(meta.noun)}</td></tr>`;
  }).join('');
  if (stage === 'competition') return `<div class="cup-participant-scroll" tabindex="0" role="region" aria-label="${escape(season)} ${escape(record.competition)} 참가 구단별 누적 출전 횟수와 국내 성적 표"><table><thead><tr><th scope="col">대표 지역</th><th scope="col">참가 구단</th><th scope="col">유러피언컵 출전</th><th scope="col">참가팀을 이해할 국내 성적·배경</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  return `<div class="cup-stage-scroll" tabindex="0" role="region" aria-label="${escape(season)} ${escape(record.competition)} ${escape(meta.label)} 구단별 누적 횟수 표"><table><thead><tr><th scope="col">구단</th><th scope="col">대표 지역</th><th scope="col">${escape(meta.label)}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// 득점 순위표: 골 수 내림차순, 공동 순위는 앞선 선수 수 + 1. 클럽 문장은 해당 시즌 자산을 쓴다.
export function renderTopScorers(season) {
  if (!/^\d{4}(-\d{2})?$/.test(season)) throw new Error('Invalid top scorers key');
  const record = europeanCupScorers.seasons.find(item => item.season === season);
  if (!record) throw new Error('Unknown top scorers season: ' + season);
  const list = record.scorers;
  // 출전 기록이 남지 않은 대회는 출전 칸을 만들지 않는다. 일부만 아는 경우는 표를 내지 않고 데이터를 채운 뒤 낸다.
  const hasApps = list.every(p => p.apps !== undefined);
  if (!hasApps && list.some(p => p.apps !== undefined)) throw new Error('Partial appearance data: ' + season);
  list.forEach((p, i) => {
    if (!Number.isInteger(p.goals) || p.goals < record.cutoff) throw new Error('Invalid scorer record: ' + p.name);
    if (hasApps && (!Number.isInteger(p.apps) || p.apps < 1)) throw new Error('Invalid scorer appearances: ' + p.name);
    if (i > 0 && list[i - 1].goals < p.goals) throw new Error('Scorers must be sorted by goals: ' + p.name);
    const expected = 1 + list.filter(q => q.goals > p.goals).length;
    if (p.rank !== expected) throw new Error('Wrong rank for ' + p.name + ': ' + p.rank + ' (expected ' + expected + ')');
    if (!p.flag.startsWith('/images/flags/') || !existsSync(new URL('public' + p.flag, root))) throw new Error('Missing scorer flag: ' + p.name);
  });
  if (list.reduce((sum, p) => sum + p.goals, 0) > record.goals) throw new Error('Scorer goals exceed season total: ' + season);
  const image = (src, cls, width, height) => '<img class="' + cls + '" src="' + escape(src) + '" alt="" width="' + width + '" height="' + height + '" loading="lazy" decoding="async" />';
  const rows = list.map(p => {
    const club = resolveClub(p.club, season);
    const tied = list.filter(q => q.rank === p.rank).length > 1;
    const crest = club.crest ? image(club.crest.src, '', 28, 28) : '';
    return '<tr' + (p.rank === 1 ? ' class="is-top"' : '') + '>'
      + '<td class="cup-scorer-rank" data-label="순위">' + (tied ? '공동 ' : '') + p.rank + '위</td>'
      + '<td class="cup-scorer-player"><strong>' + escape(p.name) + '</strong><span lang="' + escape(p.lang) + '">' + escape(p.original) + '</span></td>'
      + '<td class="cup-scorer-club" data-label="클럽"><span class="cup-result-team"><span class="cup-result-crest">' + crest + '</span><span class="cup-result-name">' + escape(club.name) + '</span></span></td>'
      + '<td class="cup-scorer-origin" data-label="출신"><span>' + image(p.flag, 'cup-result-flag', 20, 14) + escape(p.origin) + '</span></td>'
      + (hasApps ? '<td class="cup-scorer-num" data-label="출전">' + p.apps + '경기</td>' : '')
      + '<td class="cup-scorer-num cup-scorer-goals" data-label="득점">' + p.goals + '골</td></tr>';
  }).join('');
  const label = season + ' ' + record.competition + ' 득점 순위 표, ' + record.cutoff + '골 이상';
  return '<div class="cup-scorer-scroll" tabindex="0" role="region" aria-label="' + escape(label) + '"><table class="cup-scorer-table"><thead><tr><th scope="col">순위</th><th scope="col">선수</th><th scope="col">클럽</th><th scope="col">출신</th>' + (hasApps ? '<th scope="col">출전</th>' : '') + '<th scope="col">득점</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

// 조별리그(1955-58 인터시티스 페어스컵): 경기 결과에서 순위를 계산하고, 기록한 조 1위와 다르면 빌드를 멈춘다.
function loadGroups(collection) {
  if (!/^[a-z0-9-]+$/.test(collection)) throw new Error('Invalid football group key');
  return readJson(`src/data/cup-groups/${collection}.json`);
}

export function computeGroupTable(data, key) {
  const group = data.groups[key];
  if (!group) throw new Error(`Unknown group: ${key}`);
  const win = data.pointsForWin;
  const rows = new Map(group.teams.map(id => [id, { id, played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 }]));
  for (const match of group.matches) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(match.date) || match.home === match.away || !rows.has(match.home) || !rows.has(match.away)) throw new Error(`Invalid group match: ${key} ${match.date}`);
    if (match.score.length !== 2 || match.score.some(goal => !Number.isInteger(goal) || goal < 0)) throw new Error(`Invalid group score: ${key} ${match.date}`);
    const [h, a] = match.score;
    for (const [id, gf, ga] of [[match.home, h, a], [match.away, a, h]]) {
      const row = rows.get(id);
      row.played += 1; row.for += gf; row.against += ga;
      if (gf > ga) { row.won += 1; row.points += win; } else if (gf === ga) { row.drawn += 1; row.points += 1; } else row.lost += 1;
    }
  }
  const table = [...rows.values()].sort((x, y) => y.points - x.points || (y.for - y.against) - (x.for - x.against) || y.for - x.for);
  if (table.length > 1 && table[0].points === table[1].points && table[0].for - table[0].against === table[1].for - table[1].against && table[0].for === table[1].for) throw new Error(`Unresolved group tie: ${key}`);
  if (table[0].id !== group.winner) throw new Error(`Recorded group winner does not match results: ${key}`);
  return table;
}

// 조별 경기 득점자 줄: [홈, 원정] 득점 목록. 'N분' 개수가 스코어와 맞지 않으면 빌드를 멈춘다.
function goalLineHtml(goals, score, label) {
  if (!Array.isArray(goals) || goals.length !== 2) throw new Error(`Missing scorers: ${label}`);
  goals.forEach((list, side) => { const count = list.join(' ').match(/\d+분/g)?.length ?? 0; if (count !== score[side]) throw new Error(`Scorer count mismatch: ${label}`); });
  if (score[0] + score[1] === 0) return '';
  const side = (list, cls) => `<span class="cup-group-goals ${cls}">${list.map(goal => `<span class="cup-goal">${escape(goal)}</span>`).join(', ')}</span>`;
  return side(goals[0], 'cup-group-goals--home') + side(goals[1], 'cup-group-goals--away');
}

export function renderGroup(collection, key) {
  const data = loadGroups(collection);
  const group = data.groups[key];
  const table = computeGroupTable(data, key);
  const image = (asset, cls, width, height) => `<img class="${cls}" src="${escape(asset.src)}" alt="" width="${width}" height="${height}" loading="lazy" decoding="async" />`;
  const team = (club, compact = false) => `<span class="cup-result-team"><span class="cup-result-crest">${club.crest ? image(club.crest, '', 28, 28) : ''}</span><span class="cup-result-name">${escape(club.name)}</span>${compact ? '' : image(club.flag, 'cup-result-flag', 20, 14)}</span>`;
  const rows = table.map((row, index) => {
    const club = resolveClub(row.id, data.season);
    return `<tr${index === 0 ? ' class="is-winner"' : ''}><td class="cup-group-rank">${index + 1}</td><td class="cup-group-team">${team(club)}</td><td data-label="경기">${row.played}</td><td data-label="승">${row.won}</td><td data-label="무">${row.drawn}</td><td data-label="패">${row.lost}</td><td data-label="득실">${row.for}:${row.against}</td><td class="cup-group-points" data-label="승점">${row.points}</td></tr>`;
  }).join('');
  const withdrawn = group.withdrawn.map(id => {
    const club = resolveClub(id, data.season);
    return `<tr class="is-withdrawn"><td class="cup-group-rank">-</td><td class="cup-group-team">${team(club)}</td><td colspan="6" class="cup-group-note">기권</td></tr>`;
  }).join('');
  const date = value => { const [y, m, d] = value.split('-'); return `${y}.${m}.${d}`; };
  const matches = [...group.matches].sort((x, y) => x.date.localeCompare(y.date)).map(match => {
    const home = resolveClub(match.home, data.season);
    const away = resolveClub(match.away, data.season);
    return `<li><time datetime="${match.date}">${date(match.date)}</time><span class="cup-group-home">${team(home, true)}</span><strong>${match.score[0]} : ${match.score[1]}</strong><span class="cup-group-away">${team(away, true)}</span>${match.goals ? goalLineHtml(match.goals, match.score, `${key}조 ${match.date}`) : ''}</li>`;
  }).join('');
  const winner = resolveClub(group.winner, data.season);
  return `<section class="cup-group" aria-labelledby="group-${key.toLowerCase()}" data-group="${collection}:${key}"><p class="cup-tie-stage">${escape(data.season)} ${escape(data.competition)} · 조별리그</p><h3 class="cup-group-title" id="group-${key.toLowerCase()}">${escape(key)}조</h3><div class="cup-group-scroll" tabindex="0" role="region" aria-label="${escape(key)}조 순위표"><table class="cup-group-table"><thead><tr><th scope="col">순위</th><th scope="col">팀</th><th scope="col">경기</th><th scope="col">승</th><th scope="col">무</th><th scope="col">패</th><th scope="col">득실</th><th scope="col">승점</th></tr></thead><tbody>${rows}${withdrawn}</tbody></table></div><ol class="cup-group-matches" aria-label="${escape(key)}조 경기 결과">${matches}</ol><dl class="cup-leg-results cup-group-summary"><div class="cup-advance"><dt>4강 진출</dt><dd>${escape(winner.name)}</dd></div></dl><p class="cup-match-deck">${escape(group.deck)}</p></section>`;
}

// 참가팀 표: 도시 선발팀과 구단을 구분하고 조·결과를 붙인다. 누적 횟수는 페어스컵만 따로 센다(첫 대회라 모두 첫 출전).
export function renderGroupEntrants(collection) {
  const data = loadGroups(collection);
  const image = (asset, width, height) => `<img src="${escape(asset.src)}" alt="" width="${width}" height="${height}" loading="lazy" decoding="async" />`;
  const rows = Object.entries(data.groups).flatMap(([key, group]) => {
    computeGroupTable(data, key);
    return [...group.teams, ...group.withdrawn].map(id => {
      const club = resolveClub(id, data.season);
      const result = group.withdrawn.includes(id) ? '기권' : id === group.winner ? '조 1위 · 4강 진출' : '조별리그 탈락';
      return `<tr><td><span class="cup-participant-country">${image(club.flag, 28, 20)}${escape(club.country)}</span></td><td><span class="cup-entrant-club">${club.crest ? image(club.crest, 32, 32) : ''}${escape(club.name)}</span></td><td>${club.kind === 'city-select' ? '도시 선발팀' : '구단'}</td><td>${escape(key)}조</td><td>${result}</td></tr>`;
    });
  }).join('');
  return `<div class="cup-participant-scroll" tabindex="0" role="region" aria-label="${escape(data.season)} ${escape(data.competition)} 참가팀과 조 편성 표"><table><thead><tr><th scope="col">국가</th><th scope="col">참가팀</th><th scope="col">구분</th><th scope="col">조</th><th scope="col">결과</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// Build-time expansion only: no client script, remote fetch or runtime dependency.
export function expandFootballTies(html) {
  const grouped = html.replace(/<div data-football-group="([a-z0-9-]+):([A-H])"><\/div>/g, (_, collection, key) => renderGroup(collection, key)).replace(/<div data-football-group-entrants="([a-z0-9-]+)"><\/div>/g, (_, collection) => renderGroupEntrants(collection));
  if (grouped.includes('data-football-group=') || grouped.includes('data-football-group-entrants=')) throw new Error('Malformed football group placeholder');
  html = grouped;
  const milestones = html.replace(/<div data-european-cup-milestone="(\d{4}-\d{2}):(competition|preliminary-round|round-of-16|quarter-finals|semi-finals|final|champions|runners-up)"><\/div>/g, (_, season, stage) => renderEuropeanCupMilestone(season, stage));
  const scorers = milestones.replace(/<div data-european-cup-scorers="(\d{4}(?:-\d{2})?)"><\/div>/g, (_, season) => renderTopScorers(season));
  const results = scorers.replace(/<div data-football-results="([a-z0-9-]+):(예선|16강|8강|4강)"><\/div>/g, (_, collection, stage) => renderResultTable(collection, stage));
  const expanded = results.replace(/<div data-football-tie="([a-z0-9-]+):(match-\d+)"><\/div>/g, (_, collection, id) => renderTie(collection, id));
  if (expanded.includes('data-football-tie=') || expanded.includes('data-european-cup-milestone=') || expanded.includes('data-football-results=') || expanded.includes('data-european-cup-scorers=')) throw new Error('Malformed football archive placeholder');
  return expanded;
}
