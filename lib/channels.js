'use strict';

const ids = require('../ids');

const MAX_TEXT_CHANNELS = 20;
const MAX_VOICE_CHANNELS = 20;
const MAX_VOICE_MEMBERS = 5;

function keyOf(value) {
  return String(value ?? '').trim().toLowerCase();
}

function parseChannelName(value, nameRe) {
  const name = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (name.length < 1 || name.length > 32 || !nameRe.test(name)) return null;
  return { name, key: keyOf(name) };
}

function parseChannelType(value) {
  const type = String(value || '').trim().toLowerCase();
  if (type === 'text' || type === 'voice') return type;
  return null;
}

function voiceCountInChannel(voiceByToken, channelId) {
  let n = 0;
  for (const id of voiceByToken.values()) {
    if (String(id) === String(channelId)) n += 1;
  }
  return n;
}

function createChannelsApi({ db, httpError, nameRe }) {
  const stmtInsertChannel = db.prepare(`
    INSERT INTO channels (id, room_id, type, name, name_key, position, created_at)
    VALUES (@id, @room_id, @type, @name, @name_key, @position, @created_at)
  `);
  const stmtGetChannel = db.prepare('SELECT * FROM channels WHERE id = ?');
  const stmtChannelsInRoom = db.prepare(
    'SELECT * FROM channels WHERE room_id = ? ORDER BY type ASC, position ASC, created_at ASC'
  );
  const stmtCountType = db.prepare(
    'SELECT COUNT(*) AS n FROM channels WHERE room_id = ? AND type = ?'
  );
  const stmtMaxPosition = db.prepare(
    'SELECT COALESCE(MAX(position), -1) AS n FROM channels WHERE room_id = ? AND type = ?'
  );
  const stmtRenameChannel = db.prepare(
    'UPDATE channels SET name = ?, name_key = ? WHERE id = ?'
  );
  const stmtTakenName = db.prepare(
    'SELECT 1 AS ok FROM channels WHERE room_id = ? AND type = ? AND name_key = ? AND id != ? LIMIT 1'
  );
  const stmtDeleteChannel = db.prepare('DELETE FROM channels WHERE id = ?');

  function listChannels(roomId) {
    return stmtChannelsInRoom.all(roomId);
  }

  function getChannel(channelId) {
    return stmtGetChannel.get(String(channelId || '')) || null;
  }

  function requireChannelInRoom(channelId, roomId, type) {
    const channel = getChannel(channelId);
    if (!channel || String(channel.room_id) !== String(roomId)) {
      throw httpError(404, 'Channel not found.', 'channel_not_found');
    }
    if (type && channel.type !== type) {
      throw httpError(400, 'Wrong channel type.', 'channel_type');
    }
    return channel;
  }

  function nextAvailableName(roomId, type, parsed) {
    if (!stmtTakenName.get(roomId, type, parsed.key, '')) return parsed;
    for (let n = 2; n <= MAX_TEXT_CHANNELS + 1; n++) {
      const candidate = parseChannelName(`${parsed.name} ${n}`, nameRe);
      if (candidate && !stmtTakenName.get(roomId, type, candidate.key, '')) return candidate;
    }
    throw httpError(409, 'That channel name is taken.', 'channel_exists');
  }

  function addChannel(room, typeRaw, nameRaw) {
    const type = parseChannelType(typeRaw);
    if (!type) throw httpError(400, 'Choose a text or voice channel.', 'channel_type');
    const parsed = parseChannelName(nameRaw, nameRe);
    if (!parsed) throw httpError(400, 'Enter a channel name.', 'channel_name');
    const max = type === 'text' ? MAX_TEXT_CHANNELS : MAX_VOICE_CHANNELS;
    if (stmtCountType.get(room.id, type).n >= max) {
      throw httpError(409, 'Channel limit reached.', 'channel_limit');
    }
    const unique = nextAvailableName(room.id, type, parsed);
    const now = Date.now();
    const row = {
      id: ids.nextSnowflake(),
      room_id: room.id,
      type,
      name: unique.name,
      name_key: unique.key,
      position: stmtMaxPosition.get(room.id, type).n + 1,
      created_at: now,
    };
    try {
      stmtInsertChannel.run(row);
    } catch (err) {
      if (String(err.code || '').startsWith('SQLITE_CONSTRAINT')) {
        throw httpError(409, 'That channel name is taken.', 'channel_exists');
      }
      throw err;
    }
    return stmtGetChannel.get(row.id);
  }

  function renameChannel(room, channelId, nameRaw) {
    const channel = requireChannelInRoom(channelId, room.id);
    const parsed = parseChannelName(nameRaw, nameRe);
    if (!parsed) throw httpError(400, 'Enter a channel name.', 'channel_name');
    if (stmtTakenName.get(room.id, channel.type, parsed.key, channel.id)) {
      throw httpError(409, 'That channel name is taken.', 'channel_exists');
    }
    stmtRenameChannel.run(parsed.name, parsed.key, channel.id);
    return stmtGetChannel.get(channel.id);
  }

  function deleteChannel(room, channelId) {
    const channel = requireChannelInRoom(channelId, room.id);
    if (stmtCountType.get(room.id, channel.type).n <= 1) {
      throw httpError(409, 'Keep at least one channel of that type.', 'channel_last');
    }
    stmtDeleteChannel.run(channel.id);
    return channel;
  }

  function joinVoice(voiceByToken, token, channel, previousChannelId) {
    const already = String(voiceByToken.get(token) || '') === String(channel.id);
    if (already) return { channelId: channel.id, previousChannelId: null };
    if (voiceCountInChannel(voiceByToken, channel.id) >= MAX_VOICE_MEMBERS) {
      throw httpError(409, 'That voice channel is full.', 'voice_full');
    }
    if (previousChannelId) voiceByToken.delete(token);
    voiceByToken.set(token, String(channel.id));
    return { channelId: String(channel.id), previousChannelId };
  }

  return {
    MAX_TEXT_CHANNELS,
    MAX_VOICE_CHANNELS,
    MAX_VOICE_MEMBERS,
    listChannels,
    getChannel,
    requireChannelInRoom,
    addChannel,
    renameChannel,
    deleteChannel,
    joinVoice,
    stmtGetChannel,
    stmtChannelsInRoom,
  };
}

function channelPublic(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    roomId: String(row.room_id),
    type: row.type,
    name: row.name,
    position: Number(row.position) || 0,
  };
}

module.exports = {
  MAX_TEXT_CHANNELS,
  MAX_VOICE_CHANNELS,
  MAX_VOICE_MEMBERS,
  parseChannelName,
  parseChannelType,
  voiceCountInChannel,
  createChannelsApi,
  channelPublic,
};
