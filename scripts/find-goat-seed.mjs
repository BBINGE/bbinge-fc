import data from '../src/data/goat-players.json' with { type: 'json' };
const targets = process.argv.slice(2);
const eraOrder = ['pre1950', '1950s60s', '1970s80s', '1990s00s', '2010s'];
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash(s) { let h = 0x811c9dc5; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193); } return h >>> 0; }
function shuffle(a, r) { const o = a.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; }
function bracket(seed) { const r = rng(hash(seed)); const pool = eraOrder.flatMap(era => shuffle(data.players.filter(p => p.era === era), r).slice(0, data.drawAllocation[era]).map(p => p.id)); return shuffle(pool, r); }
for (let i = 0; i < 1_000_000; i++) { const seed = i.toString(36); const first = bracket(seed).slice(0, 2); if (targets.every(id => first.includes(id))) { console.log(seed, first.join(',')); break; } }
