'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile();

const PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const ACCOUNT_MS = 30 * 24 * 60 * 60 * 1000;
const STREAM_GRACE_MS = 20 * 1000;
const IS_PROD = process.env.NODE_ENV === 'production';
const TURNSTILE_SITE_KEY = String(process.env.TURNSTILE_SITE_KEY || '').trim();
const TURNSTILE_SECRET_KEY = String(process.env.TURNSTILE_SECRET_KEY || '').trim();
const MAX_MEMBERS = 5;
const ROOM_TTL_MS = 5 * 24 * 60 * 60 * 1000;
const ACCOUNT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SWEEP_MS = 5 * 60 * 1000;
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _\-]{0,30}[A-Za-z0-9]$|^[A-Za-z0-9][A-Za-z0-9_]{1,31}$/;
const ACCOUNT_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_]{1,31}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAG_RE = /^[a-z]{4}$/;
const TAG_CHARS = 'abcdefghijklmnopqrstuvwxyz';
const CHAT_KEEP = 50;
const CHAT_MAX_LEN = 500;
const CHAT_RATE_MS = 250;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;
const IMAGE_MAX_PX = 2000;
const IMAGE_MAX_BYTES = 1_000_000;

function defaultIceServers() {
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
}

function getIceServers() {
  if (!process.env.ICE_SERVERS) return defaultIceServers();
  try {
    const parsed = JSON.parse(process.env.ICE_SERVERS);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('ICE_SERVERS must be a non-empty JSON array');
    }
    return parsed;
  } catch (err) {
    console.warn('Invalid ICE_SERVERS, falling back to Google STUN:', err.message);
    return defaultIceServers();
  }
}

function hashSecret(value) {
  return crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
}

function hashesMatch(input, storedHex) {
  if (!storedHex) return false;
  const a = Buffer.from(hashSecret(input), 'hex');
  const b = Buffer.from(String(storedHex), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function readSession(req) {
  return (req.signedCookies && req.signedCookies.session) || null;
}

function isSecureRequest(req) {
  return Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
}

function keyOf(value) {
  return String(value ?? '').trim().toLowerCase();
}

function randomTag() {
  const bytes = crypto.randomBytes(4);
  let tag = '';
  for (let i = 0; i < 4; i++) tag += TAG_CHARS[bytes[i] % TAG_CHARS.length];
  return tag;
}

function parseRoomName(value) {
  const raw = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!raw) return null;
  const hash = raw.lastIndexOf('#');
  let namePart = raw;
  let tag = '';
  if (hash !== -1) {
    namePart = raw.slice(0, hash).trim();
    tag = keyOf(raw.slice(hash + 1));
  }
  if (namePart.length < 2 || namePart.length > 32 || !NAME_RE.test(namePart)) return null;
  if (tag && !TAG_RE.test(tag)) return null;
  const nameKey = keyOf(namePart);
  return {
    display: namePart,
    nameKey,
    tag,
    key: tag ? `${nameKey}#${tag}` : nameKey,
  };
}

function roomBaseName(room) {
  const tag = String(room.tag || '');
  let name = String(room.display_name || '');
  if (tag && name.toLowerCase().endsWith(`#${tag}`)) {
    name = name.slice(0, -(tag.length + 1));
  }
  return name;
}

function roomLabel(room) {
  const name = roomBaseName(room);
  const tag = room.permanent ? '' : String(room.tag || '');
  return tag ? `${name}#${tag}` : name;
}

function parseUsername(value) {
  const display = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (display.length < 2 || display.length > 32 || !NAME_RE.test(display)) return null;
  return { display, key: keyOf(display) };
}

function parseAccountUsername(value) {
  const display = String(value ?? '').trim().replace(/^@/, '');
  if (display.length < 2 || display.length > 32 || !ACCOUNT_NAME_RE.test(display)) return null;
  return { display, key: keyOf(display) };
}

function parseEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  if (email.length < 5 || email.length > 120 || !EMAIL_RE.test(email)) return null;
  return email;
}

function parsePassword(value) {
  const password = String(value ?? '');
  if (password.length < 8 || password.length > 200) return null;
  return password;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts[0] !== 'scrypt' || parts.length !== 6) return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!N || !r || !p) return false;
  let salt;
  let expected;
  try {
    salt = Buffer.from(parts[4], 'base64url');
    expected = Buffer.from(parts[5], 'base64url');
  } catch {
    return false;
  }
  if (!salt.length || !expected.length) return false;
  const hash = crypto.scryptSync(password, salt, expected.length, { N, r, p });
  return hash.length === expected.length && crypto.timingSafeEqual(hash, expected);
}

function accountDisplayName(user) {
  return `@${String(user.username || '').replace(/^@/, '')}`;
}

function webpDimensions(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const fourcc = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + size;
    if (dataEnd > buf.length) return null;
    if (fourcc === 'VP8X' && size >= 10) {
      return {
        width: 1 + buf.readUIntLE(dataStart + 4, 3),
        height: 1 + buf.readUIntLE(dataStart + 7, 3),
      };
    }
    if (fourcc === 'VP8 ' && size >= 10) {
      const sig = dataStart + 3;
      if (buf[sig] === 0x9d && buf[sig + 1] === 0x01 && buf[sig + 2] === 0x2a) {
        const bits = buf.readUInt32LE(sig + 3);
        return { width: bits & 0x3fff, height: (bits >> 16) & 0x3fff };
      }
    }
    if (fourcc === 'VP8L' && size >= 5 && buf[dataStart] === 0x2f) {
      const bits = buf.readUInt32LE(dataStart + 1);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    offset = dataEnd + (size % 2);
  }
  return null;
}

const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(dataDir, 'uploads');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(path.join(uploadsDir, 'avatars'), { recursive: true });
fs.mkdirSync(path.join(uploadsDir, 'rooms'), { recursive: true });
const db = new Database(path.join(dataDir, 'rooms.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    name_key TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    permanent INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS room_members (
    session_token TEXT PRIMARY KEY,
    name_key TEXT NOT NULL,
    peer_id TEXT NOT NULL,
    username TEXT NOT NULL,
    username_key TEXT NOT NULL,
    joined_at INTEGER NOT NULL,
    FOREIGN KEY (name_key) REFERENCES rooms(name_key)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS room_members_name ON room_members (name_key, username_key);
  CREATE TABLE IF NOT EXISTS room_sessions (
    session_token TEXT PRIMARY KEY,
    name_key TEXT NOT NULL,
    username TEXT NOT NULL,
    username_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (name_key) REFERENCES rooms(name_key)
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_key TEXT NOT NULL,
    peer_id TEXT NOT NULL,
    username TEXT NOT NULL,
    username_key TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (name_key) REFERENCES rooms(name_key)
  );
  CREATE INDEX IF NOT EXISTS chat_messages_room_id ON chat_messages (name_key, id);
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password_hash TEXT,
    username TEXT NOT NULL,
    username_key TEXT NOT NULL UNIQUE,
    avatar_path TEXT,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_oauth (
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    PRIMARY KEY (provider, provider_user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS room_memberships (
    user_id INTEGER NOT NULL,
    name_key TEXT NOT NULL,
    pinned INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, name_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (name_key) REFERENCES rooms(name_key) ON DELETE CASCADE
  );
`);

function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (cols.some((col) => col.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

ensureColumn('rooms', 'tag', "tag TEXT NOT NULL DEFAULT ''");
ensureColumn('rooms', 'last_join_at', 'last_join_at INTEGER');
ensureColumn('rooms', 'creator_username_key', "creator_username_key TEXT NOT NULL DEFAULT ''");
ensureColumn('rooms', 'owner_user_id', 'owner_user_id INTEGER');
ensureColumn('rooms', 'icon_path', 'icon_path TEXT');
ensureColumn('room_members', 'user_id', 'user_id INTEGER');
ensureColumn('room_sessions', 'user_id', 'user_id INTEGER');
ensureColumn('room_sessions', 'peer_id', "peer_id TEXT NOT NULL DEFAULT ''");
db.prepare('UPDATE rooms SET last_join_at = created_at WHERE last_join_at IS NULL').run();

const stmtInsertRoom = db.prepare(`
  INSERT INTO rooms (name_key, display_name, password_hash, permanent, created_at, tag, last_join_at, creator_username_key, owner_user_id, icon_path)
  VALUES (@name_key, @display_name, @password_hash, @permanent, @created_at, @tag, @last_join_at, @creator_username_key, @owner_user_id, @icon_path)
`);
const stmtUpsertPermanent = db.prepare(`
  INSERT INTO rooms (name_key, display_name, password_hash, permanent, created_at, tag, last_join_at, creator_username_key, owner_user_id)
  VALUES (@name_key, @display_name, @password_hash, 1, @created_at, '', @created_at, '', NULL)
  ON CONFLICT(name_key) DO UPDATE SET
    display_name = excluded.display_name,
    password_hash = excluded.password_hash,
    permanent = 1,
    tag = '',
    owner_user_id = NULL
`);
const stmtTouchRoom = db.prepare('UPDATE rooms SET last_join_at = ? WHERE name_key = ?');
const stmtClaimCreator = db.prepare(`
  UPDATE rooms SET creator_username_key = ?
  WHERE name_key = ? AND permanent = 0 AND creator_username_key = ''
`);
const stmtExpiredRooms = db.prepare(`
  SELECT name_key FROM rooms WHERE permanent = 0 AND last_join_at IS NOT NULL AND last_join_at < ?
`);
const stmtDeleteSessionsInRoom = db.prepare('DELETE FROM room_sessions WHERE name_key = ?');
const stmtGetMemberByPeer = db.prepare(
  'SELECT * FROM room_members WHERE name_key = ? AND peer_id = ? LIMIT 1'
);
const stmtGetRoom = db.prepare('SELECT * FROM rooms WHERE name_key = ?');
const stmtDeleteRoom = db.prepare('DELETE FROM rooms WHERE name_key = ?');
const stmtInsertMember = db.prepare(`
  INSERT INTO room_members (session_token, name_key, peer_id, username, username_key, joined_at, user_id)
  VALUES (@session_token, @name_key, @peer_id, @username, @username_key, @joined_at, @user_id)
`);
const stmtGetMember = db.prepare('SELECT * FROM room_members WHERE session_token = ?');
const stmtMembersInRoom = db.prepare('SELECT * FROM room_members WHERE name_key = ?');
const stmtMemberCount = db.prepare('SELECT COUNT(*) AS n FROM room_members WHERE name_key = ?');
const stmtUsernameTaken = db.prepare(
  'SELECT 1 AS ok FROM room_members WHERE name_key = ? AND username_key = ? LIMIT 1'
);
const stmtDeleteMember = db.prepare('DELETE FROM room_members WHERE session_token = ?');
const stmtDeleteMembersInRoom = db.prepare('DELETE FROM room_members WHERE name_key = ?');
const stmtGetSession = db.prepare('SELECT * FROM room_sessions WHERE session_token = ?');
const stmtUpsertSession = db.prepare(`
  INSERT INTO room_sessions (session_token, name_key, username, username_key, created_at, user_id, peer_id)
  VALUES (@session_token, @name_key, @username, @username_key, @created_at, @user_id, @peer_id)
  ON CONFLICT(session_token) DO UPDATE SET
    name_key = excluded.name_key,
    username = excluded.username,
    username_key = excluded.username_key,
    user_id = excluded.user_id,
    peer_id = excluded.peer_id
`);
const stmtDeleteSession = db.prepare('DELETE FROM room_sessions WHERE session_token = ?');
const stmtInsertChat = db.prepare(`
  INSERT INTO chat_messages (name_key, peer_id, username, username_key, body, created_at)
  VALUES (@name_key, @peer_id, @username, @username_key, @body, @created_at)
`);
const stmtPruneChat = db.prepare(`
  DELETE FROM chat_messages
  WHERE name_key = ?
    AND id NOT IN (
      SELECT id FROM (
        SELECT id FROM chat_messages WHERE name_key = ? ORDER BY id DESC LIMIT ${CHAT_KEEP}
      )
    )
`);
const stmtChatHistory = db.prepare(`
  SELECT id, peer_id AS peerId, username, username_key AS usernameKey, body, created_at AS createdAt
  FROM (
    SELECT id, peer_id, username, username_key, body, created_at
    FROM chat_messages
    WHERE name_key = ?
    ORDER BY id DESC
    LIMIT ${CHAT_KEEP}
  )
  ORDER BY id ASC
`);
const stmtGetChat = db.prepare('SELECT * FROM chat_messages WHERE id = ? AND name_key = ?');
const stmtDeleteChat = db.prepare('DELETE FROM chat_messages WHERE id = ? AND name_key = ?');
const stmtDeleteChatInRoom = db.prepare('DELETE FROM chat_messages WHERE name_key = ?');
const stmtInsertUser = db.prepare(`
  INSERT INTO users (email, password_hash, username, username_key, avatar_path, created_at, last_login_at)
  VALUES (@email, @password_hash, @username, @username_key, NULL, @created_at, @last_login_at)
`);
const stmtGetUser = db.prepare('SELECT * FROM users WHERE id = ?');
const stmtGetUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const stmtGetUserByUsername = db.prepare('SELECT * FROM users WHERE username_key = ?');
const stmtTouchUser = db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?');
const stmtSetUserAvatar = db.prepare('UPDATE users SET avatar_path = ? WHERE id = ?');
const stmtExpiredUsers = db.prepare('SELECT id FROM users WHERE last_login_at IS NOT NULL AND last_login_at < ?');
const stmtDeleteUser = db.prepare('DELETE FROM users WHERE id = ?');
const stmtDeleteOAuthForUser = db.prepare('DELETE FROM user_oauth WHERE user_id = ?');
const stmtRoomsByOwner = db.prepare('SELECT name_key FROM rooms WHERE owner_user_id = ?');
const stmtMembersByUser = db.prepare('SELECT session_token FROM room_members WHERE user_id = ?');
const stmtSetRoomIcon = db.prepare('UPDATE rooms SET icon_path = ? WHERE name_key = ?');
const stmtUpsertMembership = db.prepare(`
  INSERT INTO room_memberships (user_id, name_key, pinned, created_at)
  VALUES (@user_id, @name_key, 1, @created_at)
  ON CONFLICT(user_id, name_key) DO UPDATE SET pinned = 1
`);
const stmtGetMembership = db.prepare(
  'SELECT * FROM room_memberships WHERE user_id = ? AND name_key = ?'
);
const stmtDeleteMembership = db.prepare(
  'DELETE FROM room_memberships WHERE user_id = ? AND name_key = ?'
);
const stmtDeleteMembershipsForUser = db.prepare('DELETE FROM room_memberships WHERE user_id = ?');
const stmtDeleteMembershipsInRoom = db.prepare('DELETE FROM room_memberships WHERE name_key = ?');
const stmtListPins = db.prepare(`
  SELECT m.name_key, r.display_name, r.tag, r.permanent, r.icon_path, r.owner_user_id
  FROM room_memberships m
  JOIN rooms r ON r.name_key = m.name_key
  WHERE m.user_id = ? AND m.pinned = 1
  ORDER BY m.created_at ASC
`);

const addChatTx = db.transaction((row) => {
  const info = stmtInsertChat.run(row);
  stmtPruneChat.run(row.name_key, row.name_key);
  return Number(info.lastInsertRowid);
});

function seedPermanentRooms() {
  const raw = process.env.PERMANENT_ROOMS;
  if (!raw) return;
  let list;
  try {
    list = JSON.parse(raw);
  } catch (err) {
    console.warn('Invalid PERMANENT_ROOMS JSON:', err.message);
    return;
  }
  if (!Array.isArray(list)) {
    console.warn('PERMANENT_ROOMS must be a JSON array');
    return;
  }
  const now = Date.now();
  for (const item of list) {
    const parsed = parseRoomName(item && item.name);
    const password = item && item.password;
    if (!parsed || !password) {
      console.warn('Skipping invalid permanent room entry');
      continue;
    }
    stmtUpsertPermanent.run({
      name_key: parsed.nameKey,
      display_name: parsed.display,
      password_hash: hashSecret(password),
      created_at: now,
    });
  }
}

seedPermanentRooms();

const sockets = new Map();
const chatSockets = new Map();

function touchRoom(nameKey) {
  if (!nameKey) return;
  stmtTouchRoom.run(Date.now(), nameKey);
}

function unlinkQuiet(filePath) {
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch {
    // already gone
  }
}

function roomIconRelPath(nameKey) {
  const id = crypto.createHash('sha256').update(String(nameKey)).digest('hex').slice(0, 32);
  return path.posix.join('rooms', `${id}.webp`);
}

function avatarRelPath(userId) {
  return path.posix.join('avatars', `${Number(userId)}.webp`);
}

function saveWebpUpload(buf, relPath) {
  if (!Buffer.isBuffer(buf) || buf.length < 12 || buf.length > IMAGE_MAX_BYTES) {
    throw httpError(400, 'Image is too large or invalid.', 'image_invalid');
  }
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    throw httpError(400, 'Could not read that image.', 'image_invalid');
  }
  const size = webpDimensions(buf);
  if (!size || size.width < 1 || size.height < 1 || size.width > IMAGE_MAX_PX || size.height > IMAGE_MAX_PX) {
    throw httpError(400, 'Image is too large or invalid.', 'image_too_big');
  }
  const abs = path.join(uploadsDir, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, buf);
  return relPath;
}

function uploadCacheTag(relPath) {
  if (!relPath) return '0';
  try {
    return String(Math.trunc(fs.statSync(path.join(uploadsDir, relPath)).mtimeMs));
  } catch {
    return '0';
  }
}

function sendUpload(res, relPath) {
  if (!relPath) return false;
  const root = path.resolve(uploadsDir);
  const abs = path.resolve(uploadsDir, relPath);
  if (abs !== root && !abs.startsWith(root + path.sep)) return false;
  if (!fs.existsSync(abs)) return false;
  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.sendFile(abs);
  return true;
}

function deleteEphemeralRoom(nameKey) {
  const room = stmtGetRoom.get(nameKey);
  if (!room || room.permanent) return;
  if (stmtMemberCount.get(nameKey).n > 0) return;
  if (room.icon_path) unlinkQuiet(path.join(uploadsDir, room.icon_path));
  stmtDeleteMembershipsInRoom.run(nameKey);
  stmtDeleteMembersInRoom.run(nameKey);
  stmtDeleteSessionsInRoom.run(nameKey);
  stmtDeleteChatInRoom.run(nameKey);
  stmtDeleteRoom.run(nameKey);
}

function evictRoom(nameKey) {
  for (const row of stmtMembersInRoom.all(nameKey)) {
    const sock = findSocketByToken(row.session_token);
    if (sock) send(sock, { type: 'kicked' });
    removeMember(row.session_token, true, true);
  }
}

function deleteRoomFully(nameKey) {
  const room = stmtGetRoom.get(nameKey);
  if (!room) return;
  evictRoom(nameKey);
  if (room.icon_path) unlinkQuiet(path.join(uploadsDir, room.icon_path));
  stmtDeleteMembershipsInRoom.run(nameKey);
  stmtDeleteMembersInRoom.run(nameKey);
  stmtDeleteSessionsInRoom.run(nameKey);
  stmtDeleteChatInRoom.run(nameKey);
  stmtDeleteRoom.run(nameKey);
}

function deleteUserAccount(userId) {
  const user = stmtGetUser.get(userId);
  if (!user) return;
  for (const row of stmtMembersByUser.all(userId)) {
    removeMember(row.session_token, true, true);
  }
  for (const row of stmtRoomsByOwner.all(userId)) {
    deleteRoomFully(row.name_key);
  }
  if (user.avatar_path) unlinkQuiet(path.join(uploadsDir, user.avatar_path));
  stmtDeleteMembershipsForUser.run(userId);
  stmtDeleteOAuthForUser.run(userId);
  stmtDeleteUser.run(userId);
}

function sweepExpiredAccounts() {
  const cutoff = Date.now() - ACCOUNT_TTL_MS;
  for (const row of stmtExpiredUsers.all(cutoff)) {
    deleteUserAccount(row.id);
  }
}

function sweepExpiredRooms() {
  const cutoff = Date.now() - ROOM_TTL_MS;
  for (const row of stmtExpiredRooms.all(cutoff)) {
    deleteEphemeralRoom(row.name_key);
  }
}

function roomSockets(nameKey) {
  return [...sockets.values()].filter((client) => client.nameKey === nameKey);
}

function send(client, payload) {
  if (!client || client.res.writableEnded) return;
  client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function broadcastRoom(nameKey, payload, exceptToken) {
  for (const client of roomSockets(nameKey)) {
    if (exceptToken && client.token === exceptToken) continue;
    send(client, payload);
  }
}

function findSocketByToken(token) {
  return sockets.get(token) || null;
}

function findSocketById(id, nameKey) {
  return roomSockets(nameKey).find((client) => client.id === id) || null;
}

function setSessionCookie(res, req, token) {
  res.cookie('session', token, {
    httpOnly: true,
    signed: true,
    secure: process.env.NODE_ENV === 'production' || isSecureRequest(req),
    sameSite: 'lax',
    maxAge: SESSION_MS,
    path: '/',
  });
}

function clearSessionCookie(res, req) {
  res.clearCookie('session', {
    httpOnly: true,
    signed: true,
    secure: process.env.NODE_ENV === 'production' || isSecureRequest(req),
    sameSite: 'lax',
    path: '/',
  });
}

function closeChatSocket(token) {
  const sock = chatSockets.get(token);
  if (!sock) return;
  chatSockets.delete(token);
  sock.disconnect(true);
}

function closeSocket(token) {
  closeChatSocket(token);
  const client = sockets.get(token);
  if (!client) return;
  client.replaced = true;
  sockets.delete(token);
  if (!client.res.writableEnded) client.res.end();
}

function setAccountCookie(res, req, userId) {
  res.cookie('account', String(userId), {
    httpOnly: true,
    signed: true,
    secure: process.env.NODE_ENV === 'production' || isSecureRequest(req),
    sameSite: 'lax',
    maxAge: ACCOUNT_MS,
    path: '/',
  });
}

function clearAccountCookie(res, req) {
  res.clearCookie('account', {
    httpOnly: true,
    signed: true,
    secure: process.env.NODE_ENV === 'production' || isSecureRequest(req),
    sameSite: 'lax',
    path: '/',
  });
}

function readAccountUser(req) {
  const raw = req.signedCookies && req.signedCookies.account;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return null;
  return stmtGetUser.get(id) || null;
}

function touchAccount(userId) {
  if (!userId) return;
  stmtTouchUser.run(Date.now(), userId);
}

function rememberSession(token, room, username, userId, peerId) {
  stmtUpsertSession.run({
    session_token: token,
    name_key: room.name_key,
    username: username.display,
    username_key: username.key,
    created_at: Date.now(),
    user_id: userId || null,
    peer_id: peerId || '',
  });
}

function restoreMember(token) {
  const session = stmtGetSession.get(token);
  if (!session) return null;
  const room = stmtGetRoom.get(session.name_key);
  if (!room) {
    stmtDeleteMember.run(token);
    stmtDeleteSession.run(token);
    return { gone: true };
  }
  const existing = stmtGetMember.get(token);
  if (existing) return { member: existing, room };
  if (stmtMemberCount.get(room.name_key).n >= MAX_MEMBERS) return null;
  if (stmtUsernameTaken.get(room.name_key, session.username_key)) return null;
  const peerId = session.peer_id || crypto.randomBytes(8).toString('hex');
  const member = {
    session_token: token,
    name_key: room.name_key,
    peer_id: peerId,
    username: session.username,
    username_key: session.username_key,
    joined_at: Date.now(),
    user_id: session.user_id || null,
  };
  try {
    stmtInsertMember.run(member);
  } catch {
    return null;
  }
  if (!session.peer_id) {
    rememberSession(token, room, { display: session.username, key: session.username_key }, session.user_id, peerId);
  }
  touchRoom(room.name_key);
  return { member, room };
}

const memberGrace = new Map();

function cancelMemberGrace(token) {
  const timer = memberGrace.get(token);
  if (!timer) return false;
  clearTimeout(timer);
  memberGrace.delete(token);
  return true;
}

function scheduleMemberGrace(token) {
  cancelMemberGrace(token);
  const timer = setTimeout(() => {
    memberGrace.delete(token);
    removeMember(token, true);
  }, STREAM_GRACE_MS);
  if (typeof timer.unref === 'function') timer.unref();
  memberGrace.set(token, timer);
}

function removeMember(token, announce, logout) {
  cancelMemberGrace(token);
  const member = stmtGetMember.get(token);
  closeSocket(token);
  if (member) {
    stmtDeleteMember.run(token);
    if (announce) {
      broadcastRoom(member.name_key, { type: 'peer-left', id: member.peer_id }, token);
    }
  }
  if (logout) stmtDeleteSession.run(token);
}

function httpError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

function sendError(res, err, fallback, fallbackCode) {
  const status = err.status || 500;
  const message = err.status ? err.message : fallback;
  const code = err.status ? err.code : fallbackCode;
  res.status(status).json(code ? { error: message, code } : { error: message });
}

function turnstileSiteKeyPublic() {
  if (IS_PROD && TURNSTILE_SITE_KEY && TURNSTILE_SECRET_KEY) return TURNSTILE_SITE_KEY;
  return null;
}

async function verifyTurnstile(token, ip) {
  if (!TURNSTILE_SECRET_KEY) return false;
  const body = new URLSearchParams();
  body.set('secret', TURNSTILE_SECRET_KEY);
  body.set('response', String(token || ''));
  if (ip) body.set('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data && data.success);
}

function isCreator(room, member, user) {
  if (!room || !member) return false;
  if (user && room.owner_user_id && Number(room.owner_user_id) === Number(user.id)) return true;
  if (room.permanent) return false;
  return Boolean(room.creator_username_key && room.creator_username_key === member.username_key);
}

function resolveJoinRoom(parsed) {
  if (parsed.tag) return stmtGetRoom.get(parsed.key) || null;
  const room = stmtGetRoom.get(parsed.nameKey);
  if (!room) return null;
  if (room.permanent) return room;
  if (!room.tag && !String(room.name_key).includes('#')) return room;
  return null;
}

function dropMemberRow(token) {
  const member = stmtGetMember.get(token);
  if (!member) return null;
  stmtDeleteMember.run(token);
  return member;
}

const addMemberTx = db.transaction((room, username, previousToken, userId) => {
  const previous = previousToken ? dropMemberRow(previousToken) : null;
  const count = stmtMemberCount.get(room.name_key).n;
  if (count >= MAX_MEMBERS) throw httpError(409, 'Room is full', 'room_full');
  if (stmtUsernameTaken.get(room.name_key, username.key)) {
    throw httpError(409, 'Username taken', 'username_taken');
  }
  const token = crypto.randomBytes(32).toString('hex');
  const peerId = crypto.randomBytes(8).toString('hex');
  try {
    stmtInsertMember.run({
      session_token: token,
      name_key: room.name_key,
      peer_id: peerId,
      username: username.display,
      username_key: username.key,
      joined_at: Date.now(),
      user_id: userId || null,
    });
  } catch (err) {
    if (String(err.code || '').startsWith('SQLITE_CONSTRAINT')) {
      throw httpError(409, 'Username taken', 'username_taken');
    }
    throw err;
  }
  rememberSession(token, room, username, userId, peerId);
  if (previousToken && previousToken !== token) stmtDeleteSession.run(previousToken);
  if (!room.permanent && !room.creator_username_key && !room.owner_user_id) {
    stmtClaimCreator.run(username.key, room.name_key);
    room = stmtGetRoom.get(room.name_key) || room;
  }
  touchRoom(room.name_key);
  if (userId) touchAccount(userId);
  return { token, peerId, previous, room };
});

const createRoomTx = db.transaction((roomName, password, opts = {}) => {
  const now = Date.now();
  const ownerUserId = opts.ownerUserId || null;
  const permanent = Boolean(opts.permanent);
  if (permanent) {
    if (!ownerUserId) throw httpError(401, 'Unauthorized', 'auth_required');
    if (stmtGetRoom.get(roomName.nameKey)) {
      throw httpError(409, 'Room already exists', 'room_exists');
    }
    stmtInsertRoom.run({
      name_key: roomName.nameKey,
      display_name: roomName.display,
      password_hash: hashSecret(password),
      permanent: 1,
      created_at: now,
      tag: '',
      last_join_at: now,
      creator_username_key: '',
      owner_user_id: ownerUserId,
      icon_path: null,
    });
    return stmtGetRoom.get(roomName.nameKey);
  }
  let room = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const tag = randomTag();
    const nameKey = `${roomName.nameKey}#${tag}`;
    if (stmtGetRoom.get(nameKey)) continue;
    try {
      stmtInsertRoom.run({
        name_key: nameKey,
        display_name: roomName.display,
        password_hash: hashSecret(password),
        permanent: 0,
        created_at: now,
        tag,
        last_join_at: now,
        creator_username_key: ownerUserId ? '' : '',
        owner_user_id: ownerUserId,
        icon_path: null,
      });
      room = stmtGetRoom.get(nameKey);
      break;
    } catch (err) {
      if (String(err.code || '').startsWith('SQLITE_CONSTRAINT')) continue;
      throw err;
    }
  }
  if (!room) throw httpError(409, 'Could not allocate a room tag.', 'could_not_create');
  return room;
});

function announceDroppedMember(previous) {
  if (!previous) return;
  closeSocket(previous.session_token);
  broadcastRoom(previous.name_key, { type: 'peer-left', id: previous.peer_id }, previous.session_token);
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser(SESSION_SECRET));

app.get('/health', (_req, res) => {
  res.type('text/plain').send('ok');
});

function requireMember(req, res, next) {
  const token = readSession(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let member = stmtGetMember.get(token);
  let room = member ? stmtGetRoom.get(member.name_key) : null;
  if (!member || !room) {
    const restored = restoreMember(token);
    if (restored && restored.gone) {
      clearSessionCookie(res, req);
      return res.status(404).json({ error: 'Room not found.', code: 'room_not_found' });
    }
    member = restored && restored.member;
    room = restored && restored.room;
  }
  if (!member || !room) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.sessionToken = token;
  req.member = member;
  req.room = room;
  req.user = readAccountUser(req);
  next();
}

function requireAccount(req, res, next) {
  const user = readAccountUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized', code: 'auth_required' });
  }
  req.user = user;
  touchAccount(user.id);
  next();
}

function requireSeatedOrNull(req) {
  const token = readSession(req);
  if (!token) return null;
  return stmtGetMember.get(token) || null;
}

function requireWebpUpload(req) {
  const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (type && type !== 'image/webp') {
    throw httpError(400, 'Could not read that image.', 'image_invalid');
  }
  if (!Buffer.isBuffer(req.body)) {
    throw httpError(400, 'Could not read that image.', 'image_invalid');
  }
}

function usernameForUser(user) {
  return {
    display: accountDisplayName(user),
    key: user.username_key,
  };
}

function avatarUrlForUser(user) {
  if (!user || !user.avatar_path) return null;
  return `/api/avatars/${user.id}?v=${uploadCacheTag(user.avatar_path)}`;
}

function iconUrlForRoom(room) {
  if (!room || !room.icon_path) return null;
  return `/api/rooms/icon/${encodeURIComponent(room.name_key)}?v=${uploadCacheTag(room.icon_path)}`;
}

function memberPeerPayload(row) {
  const user = row.user_id ? stmtGetUser.get(row.user_id) : null;
  return {
    id: row.peer_id,
    name: user ? accountDisplayName(user) : row.username,
    userId: user ? user.id : null,
    avatarUrl: avatarUrlForUser(user),
  };
}

function pinPayload(row) {
  return {
    nameKey: row.name_key,
    label: roomLabel(row),
    permanent: Boolean(row.permanent),
    iconUrl: iconUrlForRoom(row),
    pinned: true,
  };
}

function accountPublic(user) {
  return {
    id: user.id,
    username: accountDisplayName(user),
    avatarUrl: avatarUrlForUser(user),
  };
}

function roomPublicPayload(room) {
  const tag = room.permanent ? '' : String(room.tag || '');
  const name = roomBaseName(room);
  return {
    name,
    tag,
    label: tag ? `${name}#${tag}` : name,
    nameKey: room.name_key,
    permanent: Boolean(room.permanent),
    iconUrl: iconUrlForRoom(room),
  };
}

function memberPayload(room, username, member, user) {
  return {
    ...roomPublicPayload(room),
    username,
    isCreator: isCreator(room, member, user),
    userId: user ? user.id : (member && member.user_id) || null,
    avatarUrl: avatarUrlForUser(user || (member && member.user_id ? stmtGetUser.get(member.user_id) : null)),
    canEditIcon: isCreator(room, member, user),
  };
}

app.get('/api/me', requireMember, (req, res) => {
  const user = req.user || (req.member.user_id ? stmtGetUser.get(req.member.user_id) : null);
  res.json(memberPayload(req.room, req.member.username, req.member, user));
});

app.get('/api/config', requireMember, (_req, res) => {
  res.json({ iceServers: getIceServers() });
});

app.get('/api/account', (req, res) => {
  const user = readAccountUser(req);
  if (user) touchAccount(user.id);
  res.json({
    user: user ? accountPublic(user) : null,
    pins: user ? stmtListPins.all(user.id).map(pinPayload) : [],
  });
});

app.get('/api/auth/config', (_req, res) => {
  res.json({ turnstileSiteKey: turnstileSiteKeyPublic() });
});

app.post('/api/auth/register', async (req, res) => {
  const body = req.body || {};
  const password = parsePassword(body.password);
  const username = parseAccountUsername(body.username);
  if (!password || !username) {
    return res.status(400).json({ error: 'Enter a username and password.', code: 'account_fields' });
  }
  if (IS_PROD) {
    if (!TURNSTILE_SITE_KEY || !TURNSTILE_SECRET_KEY) {
      return res.status(403).json({ error: 'Could not verify you are human.', code: 'captcha_fail' });
    }
    let ok = false;
    try {
      ok = await verifyTurnstile(body.turnstileToken, req.ip);
    } catch {
      ok = false;
    }
    if (!ok) {
      return res.status(403).json({ error: 'Could not verify you are human.', code: 'captcha_fail' });
    }
  }
  if (stmtGetUserByUsername.get(username.key)) {
    return res.status(409).json({ error: 'Username taken', code: 'username_taken' });
  }
  const now = Date.now();
  try {
    const info = stmtInsertUser.run({
      email: null,
      password_hash: hashPassword(password),
      username: username.display,
      username_key: username.key,
      created_at: now,
      last_login_at: now,
    });
    const user = stmtGetUser.get(info.lastInsertRowid);
    setAccountCookie(res, req, user.id);
    res.json({ user: accountPublic(user), pins: [] });
  } catch (err) {
    if (String(err.code || '').startsWith('SQLITE_CONSTRAINT')) {
      return res.status(409).json({ error: 'Username taken', code: 'username_taken' });
    }
    sendError(res, err, 'Could not create account.', 'account_fail');
  }
});

app.post('/api/auth/login', (req, res) => {
  const body = req.body || {};
  const username = parseAccountUsername(body.username);
  const password = String(body.password ?? '');
  if (!username || !password) {
    return res.status(400).json({ error: 'Enter a username and password.', code: 'account_fields' });
  }
  const user = stmtGetUserByUsername.get(username.key);
  if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Wrong username or password.', code: 'account_bad' });
  }
  touchAccount(user.id);
  setAccountCookie(res, req, user.id);
  res.json({
    user: accountPublic(stmtGetUser.get(user.id)),
    pins: stmtListPins.all(user.id).map(pinPayload),
  });
});

app.post('/api/auth/logout', (req, res) => {
  clearAccountCookie(res, req);
  res.json({ ok: true });
});

app.post('/api/account/delete', requireAccount, (req, res) => {
  const token = readSession(req);
  if (token) removeMember(token, true, true);
  clearSessionCookie(res, req);
  deleteUserAccount(req.user.id);
  clearAccountCookie(res, req);
  res.json({ ok: true });
});

app.put(
  '/api/account/avatar',
  requireAccount,
  express.raw({ type: () => true, limit: IMAGE_MAX_BYTES }),
  (req, res) => {
    try {
      requireWebpUpload(req);
      const rel = saveWebpUpload(req.body, avatarRelPath(req.user.id));
      if (req.user.avatar_path && req.user.avatar_path !== rel) {
        unlinkQuiet(path.join(uploadsDir, req.user.avatar_path));
      }
      stmtSetUserAvatar.run(rel, req.user.id);
      res.json({ user: accountPublic(stmtGetUser.get(req.user.id)) });
    } catch (err) {
      sendError(res, err, 'Could not save image.', 'image_invalid');
    }
  }
);

app.get('/api/avatars/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(404).end();
  }
  const user = stmtGetUser.get(userId);
  if (!user || !user.avatar_path) return res.status(404).end();
  const self = readAccountUser(req);
  if (self && Number(self.id) === userId) {
    if (!sendUpload(res, user.avatar_path)) res.status(404).end();
    return;
  }
  const member = requireSeatedOrNull(req);
  if (!member) return res.status(404).end();
  const sameRoom = Number(member.user_id) === userId
    || stmtMembersInRoom.all(member.name_key).some((row) => Number(row.user_id) === userId);
  if (!sameRoom) return res.status(404).end();
  if (!sendUpload(res, user.avatar_path)) res.status(404).end();
});

app.post('/api/rooms', (req, res) => {
  const body = req.body || {};
  const roomName = parseRoomName(body.name);
  const password = String(body.password ?? '');
  const user = readAccountUser(req);
  const permanent = Boolean(body.permanent);
  if (!roomName || !password) {
    return res.status(400).json({
      error: 'Enter a room name and password.',
      code: 'enter_fields',
    });
  }
  if (permanent && !user) {
    return res.status(401).json({ error: 'Unauthorized', code: 'auth_required' });
  }
  try {
    if (user) touchAccount(user.id);
    const room = createRoomTx(roomName, password, {
      ownerUserId: user ? user.id : null,
      permanent,
    });
    res.json(roomPublicPayload(room));
  } catch (err) {
    sendError(res, err, 'Could not create room.', 'could_not_create');
  }
});

app.post('/api/rooms/join', (req, res) => {
  const body = req.body || {};
  const roomName = parseRoomName(body.name);
  const password = String(body.password ?? '');
  const user = readAccountUser(req);
  const username = user ? usernameForUser(user) : parseUsername(body.username);
  if (!roomName || !username || !password) {
    return res.status(400).json({
      error: 'Enter a room name, password, and username.',
      code: 'enter_fields',
    });
  }
  const room = resolveJoinRoom(roomName);
  if (!room) {
    const code = roomName.tag ? 'room_not_found' : 'room_tag_required';
    const error = roomName.tag
      ? 'Room not found.'
      : 'Include the room tag, e.g. room#abcd.';
    return res.status(404).json({ error, code });
  }
  if (!hashesMatch(password, room.password_hash)) {
    return res.status(401).json({ error: 'Wrong password.', code: 'wrong_password' });
  }
  try {
    const member = addMemberTx(room, username, readSession(req), user ? user.id : null);
    announceDroppedMember(member.previous);
    setSessionCookie(res, req, member.token);
    const joined = member.room || room;
    res.json(memberPayload(joined, username.display, {
      username_key: username.key,
      peer_id: member.peerId,
      user_id: user ? user.id : null,
    }, user));
  } catch (err) {
    sendError(res, err, 'Could not join room.', 'could_not_join');
  }
});

app.post('/api/rooms/rejoin', requireAccount, (req, res) => {
  const nameKey = String((req.body || {}).nameKey || '');
  if (!nameKey) {
    return res.status(400).json({ error: 'Room not found.', code: 'room_not_found' });
  }
  const membership = stmtGetMembership.get(req.user.id, nameKey);
  if (!membership) {
    return res.status(404).json({ error: 'Room not found.', code: 'room_not_found' });
  }
  const room = stmtGetRoom.get(nameKey);
  if (!room) {
    stmtDeleteMembership.run(req.user.id, nameKey);
    return res.status(404).json({ error: 'Room not found.', code: 'room_not_found' });
  }
  try {
    const username = usernameForUser(req.user);
    const member = addMemberTx(room, username, readSession(req), req.user.id);
    announceDroppedMember(member.previous);
    setSessionCookie(res, req, member.token);
    const joined = member.room || room;
    res.json(memberPayload(joined, username.display, {
      username_key: username.key,
      peer_id: member.peerId,
      user_id: req.user.id,
    }, req.user));
  } catch (err) {
    sendError(res, err, 'Could not join room.', 'could_not_join');
  }
});

app.post('/api/rooms/pin', requireAccount, requireMember, (req, res) => {
  stmtUpsertMembership.run({
    user_id: req.user.id,
    name_key: req.room.name_key,
    created_at: Date.now(),
  });
  res.json({ pins: stmtListPins.all(req.user.id).map(pinPayload) });
});

app.post('/api/rooms/unpin', requireAccount, (req, res) => {
  const nameKey = String((req.body || {}).nameKey || '');
  stmtDeleteMembership.run(req.user.id, nameKey);
  res.json({ pins: stmtListPins.all(req.user.id).map(pinPayload) });
});

app.put(
  '/api/rooms/icon',
  requireMember,
  express.raw({ type: () => true, limit: IMAGE_MAX_BYTES }),
  (req, res) => {
    if (!isCreator(req.room, req.member, req.user)) {
      return res.status(403).json({ error: 'Only the room creator can upload an icon.', code: 'kick_forbidden' });
    }
    try {
      requireWebpUpload(req);
      const rel = saveWebpUpload(req.body, roomIconRelPath(req.room.name_key));
      if (req.room.icon_path && req.room.icon_path !== rel) {
        unlinkQuiet(path.join(uploadsDir, req.room.icon_path));
      }
      stmtSetRoomIcon.run(rel, req.room.name_key);
      const room = stmtGetRoom.get(req.room.name_key);
      res.json({ iconUrl: iconUrlForRoom(room) });
    } catch (err) {
      sendError(res, err, 'Could not save image.', 'image_invalid');
    }
  }
);

app.get('/api/rooms/icon/:nameKey', (req, res) => {
  const nameKey = decodeURIComponent(String(req.params.nameKey || ''));
  const room = stmtGetRoom.get(nameKey);
  if (!room || !room.icon_path) return res.status(404).end();
  const user = readAccountUser(req);
  const member = requireSeatedOrNull(req);
  const memberOk = member && member.name_key === nameKey;
  const pinOk = user && stmtGetMembership.get(user.id, nameKey);
  if (!memberOk && !pinOk) return res.status(404).end();
  if (!sendUpload(res, room.icon_path)) res.status(404).end();
});

app.post('/api/kick', requireMember, (req, res) => {
  if (!isCreator(req.room, req.member, req.user)) {
    return res.status(403).json({ error: 'Only the room creator can remove people.', code: 'kick_forbidden' });
  }
  const peerId = String((req.body || {}).id || '');
  if (!peerId) {
    return res.status(400).json({ error: 'Missing peer.', code: 'peer_gone' });
  }
  if (peerId === req.member.peer_id) {
    return res.status(400).json({ error: 'You cannot remove yourself.', code: 'kick_self' });
  }
  const target = stmtGetMemberByPeer.get(req.room.name_key, peerId);
  if (!target) {
    return res.status(404).json({ error: 'Peer gone', code: 'peer_gone' });
  }
  const sock = findSocketByToken(target.session_token);
  if (sock) send(sock, { type: 'kicked' });
  removeMember(target.session_token, true, true);
  res.json({ ok: true });
});

app.post('/api/leave', (req, res) => {
  const token = readSession(req);
  if (token) removeMember(token, true, true);
  clearSessionCookie(res, req);
  res.json({ ok: true });
});

app.get('/api/stream', requireMember, (req, res) => {
  req.setTimeout(0);
  res.setTimeout(0);
  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const { member, room } = req;
  const resumed = cancelMemberGrace(member.session_token);
  rememberSession(
    member.session_token,
    room,
    { display: member.username, key: member.username_key },
    member.user_id,
    member.peer_id
  );
  const client = {
    id: member.peer_id,
    token: member.session_token,
    nameKey: member.name_key,
    username: member.username,
    res,
    replaced: false,
  };

  let replaced = resumed;
  const existing = sockets.get(client.token);
  if (existing) {
    existing.replaced = true;
    sockets.delete(client.token);
    if (!existing.res.writableEnded) existing.res.end();
    replaced = true;
  }

  touchRoom(room.name_key);
  sockets.set(client.token, client);

  const others = stmtMembersInRoom
    .all(room.name_key)
    .filter((row) => row.session_token !== client.token)
    .map(memberPeerPayload);
  send(client, {
    type: 'hello',
    id: client.id,
    name: client.username,
    ...memberPeerPayload(member),
    peers: others,
  });
  if (!replaced) {
    broadcastRoom(room.name_key, { type: 'peer-joined', ...memberPeerPayload(member) }, client.token);
  }

  const heartbeat = setInterval(() => {
    if (res.writableEnded) return;
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const current = sockets.get(client.token);
    if (current !== client) return;
    sockets.delete(client.token);
    if (client.replaced) return;
    scheduleMemberGrace(client.token);
  });
});

app.post('/api/signal', requireMember, (req, res) => {
  const from = findSocketByToken(req.sessionToken);
  if (!from) {
    return res.status(409).json({ error: 'Not in room' });
  }
  const body = req.body || {};
  if (body.type !== 'signal' || !body.data || !body.to) {
    return res.status(400).json({ error: 'Bad signal' });
  }
  const target = findSocketById(body.to, from.nameKey);
  if (!target) {
    return res.status(404).json({ error: 'Peer gone' });
  }
  send(target, { type: 'signal', from: from.id, data: body.data });
  res.json({ ok: true });
});

const publicDir = path.join(__dirname, 'public');

function assetVersion(name) {
  try {
    return String(Math.trunc(fs.statSync(path.join(publicDir, name)).mtimeMs));
  } catch {
    return '0';
  }
}

function sendHtml(res, fileName, replacements) {
  let html = fs.readFileSync(path.join(publicDir, fileName), 'utf8');
  for (const [from, to] of replacements) html = html.split(from).join(to);
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  res.type('html').send(html);
}

function sendIndex(res) {
  sendHtml(res, 'index.html', [
    ['href="/styles.css"', `href="/styles.css?v=${assetVersion('styles.css')}"`],
    ['src="/app.js"', `src="/app.js?v=${assetVersion('app.js')}"`],
    ['"./i18n.js":"/i18n.js"', `"./i18n.js":"/i18n.js?v=${assetVersion('i18n.js')}"`],
  ]);
}

app.get(['/', '/index.html'], (_req, res) => {
  sendIndex(res);
});

app.get(['/r/:name', '/r/:name/:tag'], (_req, res) => {
  sendIndex(res);
});

app.use(express.static(publicDir, {
  etag: true,
  lastModified: true,
  setHeaders(res, filePath) {
    const ext = path.extname(filePath);
    if (ext === '.html' || ext === '.js' || ext === '.css') {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  },
}));

sweepExpiredRooms();
sweepExpiredAccounts();
setInterval(() => {
  sweepExpiredRooms();
  sweepExpiredAccounts();
}, SWEEP_MS).unref();

function chatPayload(row) {
  return {
    id: Number(row.id),
    peerId: row.peerId || row.peer_id,
    username: row.username,
    usernameKey: row.usernameKey || row.username_key,
    body: row.body,
    createdAt: Number(row.createdAt || row.created_at),
  };
}

function memberFromHandshake(req) {
  const token = (req.signedCookies && req.signedCookies.session) || null;
  if (!token) return null;
  let member = stmtGetMember.get(token);
  let room = member ? stmtGetRoom.get(member.name_key) : null;
  if (!member || !room) {
    const restored = restoreMember(token);
    if (!restored || restored.gone) return null;
    member = restored.member;
    room = restored.room;
  }
  if (!member || !room) return null;
  return { token, member, room };
}

const parseCookies = cookieParser(SESSION_SECRET);
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  path: '/socket.io',
  serveClient: true,
});

io.use((socket, next) => {
  parseCookies(socket.request, {}, (err) => {
    if (err) return next(new Error('Unauthorized'));
    const session = memberFromHandshake(socket.request);
    if (!session) return next(new Error('Unauthorized'));
    socket.data.token = session.token;
    socket.data.nameKey = session.member.name_key;
    socket.data.username = session.member.username;
    socket.data.usernameKey = session.member.username_key;
    socket.data.peerId = session.member.peer_id;
    socket.data.isCreator = isCreator(session.room, session.member, readAccountUser(socket.request));
    next();
  });
});

io.on('connection', (socket) => {
  const prev = chatSockets.get(socket.data.token);
  if (prev && prev !== socket) prev.disconnect(true);
  chatSockets.set(socket.data.token, socket);
  socket.join(socket.data.nameKey);
  socket.emit('chat:history', stmtChatHistory.all(socket.data.nameKey).map(chatPayload));

  socket.on('disconnect', () => {
    if (chatSockets.get(socket.data.token) === socket) chatSockets.delete(socket.data.token);
  });

  socket.on('chat:send', (payload) => {
    const now = Date.now();
    if (socket.data.lastChatAt && now - socket.data.lastChatAt < CHAT_RATE_MS) return;
    const body = String((payload && payload.body) || '')
      .replace(/\r\n/g, '\n')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (!body || body.length > CHAT_MAX_LEN) return;
    const member = stmtGetMember.get(socket.data.token);
    if (!member || member.name_key !== socket.data.nameKey) return;
    socket.data.lastChatAt = now;
    const id = addChatTx({
      name_key: member.name_key,
      peer_id: member.peer_id,
      username: member.username,
      username_key: member.username_key,
      body,
      created_at: now,
    });
    io.to(member.name_key).emit('chat:message', chatPayload({
      id,
      peerId: member.peer_id,
      username: member.username,
      usernameKey: member.username_key,
      body,
      createdAt: now,
    }));
  });

  socket.on('chat:delete', (payload) => {
    const id = Number(payload && payload.id);
    if (!Number.isFinite(id) || id <= 0) return;
    const member = stmtGetMember.get(socket.data.token);
    const room = member ? stmtGetRoom.get(member.name_key) : null;
    if (!member || !room || !isCreator(room, member, readAccountUser(socket.request))) return;
    const row = stmtGetChat.get(id, member.name_key);
    if (!row) return;
    stmtDeleteChat.run(id, member.name_key);
    io.to(member.name_key).emit('chat:deleted', { id });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Screenshare listening on ${PORT}`);
});
