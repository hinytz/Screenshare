'use strict';

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    username TEXT NOT NULL,
    username_key TEXT NOT NULL UNIQUE,
    avatar_path TEXT,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_oauth (
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    PRIMARY KEY (provider, provider_user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    visibility TEXT NOT NULL DEFAULT 'public',
    owner_user_id TEXT,
    kind TEXT NOT NULL DEFAULT 'screenshare',
    icon_path TEXT,
    created_at INTEGER NOT NULL,
    last_join_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    name_key TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    UNIQUE (room_id, type, name_key),
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS channels_room ON channels (room_id, type, position);
  CREATE TABLE IF NOT EXISTS room_members (
    session_token TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    peer_id TEXT NOT NULL,
    username TEXT NOT NULL,
    username_key TEXT NOT NULL,
    joined_at INTEGER NOT NULL,
    user_id TEXT,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );
  CREATE UNIQUE INDEX IF NOT EXISTS room_members_name ON room_members (room_id, username_key);
  CREATE TABLE IF NOT EXISTS room_sessions (
    session_token TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    username TEXT NOT NULL,
    username_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    user_id TEXT,
    peer_id TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS room_memberships (
    user_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    pinned INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, room_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    peer_id TEXT NOT NULL,
    username TEXT NOT NULL,
    username_key TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS chat_messages_channel ON chat_messages (channel_id, created_at);
  CREATE TABLE IF NOT EXISTS join_requests (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE UNIQUE INDEX IF NOT EXISTS join_requests_pending ON join_requests (room_id, user_id)
    WHERE status = 'pending';
  CREATE TABLE IF NOT EXISTS watch_parties (
    room_id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_url TEXT NOT NULL,
    video_id TEXT NOT NULL DEFAULT '',
    host_peer_id TEXT NOT NULL DEFAULT '',
    host_user_id TEXT,
    host_username_key TEXT NOT NULL DEFAULT '',
    paused INTEGER NOT NULL DEFAULT 1,
    media_time REAL NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
  );
`;

const LEGACY_TABLES = [
  'watch_parties',
  'join_requests',
  'chat_messages',
  'room_memberships',
  'room_sessions',
  'room_members',
  'channels',
  'user_oauth',
  'rooms',
  'users',
];

function roomsNeedRebuild(db) {
  let cols;
  try {
    cols = db.prepare('PRAGMA table_info(rooms)').all();
  } catch {
    return true;
  }
  if (!cols.length) return true;
  const names = new Set(cols.map((col) => col.name));
  return !names.has('id') || !names.has('invite_code') || names.has('name_key');
}

function applySchema(db) {
  if (roomsNeedRebuild(db)) {
    db.pragma('foreign_keys = OFF');
    db.exec('BEGIN');
    try {
      for (const table of LEGACY_TABLES) {
        db.exec(`DROP TABLE IF EXISTS ${table}`);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    db.pragma('foreign_keys = ON');
  }
  db.exec(SCHEMA_SQL);
}

module.exports = { applySchema, SCHEMA_SQL };
