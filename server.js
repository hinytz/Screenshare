'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');
const ids = require('./ids');
const { applySchema } = require('./lib/schema');
const roomsLib = require('./lib/rooms');
const channelsLib = require('./lib/channels');

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
const ACCOUNT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SWEEP_MS = 5 * 60 * 1000;
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _\-]{0,30}[A-Za-z0-9]$|^[A-Za-z0-9][A-Za-z0-9_]{1,31}$/;
const ACCOUNT_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_]{1,31}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHANNEL_NAME_RE = NAME_RE;
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
  return roomsLib.parseRoomName(value, NAME_RE);
}

function roomLabel(room) {
  return String((room && room.display_name) || '');
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

function httpError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

function parseRoomKind(value) {
  const kind = String(value || 'screenshare').trim().toLowerCase();
  if (kind === 'watchparty' || kind === 'screenshare') return kind;
  throw httpError(400, 'Invalid room type.', 'room_kind_bad');
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
applySchema(db);

const publicFileNames = fs.readdirSync(path.join(__dirname, 'public'));
const store = require('./lib/store').createStore(db, {
  httpError,
  nameRe: NAME_RE,
  parseRoomKind,
  publicFileNames,
  chatKeep: CHAT_KEEP,
});
const {
  rooms: roomsApi,
  channels: channelsApi,
  stmtTouchRoom,
  stmtExpiredRooms,
  stmtDeleteSessionsInRoom,
  stmtGetMemberByPeer,
  stmtDeleteRoom,
  stmtInsertMember,
  stmtGetMember,
  stmtMembersInRoom,
  stmtMemberCount,
  stmtUsernameTaken,
  stmtDeleteMember,
  stmtDeleteMembersInRoom,
  stmtGetSession,
  stmtUpsertSession,
  stmtDeleteSession,
  stmtChatHistory,
  stmtGetChat,
  stmtDeleteChat,
  stmtDeleteChatInRoom,
  stmtDeleteChatInChannel,
  stmtDeleteChannelsInRoom,
  stmtDeleteRequestsInRoom,
  stmtInsertUser,
  stmtGetUser,
  stmtGetUserByEmail,
  stmtGetUserByUsername,
  stmtTouchUser,
  stmtSetUserAvatar,
  stmtExpiredUsers,
  stmtDeleteUser,
  stmtDeleteOAuthForUser,
  stmtRoomsByOwner,
  stmtMembersByUser,
  stmtSetRoomIcon,
  stmtGetMembership,
  stmtDeleteMembership,
  stmtDeleteMembershipsForUser,
  stmtDeleteMembershipsInRoom,
  stmtListPins,
  stmtGetWatch,
  stmtUpsertWatch,
  stmtUpdateWatchPlayback,
  stmtUpdateWatchHost,
  stmtDeleteWatch,
  addChatTx,
  stmtGetRoom,
  stmtGetRoomByInvite,
  stmtUpsertMembership,
} = store;

const sockets = new Map();
const chatSockets = new Map();
const watchSockets = new Map();
const voiceByToken = new Map();
let watchIo = null;

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

function roomIconRelPath(roomId) {
  const id = crypto.createHash('sha256').update(String(roomId)).digest('hex').slice(0, 32);
  return path.posix.join('rooms', `${id}.webp`);
}

function avatarRelPath(userId) {
  const safe = String(userId || '').replace(/[^0-9]/g, '').slice(0, 32) || 'user';
  return path.posix.join('avatars', `${safe}.webp`);
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

function deleteOrphanRoom(roomId) {
  const room = stmtGetRoom.get(roomId);
  if (!room || room.owner_user_id) return;
  if (stmtMemberCount.get(roomId).n > 0) return;
  if (room.icon_path) unlinkQuiet(path.join(uploadsDir, room.icon_path));
  stmtDeleteRequestsInRoom.run(roomId);
  stmtDeleteMembershipsInRoom.run(roomId);
  stmtDeleteMembersInRoom.run(roomId);
  stmtDeleteSessionsInRoom.run(roomId);
  stmtDeleteWatch.run(roomId);
  stmtDeleteChatInRoom.run(roomId);
  stmtDeleteChannelsInRoom.run(roomId);
  stmtDeleteRoom.run(roomId);
}

function evictRoom(roomId) {
  for (const row of stmtMembersInRoom.all(roomId)) {
    const sock = findSocketByToken(row.session_token);
    if (sock) send(sock, { type: 'kicked' });
    removeMember(row.session_token, true, true);
  }
}

function deleteRoomFully(roomId) {
  const room = stmtGetRoom.get(roomId);
  if (!room) return;
  evictRoom(roomId);
  if (room.icon_path) unlinkQuiet(path.join(uploadsDir, room.icon_path));
  stmtDeleteRequestsInRoom.run(roomId);
  stmtDeleteMembershipsInRoom.run(roomId);
  stmtDeleteMembersInRoom.run(roomId);
  stmtDeleteSessionsInRoom.run(roomId);
  stmtDeleteWatch.run(roomId);
  stmtDeleteChatInRoom.run(roomId);
  stmtDeleteChannelsInRoom.run(roomId);
  stmtDeleteRoom.run(roomId);
}

function deleteUserAccount(userId) {
  const user = stmtGetUser.get(userId);
  if (!user) return;
  for (const row of stmtMembersByUser.all(userId)) {
    removeMember(row.session_token, true, true);
  }
  for (const row of stmtRoomsByOwner.all(userId)) {
    deleteRoomFully(row.id);
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
  const cutoff = Date.now() - ACCOUNT_TTL_MS;
  for (const row of stmtExpiredRooms.all(cutoff)) {
    deleteOrphanRoom(row.id);
  }
}

function roomSockets(roomId) {
  return [...sockets.values()].filter((client) => String(client.roomId) === String(roomId));
}

function socketsForUser(userId) {
  if (!userId) return [];
  return [...sockets.values()].filter((client) => {
    const member = stmtGetMember.get(client.token);
    return member && String(member.user_id) === String(userId);
  });
}

function notifyUser(userId, payload) {
  for (const client of socketsForUser(userId)) send(client, payload);
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

function findSocketById(id, roomId) {
  return roomSockets(roomId).find((client) => client.id === id) || null;
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

function closeWatchSocket(token) {
  const sock = watchSockets.get(token);
  if (!sock) return;
  watchSockets.delete(token);
  sock.disconnect(true);
}

function closeSocket(token) {
  closeChatSocket(token);
  closeWatchSocket(token);
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
  if (!ids.isSnowflake(raw)) return null;
  return stmtGetUser.get(String(raw)) || null;
}

function touchAccount(userId) {
  if (!userId) return;
  stmtTouchUser.run(Date.now(), userId);
}

function rememberSession(token, room, username, userId, peerId) {
  stmtUpsertSession.run({
    session_token: token,
    room_id: room.id,
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
  const room = stmtGetRoom.get(session.room_id);
  if (!room) {
    stmtDeleteMember.run(token);
    stmtDeleteSession.run(token);
    return { gone: true };
  }
  const existing = stmtGetMember.get(token);
  if (existing) return { member: existing, room };
  if (stmtUsernameTaken.get(room.id, session.username_key)) return null;
  const peerId = session.peer_id || ids.nextSnowflake();
  const member = {
    session_token: token,
    room_id: room.id,
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
  touchRoom(room.id);
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

function memberVoiceChannel(token) {
  return voiceByToken.get(token) || null;
}

function memberInVoice(token) {
  return Boolean(memberVoiceChannel(token));
}

function removeMember(token, announce, logout) {
  cancelMemberGrace(token);
  const leftChannelId = memberVoiceChannel(token);
  voiceByToken.delete(token);
  const member = stmtGetMember.get(token);
  closeSocket(token);
  if (member) {
    stmtDeleteMember.run(token);
    if (announce) {
      if (leftChannelId) {
        broadcastRoom(member.room_id, {
          type: 'voice-left',
          id: member.peer_id,
          channelId: leftChannelId,
          inVoice: false,
        }, token);
      }
      broadcastRoom(member.room_id, { type: 'peer-left', id: member.peer_id }, token);
    }
    const room = stmtGetRoom.get(member.room_id);
    if (room) {
      const nextWatch = fallbackWatchHost(room, member.peer_id);
      if (nextWatch) broadcastWatch(room.id, { action: 'host' });
    }
  }
  if (logout) stmtDeleteSession.run(token);
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

function roomKindOf(room) {
  return room && room.kind === 'watchparty' ? 'watchparty' : 'screenshare';
}

function isCreator(room, member, user) {
  if (!room || !member) return false;
  if (user && roomsApi.isOwner(room, user)) return true;
  return Boolean(room.owner_user_id && member.user_id && String(room.owner_user_id) === String(member.user_id));
}

function isHlsUrl(url) {
  const path = `${url.pathname || ''}${url.search || ''}`;
  return /\.m3u8(\b|$)/i.test(path);
}

function watchAllowsSync(watch) {
  if (!watch) return false;
  return watch.sourceType === 'youtube' || watch.sourceType === 'media' || watch.sourceType === 'hls';
}

function watchPublic(roomId) {
  const row = stmtGetWatch.get(roomId);
  if (!row) return null;
  return {
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    videoId: row.video_id || '',
    hostPeerId: row.host_peer_id || '',
    hostUserId: row.host_user_id == null ? null : String(row.host_user_id),
    hostUsernameKey: row.host_username_key || '',
    paused: Boolean(row.paused),
    mediaTime: Number(row.media_time) || 0,
    updatedAt: Number(row.updated_at) || 0,
  };
}

function memberMatchesWatchHost(watch, member, user) {
  if (!watch || !member) return false;
  if (watch.hostPeerId && watch.hostPeerId === member.peer_id) return true;
  if (watch.hostUserId && user && String(watch.hostUserId) === String(user.id)) return true;
  if (watch.hostUsernameKey && watch.hostUsernameKey === member.username_key) return true;
  return false;
}

function canManageWatch(room, member, user, watch) {
  if (isCreator(room, member, user)) return true;
  return memberMatchesWatchHost(watch, member, user);
}

function canControlWatch(room, member, user, watch) {
  return canManageWatch(room, member, user, watch);
}

function parseWatchSource(raw) {
  let url;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    throw httpError(400, 'Could not use that link.', 'watch_bad_url');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw httpError(400, 'Could not use that link.', 'watch_bad_url');
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0] || '';
    if (!id) throw httpError(400, 'Could not use that link.', 'watch_bad_url');
    return { sourceType: 'youtube', sourceUrl: url.toString(), videoId: id };
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    let id = url.searchParams.get('v') || '';
    const parts = url.pathname.split('/').filter(Boolean);
    if (!id && (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live')) {
      id = parts[1] || '';
    }
    if (!id) throw httpError(400, 'Could not use that link.', 'watch_bad_url');
    return { sourceType: 'youtube', sourceUrl: url.toString(), videoId: id };
  }
  if (host === 'clips.twitch.tv') {
    throw httpError(400, 'Twitch clips are not compatible.', 'watch_clip');
  }
  if (host === 'twitch.tv' || host === 'm.twitch.tv' || host === 'player.twitch.tv') {
    const parts = url.pathname.split('/').filter(Boolean);
    if (url.searchParams.get('clip') || parts[0] === 'clip' || parts[1] === 'clip') {
      throw httpError(400, 'Twitch clips are not compatible.', 'watch_clip');
    }
    if (url.searchParams.get('video') || parts[0] === 'videos' || parts[0] === 'video') {
      throw httpError(400, 'Twitch VODs are not compatible.', 'watch_vod');
    }
    const channel = url.searchParams.get('channel') || parts[0] || '';
    if (!channel) throw httpError(400, 'Could not use that link.', 'watch_bad_url');
    return {
      sourceType: 'twitch',
      sourceUrl: url.toString(),
      videoId: channel,
    };
  }
  if (isHlsUrl(url)) {
    return { sourceType: 'hls', sourceUrl: url.toString(), videoId: '' };
  }
  return { sourceType: 'media', sourceUrl: url.toString(), videoId: '' };
}

function hostFieldsFromMember(member) {
  return {
    host_peer_id: member.peer_id,
    host_user_id: member.user_id || null,
    host_username_key: member.username_key || '',
  };
}

function fallbackWatchHost(room, leavingPeerId) {
  const watch = stmtGetWatch.get(room.id);
  if (!watch || !leavingPeerId || watch.host_peer_id !== leavingPeerId) return;
  const members = stmtMembersInRoom.all(room.id);
  const owner = members.find((row) => {
    const user = row.user_id ? stmtGetUser.get(row.user_id) : null;
    return isCreator(room, row, user);
  }) || members[0];
  if (!owner) {
    stmtDeleteWatch.run(room.id);
    return null;
  }
  stmtUpdateWatchHost.run({
    room_id: room.id,
    ...hostFieldsFromMember(owner),
    updated_at: Date.now(),
  });
  return watchPublic(room.id);
}

function broadcastWatch(roomId, extra) {
  if (!watchIo) return;
  watchIo.to(String(roomId)).emit('watch:event', {
    action: extra && extra.action,
    state: watchPublic(roomId),
    serverAt: Date.now(),
    sentAt: extra && extra.sentAt,
  });
}

function persistWatchControl(room, member, user, action, body) {
  const current = watchPublic(room.id);
  if (!current) throw httpError(400, 'Start a watch party first.', 'watch_missing');
  if (!watchAllowsSync(current)) return current;
  if (!canControlWatch(room, member, user, current)) {
    throw httpError(403, 'Only the host can do that.', 'watch_forbidden');
  }
  const now = Date.now();
  const mediaTime = Math.max(0, Number(body && body.mediaTime));
  const paused = action === 'pause'
    ? 1
    : action === 'play'
      ? 0
      : (body && body.paused == null ? (current.paused ? 1 : 0) : (body.paused ? 1 : 0));
  stmtUpdateWatchPlayback.run({
    room_id: room.id,
    paused,
    media_time: Number.isFinite(mediaTime) ? mediaTime : current.mediaTime,
    updated_at: now,
  });
  broadcastWatch(room.id, {
    action,
    sentAt: Number(body && body.sentAt) || now,
  });
  return watchPublic(room.id);
}

function dropMemberRow(token) {
  const member = stmtGetMember.get(token);
  if (!member) return null;
  stmtDeleteMember.run(token);
  return member;
}

const addMemberTx = db.transaction((room, username, previousToken, userId) => {
  roomsApi.assertJoinAccess(room, userId ? stmtGetUser.get(userId) : null);
  const previous = previousToken ? dropMemberRow(previousToken) : null;
  if (stmtUsernameTaken.get(room.id, username.key)) {
    throw httpError(409, 'Username taken', 'username_taken');
  }
  const token = roomsLib.newSessionToken();
  const peerId = ids.nextSnowflake();
  try {
    stmtInsertMember.run({
      session_token: token,
      room_id: room.id,
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
  if (userId) {
    roomsApi.stmtUpsertMembership.run({
      user_id: userId,
      room_id: room.id,
      created_at: Date.now(),
    });
    touchAccount(userId);
  }
  touchRoom(room.id);
  return { token, peerId, previous, room };
});

function announceDroppedMember(previous) {
  if (!previous) return;
  closeSocket(previous.session_token);
  broadcastRoom(previous.room_id, { type: 'peer-left', id: previous.peer_id }, previous.session_token);
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
  let room = member ? stmtGetRoom.get(member.room_id) : null;
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
  return `/api/rooms/icon/${encodeURIComponent(room.id)}?v=${uploadCacheTag(room.icon_path)}`;
}

function channelsPayload(room) {
  return channelsApi.listChannels(room.id).map(channelsLib.channelPublic);
}

function voiceCountsForRoom(roomId) {
  const counts = {};
  for (const row of stmtMembersInRoom.all(roomId)) {
    const ch = memberVoiceChannel(row.session_token);
    if (!ch) continue;
    counts[ch] = (counts[ch] || 0) + 1;
  }
  return counts;
}

function memberPeerPayload(row) {
  const user = row.user_id ? stmtGetUser.get(row.user_id) : null;
  const voiceChannelId = memberVoiceChannel(row.session_token);
  return {
    id: row.peer_id,
    name: user ? accountDisplayName(user) : row.username,
    userId: user ? String(user.id) : null,
    avatarUrl: avatarUrlForUser(user),
    inVoice: Boolean(voiceChannelId),
    voiceChannelId: voiceChannelId || null,
  };
}

function pinPayload(row) {
  const room = {
    id: row.room_id || row.id,
    display_name: row.display_name,
    invite_code: row.invite_code,
    visibility: row.visibility,
    icon_path: row.icon_path,
    owner_user_id: row.owner_user_id,
    kind: row.kind,
  };
  return {
    roomId: String(room.id),
    inviteCode: room.invite_code,
    invitePath: `/${room.invite_code}`,
    label: roomLabel(room),
    visibility: room.visibility,
    kind: roomKindOf(room),
    iconUrl: iconUrlForRoom(room),
    pinned: true,
  };
}

function accountPublic(user) {
  return {
    id: String(user.id),
    username: accountDisplayName(user),
    avatarUrl: avatarUrlForUser(user),
  };
}

function joinRequestPublic(row) {
  const user = stmtGetUser.get(row.user_id);
  return {
    id: String(row.id),
    roomId: String(row.room_id),
    roomName: row.room_name || roomLabel(stmtGetRoom.get(row.room_id) || {}),
    inviteCode: row.invite_code || '',
    userId: String(row.user_id),
    username: user ? accountDisplayName(user) : (row.username ? `@${String(row.username).replace(/^@/, '')}` : ''),
    avatarUrl: avatarUrlForUser(user),
    createdAt: Number(row.created_at) || 0,
    status: row.status,
  };
}

function roomPublicPayload(room) {
  const name = roomLabel(room);
  return {
    id: String(room.id),
    name,
    label: name,
    inviteCode: room.invite_code,
    invitePath: `/${room.invite_code}`,
    visibility: room.visibility,
    kind: roomKindOf(room),
    iconUrl: iconUrlForRoom(room),
    channels: channelsPayload(room),
  };
}

function memberPayload(room, username, member, user) {
  return {
    ...roomPublicPayload(room),
    username,
    isCreator: isCreator(room, member, user),
    userId: user ? String(user.id) : (member && member.user_id ? String(member.user_id) : null),
    avatarUrl: avatarUrlForUser(user || (member && member.user_id ? stmtGetUser.get(member.user_id) : null)),
    canEditIcon: isCreator(room, member, user),
    watch: watchPublic(room.id),
    canManageWatch: canManageWatch(room, member, user, watchPublic(room.id)),
    voiceChannelId: member ? memberVoiceChannel(member.session_token) : null,
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
    pendingJoinRequests: user ? roomsApi.stmtPendingForOwner.all(user.id).map(joinRequestPublic) : [],
    outgoingJoinRequests: user ? roomsApi.stmtOutgoingPending.all(user.id).map(joinRequestPublic) : [],
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
    const userId = ids.nextSnowflake();
    stmtInsertUser.run({
      id: userId,
      email: null,
      password_hash: hashPassword(password),
      username: username.display,
      username_key: username.key,
      created_at: now,
      last_login_at: now,
    });
    const user = stmtGetUser.get(userId);
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
  const userId = String(req.params.userId || '');
  if (!ids.isSnowflake(userId)) {
    return res.status(404).end();
  }
  const user = stmtGetUser.get(userId);
  if (!user || !user.avatar_path) return res.status(404).end();
  const self = readAccountUser(req);
  if (self && String(self.id) === userId) {
    if (!sendUpload(res, user.avatar_path)) res.status(404).end();
    return;
  }
  const member = requireSeatedOrNull(req);
  if (!member) return res.status(404).end();
  const sameRoom = String(member.user_id) === userId
    || stmtMembersInRoom.all(member.room_id).some((row) => String(row.user_id) === userId);
  if (!sameRoom) return res.status(404).end();
  if (!sendUpload(res, user.avatar_path)) res.status(404).end();
});

app.post('/api/rooms', requireAccount, (req, res) => {
  const body = req.body || {};
  const roomName = parseRoomName(body.name);
  const visibility = roomsApi.parseVisibility(body.visibility);
  if (!roomName) {
    return res.status(400).json({
      error: 'Enter a room name.',
      code: 'enter_fields',
    });
  }
  if (!visibility) {
    return res.status(400).json({ error: 'Choose public or private.', code: 'visibility_bad' });
  }
  try {
    touchAccount(req.user.id);
    const room = roomsApi.createRoomTx(roomName, {
      ownerUserId: req.user.id,
      visibility,
      kind: parseRoomKind(body.kind),
    });
    res.json(roomPublicPayload(room));
  } catch (err) {
    sendError(res, err, 'Could not create room.', 'could_not_create');
  }
});

function seatedPayload(joined, username, memberInfo, user) {
  return memberPayload(joined, username.display, {
    username_key: username.key,
    peer_id: memberInfo.peerId,
    user_id: user ? user.id : null,
    session_token: memberInfo.token,
  }, user);
}

app.post('/api/rooms/join', (req, res) => {
  const body = req.body || {};
  const inviteCode = ids.parseInviteCode(body.inviteCode || body.code);
  const user = readAccountUser(req);
  const username = user ? usernameForUser(user) : parseUsername(body.username);
  if (!inviteCode || !username) {
    return res.status(400).json({
      error: 'Enter an invite code and username.',
      code: 'enter_fields',
    });
  }
  const room = stmtGetRoomByInvite.get(inviteCode);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.', code: 'room_not_found' });
  }
  try {
    const member = addMemberTx(room, username, readSession(req), user ? user.id : null);
    announceDroppedMember(member.previous);
    setSessionCookie(res, req, member.token);
    res.json(seatedPayload(member.room || room, username, member, user));
  } catch (err) {
    sendError(res, err, 'Could not join room.', 'could_not_join');
  }
});

app.post('/api/rooms/join-request', requireAccount, (req, res) => {
  const inviteCode = ids.parseInviteCode((req.body || {}).inviteCode || (req.body || {}).code);
  if (!inviteCode) {
    return res.status(400).json({ error: 'Room not found.', code: 'room_not_found' });
  }
  const room = stmtGetRoomByInvite.get(inviteCode);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.', code: 'room_not_found' });
  }
  try {
    const result = roomsApi.queueJoinRequest(room, req.user);
    if (result.alreadyMember) {
      const username = usernameForUser(req.user);
      const member = addMemberTx(room, username, readSession(req), req.user.id);
      announceDroppedMember(member.previous);
      setSessionCookie(res, req, member.token);
      return res.json({ ok: true, joined: seatedPayload(member.room || room, username, member, req.user) });
    }
    const payload = joinRequestPublic({ ...result.request, room_name: room.display_name, invite_code: room.invite_code });
    notifyUser(room.owner_user_id, { type: 'join-request', request: payload });
    res.json({ ok: true, pending: true, request: payload });
  } catch (err) {
    sendError(res, err, 'Could not request access.', 'join_private');
  }
});

app.post('/api/rooms/join-request/respond', requireAccount, (req, res) => {
  const body = req.body || {};
  try {
    const result = roomsApi.respondJoinRequest(body.requestId, req.user, Boolean(body.allow));
    const payload = joinRequestPublic({
      ...result.request,
      room_name: result.room.display_name,
      invite_code: result.room.invite_code,
    });
    notifyUser(result.request.user_id, {
      type: 'join-request-resolved',
      request: payload,
      allow: result.request.status === 'approved',
    });
    res.json({
      ok: true,
      request: payload,
      pendingJoinRequests: roomsApi.stmtPendingForOwner.all(req.user.id).map(joinRequestPublic),
    });
  } catch (err) {
    sendError(res, err, 'Could not update request.', 'request_fail');
  }
});

app.post('/api/rooms/rejoin', requireAccount, (req, res) => {
  const roomId = String((req.body || {}).roomId || (req.body || {}).nameKey || '');
  if (!ids.isSnowflake(roomId)) {
    return res.status(400).json({ error: 'Room not found.', code: 'room_not_found' });
  }
  const membership = stmtGetMembership.get(req.user.id, roomId);
  if (!membership) {
    return res.status(404).json({ error: 'Room not found.', code: 'room_not_found' });
  }
  const room = stmtGetRoom.get(roomId);
  if (!room) {
    stmtDeleteMembership.run(req.user.id, roomId);
    return res.status(404).json({ error: 'Room not found.', code: 'room_not_found' });
  }
  try {
    const username = usernameForUser(req.user);
    const member = addMemberTx(room, username, readSession(req), req.user.id);
    announceDroppedMember(member.previous);
    setSessionCookie(res, req, member.token);
    res.json(seatedPayload(member.room || room, username, member, req.user));
  } catch (err) {
    sendError(res, err, 'Could not join room.', 'could_not_join');
  }
});

app.post('/api/rooms/pin', requireAccount, requireMember, (req, res) => {
  stmtUpsertMembership.run({
    user_id: req.user.id,
    room_id: req.room.id,
    created_at: Date.now(),
  });
  res.json({ pins: stmtListPins.all(req.user.id).map(pinPayload) });
});

app.post('/api/rooms/unpin', requireAccount, (req, res) => {
  const roomId = String((req.body || {}).roomId || (req.body || {}).nameKey || '');
  stmtDeleteMembership.run(req.user.id, roomId);
  res.json({ pins: stmtListPins.all(req.user.id).map(pinPayload) });
});

app.post('/api/channels', requireMember, (req, res) => {
  if (!isCreator(req.room, req.member, req.user)) {
    return res.status(403).json({ error: 'Only the room owner can do that.', code: 'kick_forbidden' });
  }
  try {
    const channel = channelsApi.addChannel(req.room, (req.body || {}).type, (req.body || {}).name);
    const payload = channelsLib.channelPublic(channel);
    broadcastRoom(req.room.id, { type: 'channel-added', channel: payload });
    res.json({ channel: payload, channels: channelsPayload(req.room) });
  } catch (err) {
    sendError(res, err, 'Could not create channel.', 'channel_fail');
  }
});

app.post('/api/channels/rename', requireMember, (req, res) => {
  if (!isCreator(req.room, req.member, req.user)) {
    return res.status(403).json({ error: 'Only the room owner can do that.', code: 'kick_forbidden' });
  }
  try {
    const channel = channelsApi.renameChannel(req.room, (req.body || {}).channelId, (req.body || {}).name);
    const payload = channelsLib.channelPublic(channel);
    broadcastRoom(req.room.id, { type: 'channel-renamed', channel: payload });
    res.json({ channel: payload, channels: channelsPayload(req.room) });
  } catch (err) {
    sendError(res, err, 'Could not rename channel.', 'channel_fail');
  }
});

app.post('/api/channels/delete', requireMember, (req, res) => {
  if (!isCreator(req.room, req.member, req.user)) {
    return res.status(403).json({ error: 'Only the room owner can do that.', code: 'kick_forbidden' });
  }
  try {
    const channelId = String((req.body || {}).channelId || '');
    const existing = channelsApi.requireChannelInRoom(channelId, req.room.id);
    if (existing.type === 'voice') {
      for (const [token, joinedId] of [...voiceByToken.entries()]) {
        if (String(joinedId) !== String(existing.id)) continue;
        voiceByToken.delete(token);
        const member = stmtGetMember.get(token);
        if (member) {
          broadcastRoom(req.room.id, {
            type: 'voice-left',
            id: member.peer_id,
            channelId: existing.id,
            inVoice: false,
            voiceCounts: voiceCountsForRoom(req.room.id),
          });
        }
      }
    }
    stmtDeleteChatInChannel.run(existing.id);
    const channel = channelsApi.deleteChannel(req.room, existing.id);
    const payload = channelsLib.channelPublic(channel);
    broadcastRoom(req.room.id, {
      type: 'channel-deleted',
      channel: payload,
      channelId: payload.id,
      channels: channelsPayload(req.room),
      voiceCounts: voiceCountsForRoom(req.room.id),
    });
    res.json({
      ok: true,
      channel: payload,
      channels: channelsPayload(req.room),
      voiceCounts: voiceCountsForRoom(req.room.id),
    });
  } catch (err) {
    sendError(res, err, 'Could not delete channel.', 'channel_fail');
  }
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
      const rel = saveWebpUpload(req.body, roomIconRelPath(req.room.id));
      if (req.room.icon_path && req.room.icon_path !== rel) {
        unlinkQuiet(path.join(uploadsDir, req.room.icon_path));
      }
      stmtSetRoomIcon.run(rel, req.room.id);
      const room = stmtGetRoom.get(req.room.id);
      res.json({ iconUrl: iconUrlForRoom(room) });
    } catch (err) {
      sendError(res, err, 'Could not save image.', 'image_invalid');
    }
  }
);

app.get('/api/rooms/icon/:roomId', (req, res) => {
  const roomId = decodeURIComponent(String(req.params.roomId || ''));
  const room = stmtGetRoom.get(roomId);
  if (!room || !room.icon_path) return res.status(404).end();
  const user = readAccountUser(req);
  const member = requireSeatedOrNull(req);
  const memberOk = member && String(member.room_id) === String(roomId);
  const pinOk = user && stmtGetMembership.get(user.id, roomId);
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
  const target = stmtGetMemberByPeer.get(req.room.id, peerId);
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

app.post('/api/voice', requireMember, (req, res) => {
  const action = String((req.body || {}).action || '').trim().toLowerCase();
  const token = req.member.session_token;
  const peerId = req.member.peer_id;
  const roomId = req.room.id;
  if (action === 'join') {
    try {
      const channel = channelsApi.requireChannelInRoom((req.body || {}).channelId, roomId, 'voice');
      const previousChannelId = memberVoiceChannel(token);
      const result = channelsApi.joinVoice(voiceByToken, token, channel, previousChannelId);
      if (result.previousChannelId) {
      broadcastRoom(roomId, {
        type: 'voice-left',
        id: peerId,
        channelId: result.previousChannelId,
        inVoice: false,
        voiceCounts: voiceCountsForRoom(roomId),
      });
      }
      broadcastRoom(roomId, {
        type: 'voice-joined',
        id: peerId,
        channelId: result.channelId,
        inVoice: true,
        voiceCounts: voiceCountsForRoom(roomId),
      });
      return res.json({
        ok: true,
        inVoice: true,
        channelId: result.channelId,
        voiceCounts: voiceCountsForRoom(roomId),
      });
    } catch (err) {
      return sendError(res, err, 'Could not join voice.', 'voice_bad');
    }
  }
  if (action === 'leave') {
    const channelId = memberVoiceChannel(token);
    if (channelId) {
      voiceByToken.delete(token);
      broadcastRoom(roomId, {
        type: 'voice-left',
        id: peerId,
        channelId,
        inVoice: false,
        voiceCounts: voiceCountsForRoom(roomId),
      });
    }
    return res.json({ ok: true, inVoice: false, channelId: null, voiceCounts: voiceCountsForRoom(roomId) });
  }
  return res.status(400).json({ error: 'Invalid action.', code: 'voice_bad' });
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
    roomId: member.room_id,
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

  touchRoom(room.id);
  sockets.set(client.token, client);

  const others = stmtMembersInRoom
    .all(room.id)
    .filter((row) => row.session_token !== client.token)
    .map(memberPeerPayload);
  send(client, {
    type: 'hello',
    id: client.id,
    name: client.username,
    ...memberPeerPayload(member),
    peers: others,
    kind: roomKindOf(room),
    watch: watchPublic(room.id),
    channels: channelsPayload(room),
    voiceCounts: voiceCountsForRoom(room.id),
    pendingJoinRequests: isCreator(room, member, req.user)
      ? roomsApi.stmtPendingForOwner.all(room.owner_user_id).filter((row) => String(row.room_id) === String(room.id)).map(joinRequestPublic)
      : [],
  });
  if (!replaced) {
    broadcastRoom(room.id, { type: 'peer-joined', ...memberPeerPayload(member) }, client.token);
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

app.post('/api/watch', requireMember, (req, res) => {
  const body = req.body || {};
  const action = String(body.action || '').trim().toLowerCase();
  const room = req.room;
  const member = req.member;
  const user = req.user || (member.user_id ? stmtGetUser.get(member.user_id) : null);
  const current = watchPublic(room.id);
  const now = Date.now();

  try {
    if (action === 'set') {
      if (!canManageWatch(room, member, user, current)) {
        return res.status(403).json({ error: 'Only the host can do that.', code: 'watch_forbidden' });
      }
      const source = parseWatchSource(body.url);
      const keepHost = current && (
        stmtGetMemberByPeer.get(room.id, current.hostPeerId)
        || membersMatchHost(current, room.id)
      );
      const host = keepHost && current.hostPeerId
        ? {
          host_peer_id: current.hostPeerId,
          host_user_id: current.hostUserId,
          host_username_key: current.hostUsernameKey,
        }
        : hostFieldsFromMember(member);
      stmtUpsertWatch.run({
        room_id: room.id,
        source_type: source.sourceType,
        source_url: source.sourceUrl,
        video_id: source.videoId,
        ...host,
        paused: watchAllowsSync(source) ? 1 : 0,
        media_time: 0,
        updated_at: now,
      });
      broadcastWatch(room.id, { action: 'set' });
      return res.json({ ok: true, watch: watchPublic(room.id) });
    }

    if (action === 'stop') {
      if (!canManageWatch(room, member, user, current)) {
        return res.status(403).json({ error: 'Only the host can do that.', code: 'watch_forbidden' });
      }
      stmtDeleteWatch.run(room.id);
      broadcastWatch(room.id, { action: 'stop' });
      return res.json({ ok: true, watch: null });
    }

    if (action === 'host') {
      if (!isCreator(room, member, user)) {
        return res.status(403).json({ error: 'Only the room creator can do that.', code: 'watch_forbidden' });
      }
      if (!current) {
        return res.status(400).json({ error: 'Start a watch party first.', code: 'watch_missing' });
      }
      const peerId = String(body.peerId || '');
      const target = stmtGetMemberByPeer.get(room.id, peerId);
      if (!target) {
        return res.status(404).json({ error: 'Peer gone', code: 'peer_gone' });
      }
      stmtUpdateWatchHost.run({
        room_id: room.id,
        ...hostFieldsFromMember(target),
        updated_at: now,
      });
      broadcastWatch(room.id, { action: 'host' });
      return res.json({ ok: true, watch: watchPublic(room.id) });
    }

    if (action === 'tick') {
      return res.json({ ok: true, watch: current });
    }

    if (action === 'play' || action === 'pause' || action === 'seek') {
      return res.json({ ok: true, watch: persistWatchControl(room, member, user, action, body) });
    }

    return res.status(400).json({ error: 'Bad watch action.', code: 'watch_bad_action' });
  } catch (err) {
    sendError(res, err, 'Could not update watch party.', 'watch_fail');
  }
});

function membersMatchHost(watch, nameKey) {
  if (!watch) return false;
  const members = stmtMembersInRoom.all(nameKey);
  return members.some((row) => {
    if (watch.hostPeerId && row.peer_id === watch.hostPeerId) return true;
    if (watch.hostUserId && String(row.user_id) === String(watch.hostUserId)) return true;
    if (watch.hostUsernameKey && row.username_key === watch.hostUsernameKey) return true;
    return false;
  });
}

app.post('/api/signal', requireMember, (req, res) => {
  const from = findSocketByToken(req.sessionToken);
  if (!from) {
    return res.status(409).json({ error: 'Not in room' });
  }
  const body = req.body || {};
  if (body.type !== 'signal' || !body.data || !body.to) {
    return res.status(400).json({ error: 'Bad signal' });
  }
  const fromVoice = memberVoiceChannel(from.token);
  const target = findSocketById(body.to, from.roomId);
  if (!target) {
    return res.status(404).json({ error: 'Peer gone' });
  }
  const targetVoice = memberVoiceChannel(target.token);
  if (!fromVoice || !targetVoice || String(fromVoice) !== String(targetVoice)) {
    return res.status(403).json({ error: 'Not in the same voice channel.', code: 'voice_peer' });
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
  const replacements = [
    ['href="/styles.css"', `href="/styles.css?v=${assetVersion('styles.css')}"`],
    ['src="/app.js"', `src="/app.js?v=${assetVersion('app.js')}"`],
    ['"./i18n.js":"/i18n.js"', `"./i18n.js":"/i18n.js?v=${assetVersion('i18n.js')}"`],
  ];
  const jsDir = path.join(publicDir, 'js');
  if (fs.existsSync(jsDir)) {
    for (const file of fs.readdirSync(jsDir).filter((name) => name.endsWith('.js'))) {
      const key = `"./js/${file}":"/js/${file}"`;
      replacements.push([key, `"./js/${file}":"/js/${file}?v=${assetVersion(`js/${file}`)}"`]);
    }
  }
  sendHtml(res, 'index.html', replacements);
}

app.get(['/', '/index.html'], (_req, res) => {
  sendIndex(res);
});

app.get(['/r/:name', '/r/:name/:tag'], (_req, res) => {
  res.redirect(301, '/');
});

app.get('/:inviteCode', (req, res, next) => {
  if (!ids.parseInviteCode(req.params.inviteCode)) return next();
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

function chatPayload(row, user) {
  const usernameKey = row.usernameKey || row.username_key;
  const account = user || (usernameKey ? stmtGetUserByUsername.get(usernameKey) : null);
  return {
    id: String(row.id),
    channelId: String(row.channelId || row.channel_id || ''),
    peerId: row.peerId || row.peer_id,
    username: row.username,
    usernameKey,
    body: row.body,
    createdAt: Number(row.createdAt || row.created_at),
    avatarUrl: avatarUrlForUser(account),
  };
}

function defaultTextChannelId(roomId) {
  const text = channelsApi.listChannels(roomId).find((ch) => ch.type === 'text');
  return text ? String(text.id) : null;
}

function joinChatChannel(socket, channelId) {
  const member = stmtGetMember.get(socket.data.token);
  if (!member) return null;
  const channel = channelsApi.getChannel(channelId);
  if (!channel || String(channel.room_id) !== String(member.room_id) || channel.type !== 'text') return null;
  if (socket.data.channelId) socket.leave(`channel:${socket.data.channelId}`);
  socket.data.channelId = String(channel.id);
  socket.join(`channel:${channel.id}`);
  return channel;
}

function memberFromHandshake(req) {
  const token = (req.signedCookies && req.signedCookies.session) || null;
  if (!token) return null;
  let member = stmtGetMember.get(token);
  let room = member ? stmtGetRoom.get(member.room_id) : null;
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
    socket.data.roomId = session.member.room_id;
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
  socket.join(socket.data.roomId);
  const initial = joinChatChannel(socket, defaultTextChannelId(socket.data.roomId));
  socket.emit('chat:history', initial ? stmtChatHistory.all(initial.id).map(chatPayload) : []);

  socket.on('disconnect', () => {
    if (chatSockets.get(socket.data.token) === socket) chatSockets.delete(socket.data.token);
  });

  socket.on('chat:switch', (payload) => {
    const channel = joinChatChannel(socket, payload && payload.channelId);
    if (!channel) return;
    socket.emit('chat:history', stmtChatHistory.all(channel.id).map(chatPayload));
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
    if (!member || member.room_id !== socket.data.roomId) return;
    const channelId = String((payload && payload.channelId) || socket.data.channelId || '');
    const channel = channelsApi.getChannel(channelId);
    if (!channel || String(channel.room_id) !== String(member.room_id) || channel.type !== 'text') return;
    socket.data.lastChatAt = now;
    const id = addChatTx({
      channel_id: channel.id,
      room_id: member.room_id,
      peer_id: member.peer_id,
      username: member.username,
      username_key: member.username_key,
      body,
      created_at: now,
    });
    const account = member.user_id ? stmtGetUser.get(member.user_id) : null;
    io.to(`channel:${channel.id}`).emit('chat:message', chatPayload({
      id,
      channelId: channel.id,
      peerId: member.peer_id,
      username: member.username,
      usernameKey: member.username_key,
      body,
      createdAt: now,
    }, account));
  });

  socket.on('chat:delete', (payload) => {
    const id = String(payload && payload.id || '');
    if (!ids.isSnowflake(id)) return;
    const member = stmtGetMember.get(socket.data.token);
    const room = member ? stmtGetRoom.get(member.room_id) : null;
    if (!member || !room || !isCreator(room, member, readAccountUser(socket.request))) return;
    const row = stmtGetChat.get(id, member.room_id);
    if (!row) return;
    stmtDeleteChat.run(id, member.room_id);
    io.to(`channel:${row.channel_id}`).emit('chat:deleted', { id });
  });
});

watchIo = new Server(httpServer, {
  path: '/watch.io',
  serveClient: false,
});

watchIo.use((socket, next) => {
  parseCookies(socket.request, {}, (err) => {
    if (err) return next(new Error('Unauthorized'));
    const session = memberFromHandshake(socket.request);
    if (!session) return next(new Error('Unauthorized'));
    socket.data.token = session.token;
    socket.data.roomId = session.member.room_id;
    next();
  });
});

watchIo.on('connection', (socket) => {
  const prev = watchSockets.get(socket.data.token);
  if (prev && prev !== socket) prev.disconnect(true);
  watchSockets.set(socket.data.token, socket);
  socket.join(socket.data.roomId);
  socket.emit('watch:event', {
    action: 'set',
    state: watchPublic(socket.data.roomId),
    serverAt: Date.now(),
  });

  socket.on('disconnect', () => {
    if (watchSockets.get(socket.data.token) === socket) watchSockets.delete(socket.data.token);
  });

  socket.on('watch:control', (payload) => {
    const action = payload && payload.action;
    if (action !== 'play' && action !== 'pause' && action !== 'seek') return;
    const member = stmtGetMember.get(socket.data.token);
    const room = member ? stmtGetRoom.get(member.room_id) : null;
    if (!member || !room || member.room_id !== socket.data.roomId) return;
    try {
      persistWatchControl(room, member, readAccountUser(socket.request), action, payload || {});
    } catch {
      // Drop unauthorized or stale controls.
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Screenshare listening on ${PORT}`);
});
