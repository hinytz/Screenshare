'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('screenshareDesktop', {
  isDesktop: true,
  listSources: () => ipcRenderer.invoke('sources:list'),
  selectSource: (sourceId) => ipcRenderer.invoke('share:select', sourceId),
  startLoopback: (target) => ipcRenderer.invoke('loopback:start', target),
  stopLoopback: () => ipcRenderer.invoke('loopback:stop'),
  onPcm: (handler) => {
    const listener = (_event, buffer) => handler(buffer);
    ipcRenderer.on('audio:pcm', listener);
    return () => ipcRenderer.removeListener('audio:pcm', listener);
  },
});
