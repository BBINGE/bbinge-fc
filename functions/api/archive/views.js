const TABLE_SQL = `CREATE TABLE IF NOT EXISTS archive_page_views (
  path TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function requireDb(env) {
  if (!env?.GOAT_DB) throw new Error('GOAT_DB binding is missing');
  return env.GOAT_DB;
}

function validArchivePath(value) {
  return typeof value === 'string'
    && value.length <= 240
    && /^\/archive\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\/$/.test(value);
}

async function ensureTable(db) {
  await db.prepare(TABLE_SQL).run();
}

export async function onRequestGet({ env }) {
  try {
    const db = requireDb(env);
    await ensureTable(db);
    const rows = await db.prepare(
      'SELECT path, views FROM archive_page_views WHERE views > 0 ORDER BY views DESC, updated_at DESC, path ASC LIMIT 5'
    ).all();
    return json({ ok: true, ranking: rows.results ?? [] }, {
      headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('Archive view ranking load failed', error);
    return json({ ok: false, ranking: [], error: 'storage_unavailable' }, { status: 503 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    if (!validArchivePath(body?.path)) return json({ ok: false, error: 'invalid_path' }, { status: 400 });
    const db = requireDb(env);
    await ensureTable(db);
    await db.prepare(`INSERT INTO archive_page_views (path, views, updated_at)
      VALUES (?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(path) DO UPDATE SET views = views + 1, updated_at = CURRENT_TIMESTAMP`)
      .bind(body.path)
      .run();
    return json({ ok: true }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Archive view count failed', error);
    return json({ ok: false, error: 'storage_unavailable' }, { status: 503 });
  }
}
