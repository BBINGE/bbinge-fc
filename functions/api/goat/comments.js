import { cleanText, json, requireDb, validSessionId } from './_shared.js';

const URL_PATTERN = /(?:https?:\/\/|www\.)/gi;

export async function onRequestGet({ request, env }) {
  try {
    const db = requireDb(env);
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 20, 1), 50);
    const rows = await db.prepare(`SELECT id, result_id AS resultId, winner_id AS winnerId, nickname, content, created_at AS createdAt
      FROM comments WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?`).bind(limit).all();
    return json({ ok: true, comments: rows.results ?? [] }, {
      headers: { 'Cache-Control': 'public, max-age=15, s-maxage=30' },
    });
  } catch (error) {
    console.error('GOAT comments load failed', error);
    return json({ ok: false, comments: [], error: 'storage_unavailable' }, { status: 503 });
  }
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const resultId = typeof body?.resultId === 'string' ? body.resultId : '';
  const sessionId = body?.anonymousSessionId;
  const nickname = cleanText(body?.nickname);
  const content = cleanText(body?.content);
  if (!resultId || !validSessionId(sessionId)) return json({ ok: false, error: 'invalid_result' }, { status: 400 });
  if (!nickname || nickname.length > 20) return json({ ok: false, error: 'nickname_length' }, { status: 400 });
  if (!content || content.length > 150) return json({ ok: false, error: 'content_length' }, { status: 400 });
  if ((content.match(URL_PATTERN) ?? []).length > 1) return json({ ok: false, error: 'too_many_urls' }, { status: 400 });

  try {
    const db = requireDb(env);
    const result = await db.prepare('SELECT winner_id AS winnerId FROM tournament_results WHERE id = ? AND anonymous_session_id = ? LIMIT 1')
      .bind(resultId, sessionId).first();
    if (!result?.winnerId) return json({ ok: false, error: 'result_not_found' }, { status: 403 });
    const recent = await db.prepare(`SELECT id FROM comments
      WHERE anonymous_session_id = ? AND created_at > datetime('now', '-30 seconds') LIMIT 1`).bind(sessionId).first();
    if (recent?.id) return json({ ok: false, error: 'rate_limited' }, { status: 429 });

    const id = crypto.randomUUID();
    await db.prepare(`INSERT INTO comments
      (id, result_id, winner_id, anonymous_session_id, nickname, content) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(id, resultId, result.winnerId, sessionId, nickname, content).run();
    return json({ ok: true, comment: { id, resultId, winnerId: result.winnerId, nickname, content, createdAt: new Date().toISOString() } }, { status: 201 });
  } catch (error) {
    console.error('GOAT comment save failed', error);
    return json({ ok: false, error: 'storage_unavailable' }, { status: 503 });
  }
}
