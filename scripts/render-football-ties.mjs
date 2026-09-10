import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Astro moves bundled modules into dist/.prerender; source data stays at the build root.
const root = pathToFileURL(resolve(process.cwd()) + '/');
const readJson = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const clubs = readJson('src/data/historical-clubs.json');
const europeanCupHistory = readJson('src/data/european-cup-seasons.json');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));

const stageMeta = {
  competition: { label: '대회 출전', noun: '출전' },
  'round-of-16': { label: '16강 진출', noun: '16강 진출' },
  'quarter-finals': { label: '8강 진출', noun: '8강 진출' },
  'semi-finals': { label: '4강 진출', noun: '4강 진출' },
  final: { label: '결승 진출', noun: '결승 진출' },
  champions: { label: '대회 우승', noun: '유러피언컵 우승' },
  'runners-up': { label: '대회 준우승', noun: '유러피언컵 준우승' }
};

function ordinal(count) {
  const native = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
  return native[count - 1] ?? `${count}번째`;
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
  if (total[0] === total[1]) throw new Error(`Level aggregate needs explicit tie-break support: ${id}`);
  const winner = total[0] > total[1] ? left : right;
  const image = (asset, cls, alt, width, height) => `<img class="${cls}" src="${escape(asset.src)}" alt="${escape(alt)}" width="${width}" height="${height}" loading="lazy" decoding="async" />`;
  const team = club => `<div class="cup-side"><div class="cup-crest-slot"${club.crest ? '' : ' aria-hidden="true"'}>${club.crest ? image(club.crest, 'cup-club-crest', `${club.name} 로고`, 68, 68) : ''}</div><strong>${escape(club.name)}</strong><span class="cup-original">${escape(club.original)}</span><span class="cup-country"><span class="cup-flag-slot">${image(club.flag, 'cup-flag', `${club.country} 국기`, 24, 16)}</span>${escape(club.country)}</span></div>`;
  const nextStage = { '16강': '8강', '8강': '4강', '4강': '결승' }[tie.stage];
  if (!nextStage) throw new Error(`Unsupported knockout stage: ${tie.stage}`);
  const facts = tie.legs.map((leg, i) => `<div><dt>${tie.stage === '4강' ? '4강 ' : ''}${i + 1}차전</dt><dd>${leg[0]} : ${leg[1]}</dd></div>`).join('');
  return `<section class="cup-tie" aria-labelledby="${id}" data-tie="${collection}:${id}"><p class="cup-tie-stage">${escape(data.season)} 유러피언컵 · ${escape(tie.stage)}</p><h3 class="cup-match" id="${id}">${escape(left.name)} vs ${escape(right.name)}</h3><div class="cup-scoreboard">${team(left)}<div class="cup-aggregate"><span>합계</span><strong>${total[0]}<i>:</i>${total[1]}</strong><small>두 경기 결과</small></div>${team(right)}</div><dl class="cup-leg-results">${facts}<div><dt>${nextStage} 진출</dt><dd>${escape(winner.name)}</dd></div></dl><p class="cup-match-deck">${escape(tie.deck)}</p></section>`;
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

// Build-time expansion only: no client script, remote fetch or runtime dependency.
export function expandFootballTies(html) {
  const milestones = html.replace(/<div data-european-cup-milestone="(\d{4}-\d{2}):(competition|round-of-16|quarter-finals|semi-finals|final|champions|runners-up)"><\/div>/g, (_, season, stage) => renderEuropeanCupMilestone(season, stage));
  const expanded = milestones.replace(/<div data-football-tie="([a-z0-9-]+):(match-\d+)"><\/div>/g, (_, collection, id) => renderTie(collection, id));
  if (expanded.includes('data-football-tie=') || expanded.includes('data-european-cup-milestone=')) throw new Error('Malformed football archive placeholder');
  return expanded;
}
