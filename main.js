const { app, BrowserWindow, screen, ipcMain, globalShortcut } = require('electron');
const path = require('path');

let gooseWindow = null;
const noteWindows = new Set();

function createGooseWindow(){
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  gooseWindow = new BrowserWindow({
    width, height,
    x: 0, y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    focusable: false,           // não rouba foco de outras janelas
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  gooseWindow.setAlwaysOnTop(true, 'screen-saver');
  gooseWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Por padrão a janela deixa todos os cliques "atravessarem" pro que
  // estiver por baixo (seu desktop de verdade). O renderer nos avisa
  // (via IPC) quando o mouse está sobre o ganso, e aí capturamos o clique.
  gooseWindow.setIgnoreMouseEvents(true, { forward: true });

  gooseWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Descomente para depurar:
  // gooseWindow.webContents.openDevTools({ mode: 'detach' });
}

// Renderer chama isso a cada frame de hit-test do ganso.
ipcMain.on('goose-hover', (event, isHovering) => {
  if(!gooseWindow) return;
  gooseWindow.setIgnoreMouseEvents(!isHovering, { forward: true });
});

// Renderer pede pra abrir uma "nota" (janela separada, tipo bloco de notas).
ipcMain.on('spawn-note', (event, text) => {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const w = 300, h = 210;
  const x = Math.round(Math.random() * (sw - w - 40)) + 20;
  const y = Math.round(Math.random() * (sh - h - 120)) + 40;

  const note = new BrowserWindow({
    width: w, height: h, x, y,
    frame: true,
    alwaysOnTop: true,
    resizable: false,
    title: 'Not-epad',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  note.setMenu(null);
  note.loadFile(path.join(__dirname, 'notepad', 'notepad.html'), {
    query: { text }
  });

  noteWindows.add(note);
  note.on('closed', () => noteWindows.delete(note));
});

app.whenReady().then(() => {
  createGooseWindow();

  // Ctrl+Alt+G fecha o ganso e todas as notas — o "Close Goose.bat" da vida.
  globalShortcut.register('CommandOrControl+Alt+G', () => {
    noteWindows.forEach(w => w.close());
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createGooseWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
