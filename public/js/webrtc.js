import { state, hooks } from './state.js';
import { sameVoice, restoreLastTextChannel } from './channels.js';

export function shouldConnectPeer(member) {
  return Boolean(state.voiceChannelId && member && sameVoice(member));
}

export function applyVoiceEvent(msg, { myId, upsert, connect, remove, render }) {
  if (msg.voiceCounts) state.voiceCounts = msg.voiceCounts;
  if (msg.type === 'voice-joined') {
    if (msg.channelId && msg.id === myId) state.voiceChannelId = String(msg.channelId);
    if (msg.id && msg.id !== myId) {
      const prev = { id: msg.id, name: '', inVoice: true, voiceChannelId: msg.channelId };
      const member = upsert(prev);
      if (shouldConnectPeer(member)) connect(member);
    }
    render();
    return true;
  }
  if (msg.type === 'voice-left') {
    if (msg.id === myId) {
      const kicked = Boolean(state.voiceChannelId);
      state.voiceChannelId = null;
      if (kicked) {
        if (hooks.onVoiceLeft) hooks.onVoiceLeft();
        restoreLastTextChannel();
      }
    }
    if (msg.id && msg.id !== myId) {
      remove(msg.id);
    }
    render();
    return true;
  }
  if (msg.type === 'channel-added' || msg.type === 'channel-renamed') {
    if (hooks.onChannelsChanged) hooks.onChannelsChanged(msg);
    return true;
  }
  return false;
}
