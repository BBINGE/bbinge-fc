import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

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
  for (const index of data.weights.keys()) {
    if (data.ranking.reduce((sum, row) => sum + row.votes[index], 0) !== data.voters) throw new Error('Incomplete ballot column');
  }
  return data;
}

function ranking(data, detailed) {
  const heading = detailed ? '<th scope="col">1위표</th><th scope="col">2위표</th><th scope="col">3위표</th><th scope="col">4위표</th><th scope="col">5위표</th><th scope="col">선정 기자</th>' : '<th scope="col">국적</th><th scope="col">1956년 소속 구단</th>';
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

export function expandAwardRecords(html) {
  const expanded = html.replace(/<div data-award-record="(\d{4}-[a-z-]+):(ranking|ballots|identity-[a-z-]+)"><\/div>/g, (_, id, section) => {
    const data = readAwardEdition(id);
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
