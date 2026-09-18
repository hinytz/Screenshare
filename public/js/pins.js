import { state } from './state.js';
import { postJson } from './api.js';

export function pinPayloadFromInfo(info) {
  return {
    roomId: info.roomId || info.id || state.roomId,
    inviteCode: info.inviteCode || state.inviteCode,
    label: info.label || info.name || '',
    iconUrl: info.iconUrl || null,
    visibility: info.visibility || 'public',
    kind: info.kind || 'screenshare',
    pinned: true,
  };
}

export async function pinCurrent() {
  const { data } = await postJson('/api/rooms/pin', {});
  return data && data.pins ? data.pins : [];
}

export async function unpinRoom(roomId) {
  const { data } = await postJson('/api/rooms/unpin', { roomId });
  return data && data.pins ? data.pins : [];
}

export function guestPinKey() {
  return 'screenshare.guestPins';
}

export function loadGuestPins() {
  try {
    const raw = JSON.parse(localStorage.getItem(guestPinKey()) || '[]');
    return Array.isArray(raw) ? raw.filter((pin) => pin && (pin.inviteCode || pin.roomId)) : [];
  } catch {
    return [];
  }
}

export function saveGuestPins(pins) {
  try {
    localStorage.setItem(guestPinKey(), JSON.stringify(pins || []));
  } catch {
    // ignore
  }
}
