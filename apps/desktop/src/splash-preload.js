'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dalmg', {
  openSetup: () => ipcRenderer.invoke('splash:openSetup'),
  onStatus: (handler) => {
    const listener = (_event, status) => handler(status);
    ipcRenderer.on('splash:status', listener);
    return () => ipcRenderer.removeListener('splash:status', listener);
  },
});
