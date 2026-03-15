CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  owner_secret TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'escalated')),
  tags TEXT NOT NULL DEFAULT '[]',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_event_id INTEGER NOT NULL DEFAULT 0,
  priority_cache TEXT,
  priority_cached_at TEXT
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(thread_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_threads_status ON threads(status);
CREATE INDEX IF NOT EXISTS idx_participants_thread ON participants(thread_id);
