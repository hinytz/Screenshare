'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const ids = require('../ids');
const { applySchema } = require('../lib/schema');
const { createStore } = require('../lib/store');
const { voiceCountInChannel } = require('../lib/channels');

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

function openStore() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  applySchema(db);
  db.prepare(`
    INSERT INTO users (id, email, password_hash, username, username_key, avatar_path, created_at, last_login_at)
    VALUES (?, NULL, 'x', ?, ?, NULL, ?, ?)
  `).run('1', 'owner', 'owner', Date.now(), Date.now());
  db.prepare(`
    INSERT INTO users (id, email, password_hash, username, username_key, avatar_path, created_at, last_login_at)
    VALUES (?, NULL, 'x', ?, ?, NULL, ?, ?)
  `).run('2', 'guest', 'guest', Date.now(), Date.now());
  const store = createStore(db, {
    httpError,
    nameRe: /^[A-Za-z0-9][A-Za-z0-9 _\-]{0,30}[A-Za-z0-9]$|^[A-Za-z0-9][A-Za-z0-9_]{1,31}$/,
    parseRoomKind,
    publicFileNames: ['index.html', 'app.js'],
    chatKeep: 50,
  });
  return { db, store };
}

describe('rooms and channels', () => {
  it('creates a public room with invite code and default channels', () => {
    const { store } = openStore();
    const room = store.rooms.createRoomTx(
      { display: 'Lobby', key: 'lobby' },
      { ownerUserId: '1', visibility: 'public', kind: 'screenshare' }
    );
    assert.equal(ids.isSnowflake(room.id), true);
    assert.equal(ids.parseInviteCode(room.invite_code), room.invite_code);
    assert.equal(room.invite_code.length, 9);
    assert.equal(room.visibility, 'public');
    const channels = store.channels.listChannels(room.id);
    assert.equal(channels.length, 2);
    assert.deepEqual(channels.map((row) => row.type).sort(), ['text', 'voice']);
  });

  it('queues private join requests until the owner approves', () => {
    const { store } = openStore();
    const room = store.rooms.createRoomTx(
      { display: 'Secret', key: 'secret' },
      { ownerUserId: '1', visibility: 'private', kind: 'screenshare' }
    );
    const guest = { id: '2' };
    const access = store.rooms.joinAccess(room, guest);
    assert.equal(access.ok, false);
    assert.equal(access.code, 'join_private');
    const queued = store.rooms.queueJoinRequest(room, guest);
    assert.equal(queued.request.status, 'pending');
    assert.equal(store.rooms.joinAccess(room, guest).code, 'join_pending');
    store.rooms.respondJoinRequest(queued.request.id, { id: '1' }, true);
    assert.equal(store.rooms.joinAccess(room, guest).ok, true);
  });

  it('caps voice channels at 5 members and text/voice lists at 20', () => {
    const { store } = openStore();
    const room = store.rooms.createRoomTx(
      { display: 'Voice', key: 'voice' },
      { ownerUserId: '1', visibility: 'public', kind: 'screenshare' }
    );
    const voice = store.channels.listChannels(room.id).find((row) => row.type === 'voice');
    const voiceByToken = new Map();
    for (let i = 0; i < 5; i++) {
      store.channels.joinVoice(voiceByToken, `t${i}`, voice, null);
    }
    assert.equal(voiceCountInChannel(voiceByToken, voice.id), 5);
    assert.throws(
      () => store.channels.joinVoice(voiceByToken, 't5', voice, null),
      (err) => err.code === 'voice_full'
    );
    for (let i = 1; i < 20; i++) {
      store.channels.addChannel(room, 'text', `Chat ${i}`);
      store.channels.addChannel(room, 'voice', `Voice ${i}`);
    }
    assert.throws(
      () => store.channels.addChannel(room, 'text', 'Overflow'),
      (err) => err.code === 'channel_limit'
    );
    assert.throws(
      () => store.channels.addChannel(room, 'voice', 'Overflow'),
      (err) => err.code === 'channel_limit'
    );
  });

  it('adds a numbered channel when Chat or Voice already exists', () => {
    const { store } = openStore();
    const room = store.rooms.createRoomTx(
      { display: 'Lobby', key: 'lobby' },
      { ownerUserId: '1', visibility: 'public', kind: 'screenshare' }
    );
    const extraText = store.channels.addChannel(room, 'text', 'Chat');
    const extraVoice = store.channels.addChannel(room, 'voice', 'Voice');
    assert.equal(extraText.name, 'Chat 2');
    assert.equal(extraVoice.name, 'Voice 2');
  });

  it('deletes extra channels but keeps at least one of each type', () => {
    const { store } = openStore();
    const room = store.rooms.createRoomTx(
      { display: 'Lobby', key: 'lobby' },
      { ownerUserId: '1', visibility: 'public', kind: 'screenshare' }
    );
    const extraText = store.channels.addChannel(room, 'text', 'Notes');
    store.stmtInsertChat.run({
      id: 'm1',
      channel_id: extraText.id,
      room_id: room.id,
      peer_id: 'p',
      username: 'owner',
      username_key: 'owner',
      body: 'bye',
      created_at: Date.now(),
    });
    const extraVoice = store.channels.addChannel(room, 'voice', 'Stage');
    store.channels.deleteChannel(room, extraText.id);
    store.channels.deleteChannel(room, extraVoice.id);
    const left = store.channels.listChannels(room.id);
    assert.equal(left.length, 2);
    assert.equal(store.stmtChatHistory.all(extraText.id).length, 0);
    const onlyText = left.find((row) => row.type === 'text');
    const onlyVoice = left.find((row) => row.type === 'voice');
    assert.throws(
      () => store.channels.deleteChannel(room, onlyText.id),
      (err) => err.code === 'channel_last'
    );
    assert.throws(
      () => store.channels.deleteChannel(room, onlyVoice.id),
      (err) => err.code === 'channel_last'
    );
  });

  it('lets the same account sit in a room from two sessions', () => {
    const { db, store } = openStore();
    const room = store.rooms.createRoomTx(
      { display: 'Lobby', key: 'lobby' },
      { ownerUserId: '1', visibility: 'public', kind: 'screenshare' }
    );
    const now = Date.now();
    db.prepare(`
      INSERT INTO room_members (session_token, room_id, peer_id, username, username_key, joined_at, user_id)
      VALUES (?, ?, ?, 'owner', 'owner', ?, '1')
    `).run('tok-a', room.id, 'peer-a', now);
    db.prepare(`
      INSERT INTO room_members (session_token, room_id, peer_id, username, username_key, joined_at, user_id)
      VALUES (?, ?, ?, 'owner', 'owner', ?, '1')
    `).run('tok-b', room.id, 'peer-b', now);
    assert.equal(store.stmtMemberCount.get(room.id).n, 2);
    assert.equal(store.usernameTakenByOther(room.id, 'owner', '1'), false);
    assert.equal(store.usernameTakenByOther(room.id, 'owner', '2'), true);
    assert.equal(store.usernameTakenByOther(room.id, 'owner', null), true);
  });

  it('keeps guest usernames unique in a room', () => {
    const { db, store } = openStore();
    const room = store.rooms.createRoomTx(
      { display: 'Lobby', key: 'lobby' },
      { ownerUserId: '1', visibility: 'public', kind: 'screenshare' }
    );
    const now = Date.now();
    db.prepare(`
      INSERT INTO room_members (session_token, room_id, peer_id, username, username_key, joined_at, user_id)
      VALUES (?, ?, ?, 'guest', 'guest', ?, NULL)
    `).run('tok-g1', room.id, 'peer-g1', now);
    assert.throws(
      () => db.prepare(`
        INSERT INTO room_members (session_token, room_id, peer_id, username, username_key, joined_at, user_id)
        VALUES (?, ?, ?, 'guest', 'guest', ?, NULL)
      `).run('tok-g2', room.id, 'peer-g2', now)
    );
    assert.equal(store.usernameTakenByOther(room.id, 'guest', '1'), true);
  });
});
