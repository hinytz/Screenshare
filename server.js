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
const MAX_MEMBERS = 5;
const ROOM_TTL_MS = 5 * 24 * 60 * 60 * 1000;
const SWEEP_MS = 5 * 60 * 1000;
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 \-]{0,30}[A-Za-z0-9]$|^[A-Za-z0-9]{2,32}$/;
const TAG_RE = /^[a-z]{4}$/;
const TAG_CHARS = 'abcdefghijklmnopqrstuvwxyz';
const CHAT_KEEP = 50;
const CHAT_MAX_LEN = 500;
const CHAT_RATE_MS = 250;

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

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
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
`);

function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (cols.some((col) => col.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

ensureColumn('rooms', 'tag', "tag TEXT NOT NULL DEFAULT ''");
ensureColumn('rooms', 'last_join_at', 'last_join_at INTEGER');
ensureColumn('rooms', 'creator_username_key', "creator_username_key TEXT NOT NULL DEFAULT ''");
db.prepare('UPDATE rooms SET last_join_at = created_at WHERE last_join_at IS NULL').run();

const stmtInsertRoom = db.prepare(`
  INSERT INTO rooms (name_key, display_name, password_hash, permanent, created_at, tag, last_join_at, creator_username_key)
  VALUES (@name_key, @display_name, @password_hash, @permanent, @created_at, @tag, @last_join_at, @creator_username_key)
`);
const stmtUpsertPermanent = db.prepare(`
  INSERT INTO rooms (name_key, display_name, password_hash, permanent, created_at, tag, last_join_at, creator_username_key)
  VALUES (@name_key, @display_name, @password_hash, 1, @created_at, '', @created_at, '')
  ON CONFLICT(name_key) DO UPDATE SET
    display_name = excluded.display_name,
    password_hash = excluded.password_hash,
    permanent = 1,
    tag = ''
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
  INSERT INTO room_members (session_token, name_key, peer_id, username, username_key, joined_at)
  VALUES (@session_token, @name_key, @peer_id, @username, @username_key, @joined_at)
`);
const stmtGetMember = db.prepare('SELECT * FROM room_members WHERE session_token = ?');
const stmtMembersInRoom = db.prepare('SELECT * FROM room_members WHERE name_key = ?');
const stmtMemberCount = db.prepare('SELECT COUNT(*) AS n FROM room_members WHERE name_key = ?');
const stmtUsernameTaken = db.prepare(
  'SELECT 1 AS ok FROM room_members WHERE name_key = ? AND username_key = ? LIMIT 1'
);
const stmtDeleteMember = db.prepare('DELETE FROM room_members WHERE session_token = ?');
const stmtDeleteMembersInRoom = db.prepare('DELETE FROM room_members WHERE name_key = ?');
const stmtClearMembers = db.prepare('DELETE FROM room_members');
const stmtGetSession = db.prepare('SELECT * FROM room_sessions WHERE session_token = ?');
const stmtUpsertSession = db.prepare(`
  INSERT INTO room_sessions (session_token, name_key, username, username_key, created_at)
  VALUES (@session_token, @name_key, @username, @username_key, @created_at)
  ON CONFLICT(session_token) DO UPDATE SET
    name_key = excluded.name_key,
    username = excluded.username,
    username_key = excluded.username_key
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

const addChatTx = db.transaction((row) => {
  const info = stmtInsertChat.run(row);
  stmtPruneChat.run(row.name_key, row.name_key);
  return Number(info.lastInsertRowid);
});

stmtClearMembers.run();

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

function deleteEphemeralRoom(nameKey) {
  const room = stmtGetRoom.get(nameKey);
  if (!room || room.permanent) return;
  if (stmtMemberCount.get(nameKey).n > 0) return;
  stmtDeleteMembersInRoom.run(nameKey);
  stmtDeleteSessionsInRoom.run(nameKey);
  stmtDeleteChatInRoom.run(nameKey);
  stmtDeleteRoom.run(nameKey);
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

function rememberSession(token, room, username) {
  stmtUpsertSession.run({
    session_token: token,
    name_key: room.name_key,
    username: username.display,
    username_key: username.key,
    created_at: Date.now(),
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
  const member = {
    session_token: token,
    name_key: room.name_key,
    peer_id: crypto.randomBytes(8).toString('hex'),
    username: session.username,
    username_key: session.username_key,
    joined_at: Date.now(),
  };
  try {
    stmtInsertMember.run(member);
  } catch {
    return null;
  }
  touchRoom(room.name_key);
  return { member, room };
}

function removeMember(token, announce, logout) {
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

function isCreator(room, member) {
  return Boolean(
    room &&
    member &&
    !room.permanent &&
    room.creator_username_key &&
    room.creator_username_key === member.username_key
  );
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

const addMemberTx = db.transaction((room, username, previousToken) => {
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
    });
  } catch (err) {
    if (String(err.code || '').startsWith('SQLITE_CONSTRAINT')) {
      throw httpError(409, 'Username taken', 'username_taken');
    }
    throw err;
  }
  rememberSession(token, room, username);
  if (previousToken && previousToken !== token) stmtDeleteSession.run(previousToken);
  if (!room.permanent && !room.creator_username_key) {
    stmtClaimCreator.run(username.key, room.name_key);
    room = stmtGetRoom.get(room.name_key) || room;
  }
  touchRoom(room.name_key);
  return { token, peerId, previous, room };
});

const createRoomTx = db.transaction((roomName, password) => {
  const now = Date.now();
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
        creator_username_key: '',
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
  next();
}

function roomPublicPayload(room) {
  const tag = room.permanent ? '' : String(room.tag || '');
  const name = roomBaseName(room);
  return {
    name,
    tag,
    label: tag ? `${name}#${tag}` : name,
    permanent: Boolean(room.permanent),
  };
}

function memberPayload(room, username, member) {
  return {
    ...roomPublicPayload(room),
    username,
    isCreator: isCreator(room, member),
  };
}

app.get('/api/me', requireMember, (req, res) => {
  res.json(memberPayload(req.room, req.member.username, req.member));
});

app.get('/api/config', requireMember, (_req, res) => {
  res.json({ iceServers: getIceServers() });
});

app.post('/api/rooms', (req, res) => {
  const body = req.body || {};
  const roomName = parseRoomName(body.name);
  const password = String(body.password ?? '');
  if (!roomName || !password) {
    return res.status(400).json({
      error: 'Enter a room name and password.',
      code: 'enter_fields',
    });
  }
  try {
    const room = createRoomTx(roomName, password);
    res.json(roomPublicPayload(room));
  } catch (err) {
    sendError(res, err, 'Could not create room.', 'could_not_create');
  }
});

app.post('/api/rooms/join', (req, res) => {
  const body = req.body || {};
  const roomName = parseRoomName(body.name);
  const username = parseUsername(body.username);
  const password = String(body.password ?? '');
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
    const member = addMemberTx(room, username, readSession(req));
    announceDroppedMember(member.previous);
    setSessionCookie(res, req, member.token);
    const joined = member.room || room;
    res.json(memberPayload(joined, username.display, {
      username_key: username.key,
      peer_id: member.peerId,
    }));
  } catch (err) {
    sendError(res, err, 'Could not join room.', 'could_not_join');
  }
});

app.post('/api/kick', requireMember, (req, res) => {
  if (req.room.permanent || !isCreator(req.room, req.member)) {
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
  const client = {
    id: member.peer_id,
    token: member.session_token,
    nameKey: member.name_key,
    username: member.username,
    res,
    replaced: false,
  };

  let replaced = false;
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
    .map((row) => ({ id: row.peer_id, name: row.username }));
  send(client, { type: 'hello', id: client.id, name: client.username, peers: others });
  if (!replaced) {
    broadcastRoom(room.name_key, { type: 'peer-joined', id: client.id, name: client.username }, client.token);
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
    removeMember(client.token, true);
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
setInterval(sweepExpiredRooms, SWEEP_MS).unref();

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
    socket.data.isCreator = isCreator(session.room, session.member);
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
    if (!member || !room || !isCreator(room, member)) return;
    const row = stmtGetChat.get(id, member.name_key);
    if (!row) return;
    stmtDeleteChat.run(id, member.name_key);
    io.to(member.name_key).emit('chat:deleted', { id });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Screenshare listening on ${PORT}`);
});
