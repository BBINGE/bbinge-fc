CREATE TABLE IF NOT EXISTS archive_page_views (
  path TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_archive_views_rank
  ON archive_page_views(views DESC, updated_at DESC);
