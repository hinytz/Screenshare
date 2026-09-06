'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');

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
const APP_PASSWORD = process.env.APP_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

if (!APP_PASSWORD) {
  console.warn('APP_PASSWORD is not set. Login will fail until it is configured.');
}

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

function passwordMatches(input) {
  const a = crypto.createHash('sha256').update(String(input ?? '')).digest();
  const b = crypto.createHash('sha256').update(APP_PASSWORD).digest();
  return Boolean(APP_PASSWORD) && crypto.timingSafeEqual(a, b);
}

function readSession(req) {
  return (req.signedCookies && req.signedCookies.session) || null;
}

function isSecureRequest(req) {
  return Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
}

const sessions = new Set();
const peers = new Set();
const peerIdsByToken = new Map();

function idForToken(token) {
  let id = peerIdsByToken.get(token);
  if (!id) {
    id = crypto.randomBytes(8).toString('hex');
    peerIdsByToken.set(token, id);
  }
  return id;
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser(SESSION_SECRET));

app.get('/health', (_req, res) => {
  res.type('text/plain').send('ok');
});

function requireSession(req, res, next) {
  const token = readSession(req);
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.sessionToken = token;
  next();
}

app.get('/api/me', requireSession, (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/config', requireSession, (_req, res) => {
  res.json({ iceServers: getIceServers() });
});

app.post('/api/login', (req, res) => {
  const password = req.body && req.body.password;
  if (!passwordMatches(password)) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  sessions.add(token);
  res.cookie('session', token, {
    httpOnly: true,
    signed: true,
    secure: process.env.NODE_ENV === 'production' || isSecureRequest(req),
    sameSite: 'lax',
    maxAge: SESSION_MS,
    path: '/',
  });
  res.json({ ok: true });
});

function send(client, payload) {
  if (client.res.writableEnded) return;
  client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function broadcastToOthers(from, payload) {
  for (const peer of peers) {
    if (peer !== from) send(peer, payload);
  }
}

function findPeerByToken(token) {
  return [...peers].find((peer) => peer.token === token) || null;
}

function findPeerById(id) {
  return [...peers].find((peer) => peer.id === id) || null;
}

function dropPeer(client, announce) {
  if (!peers.delete(client)) return;
  if (announce && !client.replaced) {
    broadcastToOthers(client, { type: 'peer-left', id: client.id });
  }
}

app.get('/api/stream', requireSession, (req, res) => {
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

  const client = {
    id: idForToken(req.sessionToken),
    token: req.sessionToken,
    res,
    replaced: false,
  };

  for (const existing of [...peers]) {
    if (existing.token === client.token) {
      existing.replaced = true;
      peers.delete(existing);
      existing.res.end();
      broadcastToOthers(existing, { type: 'peer-left', id: existing.id });
    }
  }

  const others = [...peers].map((peer) => peer.id);
  peers.add(client);
  send(client, { type: 'hello', id: client.id, peers: others });
  broadcastToOthers(client, { type: 'peer-joined', id: client.id });

  const heartbeat = setInterval(() => {
    if (res.writableEnded) return;
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    dropPeer(client, true);
  });
});

app.post('/api/signal', requireSession, (req, res) => {
  const from = findPeerByToken(req.sessionToken);
  if (!from) {
    return res.status(409).json({ error: 'Not in room' });
  }
  const body = req.body || {};
  if (body.type !== 'signal' || !body.data || !body.to) {
    return res.status(400).json({ error: 'Bad signal' });
  }
  const target = findPeerById(body.to);
  if (!target) {
    return res.status(404).json({ error: 'Peer gone' });
  }
  send(target, { type: 'signal', from: from.id, data: body.data });
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Screenshare listening on ${PORT}`);
});
