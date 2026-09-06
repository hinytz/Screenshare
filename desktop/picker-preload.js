'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('picker', {
  list: () => ipcRenderer.invoke('sources:list'),
  choose: (source) => ipcRenderer.send('picker:choose', source),
  cancel: () => ipcRenderer.send('picker:cancel'),
});
