const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('goose', {
  setHover: (isHovering) => ipcRenderer.send('goose-hover', isHovering),
  spawnNote: (text) => ipcRenderer.send('spawn-note', text),
  // carrega as falas/notas do frases.json (lidas no processo principal)
  getPhrases: () => ipcRenderer.invoke('get-phrases'),
  // carrega os ajustes do config.json
  getConfig: () => ipcRenderer.invoke('get-config'),
  // pede pra abrir uma foto/vídeo de meme (sorteado de assets/memes)
  spawnMeme: () => ipcRenderer.send('spawn-meme'),
  // pede pro ganso roubar o cursor do sistema (precisa de robotjs)
  stealMouse: () => ipcRenderer.send('steal-mouse'),
  // avisado pela bandeja quando o ganso é pausado/retomado
  onPauseChange: (cb) => ipcRenderer.on('goose-paused', (_e, paused) => cb(paused))
});

contextBridge.exposeInMainWorld('noteData', {
  getText: () => new URLSearchParams(window.location.search).get('text') || ''
});
