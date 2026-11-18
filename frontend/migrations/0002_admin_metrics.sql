ALTER TABLE users
  ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));

CREATE TABLE IF NOT EXISTS app_request_minutes (
  minute_start INTEGER NOT NULL,
  route TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  duration_total_ms INTEGER NOT NULL DEFAULT 0,
  duration_max_ms INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (minute_start, route, status_code)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS app_pageview_minutes (
  minute_start INTEGER NOT NULL,
  path TEXT NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (minute_start, path)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS app_active_user_minutes (
  minute_start INTEGER NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (minute_start, user_id)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS app_request_minutes_start_idx
  ON app_request_minutes(minute_start);
CREATE INDEX IF NOT EXISTS app_pageview_minutes_start_idx
  ON app_pageview_minutes(minute_start);
CREATE INDEX IF NOT EXISTS app_active_user_minutes_start_idx
  ON app_active_user_minutes(minute_start);
