-- Papirklips Jagt - Cloudflare D1 Database Schema
-- SQLite schema for leaderboard and anti-cheat

-- Leaderboard tabel
CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  initials TEXT NOT NULL,
  survival_time INTEGER NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Index for hurtigere leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_survival_time 
ON leaderboard(survival_time DESC);

-- Sessions tabel for anti-cheat
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0
);

-- Index for hurtigere session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token 
ON sessions(token);

CREATE INDEX IF NOT EXISTS idx_sessions_created_at 
ON sessions(created_at);

-- Rate limiting tabel
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

-- Index for hurtigere rate limit queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_timestamp 
ON rate_limits(ip_hash, timestamp);

CREATE INDEX IF NOT EXISTS idx_rate_limits_timestamp 
ON rate_limits(timestamp);
