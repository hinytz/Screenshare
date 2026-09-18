'use strict';

const crypto = require('crypto');
const ids = require('../ids');

function parseVisibility(value) {
  const vis = String(value || 'public').trim().toLowerCase();
  if (vis === 'public' || vis === 'private') return vis;
  return null;
}

function parseRoomName(value, nameRe) {
  const display = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (display.length < 2 || display.length > 32 || !nameRe.test(display)) return null;
  return { display, key: String(display).trim().toLowerCase() };
}

function sameId(a, b) {
  return a != null && b != null && String(a) === String(b);
}

function isOwner(room, user) {
  return Boolean(room && user && sameId(room.owner_user_id, user.id));
}

function createRoomsApi({
  db,
  httpError,
  nameRe,
  parseRoomKind,
  publicFileNames,
  defaultTextName,
  defaultVoiceName,
}) {
  const stmtInsertRoom = db.prepare(`
    INSERT INTO rooms (id, display_name, invite_code, visibility, owner_user_id, kind, icon_path, created_at, last_join_at)
    VALUES (@id, @display_name, @invite_code, @visibility, @owner_user_id, @kind, NULL, @created_at, @last_join_at)
  `);
  const stmtGetRoom = db.prepare('SELECT * FROM rooms WHERE id = ?');
  const stmtGetRoomByInvite = db.prepare('SELECT * FROM rooms WHERE invite_code = ?');
  const stmtInviteTaken = db.prepare('SELECT 1 AS ok FROM rooms WHERE invite_code = ? LIMIT 1');
  const stmtInsertChannel = db.prepare(`
    INSERT INTO channels (id, room_id, type, name, name_key, position, created_at)
    VALUES (@id, @room_id, @type, @name, @name_key, @position, @created_at)
  `);
  const stmtUpsertMembership = db.prepare(`
    INSERT INTO room_memberships (user_id, room_id, pinned, created_at)
    VALUES (@user_id, @room_id, 1, @created_at)
    ON CONFLICT(user_id, room_id) DO UPDATE SET pinned = 1
  `);
  const stmtGetMembership = db.prepare(
    'SELECT * FROM room_memberships WHERE user_id = ? AND room_id = ?'
  );
  const stmtLatestRequest = db.prepare(`
    SELECT * FROM join_requests
    WHERE room_id = ? AND user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);
  const stmtPendingRequest = db.prepare(`
    SELECT * FROM join_requests
    WHERE room_id = ? AND user_id = ? AND status = 'pending'
    LIMIT 1
  `);
  const stmtInsertRequest = db.prepare(`
    INSERT INTO join_requests (id, room_id, user_id, status, created_at)
    VALUES (@id, @room_id, @user_id, 'pending', @created_at)
  `);
  const stmtGetRequest = db.prepare('SELECT * FROM join_requests WHERE id = ?');
  const stmtSetRequestStatus = db.prepare('UPDATE join_requests SET status = ? WHERE id = ?');
  const stmtPendingForOwner = db.prepare(`
    SELECT jr.*, r.display_name AS room_name, r.invite_code, u.username, u.avatar_path
    FROM join_requests jr
    JOIN rooms r ON r.id = jr.room_id
    JOIN users u ON u.id = jr.user_id
    WHERE r.owner_user_id = ? AND jr.status = 'pending'
    ORDER BY jr.created_at ASC
  `);
  const stmtOutgoingPending = db.prepare(`
    SELECT jr.*, r.display_name AS room_name, r.invite_code, r.visibility
    FROM join_requests jr
    JOIN rooms r ON r.id = jr.room_id
    WHERE jr.user_id = ? AND jr.status = 'pending'
    ORDER BY jr.created_at DESC
  `);

  function inviteExists(code) {
    return Boolean(stmtInviteTaken.get(code));
  }

  function allocateInvite() {
    return ids.randomInviteCode(inviteExists, publicFileNames);
  }

  const createRoomTx = db.transaction((roomName, opts = {}) => {
    const ownerUserId = opts.ownerUserId || null;
    if (!ownerUserId) throw httpError(401, 'Log in to create a room.', 'auth_required');
    const visibility = parseVisibility(opts.visibility);
    if (!visibility) throw httpError(400, 'Choose public or private.', 'visibility_bad');
    const kind = parseRoomKind(opts.kind);
    const now = Date.now();
    const roomId = ids.nextSnowflake();
    const inviteCode = allocateInvite();
    stmtInsertRoom.run({
      id: roomId,
      display_name: roomName.display,
      invite_code: inviteCode,
      visibility,
      owner_user_id: ownerUserId,
      kind,
      created_at: now,
      last_join_at: now,
    });
    stmtInsertChannel.run({
      id: ids.nextSnowflake(),
      room_id: roomId,
      type: 'text',
      name: defaultTextName,
      name_key: defaultTextName.toLowerCase(),
      position: 0,
      created_at: now,
    });
    stmtInsertChannel.run({
      id: ids.nextSnowflake(),
      room_id: roomId,
      type: 'voice',
      name: defaultVoiceName,
      name_key: defaultVoiceName.toLowerCase(),
      position: 0,
      created_at: now,
    });
    stmtUpsertMembership.run({
      user_id: ownerUserId,
      room_id: roomId,
      created_at: now,
    });
    return stmtGetRoom.get(roomId);
  });

  function joinAccess(room, user) {
    if (!room) return { ok: false, code: 'room_not_found' };
    if (isOwner(room, user)) return { ok: true };
    if (room.visibility === 'public') return { ok: true };
    if (!user) return { ok: false, code: 'auth_required' };
    if (stmtGetMembership.get(user.id, room.id)) return { ok: true };
    const latest = stmtLatestRequest.get(room.id, user.id);
    if (latest && latest.status === 'pending') return { ok: false, code: 'join_pending' };
    if (latest && latest.status === 'denied') return { ok: false, code: 'join_denied' };
    return { ok: false, code: 'join_private' };
  }

  function assertJoinAccess(room, user) {
    const access = joinAccess(room, user);
    if (access.ok) return;
    if (access.code === 'room_not_found') throw httpError(404, 'Room not found.', 'room_not_found');
    if (access.code === 'auth_required') throw httpError(401, 'Log in to request access.', 'auth_required');
    if (access.code === 'join_pending') throw httpError(409, 'Waiting for the owner to approve.', 'join_pending');
    if (access.code === 'join_denied') throw httpError(403, 'The owner denied this request.', 'join_denied');
    throw httpError(403, 'This room is private. Request access.', 'join_private');
  }

  function queueJoinRequest(room, user) {
    if (!user) throw httpError(401, 'Log in to request access.', 'auth_required');
    if (!room) throw httpError(404, 'Room not found.', 'room_not_found');
    if (room.visibility !== 'private') {
      throw httpError(400, 'This room is public.', 'room_public');
    }
    if (isOwner(room, user) || stmtGetMembership.get(user.id, room.id)) {
      return { alreadyMember: true, room };
    }
    const pending = stmtPendingRequest.get(room.id, user.id);
    if (pending) return { request: pending, room };
    const latest = stmtLatestRequest.get(room.id, user.id);
    if (latest && latest.status === 'denied') {
      throw httpError(403, 'The owner denied this request.', 'join_denied');
    }
    const row = {
      id: ids.nextSnowflake(),
      room_id: room.id,
      user_id: user.id,
      created_at: Date.now(),
    };
    try {
      stmtInsertRequest.run(row);
    } catch (err) {
      if (String(err.code || '').startsWith('SQLITE_CONSTRAINT')) {
        const again = stmtPendingRequest.get(room.id, user.id);
        if (again) return { request: again, room };
      }
      throw err;
    }
    return { request: stmtGetRequest.get(row.id), room };
  }

  function respondJoinRequest(requestId, owner, allow) {
    const request = stmtGetRequest.get(String(requestId || ''));
    if (!request) throw httpError(404, 'Request not found.', 'request_not_found');
    const room = stmtGetRoom.get(request.room_id);
    if (!room || !isOwner(room, owner)) {
      throw httpError(403, 'Only the room owner can do that.', 'kick_forbidden');
    }
    if (request.status !== 'pending') return { request: stmtGetRequest.get(request.id), room };
    stmtSetRequestStatus.run(allow ? 'approved' : 'denied', request.id);
    if (allow) {
      stmtUpsertMembership.run({
        user_id: request.user_id,
        room_id: room.id,
        created_at: Date.now(),
      });
    }
    return { request: stmtGetRequest.get(request.id), room };
  }

  return {
    parseVisibility,
    parseRoomName: (value) => parseRoomName(value, nameRe),
    isOwner,
    sameId,
    createRoomTx,
    joinAccess,
    assertJoinAccess,
    queueJoinRequest,
    respondJoinRequest,
    stmtGetRoom,
    stmtGetRoomByInvite,
    stmtGetMembership,
    stmtGetRequest,
    stmtPendingForOwner,
    stmtOutgoingPending,
    stmtUpsertMembership,
    allocateInvite,
  };
}

function newSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  parseVisibility,
  parseRoomName,
  sameId,
  isOwner,
  createRoomsApi,
  newSessionToken,
};
