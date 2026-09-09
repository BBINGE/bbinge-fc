import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Astro moves bundled modules into dist/.prerender; source data stays at the build root.
const root = pathToFileURL(resolve(process.cwd()) + '/');
const readJson = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const clubs = readJson('src/data/historical-clubs.json');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));

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
  const team = club => `<div class="cup-side">${club.crest ? image(club.crest, 'cup-club-crest', `${club.name} 로고`, 68, 68) : `<div class="cup-flag-emblem">${image(club.flag, 'cup-flag', `${club.country} 국기`, 60, 40)}</div>`}<strong>${escape(club.name)}</strong><span class="cup-original">${escape(club.original)}</span><span class="cup-country">${club.crest ? image(club.flag, 'cup-flag', `${club.country} 국기`, 24, 16) : ''}${escape(club.country)}</span></div>`;
  const facts = tie.legs.map((leg, i) => `<div><dt>${i + 1}차전</dt><dd>${leg[0]} : ${leg[1]}</dd></div>`).join('');
  return `<section class="cup-tie" aria-labelledby="${id}" data-tie="${collection}:${id}"><p class="cup-tie-stage">${escape(data.season)} 유러피언컵 · ${escape(tie.stage)}</p><h3 class="cup-match" id="${id}">${escape(left.name)} vs ${escape(right.name)}</h3><div class="cup-scoreboard">${team(left)}<div class="cup-aggregate"><span>합계</span><strong>${total[0]}<i>:</i>${total[1]}</strong><small>두 경기 결과</small></div>${team(right)}</div><dl class="cup-leg-results">${facts}<div><dt>${tie.stage === '16강' ? '8강' : '4강'} 진출</dt><dd>${escape(winner.name)}</dd></div></dl><p class="cup-match-deck">${escape(tie.deck)}</p></section>`;
}

// Build-time expansion only: no client script, remote fetch or runtime dependency.
export function expandFootballTies(html) {
  const expanded = html.replace(/<div data-football-tie="([a-z0-9-]+):(match-\d+)"><\/div>/g, (_, collection, id) => renderTie(collection, id));
  if (expanded.includes('data-football-tie=')) throw new Error('Malformed football tie placeholder');
  return expanded;
}
