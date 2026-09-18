import { state } from './state.js';

function ioFactory() {
  return typeof window !== 'undefined' ? window.io : null;
}

let chatSocket = null;

export function ioOptions(path) {
  return {
    path,
    withCredentials: true,
    forceNew: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 400,
    timeout: 20000,
  };
}

export function stopIo(socket) {
  if (!socket) return;
  socket.removeAllListeners();
  if (socket.io && typeof socket.io.reconnection === 'function') {
    socket.io.reconnection(false);
  }
  socket.disconnect();
}

export function disconnectChat() {
  stopIo(chatSocket);
  chatSocket = null;
}

export function connectChat({ onHistory, onMessage, onDeleted }) {
  const socketIo = ioFactory();
  if (!socketIo) return null;
  disconnectChat();
  chatSocket = socketIo(ioOptions('/socket.io'));
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
