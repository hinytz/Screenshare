import { t } from '../i18n.js';
import { state, hooks } from './state.js';
import { postJson, readError, getJson } from './api.js';

const INVITE_RE = /^[A-Za-z0-9]{1,9}$/;

export function parseInviteCode(value) {
  const code = String(value || '').trim();
  return INVITE_RE.test(code) ? code : '';
}

export function parseRoomInvite() {
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length === 1 && INVITE_RE.test(parts[0])) {
    return { inviteCode: parts[0] };
  }
  const params = new URLSearchParams(location.search);
  const code = parseInviteCode(params.get('code') || params.get('invite'));
  return code ? { inviteCode: code } : null;
}

export function roomInvitePath(code = state.inviteCode) {
  return code ? `/${code}` : '/';
}

export function roomInviteUrl(code = state.inviteCode) {
  return `${location.origin}${roomInvitePath(code)}`;
}

export function setRoomInviteUrl(code) {
  const next = roomInvitePath(code);
  if (`${location.pathname}${location.search}` === next) return;
  history.replaceState(null, '', next);
}

export function clearRoomInviteUrl() {
  if (location.pathname === '/' && !location.search) return;
  history.replaceState(null, '', '/');
}

export function applyRoomInvite(invite) {
  if (!invite || !invite.inviteCode) return;
  const input = document.getElementById('room-name');
  if (input) input.value = invite.inviteCode;
}

function setVisibilityButtons(prefix, value) {
  const pub = document.getElementById(`${prefix}public`);
  const priv = document.getElementById(`${prefix}private`);
  const vis = value === 'private' ? 'private' : 'public';
  if (pub) {
    pub.setAttribute('aria-selected', vis === 'public' ? 'true' : 'false');
  }
  if (priv) {
    priv.setAttribute('aria-selected', vis === 'private' ? 'true' : 'false');
  }
}

export function syncVisibilityFields(homeMode, modalMode) {
  const visField = document.getElementById('visibility-field');
  const modalVis = document.getElementById('modal-visibility-field');
  if (visField) visField.hidden = homeMode !== 'create';
  if (modalVis) modalVis.hidden = modalMode !== 'create';
  const label = document.getElementById('room-name-label');
  const input = document.getElementById('room-name');
  if (label) label.textContent = t(homeMode === 'create' ? 'room' : 'invite_code');
  if (input) {
    input.maxLength = homeMode === 'create' ? 32 : 9;
    input.minLength = homeMode === 'create' ? 2 : 1;
    input.placeholder = t(homeMode === 'create' ? 'room_placeholder' : 'invite_placeholder');
  }
  const modalLabel = document.getElementById('modal-room-name-label');
  const modalInput = document.getElementById('modal-room-name');
  if (modalLabel) modalLabel.textContent = t(modalMode === 'create' ? 'room' : 'invite_code');
  if (modalInput) {
    modalInput.maxLength = modalMode === 'create' ? 32 : 9;
    modalInput.minLength = modalMode === 'create' ? 2 : 1;
  }
  setVisibilityButtons('mode-', state.homeVisibility);
  setVisibilityButtons('modal-mode-', state.modalVisibility);
}

export async function createRoom({ name, visibility, kind }) {
  const { res, data } = await postJson('/api/rooms', { name, visibility, kind });
  if (!res.ok) throw new Error(await readError(res, t('could_not_create')));
  return data;
}

export async function joinRoom({ inviteCode, username }) {
  const { res, data } = await postJson('/api/rooms/join', { inviteCode, username });
  if (!res.ok) {
    const err = new Error(await readError(res, t('could_not_join')));
    err.code = data && data.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function requestJoin(inviteCode) {
  const { res, data } = await postJson('/api/rooms/join-request', { inviteCode });
  if (!res.ok) {
    const err = new Error(await readError(res, t('join_private')));
    err.code = data && data.code;
    throw err;
  }
  return data;
}

export async function rejoinRoom(roomId) {
  const { res, data } = await postJson('/api/rooms/rejoin', { roomId });
  if (!res.ok) throw new Error(await readError(res, t('could_not_join')));
  return data;
}

export async function pollOutgoing() {
  const { res, data } = await getJson('/api/account');
  if (!res.ok || !data) return [];
  state.outgoingJoinRequests = data.outgoingJoinRequests || [];
  state.pendingJoinRequests = data.pendingJoinRequests || [];
  return state.outgoingJoinRequests;
}

export function bindHomeChrome() {
  const pub = document.getElementById('mode-public');
  const priv = document.getElementById('mode-private');
  if (pub) pub.addEventListener('click', () => { state.homeVisibility = 'public'; setVisibilityButtons('mode-', 'public'); });
  if (priv) priv.addEventListener('click', () => { state.homeVisibility = 'private'; setVisibilityButtons('mode-', 'private'); });
  const mPub = document.getElementById('modal-mode-public');
  const mPriv = document.getElementById('modal-mode-private');
  if (mPub) mPub.addEventListener('click', () => { state.modalVisibility = 'public'; setVisibilityButtons('modal-mode-', 'public'); });
  if (mPriv) mPriv.addEventListener('click', () => { state.modalVisibility = 'private'; setVisibilityButtons('modal-mode-', 'private'); });
}
