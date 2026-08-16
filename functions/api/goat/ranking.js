import { json, PLAYER_IDS, requireDb } from './_shared.js';

export async function onRequestGet({ env }) {
  try {
    const db = requireDb(env);
    const [totalRow, champions, appearances, wins, finals, semifinals] = await Promise.all([
      db.prepare('SELECT COUNT(*) AS count FROM tournament_results').first(),
      db.prepare('SELECT winner_id AS player_id, COUNT(*) AS count FROM tournament_results GROUP BY winner_id').all(),
      db.prepare(`SELECT player_id, COUNT(*) AS count FROM (
        SELECT player_a_id AS player_id FROM matchup_votes UNION ALL SELECT player_b_id FROM matchup_votes
      ) GROUP BY player_id`).all(),
      db.prepare('SELECT winner_id AS player_id, COUNT(*) AS count FROM matchup_votes GROUP BY winner_id').all(),
      db.prepare(`SELECT player_id, COUNT(*) AS count FROM (
        SELECT winner_id AS player_id FROM tournament_results UNION ALL SELECT runner_up_id FROM tournament_results
      ) GROUP BY player_id`).all(),
      db.prepare(`SELECT player_id, COUNT(*) AS count FROM (
        SELECT winner_id AS player_id FROM tournament_results
        UNION ALL SELECT runner_up_id FROM tournament_results
        UNION ALL SELECT semifinalist_1_id FROM tournament_results
        UNION ALL SELECT semifinalist_2_id FROM tournament_results
      ) GROUP BY player_id`).all(),
    ]);

    const toMap = (rows) => new Map((rows.results ?? []).map((row) => [row.player_id, Number(row.count)]));
    const championMap = toMap(champions);
    const appearanceMap = toMap(appearances);
    const winMap = toMap(wins);
    const finalMap = toMap(finals);
    const semifinalMap = toMap(semifinals);
    const totalGames = Number(totalRow?.count ?? 0);
    const ranking = [...PLAYER_IDS].map((id) => {
      const championships = championMap.get(id) ?? 0;
      const matchups = appearanceMap.get(id) ?? 0;
      const matchupWins = winMap.get(id) ?? 0;
      return {
        id,
        championships,
        championshipRate: totalGames ? championships / totalGames : 0,
        matchupWins,
        matchups,
        matchupWinRate: matchups ? matchupWins / matchups : 0,
        finals: finalMap.get(id) ?? 0,
        semifinals: semifinalMap.get(id) ?? 0,
      };
    }).sort((a, b) => b.championships - a.championships || b.matchupWinRate - a.matchupWinRate || b.matchups - a.matchups || a.id.localeCompare(b.id));

    return json({ ok: true, totalGames, ranking, updatedAt: new Date().toISOString() }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('GOAT ranking load failed', error);
    return json({ ok: false, totalGames: 0, ranking: [], error: 'storage_unavailable' }, { status: 503 });
  }
}
