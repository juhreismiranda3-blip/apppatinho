const { app, BrowserWindow, screen, ipcMain, globalShortcut, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let gooseWindow = null;
let tray = null;
let paused = false;
const noteWindows = new Set();

// Falas e notas ficam num frases.json fácil de editar. Se algo der errado
// na leitura, caímos num conjunto mínimo pra o ganso nunca ficar mudo.
function loadPhrases(){
  const fallback = {
    honks: ["HONK.", "só passeando pela sua tela"],
    notes: ["lembrete: você está sendo observado(a) 🪿"]
  };
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'frases.json'), 'utf8');
    const data = JSON.parse(raw);
    return {
      honks: Array.isArray(data.honks) && data.honks.length ? data.honks : fallback.honks,
      notes: Array.isArray(data.notes) && data.notes.length ? data.notes : fallback.notes
    };
  } catch (err) {
    console.error('Não consegui ler frases.json, usando padrão:', err.message);
    return fallback;
  }
}

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

// Renderer pede as frases ao subir.
ipcMain.handle('get-phrases', () => loadPhrases());

// Renderer chama isso a cada frame de hit-test do ganso.
ipcMain.on('goose-hover', (event, isHovering) => {
  if(!gooseWindow) return;
  gooseWindow.setIgnoreMouseEvents(!isHovering, { forward: true });
});

function setPaused(value){
  paused = value;
  if(gooseWindow) gooseWindow.webContents.send('goose-paused', paused);
  if(tray) tray.setContextMenu(buildTrayMenu());
}

function buildTrayMenu(){
  return Menu.buildFromTemplate([
    { label: 'Desktop Goose (DIY)', enabled: false },
    { type: 'separator' },
    {
      label: paused ? 'Retomar ganso' : 'Pausar ganso',
      click: () => setPaused(!paused)
    },
    { type: 'separator' },
    {
      label: 'Fechar ganso  (Ctrl+Alt+G)',
      click: () => { noteWindows.forEach(w => w.close()); app.quit(); }
    }
  ]);
}

function createTray(){
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
  tray = new Tray(icon);
  tray.setToolTip('Desktop Goose (DIY)');
  tray.setContextMenu(buildTrayMenu());
  // clique no ícone alterna pausa (atalho prático)
  tray.on('click', () => setPaused(!paused));
}

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
  createTray();

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
