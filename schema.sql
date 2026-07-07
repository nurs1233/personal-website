CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  imgur_url TEXT NOT NULL,
  deletehash TEXT NOT NULL,
  region TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_photos_region ON photos(region);
