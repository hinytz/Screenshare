'use strict';

const { app, BrowserWindow, desktopCapturer, dialog, ipcMain, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULT_URL = 'https://screenshare.hinytz.com';

let nativeCapture = null;
try {
  nativeCapture = require('electron-native-screenshare');
} catch (err) {
  console.error('[loopback] native module load failed', err);
}

let mainWindow = null;
let pickerWindow = null;
let loopbackProc = null;
let nativeActive = false;
let selectedSourceId = null;
let pickerResolver = null;

function startUrl() {
  if (process.env.SCREENSHARE_URL) return process.env.SCREENSHARE_URL;
  return app.isPackaged ? DEFAULT_URL : 'http://localhost:3000';
}

function appIcon() {
  const icon = path.join(__dirname, 'build', 'icon.ico');
  return fs.existsSync(icon) ? icon : undefined;
}

function helperPath() {
  const packaged = path.join(process.resourcesPath, 'LoopbackCapture.exe');
  if (fs.existsSync(packaged)) return packaged;
  const dev = path.join(__dirname, 'native', 'dist', 'LoopbackCapture.exe');
  if (fs.existsSync(dev)) return dev;
  return null;
}

function parseHwnd(sourceId) {
  const match = /^window:(\d+):/.exec(sourceId || '');
  return match ? Number(match[1]) : null;
}

function nativeAvailable() {
  return Boolean(nativeCapture && nativeCapture.isAvailable());
}

function snapshotProcesses() {
  try {
    const out = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name | ConvertTo-Json -Compress',
      ],
      { encoding: 'utf8', windowsHide: true, timeout: 20000, maxBuffer: 20 * 1024 * 1024 }
    );
    const rows = JSON.parse(out);
    const list = Array.isArray(rows) ? rows : [rows];
    const map = new Map();
    for (const row of list) {
      if (!row || row.ProcessId == null) continue;
      map.set(Number(row.ProcessId), {
        parent: Number(row.ParentProcessId) || 0,
        name: String(row.Name || ''),
      });
    }
    return map;
  } catch (err) {
    console.error('[loopback] process snapshot failed', err);
    return new Map();
  }
}

function resolveSameImageRoot(pid) {
  const processes = snapshotProcesses();
  const start = processes.get(pid);
  if (!start) return { pid, image: '?' };
  let image = start.name;
  let current = pid;
  const seen = new Set([current]);
  while (true) {
    const entry = processes.get(current);
    if (!entry) break;
    const parent = entry.parent;
    if (!parent || seen.has(parent)) break;
    const parentEntry = processes.get(parent);
    if (!parentEntry) break;
    if (parentEntry.name.toLowerCase() !== image.toLowerCase()) break;
    seen.add(parent);
    current = parent;
    image = parentEntry.name;
  }
  return { pid: current, image };
}

function stopNativeLoopback() {
  if (!nativeActive) return;
  nativeActive = false;
  if (!nativeCapture) return;
  try {
    nativeCapture.stopCapture();
  } catch {
    // already stopped
  }
}

function startNativeLoopback(target) {
  if (!nativeAvailable()) {
    return {
      ok: false,
      error: nativeCapture && nativeCapture.getLoadError
        ? nativeCapture.getLoadError()
        : 'Native audio module is not built.',
    };
  }

  stopNativeLoopback();

  let includeMode = false;
  let pid = process.pid;

  if (target && target.system) {
    includeMode = false;
    pid = process.pid;
  } else if (target && target.hwnd) {
    includeMode = true;
    const hwndPid = nativeCapture.getPidFromWindowHandle(Number(target.hwnd));
    if (!hwndPid) return { ok: false, error: 'Could not resolve window process.' };
    const root = resolveSameImageRoot(hwndPid);
    pid = root.pid;
    console.error(`[loopback] hwnd pid ${hwndPid} -> root ${pid} ${root.image}`);
  } else if (target && target.pid) {
    includeMode = true;
    const root = resolveSameImageRoot(Number(target.pid));
    pid = root.pid;
    console.error(`[loopback] pid ${target.pid} -> root ${pid} ${root.image}`);
  }

  try {
    const started = nativeCapture.startCapture(pid, includeMode, (data) => {
      sendPcm(data);
    });
    if (!started) return { ok: false, error: 'Native audio capture failed to start.' };
    nativeActive = true;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Native audio capture failed.' };
  }
}

function startHelperLoopback(target) {
  const exe = helperPath();
  if (!exe) {
    return { ok: false, error: 'Loopback helper is not built yet.' };
  }
  const args = [];
  if (target && target.system) args.push('--system');
  else if (target && target.pid) args.push('--pid', String(target.pid));
  else if (target && target.hwnd) args.push('--hwnd', String(target.hwnd));
  else args.push('--system');

  const child = spawn(exe, args, {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  loopbackProc = child;
  child.stdout.on('data', (buf) => sendPcm(buf));
  child.stderr.on('data', (buf) => {
    const text = String(buf).trim();
    if (text) console.error('[loopback]', text);
  });
  child.on('exit', () => {
    if (loopbackProc === child) loopbackProc = null;
  });
  return { ok: true };
}

function stopLoopback() {
  stopNativeLoopback();
  if (!loopbackProc) return;
  const child = loopbackProc;
  loopbackProc = null;
  try {
    child.kill();
  } catch {
    // already gone
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 520,
    backgroundColor: '#000000',
    icon: appIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('closed', () => {
    stopLoopback();
    const leftover = [...BrowserWindow.getAllWindows()];
    mainWindow = null;
    for (const win of leftover) {
      if (!win.isDestroyed()) win.close();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return { action: 'deny' };
    }
    let origin = '';
    try {
      origin = new URL(startUrl()).origin;
    } catch {
      origin = '';
    }
    if (origin && parsed.origin === origin && parsed.pathname === '/float.html') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          frame: false,
          alwaysOnTop: true,
          skipTaskbar: true,
          backgroundColor: '#000000',
          resizable: true,
          width: 800,
          height: 280,
          minWidth: 320,
          minHeight: 140,
          autoHideMenuBar: true,
          icon: appIcon(),
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
          },
        },
      };
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-create-window', (child, details) => {
    let parsed;
    try {
      parsed = new URL(details.url);
    } catch {
      return;
    }
    if (parsed.pathname !== '/float.html') return;
    child.setMenu(null);
    child.setMenuBarVisibility(false);
    child.setAutoHideMenuBar(true);
    pinFloatWindow(child);
    const pin = setInterval(() => pinFloatWindow(child), 750);
    child.on('blur', () => pinFloatWindow(child));
    child.on('closed', () => clearInterval(pin));
  });

  return mainWindow.loadURL(startUrl()).then(() => {
    setupAutoUpdate();
  });
}

function setupAutoUpdate() {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('error', (err) => {
    console.error('[update]', err);
  });
  autoUpdater.on('update-downloaded', () => {
    const options = {
      type: 'info',
      buttons: ['Restart', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: 'A new version of Screenshare is ready.',
      detail: 'Restart now to update. Your current session will close.',
    };
    const prompt = mainWindow && !mainWindow.isDestroyed()
      ? dialog.showMessageBox(mainWindow, options)
      : dialog.showMessageBox(options);
    prompt.then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[update] check failed', err);
  });
}

function pinFloatWindow(win) {
  if (!win || win.isDestroyed()) return;
  try {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch {
    // Windows ignores workspace flags.
  }
  win.setAlwaysOnTop(true, 'screen-saver');
  win.moveTop();
}

function detectBrowser(title, image) {
  const exe = String(image || '')
    .toLowerCase()
    .replace(/\.exe$/i, '');
  const fromExe = {
    chrome: 'Chrome',
    chromium: 'Chromium',
    msedge: 'Edge',
    firefox: 'Firefox',
    waterfox: 'Firefox',
    librewolf: 'Firefox',
    floorp: 'Firefox',
    brave: 'Brave',
    opera: 'Opera',
    vivaldi: 'Vivaldi',
    arc: 'Arc',
    iexplore: 'Internet Explorer',
  }[exe];
  if (fromExe) return fromExe;
  const name = String(title || '');
  if (/google chrome/i.test(name)) return 'Chrome';
  if (/microsoft edge/i.test(name)) return 'Edge';
  if (/mozilla firefox/i.test(name)) return 'Firefox';
  if (/(?:^|\s[—\-]\s)Brave$/i.test(name)) return 'Brave';
  if (/(?:^|\s[—\-]\s)Opera(?:\sGX)?$/i.test(name)) return 'Opera';
  if (/vivaldi/i.test(name)) return 'Vivaldi';
  if (/(?:^|\s[—\-]\s)Arc$/i.test(name)) return 'Arc';
  if (/chromium/i.test(name)) return 'Chromium';
  return '';
}

function mapSource(source, processes) {
  const hwnd = parseHwnd(source.id);
  let image = '';
  if (hwnd && nativeCapture && typeof nativeCapture.getPidFromWindowHandle === 'function') {
    try {
      const pid = nativeCapture.getPidFromWindowHandle(hwnd);
      const entry = pid ? processes.get(Number(pid)) : null;
      if (entry && entry.name) image = entry.name;
    } catch {
      // title fallback
    }
  }
  const browser = detectBrowser(source.name, image);
  const isScreen = source.id.startsWith('screen:');
  let icon = '';
  try {
    if (source.appIcon) icon = source.appIcon.toDataURL();
  } catch {
    icon = '';
  }
  return {
    id: source.id,
    name: source.name,
    kind: isScreen ? 'screen' : 'window',
    hwnd,
    thumbnail: source.thumbnail ? source.thumbnail.toDataURL() : '',
    icon,
    app: browser || (image ? String(image).replace(/\.exe$/i, '') : ''),
    group: isScreen ? 'window' : browser ? 'browser' : 'window',
  };
}

async function listSources() {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true,
  });
  const processes =
    nativeCapture && typeof nativeCapture.getPidFromWindowHandle === 'function'
      ? snapshotProcesses()
      : new Map();
  return sources.map((source) => mapSource(source, processes));
}

function closePicker(result) {
  const resolve = pickerResolver;
  pickerResolver = null;
  if (pickerWindow && !pickerWindow.isDestroyed()) {
    pickerWindow.close();
  }
  pickerWindow = null;
  if (resolve) resolve(result);
}

function showSourcePicker() {
  if (pickerResolver) return new Promise((resolve) => {
    const previous = pickerResolver;
    pickerResolver = (value) => {
      previous(value);
      resolve(value);
    };
  });

  return new Promise((resolve) => {
    pickerResolver = resolve;
    pickerWindow = new BrowserWindow({
      parent: mainWindow || undefined,
      modal: Boolean(mainWindow),
      width: 760,
      height: 560,
      backgroundColor: '#000000',
      icon: appIcon(),
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'picker-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    pickerWindow.loadFile(path.join(__dirname, 'picker.html'));
    pickerWindow.on('closed', () => {
      pickerWindow = null;
      if (pickerResolver) {
        const pending = pickerResolver;
        pickerResolver = null;
        pending(null);
      }
    });
  });
}

async function resolveCaptureSource() {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 1, height: 1 },
  });
  if (selectedSourceId) {
    const preset = sources.find((source) => source.id === selectedSourceId);
    selectedSourceId = null;
    if (preset) return preset;
  }
  const picked = await showSourcePicker();
  if (!picked) return null;
  selectedSourceId = picked.id;
  return sources.find((source) => source.id === picked.id) || picked;
}

function sendPcm(chunk) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const copy = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
  mainWindow.webContents.send('audio:pcm', copy);
}

app.commandLine.appendSwitch('enable-features', 'WebRtcUseEchoCanceller3');
app.commandLine.appendSwitch('disable-http-cache');

app.whenReady().then(async () => {
  await session.defaultSession.clearCache().catch(() => {});
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media' || permission === 'display-capture' || permission === 'fullscreen');
  });

  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const match = await resolveCaptureSource();
      if (!match) {
        callback({});
        return;
      }
      callback({ video: match });
    } catch (err) {
      console.error(err);
      callback({});
    }
  });

  ipcMain.handle('sources:list', () => listSources());
  ipcMain.on('picker:choose', (_event, source) => closePicker(source || null));
  ipcMain.on('picker:cancel', () => closePicker(null));

  ipcMain.handle('share:select', (_event, sourceId) => {
    selectedSourceId = sourceId;
    return true;
  });

  ipcMain.handle('loopback:start', (_event, target) => {
    stopLoopback();
    const native = startNativeLoopback(target);
    if (native.ok) return native;
    console.error('[loopback] native failed, falling back', native.error);
    const fallback = startHelperLoopback(target);
    if (fallback.ok) return fallback;
    return native.error ? native : fallback;
  });

  ipcMain.handle('loopback:stop', () => {
    stopLoopback();
    return { ok: true };
  });

  return createWindow();
});

app.on('window-all-closed', () => {
  stopLoopback();
  app.quit();
});

app.on('before-quit', () => {
  stopLoopback();
});
