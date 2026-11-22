'use strict';

const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const APP_NAME = 'Dalmg';
const ICON_ICO = path.join(__dirname, '..', 'build', 'icon.ico');
const ICON_PNG = path.join(__dirname, '..', 'build', 'icon.png');
// Stable location regardless of Electron's default "<vendor>/<package name>" folder.
const APP_DATA_DIR = path.join(app.getPath('appData'), APP_NAME);
const CONFIG_PATH = path.join(APP_DATA_DIR, 'config.json');
const LOG_DIR = path.join(APP_DATA_DIR, 'logs');

/** @type {{ serverUrl?: string, projectDir?: string, launchLocal?: boolean }} */
let config = {};
let mainWindow = null;
let setupWindow = null;
let splashWindow = null;
let serverProcess = null;

app.setAppUserModelId('dev.dalmg.builder');
app.setName(APP_NAME);

/* ── config ─────────────────────────────────────────────── */

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8').replace(/^\uFEFF/, '');
    config = JSON.parse(raw);
  } catch {
    config = {};
  }
  return config;
}

function saveConfig(next) {
  config = { ...config, ...next };
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function detectDefaultProjectDir() {
  const candidates = [
    process.env.DALMG_PROJECT_DIR,
    path.join(os.homedir(), 'dalmg'),
    path.join(os.homedir(), 'Documents', 'dalmg'),
  ].filter(Boolean);

  for (const dir of candidates) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      if (pkg.name === 'dalmg') return dir;
    } catch {
      /* not a dalmg checkout */
    }
  }
  return '';
}

/* ── windows ────────────────────────────────────────────── */

function createSetupWindow() {
  if (setupWindow) {
    setupWindow.focus();
    return;
  }
  setupWindow = new BrowserWindow({
    width: 620,
    height: 700,
    resizable: false,
    maximizable: false,
    title: `${APP_NAME} — настройка`,
    icon: fs.existsSync(ICON_ICO) ? ICON_ICO : undefined,
    backgroundColor: '#0B1020',
    webPreferences: {
      preload: path.join(__dirname, 'setup-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  setupWindow.setMenuBarVisibility(false);
  setupWindow.loadFile(path.join(__dirname, 'setup.html'));
  setupWindow.on('closed', () => {
    setupWindow = null;
    if (!mainWindow && !splashWindow) app.quit();
  });
}

async function openApp(showSplash = true) {
  const cfg = loadConfig();
  const url = cfg.serverUrl;

  if (!url) {
    createSetupWindow();
    return;
  }

  if (showSplash) showSplashWindow();

  if (cfg.launchLocal && cfg.projectDir) {
    const alreadyRunning = await ping(url);
    if (!alreadyRunning) startLocalServer(cfg.projectDir);
    else updateSplash('Сервер уже запущен');
  }

  const ok = await waitForServer(url, 120_000);
  if (!ok) {
    closeSplash();
    dialog.showMessageBox({
      type: 'error',
      title: `${APP_NAME}: сервер недоступен`,
      message: `Не удалось подключиться к ${url}`,
      detail: 'Проверьте адрес в настройках или запустите локальный сервер вручную (npm run dev).',
      buttons: ['Открыть настройки', 'Выход'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) createSetupWindow();
      else app.quit();
    });
    return;
  }

  updateSplash('Открываем редактор…');
  createMainWindow(url);
  closeSplash();
}

function createMainWindow(url) {
  if (mainWindow) {
    mainWindow.loadURL(url);
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1100,
    minHeight: 700,
    title: APP_NAME,
    icon: fs.existsSync(ICON_ICO) ? ICON_ICO : undefined,
    backgroundColor: '#F5F6FA',
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });
  mainWindow.loadURL(url);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (target.startsWith(url)) return { action: 'allow' };
    shell.openExternal(target);
    return { action: 'deny' };
  });
}

function showSplashWindow() {
  if (splashWindow) return;
  splashWindow = new BrowserWindow({
    width: 480,
    height: 340,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#0B1020',
    icon: fs.existsSync(ICON_ICO) ? ICON_ICO : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'splash-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => splashWindow && splashWindow.show());
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function updateSplash(status) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash:status', status);
  }
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
  splashWindow = null;
}

/* ── local server ───────────────────────────────────────── */

async function ping(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(url, { signal: controller.signal, redirect: 'manual' });
    clearTimeout(timer);
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now();
  let attempt = 0;
  while (Date.now() - startedAt < timeoutMs) {
    attempt += 1;
    if (await ping(url)) return true;
    if (attempt % 4 === 0) {
      updateSplash(`Ожидаем локальный сервер… ${Math.round((Date.now() - startedAt) / 1000)} с`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return false;
}

function startLocalServer(projectDir) {
  if (serverProcess) return;
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logStream = fs.createWriteStream(path.join(LOG_DIR, 'dev-server.log'), { flags: 'a' });

  updateSplash('Запускаем локальный сервер…');

  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'cmd.exe' : 'npm';
  const args = isWindows ? ['/d', '/s', '/c', 'npm run dev'] : ['run', 'dev'];

  try {
    serverProcess = spawn(command, args, {
      cwd: projectDir,
      env: { ...process.env, FORCE_COLOR: '0' },
      windowsHide: true,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    serverProcess.stdout.pipe(logStream);
    serverProcess.stderr.pipe(logStream);
    serverProcess.on('exit', () => {
      serverProcess = null;
    });
  } catch (error) {
    logStream.write(`\n[failed to start] ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

function stopLocalServer() {
  if (!serverProcess) return;
  const pid = serverProcess.pid;
  serverProcess = null;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true });
  } else {
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      /* ignore */
    }
  }
}

/* ── menu ───────────────────────────────────────────────── */

function buildMenu() {
  const template = [
    {
      label: 'Файл',
      submenu: [
        {
          label: 'Настройки сервера…',
          accelerator: 'CmdOrCtrl+,',
          click: () => createSetupWindow(),
        },
        { type: 'separator' },
        { role: 'quit', label: 'Выход' },
      ],
    },
    {
      label: 'Правка',
      submenu: [
        { role: 'undo', label: 'Отменить' },
        { role: 'redo', label: 'Повторить' },
        { type: 'separator' },
        { role: 'cut', label: 'Вырезать' },
        { role: 'copy', label: 'Копировать' },
        { role: 'paste', label: 'Вставить' },
        { role: 'selectAll', label: 'Выделить всё' },
      ],
    },
    {
      label: 'Вид',
      submenu: [
        { role: 'reload', label: 'Обновить' },
        { role: 'forceReload', label: 'Перезагрузить приложение' },
        { type: 'separator' },
        {
          label: 'Масштаб',
          submenu: [
            { role: 'resetZoom', label: '100%' },
            { role: 'zoomIn', label: 'Увеличить' },
            { role: 'zoomOut', label: 'Уменьшить' },
          ],
        },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Полный экран' },
        { role: 'toggleDevTools', label: 'Инструменты разработчика' },
      ],
    },
    {
      label: 'Справка',
      submenu: [
        {
          label: 'Открыть в браузере',
          click: () => config.serverUrl && shell.openExternal(config.serverUrl),
        },
        { type: 'separator' },
        {
          label: `О программе ${APP_NAME}`,
          click: () =>
            dialog.showMessageBox({
              type: 'info',
              title: APP_NAME,
              message: `${APP_NAME} ${app.getVersion()}`,
              detail: `Конструктор сайтов.\nСервер: ${config.serverUrl ?? 'не настроен'}\nElectron ${process.versions.electron} · Chromium ${process.versions.chrome}`,
              buttons: ['OK'],
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ── ipc ────────────────────────────────────────────────── */

ipcMain.handle('setup:defaults', () => {
  const current = loadConfig();
  return {
    serverUrl: current.serverUrl ?? 'http://localhost:3002',
    projectDir: current.projectDir ?? detectDefaultProjectDir(),
    launchLocal: current.launchLocal ?? true,
    version: app.getVersion(),
  };
});

ipcMain.handle('setup:test', async (_event, url) => {
  if (!url || !/^https?:\/\//i.test(url)) return { ok: false, message: 'Адрес должен начинаться с http:// или https://' };
  const ok = await ping(url);
  return { ok, message: ok ? 'Сервер отвечает' : 'Сервер не отвечает' };
});

ipcMain.handle('setup:pickDir', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'], title: 'Папка проекта Dalmg' });
  return result.canceled ? null : result.filePaths[0] ?? null;
});

ipcMain.handle('setup:save', async (_event, data) => {
  saveConfig({
    serverUrl: String(data.serverUrl || '').replace(/\/+$/, ''),
    projectDir: String(data.projectDir || ''),
    launchLocal: Boolean(data.launchLocal),
  });
  if (setupWindow) {
    setupWindow.close();
    setupWindow = null;
  }
  await openApp();
  return { ok: true };
});

ipcMain.handle('setup:cancel', () => {
  if (setupWindow) setupWindow.close();
  if (!mainWindow) app.quit();
});

ipcMain.handle('splash:openSetup', () => {
  closeSplash();
  createSetupWindow();
});

/* ── lifecycle ──────────────────────────────────────────── */

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    loadConfig();
    buildMenu();
    const cfg = loadConfig();
    if (!cfg.serverUrl) createSetupWindow();
    else await openApp();
  });

  app.on('window-all-closed', () => {
    stopLocalServer();
    app.quit();
  });

  app.on('before-quit', () => {
    stopLocalServer();
  });
}
