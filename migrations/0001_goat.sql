PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tournament_results (
  id TEXT PRIMARY KEY,
  seed TEXT NOT NULL,
  winner_id TEXT NOT NULL,
  runner_up_id TEXT NOT NULL,
  semifinalist_1_id TEXT NOT NULL,
  semifinalist_2_id TEXT NOT NULL,
  anonymous_session_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (anonymous_session_id, seed)
);

CREATE TABLE IF NOT EXISTS matchup_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  result_id TEXT NOT NULL REFERENCES tournament_results(id) ON DELETE CASCADE,
  round INTEGER NOT NULL CHECK (round IN (32, 16, 8, 4, 2)),
  player_a_id TEXT NOT NULL,
  player_b_id TEXT NOT NULL,
  winner_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (player_a_id <> player_b_id),
  CHECK (winner_id = player_a_id OR winner_id = player_b_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  result_id TEXT NOT NULL REFERENCES tournament_results(id) ON DELETE CASCADE,
  winner_id TEXT NOT NULL,
  anonymous_session_id TEXT NOT NULL,
  nickname TEXT NOT NULL CHECK (length(nickname) BETWEEN 1 AND 20),
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 150),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_results_winner ON tournament_results(winner_id);
CREATE INDEX IF NOT EXISTS idx_results_created ON tournament_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matchups_players ON matchup_votes(player_a_id, player_b_id);
CREATE INDEX IF NOT EXISTS idx_matchups_winner ON matchup_votes(winner_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_session ON comments(anonymous_session_id, created_at DESC);
