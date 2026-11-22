'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dalmg', {
  setup: {
    defaults: () => ipcRenderer.invoke('setup:defaults'),
    test: (url) => ipcRenderer.invoke('setup:test', url),
    save: (data) => ipcRenderer.invoke('setup:save', data),
    cancel: () => ipcRenderer.invoke('setup:cancel'),
    pickProjectDir: () => ipcRenderer.invoke('setup:pickDir'),
  },
  splash: {
    openSetup: () => ipcRenderer.invoke('splash:openSetup'),
    onStatus: (handler) => {
      const listener = (_event, status) => handler(status);
      ipcRenderer.on('splash:status', listener);
      return () => ipcRenderer.removeListener('splash:status', listener);
    },
  },
});
