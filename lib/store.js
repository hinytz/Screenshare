'use strict';

const ids = require('../ids');
const roomsLib = require('./rooms');
const channelsLib = require('./channels');

function createStore(db, { httpError, nameRe, parseRoomKind, publicFileNames, chatKeep }) {
  const rooms = roomsLib.createRoomsApi({
    db,
    httpError,
    nameRe,
    parseRoomKind,
    publicFileNames,
    defaultTextName: 'Chat',
    defaultVoiceName: 'Voice',
  });
  const channels = channelsLib.createChannelsApi({ db, httpError, nameRe });

  const stmtTouchRoom = db.prepare('UPDATE rooms SET last_join_at = ? WHERE id = ?');
  const stmtExpiredRooms = db.prepare(`
    SELECT id FROM rooms
    WHERE owner_user_id IS NULL AND last_join_at IS NOT NULL AND last_join_at < ?
  `);
  const stmtDeleteSessionsInRoom = db.prepare('DELETE FROM room_sessions WHERE room_id = ?');
  const stmtGetMemberByPeer = db.prepare(
    'SELECT * FROM room_members WHERE room_id = ? AND peer_id = ? LIMIT 1'
  );
  const stmtDeleteRoom = db.prepare('DELETE FROM rooms WHERE id = ?');
  const stmtInsertMember = db.prepare(`
    INSERT INTO room_members (session_token, room_id, peer_id, username, username_key, joined_at, user_id)
    VALUES (@session_token, @room_id, @peer_id, @username, @username_key, @joined_at, @user_id)
  `);
  const stmtGetMember = db.prepare('SELECT * FROM room_members WHERE session_token = ?');
  const stmtMembersInRoom = db.prepare('SELECT * FROM room_members WHERE room_id = ?');
  const stmtMemberCount = db.prepare('SELECT COUNT(*) AS n FROM room_members WHERE room_id = ?');
  const stmtGetMemberByName = db.prepare(
    'SELECT * FROM room_members WHERE room_id = ? AND username_key = ? LIMIT 1'
  );
  const stmtUsernameTaken = db.prepare(
    'SELECT 1 AS ok FROM room_members WHERE room_id = ? AND username_key = ? LIMIT 1'
  );

  function usernameTakenByOther(roomId, usernameKey, userId) {
    const occupant = stmtGetMemberByName.get(roomId, usernameKey);
    if (!occupant) return false;
    if (userId && occupant.user_id && String(occupant.user_id) === String(userId)) return false;
    return true;
  }
  const stmtDeleteMember = db.prepare('DELETE FROM room_members WHERE session_token = ?');
  const stmtDeleteMembersInRoom = db.prepare('DELETE FROM room_members WHERE room_id = ?');
  const stmtGetSession = db.prepare('SELECT * FROM room_sessions WHERE session_token = ?');
  const stmtUpsertSession = db.prepare(`
    INSERT INTO room_sessions (session_token, room_id, username, username_key, created_at, user_id, peer_id)
    VALUES (@session_token, @room_id, @username, @username_key, @created_at, @user_id, @peer_id)
    ON CONFLICT(session_token) DO UPDATE SET
      room_id = excluded.room_id,
      username = excluded.username,
      username_key = excluded.username_key,
      user_id = excluded.user_id,
      peer_id = excluded.peer_id
  `);
  const stmtDeleteSession = db.prepare('DELETE FROM room_sessions WHERE session_token = ?');
  const stmtInsertChat = db.prepare(`
    INSERT INTO chat_messages (id, channel_id, room_id, peer_id, username, username_key, body, created_at)
    VALUES (@id, @channel_id, @room_id, @peer_id, @username, @username_key, @body, @created_at)
  `);
  const stmtPruneChat = db.prepare(`
    DELETE FROM chat_messages
    WHERE channel_id = ?
      AND id NOT IN (
        SELECT id FROM (
          SELECT id FROM chat_messages WHERE channel_id = ? ORDER BY created_at DESC, id DESC LIMIT ${chatKeep}
        )
      )
  `);
  const stmtChatHistory = db.prepare(`
    SELECT id, channel_id AS channelId, peer_id AS peerId, username, username_key AS usernameKey,
           body, created_at AS createdAt
    FROM (
      SELECT id, channel_id, peer_id, username, username_key, body, created_at
      FROM chat_messages
      WHERE channel_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ${chatKeep}
    )
    ORDER BY created_at ASC, id ASC
  `);
  const stmtGetChat = db.prepare('SELECT * FROM chat_messages WHERE id = ? AND room_id = ?');
  const stmtDeleteChat = db.prepare('DELETE FROM chat_messages WHERE id = ? AND room_id = ?');
  const stmtDeleteChatInRoom = db.prepare('DELETE FROM chat_messages WHERE room_id = ?');
  const stmtDeleteChatInChannel = db.prepare('DELETE FROM chat_messages WHERE channel_id = ?');
  const stmtDeleteChannelsInRoom = db.prepare('DELETE FROM channels WHERE room_id = ?');
  const stmtDeleteRequestsInRoom = db.prepare('DELETE FROM join_requests WHERE room_id = ?');
  const stmtInsertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, username, username_key, avatar_path, created_at, last_login_at)
    VALUES (@id, @email, @password_hash, @username, @username_key, NULL, @created_at, @last_login_at)
  `);
  const stmtGetUser = db.prepare('SELECT * FROM users WHERE id = ?');
  const stmtGetUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const stmtGetUserByUsername = db.prepare('SELECT * FROM users WHERE username_key = ?');
  const stmtTouchUser = db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?');
  const stmtSetUserAvatar = db.prepare('UPDATE users SET avatar_path = ? WHERE id = ?');
  const stmtExpiredUsers = db.prepare('SELECT id FROM users WHERE last_login_at IS NOT NULL AND last_login_at < ?');
  const stmtDeleteUser = db.prepare('DELETE FROM users WHERE id = ?');
  const stmtDeleteOAuthForUser = db.prepare('DELETE FROM user_oauth WHERE user_id = ?');
  const stmtRoomsByOwner = db.prepare('SELECT id FROM rooms WHERE owner_user_id = ?');
  const stmtMembersByUser = db.prepare('SELECT session_token FROM room_members WHERE user_id = ?');
  const stmtSetRoomIcon = db.prepare('UPDATE rooms SET icon_path = ? WHERE id = ?');
  const stmtGetMembership = rooms.stmtGetMembership;
  const stmtDeleteMembership = db.prepare(
    'DELETE FROM room_memberships WHERE user_id = ? AND room_id = ?'
  );
  const stmtDeleteMembershipsForUser = db.prepare('DELETE FROM room_memberships WHERE user_id = ?');
  const stmtDeleteMembershipsInRoom = db.prepare('DELETE FROM room_memberships WHERE room_id = ?');
  const stmtListPins = db.prepare(`
    SELECT m.room_id, r.display_name, r.invite_code, r.visibility, r.icon_path, r.owner_user_id, r.kind
    FROM room_memberships m
    JOIN rooms r ON r.id = m.room_id
    WHERE m.user_id = ? AND m.pinned = 1
    ORDER BY m.created_at ASC
  `);
  const stmtGetWatch = db.prepare('SELECT * FROM watch_parties WHERE room_id = ?');
  const stmtUpsertWatch = db.prepare(`
    INSERT INTO watch_parties (
      room_id, source_type, source_url, video_id, host_peer_id, host_user_id,
      host_username_key, paused, media_time, updated_at
    ) VALUES (
      @room_id, @source_type, @source_url, @video_id, @host_peer_id, @host_user_id,
      @host_username_key, @paused, @media_time, @updated_at
    )
    ON CONFLICT(room_id) DO UPDATE SET
      source_type = excluded.source_type,
      source_url = excluded.source_url,
      video_id = excluded.video_id,
      host_peer_id = excluded.host_peer_id,
      host_user_id = excluded.host_user_id,
      host_username_key = excluded.host_username_key,
      paused = excluded.paused,
      media_time = excluded.media_time,
      updated_at = excluded.updated_at
  `);
  const stmtUpdateWatchPlayback = db.prepare(`
    UPDATE watch_parties
    SET paused = @paused, media_time = @media_time, updated_at = @updated_at
    WHERE room_id = @room_id
  `);
  const stmtUpdateWatchHost = db.prepare(`
    UPDATE watch_parties
    SET host_peer_id = @host_peer_id, host_user_id = @host_user_id,
        host_username_key = @host_username_key, updated_at = @updated_at
    WHERE room_id = @room_id
  `);
  const stmtDeleteWatch = db.prepare('DELETE FROM watch_parties WHERE room_id = ?');

  const addChatTx = db.transaction((row) => {
    const id = row.id || ids.nextSnowflake();
    stmtInsertChat.run({ ...row, id });
    stmtPruneChat.run(row.channel_id, row.channel_id);
    return id;
  });

  return {
    rooms,
    channels,
    stmtTouchRoom,
    stmtExpiredRooms,
    stmtDeleteSessionsInRoom,
    stmtGetMemberByPeer,
    stmtDeleteRoom,
    stmtInsertMember,
    stmtGetMember,
    stmtGetMemberByName,
    usernameTakenByOther,
    stmtMembersInRoom,
    stmtMemberCount,
    stmtUsernameTaken,
    stmtDeleteMember,
    stmtDeleteMembersInRoom,
    stmtGetSession,
    stmtUpsertSession,
    stmtDeleteSession,
    stmtInsertChat,
    stmtPruneChat,
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
    stmtGetRoom: rooms.stmtGetRoom,
    stmtGetRoomByInvite: rooms.stmtGetRoomByInvite,
    stmtUpsertMembership: rooms.stmtUpsertMembership,
  };
}

module.exports = { createStore };
