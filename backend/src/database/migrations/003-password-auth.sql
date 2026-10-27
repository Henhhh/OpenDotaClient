-- Keep all user IDs and dependent rows. The legacy identity is not a Dota ownership claim.
ALTER TABLE users RENAME COLUMN account_id TO identity_key;
ALTER TABLE users ADD COLUMN dota_account_id TEXT;
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN display_name TEXT;
UPDATE users SET dota_account_id=identity_key;
CREATE UNIQUE INDEX users_email ON users(email) WHERE email IS NOT NULL;
-- No external provider assertions or pending callback codes are used by form auth.
DROP TABLE auth_flows;
DROP TABLE openid_nonces;
