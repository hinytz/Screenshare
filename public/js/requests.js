import { t } from '../i18n.js';
import { state, hooks } from './state.js';
import { postJson } from './api.js';

export function setPendingRequests(list) {
  state.pendingJoinRequests = Array.isArray(list) ? list.slice() : [];
  renderInbox();
}

export function renderInbox() {
  const box = document.getElementById('join-inbox');
  const list = document.getElementById('join-inbox-list');
  if (!box || !list) return;
  const rows = state.pendingJoinRequests || [];
  box.hidden = rows.length === 0;
  list.replaceChildren(
    ...rows.map((req) => {
      const li = document.createElement('li');
      li.className = 'join-inbox-item';
      const who = document.createElement('div');
      who.className = 'join-inbox-who';
      const name = document.createElement('strong');
      name.textContent = req.username || t('username');
      const room = document.createElement('span');
      room.textContent = req.roomName || '';
      who.append(name, room);
      const actions = document.createElement('div');
      actions.className = 'join-inbox-actions';
      const allow = document.createElement('button');
      allow.type = 'button';
      allow.textContent = t('allow');
      allow.addEventListener('click', () => respond(req.id, true));
      const deny = document.createElement('button');
      deny.type = 'button';
      deny.className = 'danger';
      deny.textContent = t('deny');
      deny.addEventListener('click', () => respond(req.id, false));
      actions.append(allow, deny);
      li.append(who, actions);
      return li;
    })
  );
}

async function respond(requestId, allow) {
  const { res, data } = await postJson('/api/rooms/join-request/respond', { requestId, allow });
  if (!res.ok) return;
  if (data && data.pendingJoinRequests) setPendingRequests(data.pendingJoinRequests);
  else setPendingRequests((state.pendingJoinRequests || []).filter((row) => row.id !== requestId));
}

export function handleRequestEvent(msg) {
  if (msg.type === 'join-request' && msg.request) {
    const next = [...state.pendingJoinRequests.filter((row) => row.id !== msg.request.id), msg.request];
    setPendingRequests(next);
    if (hooks.setAccountMenu) hooks.setAccountMenu(true);
    return true;
  }
  if (msg.type === 'join-request-resolved' && msg.request) {
    state.outgoingJoinRequests = (state.outgoingJoinRequests || []).filter((row) => row.id !== msg.request.id);
    if (msg.allow && msg.request.inviteCode && hooks.onJoinApproved) {
      hooks.onJoinApproved(msg.request);
    }
    return true;
  }
  return false;
}

export function bindRequests() {
  renderInbox();
}
