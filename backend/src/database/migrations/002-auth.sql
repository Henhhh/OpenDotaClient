CREATE TABLE auth_flows (
  state_hash TEXT PRIMARY KEY,
  redirect_uri TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('web','native')),
  browser_hash TEXT,
  expires_at INTEGER NOT NULL,
  return_to TEXT NOT NULL,
  code_hash TEXT UNIQUE,
  code_expires_at INTEGER,
  account_id TEXT
) STRICT;
CREATE TABLE openid_nonces (nonce TEXT PRIMARY KEY, expires_at INTEGER NOT NULL) STRICT;
CREATE INDEX auth_expiry ON auth_flows(expires_at);
