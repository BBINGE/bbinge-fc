import { json, requireDb } from '../_shared.js';

export async function onRequestDelete({ params, request, env }) {
  const configuredToken = env.GOAT_ADMIN_TOKEN;
  const suppliedToken = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!configuredToken || !suppliedToken || suppliedToken !== configuredToken) {
    return json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  try {
    const db = requireDb(env);
    await db.prepare("UPDATE comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL").bind(params.id).run();
    return json({ ok: true });
  } catch (error) {
    console.error('GOAT comment delete failed', error);
    return json({ ok: false, error: 'storage_unavailable' }, { status: 503 });
  }
}
