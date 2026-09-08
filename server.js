'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
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
const EMPTY_ROOM_MS = 20_000;
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 \-]{0,30}[A-Za-z0-9]$|^[A-Za-z0-9]{2,32}$/;

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

function parseRoomName(value) {
  const display = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (display.length < 2 || display.length > 32 || !NAME_RE.test(display)) return null;
  return { display, key: keyOf(display) };
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
`);

const stmtInsertRoom = db.prepare(`
  INSERT INTO rooms (name_key, display_name, password_hash, permanent, created_at)
  VALUES (@name_key, @display_name, @password_hash, @permanent, @created_at)
`);
const stmtUpsertPermanent = db.prepare(`
  INSERT INTO rooms (name_key, display_name, password_hash, permanent, created_at)
  VALUES (@name_key, @display_name, @password_hash, 1, @created_at)
  ON CONFLICT(name_key) DO UPDATE SET
    display_name = excluded.display_name,
    password_hash = excluded.password_hash,
    permanent = 1
`);
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
      name_key: parsed.key,
      display_name: parsed.display,
      password_hash: hashSecret(password),
      created_at: now,
    });
  }
}

seedPermanentRooms();

const sockets = new Map();
const emptyTimers = new Map();

function cancelEmptyTimer(nameKey) {
  const timer = emptyTimers.get(nameKey);
  if (!timer) return;
  clearTimeout(timer);
  emptyTimers.delete(nameKey);
}

function deleteEphemeralRoom(nameKey) {
  const room = stmtGetRoom.get(nameKey);
  if (!room || room.permanent) return;
  if (stmtMemberCount.get(nameKey).n > 0) return;
  stmtDeleteMembersInRoom.run(nameKey);
  stmtDeleteRoom.run(nameKey);
}

function scheduleEmptyRoom(nameKey) {
  const room = stmtGetRoom.get(nameKey);
  if (!room || room.permanent) return;
  if (stmtMemberCount.get(nameKey).n > 0) return;
  cancelEmptyTimer(nameKey);
  emptyTimers.set(
    nameKey,
    setTimeout(() => {
      emptyTimers.delete(nameKey);
      deleteEphemeralRoom(nameKey);
    }, EMPTY_ROOM_MS)
  );
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

function closeSocket(token) {
  const client = sockets.get(token);
  if (!client) return;
  client.replaced = true;
  sockets.delete(token);
  if (!client.res.writableEnded) client.res.end();
}

function rememberPermanentSession(token, room, username) {
  if (!room.permanent) {
    stmtDeleteSession.run(token);
    return;
  }
  stmtUpsertSession.run({
    session_token: token,
    name_key: room.name_key,
    username: username.display,
    username_key: username.key,
    created_at: Date.now(),
  });
}

function restorePermanentMember(token) {
  const session = stmtGetSession.get(token);
  if (!session) return null;
  const room = stmtGetRoom.get(session.name_key);
  if (!room || !room.permanent) {
    stmtDeleteSession.run(token);
    return null;
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
  cancelEmptyTimer(room.name_key);
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
    scheduleEmptyRoom(member.name_key);
  }
  if (logout) stmtDeleteSession.run(token);
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
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
  if (count >= MAX_MEMBERS) throw httpError(409, 'Room is full');
  if (stmtUsernameTaken.get(room.name_key, username.key)) {
    throw httpError(409, 'Username taken');
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
      throw httpError(409, 'Username taken');
    }
    throw err;
  }
  rememberPermanentSession(token, room, username);
  if (previousToken && previousToken !== token) stmtDeleteSession.run(previousToken);
  return { token, peerId, previous };
});

const createRoomTx = db.transaction((roomName, password, username, previousToken) => {
  if (stmtGetRoom.get(roomName.key)) throw httpError(409, 'Room already exists');
  try {
    stmtInsertRoom.run({
      name_key: roomName.key,
      display_name: roomName.display,
      password_hash: hashSecret(password),
      permanent: 0,
      created_at: Date.now(),
    });
  } catch (err) {
    if (String(err.code || '').startsWith('SQLITE_CONSTRAINT')) {
      throw httpError(409, 'Room already exists');
    }
    throw err;
  }
  const room = stmtGetRoom.get(roomName.key);
  const previous = previousToken ? dropMemberRow(previousToken) : null;
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
      throw httpError(409, 'Username taken');
    }
    throw err;
  }
  stmtDeleteSession.run(token);
  if (previousToken && previousToken !== token) stmtDeleteSession.run(previousToken);
  return { room, member: { token, peerId, previous } };
});

function announceDroppedMember(previous) {
  if (!previous) return;
  closeSocket(previous.session_token);
  broadcastRoom(previous.name_key, { type: 'peer-left', id: previous.peer_id }, previous.session_token);
  scheduleEmptyRoom(previous.name_key);
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
    const restored = restorePermanentMember(token);
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

function memberPayload(room, username) {
  return {
    name: room.display_name,
    username,
    permanent: Boolean(room.permanent),
  };
}

app.get('/api/me', requireMember, (req, res) => {
  res.json(memberPayload(req.room, req.member.username));
});

app.get('/api/config', requireMember, (_req, res) => {
  res.json({ iceServers: getIceServers() });
});

app.post('/api/rooms', (req, res) => {
  const body = req.body || {};
  const roomName = parseRoomName(body.name);
  const username = parseUsername(body.username);
  const password = String(body.password ?? '');
  if (!roomName || !username || !password) {
    return res.status(400).json({ error: 'Enter a room name, password, and username.' });
  }
  try {
    const previousToken = readSession(req);
    const { room, member } = createRoomTx(roomName, password, username, previousToken);
    cancelEmptyTimer(room.name_key);
    announceDroppedMember(member.previous);
    setSessionCookie(res, req, member.token);
    res.json(memberPayload(room, username.display));
  } catch (err) {
    const status = err.status || 500;
    const message = err.status ? err.message : 'Could not create room.';
    res.status(status).json({ error: message });
  }
});

app.post('/api/rooms/join', (req, res) => {
  const body = req.body || {};
  const roomName = parseRoomName(body.name);
  const username = parseUsername(body.username);
  const password = String(body.password ?? '');
  if (!roomName || !username || !password) {
    return res.status(400).json({ error: 'Enter a room name, password, and username.' });
  }
  const room = stmtGetRoom.get(roomName.key);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }
  if (!hashesMatch(password, room.password_hash)) {
    return res.status(401).json({ error: 'Wrong password.' });
  }
  try {
    const member = addMemberTx(room, username, readSession(req));
    cancelEmptyTimer(room.name_key);
    announceDroppedMember(member.previous);
    setSessionCookie(res, req, member.token);
    res.json(memberPayload(room, username.display));
  } catch (err) {
    const status = err.status || 500;
    const message = err.status ? err.message : 'Could not join room.';
    res.status(status).json({ error: message });
  }
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

  cancelEmptyTimer(room.name_key);
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

app.get(['/', '/index.html'], (_req, res) => {
  const css = assetVersion('styles.css');
  const js = assetVersion('app.js');
  sendHtml(res, 'index.html', [
    ['href="/styles.css"', `href="/styles.css?v=${css}"`],
    ['src="/app.js"', `src="/app.js?v=${js}"`],
  ]);
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

app.listen(PORT, () => {
  console.log(`Screenshare listening on ${PORT}`);
});
