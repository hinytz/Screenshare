'use strict';

const crypto = require('crypto');

const SNOWFLAKE_EPOCH = Date.UTC(2024, 0, 1);
const WORKER_ID = Number(process.env.SNOWFLAKE_WORKER || 0) & 0x1f;
const PROCESS_ID = Number(process.env.SNOWFLAKE_PROCESS || 0) & 0x1f;
const INVITE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const INVITE_RE = /^[A-Za-z0-9]{1,9}$/;
const DEFAULT_RESERVED = new Set([
  'api',
  'health',
  'index',
  'r',
  'socket',
  'watch',
  'favicon',
  'robots',
  'sitemap',
]);

let lastTimestamp = -1;
let sequence = 0;

function nextSnowflake(now = Date.now()) {
  let ts = Math.max(0, now - SNOWFLAKE_EPOCH);
  if (ts === lastTimestamp) {
    sequence = (sequence + 1) & 0xfff;
    if (sequence === 0) ts += 1;
  } else {
    sequence = 0;
  }
  lastTimestamp = ts;
  const id =
    (BigInt(ts) << 22n) |
    (BigInt(WORKER_ID) << 17n) |
    (BigInt(PROCESS_ID) << 12n) |
    BigInt(sequence);
  return id.toString();
}

function isSnowflake(value) {
  const raw = String(value ?? '');
  if (!/^[1-9]\d{0,19}$/.test(raw)) return false;
  try {
    const n = BigInt(raw);
    return n > 0n && n < 2n ** 63n;
  } catch {
    return false;
  }
}

function parseInviteCode(value) {
  const code = String(value ?? '').trim();
  if (!INVITE_RE.test(code)) return null;
  return code;
}

function reservedInviteNames(extra) {
  const names = new Set(DEFAULT_RESERVED);
  for (const item of extra || []) {
    const base = String(item || '')
      .trim()
      .toLowerCase()
      .replace(/\.[^.]+$/, '');
    if (base) names.add(base);
  }
  return names;
}

function randomInviteCode(exists, extraReserved) {
  const reserved = reservedInviteNames(extraReserved);
  for (let attempt = 0; attempt < 80; attempt++) {
    let code = '';
    const bytes = crypto.randomBytes(9);
    for (let i = 0; i < 9; i++) code += INVITE_CHARS[bytes[i] % INVITE_CHARS.length];
    if (reserved.has(code.toLowerCase())) continue;
    if (exists && exists(code)) continue;
    return code;
  }
  throw new Error('Could not allocate an invite code.');
}

module.exports = {
  SNOWFLAKE_EPOCH,
  INVITE_RE,
  nextSnowflake,
  isSnowflake,
  parseInviteCode,
  reservedInviteNames,
  randomInviteCode,
};
