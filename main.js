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

// Ajustes do ganso ficam num config.json (silenciar sons, agressividade,
// tempos de passeio, cores etc.). Faltando um campo, usamos o padrão.
function loadConfig(){
  const fallback = {
    silenciarSons: false,
    abrirComOSistema: false,
    podeAtacarMouse: true,
    atacarSozinho: true,
    tempoMinPasseioS: 4,
    tempoMaxPasseioS: 10,
    pegadas: true,
    memes: true,
    racao: true,
    roubarMouse: true,
    chanceHonk: 0.40,
    chanceNota: 0.18,
    chanceMeme: 0.15,
    chanceRoubo: 0.20,
    chanceRacao: 0.15,
    chanceCacaSozinho: 0.35,
    cores: { corpo: '#ffffff', bico: '#ffa500', contorno: '#161616', pernas: '#2f7ec7' }
  };
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8');
    const data = JSON.parse(raw);
    return { ...fallback, ...data, cores: { ...fallback.cores, ...(data.cores || {}) } };
  } catch (err) {
    console.error('Não consegui ler config.json, usando padrão:', err.message);
    return fallback;
  }
}

// Salva uma alteração de volta no config.json (ex.: ligar/desligar o
// "abrir com o sistema" pela bandeja) preservando o resto do arquivo.
function saveConfig(patch){
  const file = path.join(__dirname, 'config.json');
  let data = {};
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { data = loadConfig(); }
  Object.assign(data, patch);
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n'); }
  catch (err) { console.error('Não consegui salvar config.json:', err.message); }
}

// Faz o honk abrir junto com o sistema (Windows/macOS via API do Electron).
// No Linux o Electron não gerencia isso — deixamos um aviso.
function setAutostart(enabled){
  if (process.platform === 'linux') {
    console.warn('Abrir com o sistema no Linux precisa de um arquivo .desktop em ~/.config/autostart (veja o README).');
    return;
  }
  app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true });
}

// Sorteia uma foto OU vídeo da pasta assets/memes (se houver algum).
function pickMeme(){
  try {
    const dir = path.join(__dirname, 'assets', 'memes');
    const ok = /\.(png|jpe?g|gif|webp|mp4|webm|ogg)$/i;
    const files = fs.readdirSync(dir).filter(f => ok.test(f));
    if (!files.length) return null;
    const file = files[Math.floor(Math.random() * files.length)];
    const isVideo = /\.(mp4|webm|ogg)$/i.test(file);
    return { path: path.join(dir, file), isVideo };
  } catch { return null; }
}

// --- Roubar o mouse (opcional) ---
// Mover o cursor REAL do sistema não faz parte do Electron "de fábrica";
// precisa de um módulo nativo. Carregamos o robotjs só se estiver instalado
// (`npm install robotjs`) — sem ele, o recurso simplesmente não liga.
let robot = null;
try { robot = require('robotjs'); } catch { /* opcional */ }

let stealing = false;
function stealMouse(){
  if (!robot || stealing) return;
  stealing = true;
  const { width, height } = robot.getScreenSize();
  let steps = 26;
  // ponto de destino aleatório pra onde o ganso "arrasta" seu cursor
  let tx = Math.round(Math.random() * (width - 40)) + 20;
  let ty = Math.round(Math.random() * (height - 40)) + 20;
  const timer = setInterval(() => {
    if (steps-- <= 0) { clearInterval(timer); stealing = false; return; }
    const { x, y } = robot.getMousePos();
    // caminho tremido em direção ao destino (parece que o ganso puxa)
    const nx = x + (tx - x) * 0.25 + (Math.random() * 30 - 15);
    const ny = y + (ty - y) * 0.25 + (Math.random() * 30 - 15);
    robot.moveMouse(
      Math.max(0, Math.min(width - 1, Math.round(nx))),
      Math.max(0, Math.min(height - 1, Math.round(ny)))
    );
  }, 45);
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

// Renderer pede as frases e os ajustes ao subir.
ipcMain.handle('get-phrases', () => loadPhrases());
ipcMain.handle('get-config', () => loadConfig());

// Renderer pede pra abrir um meme — foto OU vídeo (janela pequena, sem
// moldura, sempre no topo).
ipcMain.on('spawn-meme', () => {
  const pick = pickMeme();
  if (!pick) return;
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const w = 340, h = 300;
  const x = Math.round(Math.random() * (sw - w - 40)) + 20;
  const y = Math.round(Math.random() * (sh - h - 80)) + 20;

  const meme = new BrowserWindow({
    width: w, height: h, x, y,
    frame: false, transparent: true, alwaysOnTop: true,
    resizable: false, skipTaskbar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  meme.setAlwaysOnTop(true, 'screen-saver');
  const src = 'file://' + pick.path.replace(/\\/g, '/');
  const media = pick.isVideo
    ? `<video src="${src}" autoplay loop muted playsinline
         style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 8px 14px rgba(0,0,0,.5))"></video>`
    : `<img src="${src}"
         style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 8px 14px rgba(0,0,0,.5))">`;
  const url = 'data:text/html;charset=utf-8,' + encodeURIComponent(
    `<body style="margin:0;background:transparent;overflow:hidden;cursor:pointer"
       onclick="window.close()" title="clique para fechar">${media}</body>`);
  meme.loadURL(url);
  noteWindows.add(meme);
  meme.on('closed', () => noteWindows.delete(meme));
  // some sozinho depois de um tempinho (vídeo fica um pouco mais)
  setTimeout(() => { if (!meme.isDestroyed()) meme.close(); }, pick.isVideo ? 12000 : 7000);
});

// Renderer pede pro ganso roubar o cursor (só funciona com robotjs instalado
// e "roubarMouse": true no config.json).
ipcMain.on('steal-mouse', () => {
  if (loadConfig().roubarMouse) stealMouse();
});

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
    { label: 'honk 🪿', enabled: false },
    { type: 'separator' },
    {
      label: paused ? 'Retomar ganso' : 'Pausar ganso',
      click: () => setPaused(!paused)
    },
    {
      label: 'Abrir junto com o PC',
      type: 'checkbox',
      checked: loadConfig().abrirComOSistema === true,
      enabled: process.platform !== 'linux',
      click: (item) => {
        setAutostart(item.checked);
        saveConfig({ abrirComOSistema: item.checked });
      }
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
  tray.setToolTip('honk 🪿');
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

  // aplica a preferência de "abrir com o sistema" salva no config.json
  setAutostart(loadConfig().abrirComOSistema === true);

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
