const { contextBridge, ipcRenderer, shell, clipboard } = require('electron');

// Expose protected methods that allow the renderer process to use
// Electron's APIs
contextBridge.exposeInMainWorld('api', {
  openExternal: (url) => {
    shell.openExternal(url);
  },
  
  openVLC: (url) => {
    // This would work differently based on OS, but a simple implementation:
    shell.openExternal(`vlc://${url}`);
  },
  
  copyToClipboard: (text) => {
    clipboard.writeText(text);
    return true;
  }
});