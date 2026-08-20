const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('goose', {
  setHover: (isHovering) => ipcRenderer.send('goose-hover', isHovering),
  spawnNote: (text) => ipcRenderer.send('spawn-note', text),
  // carrega as falas/notas do frases.json (lidas no processo principal)
  getPhrases: () => ipcRenderer.invoke('get-phrases'),
  // avisado pela bandeja quando o ganso é pausado/retomado
  onPauseChange: (cb) => ipcRenderer.on('goose-paused', (_e, paused) => cb(paused))
});

contextBridge.exposeInMainWorld('noteData', {
  getText: () => new URLSearchParams(window.location.search).get('text') || ''
});
