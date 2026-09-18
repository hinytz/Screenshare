import { state } from './state.js';

function ioFactory() {
  return typeof window !== 'undefined' ? window.io : null;
}

let chatSocket = null;

export function disconnectChat() {
  if (!chatSocket) return;
  chatSocket.removeAllListeners();
  chatSocket.disconnect();
  chatSocket = null;
}

export function connectChat({ onHistory, onMessage, onDeleted }) {
  const socketIo = ioFactory();
  if (!socketIo) return null;
  disconnectChat();
  chatSocket = socketIo({ path: '/socket.io', withCredentials: true });
  chatSocket.on('chat:history', (rows) => onHistory && onHistory(rows || []));
  chatSocket.on('chat:message', (row) => onMessage && onMessage(row));
  chatSocket.on('chat:deleted', (payload) => onDeleted && onDeleted(payload && payload.id));
  return chatSocket;
}

export function switchChatChannel(channelId) {
  if (!chatSocket || !channelId) return;
  chatSocket.emit('chat:switch', { channelId });
}

export function sendChat(body) {
  if (!chatSocket || !body) return;
  chatSocket.emit('chat:send', { body, channelId: state.activeChannel && state.activeChannel.id });
}

export function deleteChat(id) {
  if (!chatSocket || !id) return;
  chatSocket.emit('chat:delete', { id: String(id) });
}

export function getChatSocket() {
  return chatSocket;
}
