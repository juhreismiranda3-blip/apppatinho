const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('goose', {
  setHover: (isHovering) => ipcRenderer.send('goose-hover', isHovering),
  spawnNote: (text) => ipcRenderer.send('spawn-note', text)
});

contextBridge.exposeInMainWorld('noteData', {
  getText: () => new URLSearchParams(window.location.search).get('text') || ''
});
