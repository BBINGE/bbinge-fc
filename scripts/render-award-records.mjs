import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveClub } from './render-football-ties.mjs';

const read = file => JSON.parse(readFileSync(resolve(file), 'utf8'));
const identities = read('src/data/historical-identities.json');
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function resolveHistoricalIdentity(id, year) {
  const matches = identities[id]?.filter(item => item.years.includes(year)) ?? [];
  if (matches.length !== 1) throw new Error(`Unreviewed or ambiguous identity: ${id} / ${year}`);
  const item = matches[0];
  if (!item.src.startsWith('/images/') || item.src.includes('..') || !existsSync(resolve('public' + item.src))) throw new Error(`Missing identity asset: ${id}`);
  return item;
}

// Shared by award records and any player archive with an explicit historical year.
export function renderHistoricalIdentity(rows, year, label) {
  return `<div class="historical-identity" aria-label="${escape(label)} 국가·대표팀·클럽"><div class="identity-stack">${rows.map(row => {
    const item = resolveHistoricalIdentity(row.id, year);
    return `<section class="identity-row identity-${item.theme}" data-identity-kind="${item.kind}" data-identity-id="${row.id}"><span class="identity-art${item.wide ? ' identity-art-wide' : ''}"><img src="${item.src}" width="100" height="86" alt="${escape(item.name)} ${item.kind.includes('country') ? '국기' : '당시 문장'}" loading="lazy" decoding="async" /></span><div><span class="identity-label">${escape(item.label)}</span><strong>${escape(item.name)}</strong><small>${escape(item.original)}</small></div></section>`;
  }).join('')}</div></div>`;
}

export function readAwardEdition(id) {
  if (!/^\d{4}-[a-z-]+$/.test(id)) throw new Error('Invalid award edition');
  const data = read(`src/data/awards/${id}.json`);
  for (const [index, row] of data.ranking.entries()) {
    if (row.nationalities && (!Array.isArray(row.nationalities) || !row.nationalities.length || row.nationalities.some(n => typeof n !== 'string' || !n.trim()))) throw new Error('Invalid nationality history');
    if (row.votes.length !== data.weights.length || row.votes.some(n => !Number.isInteger(n) || n < 0)) throw new Error('Invalid ballot counts');
    if (row.points !== row.votes.reduce((sum, n, i) => sum + n * data.weights[i], 0)) throw new Error(`Incorrect points: ${row.name}`);
    const expected = index && row.points === data.ranking[index - 1].points ? data.ranking[index - 1].rank : index + 1;
    if (row.rank !== expected || (index && row.points > data.ranking[index - 1].points)) throw new Error(`Incorrect rank: ${row.name}`);
  }
  // 발표 원자료에 순위표 수가 기자 수와 다른 칸이 있으면(1957년 5위표 17장) 칸별 값과 근거 메모를 함께 적어야 한다.
  const columnTotals = data.ballotColumns ?? data.weights.map(() => data.voters);
  if (!Array.isArray(columnTotals) || columnTotals.length !== data.weights.length || columnTotals.some(n => !Number.isInteger(n) || n < data.voters)) throw new Error('Invalid ballot column totals');
  if (data.ballotColumns && !String(data.ballotNote ?? '').trim()) throw new Error('Ballot column exception needs a source note');
  for (const index of data.weights.keys()) {
    if (data.ranking.reduce((sum, row) => sum + row.votes[index], 0) !== columnTotals[index]) throw new Error('Incomplete ballot column');
  }
  return data;
}

function ranking(data, detailed) {
  const heading = detailed ? '<th scope="col">1위표</th><th scope="col">2위표</th><th scope="col">3위표</th><th scope="col">4위표</th><th scope="col">5위표</th><th scope="col">선정 기자</th>' : `<th scope="col">국적</th><th scope="col">${data.year}년 소속 구단</th>`;
  const columns = detailed ? [8,27,8,8,8,8,8,15,10] : [8,29,20,33,10];
  // Explicit table roles preserve header relationships when narrow-screen rows use CSS grid.
  return `<div class="award-table-wrap" role="region" aria-label="${data.year}년 발롱도르 ${detailed ? '순위별 투표 내역' : '전체 랭킹'}"><table role="table" class="award-ranking${detailed ? ' award-ballots' : ''}"><colgroup>${columns.map(width => `<col style="width:${width}%">`).join('')}</colgroup><thead role="rowgroup"><tr role="row"><th scope="col">순위</th><th scope="col">선수</th>${heading}<th scope="col">점수</th></tr></thead><tbody role="rowgroup">${data.ranking.map((row, index) => {
    const tied = data.ranking.filter(item => item.points === row.points).length > 1;
    const nationality = (row.nationalities ?? [row.country]).map(n => `<span>${escape(n)}</span>`).join('');
    return `<tr role="row" data-award-rank="${row.rank}">
      <td role="cell" class="award-place">${tied ? '<span>공동</span>' : ''}${row.rank}</td>
      <th role="rowheader" scope="row" class="award-player">${escape(row.name)}<small>${escape(row.original)}</small></th>
      ${detailed ? row.votes.map((n, i) => `<td role="cell" class="award-vote" data-label="${i + 1}위표">${n}</td>`).join('') + `<td role="cell" class="award-voters" data-label="선정 기자">${row.votes.reduce((a,b) => a+b,0)}명</td>` : `<td role="cell" class="award-nationality" data-label="국적">${nationality}</td><td role="cell" class="award-clubs" data-label="${data.year}년 소속 구단">${row.clubs.map(club => `<span>${escape(club)}</span>`).join('')}</td>`}
      <td role="cell" class="award-points" data-label="점수"><strong>${row.points}</strong></td>
    </tr>`;
  }).join('')}</tbody></table></div>`;
}

// 상단 시즌 우승팀 칸(운영자 지시, 2026-09-22 "대회 로고도 넣자 발롱도르 통일"): 대회 로고 + 팀 문장(클럽) 또는 국기(나라)를 데이터에서 그린다.
// 클럽은 historical-clubs.json의 시즌별 문장, 대회 로고는 competition-logos.json의 시대 자산만 쓴다.
const competitionLogos = read('src/data/competition-logos.json');
function localAsset(src, label) {
  if (!src?.startsWith('/images/') || src.includes('..') || !existsSync(resolve('public' + src))) throw new Error(`Missing ${label}: ${src}`);
  return src;
}
function seasonTeam(entry, season) {
  let name, icon, kind;
  if (entry.club) {
    const club = resolveClub(entry.club, entry.season ?? season);
    if (!club.crest) throw new Error(`Season results need a reviewed crest: ${entry.club}`);
    name = club.name; icon = localAsset(club.crest.src, 'crest'); kind = 'crest';
  } else if (entry.country) {
    name = entry.country; icon = localAsset(entry.flag, 'flag'); kind = 'flag';
  } else throw new Error('Season result entry needs club or country');
  return `<span class="award-team"><img class="award-team-${kind}" src="${icon}" width="${kind === 'flag' ? 36 : 28}" height="${kind === 'flag' ? 24 : 28}" alt="" loading="lazy" decoding="async" /><span>${escape(name)}${entry.note ? ` <small>(${escape(entry.note)})</small>` : ''}</span></span>`;
}
function seasonResults(data) {
  const block = data.seasonResults;
  if (!block?.competitions?.length) throw new Error('Missing seasonResults');
  return block.competitions.map(comp => {
    const logo = comp.logo ? competitionLogos[comp.logo] : null;
    if (comp.logo && !logo) throw new Error(`Unknown competition logo: ${comp.logo}`);
    const logoHtml = logo ? `<img class="award-competition-logo" src="${localAsset(logo.src, 'competition logo')}" width="${logo.width}" height="${logo.height}" alt="${escape(logo.alt)}" loading="lazy" decoding="async" />` : '';
    const cite = comp.cite ? ` <a class="cite" href="#source-${comp.cite}">[${comp.cite}]</a>` : '';
    const rows = comp.rows.map(row => `<div><dt>${escape(row.label)}</dt><dd>${row.entries.map(e => seasonTeam(e, comp.season)).join('')}</dd></div>`).join('');
    return `<div class="award-competition"><h3>${logoHtml}<span>${escape(comp.name)}${cite}</span></h3><dl>${rows}</dl></div>`;
  }).join('\n');
}

export function expandAwardRecords(html) {
  const expanded = html.replace(/<div data-award-record="(\d{4}-[a-z-]+):(ranking|ballots|season|identity-[a-z-]+)"><\/div>/g, (_, id, section) => {
    const data = readAwardEdition(id);
    if (section === 'season') return seasonResults(data);
    if (section.startsWith('identity-')) {
      const profile = data.profiles[section.slice(9)];
      if (!profile) throw new Error('Unknown award profile');
      return renderHistoricalIdentity(profile.rows, data.year, profile.name);
    }
    return ranking(data, section === 'ballots');
  });
  if (expanded.includes('data-award-record=')) throw new Error('Malformed award record placeholder');
  return expanded;
}
