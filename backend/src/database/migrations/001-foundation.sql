CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
) STRICT;
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK(platform IN ('web','native')),
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL
) STRICT;
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE settings (
  user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK(theme IN ('dark','light','system')),
  language TEXT NOT NULL DEFAULT 'en' CHECK(language IN ('vi','en')),
  in_app_notifications INTEGER NOT NULL DEFAULT 1 CHECK(in_app_notifications IN (0,1))
) STRICT;
CREATE TABLE favorites (
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('hero','player','team')),
  entity_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id,kind,entity_id)
) STRICT;
CREATE TABLE notifications (
  notification_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('match','favorite','system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read_at TEXT,
  target_kind TEXT CHECK(target_kind IN ('match','player','hero','team','league')),
  target_id TEXT,
  CHECK((target_kind IS NULL) = (target_id IS NULL)),
  UNIQUE(user_id,event_key)
) STRICT;
CREATE INDEX notifications_user_time ON notifications(user_id,created_at DESC);
CREATE TABLE parse_jobs (
  job_id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued','processing','completed','failed','unknown')),
  error TEXT,
  poll_after_seconds INTEGER NOT NULL DEFAULT 5 CHECK(poll_after_seconds >= 5),
  upstream_job_id TEXT,
  created_at TEXT NOT NULL
) STRICT;
CREATE UNIQUE INDEX one_active_parse_per_match ON parse_jobs(match_id)
  WHERE status IN ('queued','processing','unknown');
CREATE TABLE parse_job_users (
  job_id TEXT NOT NULL REFERENCES parse_jobs(job_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  PRIMARY KEY(job_id,user_id)
) STRICT;
