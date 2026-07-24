CREATE TABLE IF NOT EXISTS site_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visited_at TEXT NOT NULL,
  country TEXT,
  country_code TEXT,
  city TEXT,
  device_type TEXT,
  device_name TEXT,
  operating_system TEXT,
  browser TEXT,
  path TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_site_visits_visited_at
  ON site_visits(visited_at DESC);
