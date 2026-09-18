import { t } from '../i18n.js';
import { state, hooks } from './state.js';
import { postJson, readError } from './api.js';

const HASH_SVG = '<svg class="hi" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3L8 21M16 3L14 21"/><path d="M4 9H20M4 15H20"/></svg>';
const VOICE_SVG = '<svg class="hi" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z"/><path d="M12 8V16"/><path d="M9 10V14"/><path d="M6 11V13"/><path d="M15 10V14"/><path d="M18 11V13"/></svg>';
const EDIT_SVG = '<svg class="hi" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.214 4.982L17.616 3.581a2.25 2.25 0 1 1 3.183 3.183l-1.401 1.402M16.214 4.982L10.98 10.216c-1.045 1.046-1.568 1.568-1.924 2.205-.356.637-.714 2.141-1.056 3.579 1.438-.342 2.942-.7 3.579-1.056.637-.356 1.16-.879 2.205-1.924l5.234-5.234M16.214 4.982l2.804 2.804"/></svg>';
const DELETE_SVG = '<svg class="hi" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6L18 18"/></svg>';

function canEdit() {
  return Boolean(hooks.canEditChannels && hooks.canEditChannels());
}

function textList() {
  return document.getElementById('text-channel-list');
}
function voiceList() {
  return document.getElementById('voice-channel-list');
}

export function setChannels(list) {
  state.channels = Array.isArray(list) ? list.slice() : [];
  const firstText = firstTextChannel();
  if (!state.activeChannel.id && firstText) {
    state.activeChannel = { type: 'text', id: firstText.id };
  }
  if (!state.lastTextChannelId && firstText) {
    state.lastTextChannelId = firstText.id;
  }
  renderChannels();
}

export function firstTextChannel() {
  return state.channels.find((ch) => ch.type === 'text') || null;
}

export function channelById(id) {
  return state.channels.find((ch) => String(ch.id) === String(id)) || null;
}

function voiceCount(id) {
  let n = Number(state.voiceCounts[id] || 0);
  if (String(state.voiceChannelId) === String(id) && n < 1) n = 1;
  return n;
}

function canDeleteChannel(channel) {
  if (!canEdit() || !channel) return false;
  return state.channels.filter((ch) => ch.type === channel.type).length > 1;
}

function renderChannelButton(channel) {
  const row = document.createElement('div');
  row.className = 'channel-item';
  row.dataset.channelId = channel.id;
  row.dataset.type = channel.type;
  const active = String(state.activeChannel.id) === String(channel.id);
  row.classList.toggle('is-active', active);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'channel-item-main';
  btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  btn.innerHTML = `${channel.type === 'voice' ? VOICE_SVG : HASH_SVG}<span class="channel-item-name"></span>`;
  btn.querySelector('.channel-item-name').textContent = channel.name;
  if (channel.type === 'voice') {
    const count = document.createElement('span');
    count.className = 'channel-voice-count';
    count.textContent = `${voiceCount(channel.id)} / 5`;
    btn.append(count);
  }
  row.append(btn);

  let clickTimer = 0;
  if (canEdit()) {
    const actions = document.createElement('span');
    actions.className = 'channel-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'channel-edit';
    edit.title = t('rename_channel');
    edit.setAttribute('aria-label', t('rename_channel'));
    edit.innerHTML = EDIT_SVG;
    edit.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      clearTimeout(clickTimer);
      startRename(row, channel);
    });
    actions.append(edit);
    if (canDeleteChannel(channel)) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'channel-delete';
      del.title = t('delete_channel');
      del.setAttribute('aria-label', t('delete_channel'));
      del.innerHTML = DELETE_SVG;
      del.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearTimeout(clickTimer);
        deleteChannel(channel);
      });
      actions.append(del);
    }
    row.append(actions);
  }

  const activate = () => {
    if (channel.type === 'text') selectTextChannel(channel.id);
    else selectVoiceChannel(channel.id);
  };
  btn.addEventListener('click', (event) => {
    if (row.querySelector('.channel-rename')) {
      event.preventDefault();
      return;
    }
    if (!canEdit()) {
      activate();
      return;
    }
    clearTimeout(clickTimer);
    clickTimer = window.setTimeout(activate, 250);
  });
  btn.addEventListener('dblclick', (event) => {
    event.preventDefault();
    clearTimeout(clickTimer);
    if (canEdit()) startRename(row, channel);
  });
  return row;
}

export function renderChannels() {
  const texts = textList();
  const voices = voiceList();
  if (!texts || !voices) return;
  texts.replaceChildren();
  voices.replaceChildren();
  for (const channel of state.channels.filter((ch) => ch.type === 'text')) {
    texts.append(renderChannelButton(channel));
  }
  for (const channel of state.channels.filter((ch) => ch.type === 'voice')) {
    const wrap = document.createElement('div');
    wrap.className = 'voice-channel-block';
    wrap.append(renderChannelButton(channel));
    if (String(state.voiceChannelId) === String(channel.id)) {
      const list = document.createElement('ul');
      list.className = 'voice-roster';
      list.id = 'voice-roster';
      wrap.append(list);
    }
    voices.append(wrap);
  }
  const addText = document.getElementById('add-text-channel');
  const addVoice = document.getElementById('add-voice-channel');
  const owner = Boolean(hooks.canEditChannels && hooks.canEditChannels());
  if (addText) addText.hidden = !owner;
  if (addVoice) addVoice.hidden = !owner;
  syncChannelTitle();
  if (hooks.renderVoiceRoster) hooks.renderVoiceRoster();
}

function syncChannelTitle() {
  const title = document.getElementById('main-channel-title');
  const channel = channelById(state.activeChannel.id);
  if (title) title.textContent = channel ? channel.name : t(state.activeChannel.type === 'voice' ? 'voice_channel' : 'chat_channel');
}

function startRename(btn, channel) {
  if (!btn || btn.querySelector('.channel-rename')) return;
  const span = btn.querySelector('.channel-item-name');
  if (!span) return;
  const input = document.createElement('input');
  input.className = 'channel-rename';
  input.value = channel.name;
  input.maxLength = 32;
  input.addEventListener('click', (event) => event.stopPropagation());
  span.replaceWith(input);
  input.focus();
  input.select();
  const finish = async (ok) => {
    const name = input.value.trim();
    if (ok && name && name !== channel.name) {
      const { res, data } = await postJson('/api/channels/rename', { channelId: channel.id, name });
      if (!res.ok) {
        hooks.showRoomError(await readError(res, t('channel_fail')));
      } else if (data && data.channels) {
        setChannels(data.channels);
        return;
      }
    }
    renderChannels();
  };
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      input.blur();
    }
    if (event.key === 'Escape') finish(false);
  });
}

export function syncChannelChrome() {
  document.querySelectorAll('.channel-item').forEach((row) => {
    const active = String(row.dataset.channelId) === String(state.activeChannel.id);
    row.classList.toggle('is-active', active);
    const main = row.querySelector('.channel-item-main');
    if (main) main.setAttribute('aria-pressed', active ? 'true' : 'false');
    const countEl = row.querySelector('.channel-voice-count');
    if (countEl) countEl.textContent = `${voiceCount(row.dataset.channelId)} / 5`;
  });
  const voices = voiceList();
  if (voices) {
    voices.querySelectorAll('.voice-channel-block').forEach((wrap) => {
      const btn = wrap.querySelector('.channel-item');
      const id = btn && btn.dataset.channelId;
      const inThis = id && String(state.voiceChannelId) === String(id);
      let list = wrap.querySelector('.voice-roster');
      if (inThis && !list) {
        list = document.createElement('ul');
        list.className = 'voice-roster';
        list.id = 'voice-roster';
        wrap.append(list);
      } else if (!inThis && list) {
        list.remove();
      }
    });
  }
  syncChannelTitle();
  if (hooks.renderVoiceRoster) hooks.renderVoiceRoster();
}

export function selectTextChannel(channelId) {
  const channel = channelById(channelId);
  if (!channel || channel.type !== 'text') return;
  state.activeChannel = { type: 'text', id: channel.id };
  state.lastTextChannelId = channel.id;
  syncChannelChrome();
  hooks.switchChat(channel.id);
  hooks.applySidePanel();
  hooks.applyLayout();
  if (hooks.onChannelActivated) hooks.onChannelActivated();
}

export async function selectVoiceChannel(channelId) {
  const channel = channelById(channelId);
  if (!channel || channel.type !== 'voice') return;
  state.activeChannel = { type: 'voice', id: channel.id };
  syncChannelChrome();
  hooks.applySidePanel();
  hooks.applyLayout();
  if (hooks.onChannelActivated) hooks.onChannelActivated();
  if (String(state.voiceChannelId) === String(channel.id)) return;
  await joinVoice(channel.id);
}

export async function joinVoice(channelId) {
  const { res, data } = await postJson('/api/voice', { action: 'join', channelId });
  if (!res.ok) {
    hooks.showRoomError(await readError(res, t('could_not_enter')));
    return false;
  }
  state.voiceChannelId = data && data.channelId ? String(data.channelId) : String(channelId);
  if (data && data.voiceCounts) state.voiceCounts = data.voiceCounts;
  syncChannelChrome();
  if (hooks.onVoiceJoined) await hooks.onVoiceJoined();
  return true;
}

export async function leaveVoice() {
  const { data } = await postJson('/api/voice', { action: 'leave' });
  state.voiceChannelId = null;
  if (data && data.voiceCounts) state.voiceCounts = data.voiceCounts;
  if (hooks.onVoiceLeft) hooks.onVoiceLeft();
  restoreLastTextChannel();
}

export function restoreLastTextChannel() {
  const remembered = channelById(state.lastTextChannelId);
  const target = remembered && remembered.type === 'text' ? remembered : firstTextChannel();
  if (target) {
    selectTextChannel(target.id);
    return;
  }
  state.activeChannel = { type: 'text', id: null };
  syncChannelChrome();
  hooks.applySidePanel();
  hooks.applyLayout();
}

function nextChannelName(type) {
  const base = type === 'voice' ? t('voice') : t('chat');
  const taken = new Set(
    state.channels
      .filter((ch) => ch.type === type)
      .map((ch) => String(ch.name || '').trim().toLowerCase())
  );
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; n <= 21; n++) {
    const name = `${base} ${n}`;
    if (!taken.has(name.toLowerCase())) return name;
  }
  return `${base} ${Date.now()}`;
}

export async function addChannel(type) {
  const name = nextChannelName(type);
  const { res, data } = await postJson('/api/channels', { type, name });
  if (!res.ok) {
    hooks.showRoomError(await readError(res, t('channel_fail')));
    return;
  }
  if (data && data.channels) setChannels(data.channels);
}

let confirmResolve = null;

function closeDeleteConfirm(ok) {
  const modal = document.getElementById('channel-delete-modal');
  if (modal) {
    modal.classList.remove('is-open');
    modal.hidden = true;
  }
  if (confirmResolve) {
    const done = confirmResolve;
    confirmResolve = null;
    done(Boolean(ok));
  }
}

function confirmChannelDelete(name) {
  const modal = document.getElementById('channel-delete-modal');
  const body = document.getElementById('channel-delete-body');
  const ok = document.getElementById('channel-delete-ok');
  if (!modal || !body) {
    return Promise.resolve(window.confirm(t('delete_channel_confirm', { name })));
  }
  closeDeleteConfirm(false);
  body.textContent = t('delete_channel_confirm', { name });
  modal.hidden = false;
  void modal.offsetWidth;
  modal.classList.add('is-open');
  if (ok) ok.focus();
  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}

export async function deleteChannel(channel) {
  if (!channel || !canDeleteChannel(channel)) {
    hooks.showRoomError(t('channel_last'));
    return;
  }
  if (!await confirmChannelDelete(channel.name)) return;
  const { res, data } = await postJson('/api/channels/delete', { channelId: channel.id });
  if (!res.ok) {
    hooks.showRoomError(await readError(res, t('channel_fail')));
    return;
  }
  applyDeletedChannel(channel.id, data && data.channels, data && data.voiceCounts);
}

export function applyDeletedChannel(channelId, list, voiceCounts) {
  const id = String(channelId || '');
  if (!id) return;
  const wasActive = String(state.activeChannel.id) === id;
  const wasVoice = String(state.voiceChannelId) === id;
  if (voiceCounts) state.voiceCounts = voiceCounts;
  if (String(state.lastTextChannelId) === id) state.lastTextChannelId = null;
  const nextList = Array.isArray(list) ? list : state.channels.filter((ch) => String(ch.id) !== id);
  setChannels(nextList);
  if (wasVoice) {
    state.voiceChannelId = null;
    if (hooks.onVoiceLeft) hooks.onVoiceLeft();
    restoreLastTextChannel();
    return;
  }
  if (wasActive) restoreLastTextChannel();
}

export function bindChannels() {
  const addText = document.getElementById('add-text-channel');
  const addVoice = document.getElementById('add-voice-channel');
  if (addText) addText.addEventListener('click', () => addChannel('text'));
  if (addVoice) addVoice.addEventListener('click', () => addChannel('voice'));
  const modal = document.getElementById('channel-delete-modal');
  const ok = document.getElementById('channel-delete-ok');
  const cancel = document.getElementById('channel-delete-cancel');
  if (ok) ok.addEventListener('click', () => closeDeleteConfirm(true));
  if (cancel) cancel.addEventListener('click', () => closeDeleteConfirm(false));
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeDeleteConfirm(false);
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && confirmResolve) {
      event.preventDefault();
      closeDeleteConfirm(false);
    }
  });
}

export function sameVoice(peer) {
  if (!state.voiceChannelId || !peer) return false;
  return String(peer.voiceChannelId || '') === String(state.voiceChannelId);
}
