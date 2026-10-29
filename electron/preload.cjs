const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('opsdeckNative', {
  isElectron: true,
  platform: process.platform,
  version: '2.5.0-enterprise',
});
