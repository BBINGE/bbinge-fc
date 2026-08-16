import { json, requireDb, validateResult } from './_shared.js';

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const validationError = validateResult(body);
  if (validationError) return json({ ok: false, error: validationError }, { status: 400 });

  try {
    const db = requireDb(env);
    const duplicate = await db.prepare(
      'SELECT id FROM tournament_results WHERE anonymous_session_id = ? AND seed = ? LIMIT 1'
    ).bind(body.anonymousSessionId, body.seed).first();
    if (duplicate?.id) return json({ ok: true, duplicate: true, resultId: duplicate.id });

    const resultId = crypto.randomUUID();
    const statements = [
      db.prepare(`INSERT INTO tournament_results
        (id, seed, winner_id, runner_up_id, semifinalist_1_id, semifinalist_2_id, anonymous_session_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(resultId, body.seed, body.winner, body.runnerUp, body.semifinalists[0], body.semifinalists[1], body.anonymousSessionId),
      ...body.matches.map((match) => db.prepare(`INSERT INTO matchup_votes
        (result_id, round, player_a_id, player_b_id, winner_id) VALUES (?, ?, ?, ?, ?)`)
        .bind(resultId, Number(match.round), match.playerA, match.playerB, match.winner)),
    ];
    await db.batch(statements);
    return json({ ok: true, duplicate: false, resultId }, { status: 201 });
  } catch (error) {
    console.error('GOAT result save failed', error);
    return json({ ok: false, error: 'storage_unavailable' }, { status: 503 });
  }
}
