'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const { WebSocketServer } = require('ws');

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

const parseCookies = cookieParser(SESSION_SECRET);
const tickets = new Map();
const TICKET_MS = 60_000;

function readSession(req) {
  return (req.signedCookies && req.signedCookies.session) || null;
}

function takeTicket(ticket) {
  if (!ticket) return false;
  const exp = tickets.get(ticket);
  tickets.delete(ticket);
  return Boolean(exp && exp > Date.now());
}

function isSecureRequest(req) {
  return Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
}

const sessions = new Set();
const peers = new Set();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser(SESSION_SECRET));

app.get('/health', (_req, res) => {
  res.type('text/plain').send('ok');
});

function requireSession(req, res, next) {
  const token = readSession(req);
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
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

app.get('/api/ws-ticket', requireSession, (_req, res) => {
  const ticket = crypto.randomBytes(24).toString('hex');
  tickets.set(ticket, Date.now() + TICKET_MS);
  res.json({ ticket });
});

app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

function send(ws, payload) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastToOthers(from, payload) {
  for (const peer of peers) {
    if (peer !== from) send(peer, payload);
  }
}

function rejectUpgrade(socket, status, message) {
  socket.write(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

server.on('upgrade', (req, socket, head) => {
  parseCookies(req, {}, () => {
    let parsed;
    try {
      parsed = new URL(req.url, 'http://localhost');
    } catch {
      rejectUpgrade(socket, 400, 'Bad Request');
      return;
    }
    if (parsed.pathname !== '/ws' && parsed.pathname !== '/api/ws') {
      rejectUpgrade(socket, 404, 'Not Found');
      return;
    }
    const ticketOk = takeTicket(parsed.searchParams.get('ticket'));
    const token = readSession(req);
    if (!ticketOk && (!token || !sessions.has(token))) {
      rejectUpgrade(socket, 401, 'Unauthorized');
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });
});

wss.on('connection', (ws) => {
  if (peers.size >= 2) {
    send(ws, { type: 'room-full' });
    ws.close();
    return;
  }

  const polite = peers.size >= 1;
  peers.add(ws);
  send(ws, { type: 'hello', polite, peerPresent: peers.size === 2 });
  if (peers.size === 2) {
    broadcastToOthers(ws, { type: 'peer-joined' });
  }

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!msg || msg.type !== 'signal' || !msg.data) return;
    broadcastToOthers(ws, { type: 'signal', data: msg.data });
  });

  ws.on('close', () => {
    if (peers.delete(ws)) {
      broadcastToOthers(ws, { type: 'peer-left' });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Screenshare listening on ${PORT}`);
});
