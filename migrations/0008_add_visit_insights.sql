ALTER TABLE site_visits ADD COLUMN visitor_type TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE site_visits ADD COLUMN bot_name TEXT;
ALTER TABLE site_visits ADD COLUMN active_seconds INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_site_visits_type_and_date
  ON site_visits(visitor_type, visited_at DESC);
