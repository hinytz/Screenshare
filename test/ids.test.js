'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const ids = require('../ids');

describe('nextSnowflake', () => {
  it('returns unique decimal strings', () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      const id = ids.nextSnowflake();
      assert.match(id, /^[1-9]\d*$/);
      assert.equal(ids.isSnowflake(id), true);
      assert.equal(seen.has(id), false);
      seen.add(id);
    }
  });

  it('encodes timestamp relative to the 2024 epoch', () => {
    const now = Date.UTC(2025, 5, 15, 12, 0, 0);
    const id = BigInt(ids.nextSnowflake(now));
    const ts = Number(id >> 22n);
    assert.equal(ts, now - ids.SNOWFLAKE_EPOCH);
  });
});

describe('isSnowflake', () => {
  it('rejects empty, padded, and non-numeric values', () => {
    assert.equal(ids.isSnowflake(''), false);
    assert.equal(ids.isSnowflake('0123'), false);
    assert.equal(ids.isSnowflake('abc'), false);
    assert.equal(ids.isSnowflake(null), false);
  });
});

describe('parseInviteCode', () => {
  it('accepts 1–9 alphanumeric characters', () => {
    assert.equal(ids.parseInviteCode('JyW5XrNwb'), 'JyW5XrNwb');
    assert.equal(ids.parseInviteCode(' a1 '), 'a1');
    assert.equal(ids.parseInviteCode('too-long-x'), null);
    assert.equal(ids.parseInviteCode('has.dot'), null);
  });
});

describe('randomInviteCode', () => {
  it('skips reserved names and collisions', () => {
    const blocked = new Set(['api']);
    const code = ids.randomInviteCode((value) => blocked.has(value), ['api']);
    assert.equal(ids.parseInviteCode(code), code);
    assert.equal(code.length, 9);
    assert.notEqual(code.toLowerCase(), 'api');
  });
});
