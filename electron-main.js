const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const selftest = process.argv.includes('--selftest');
const root = __dirname;

app.setAppUserModelId('com.quora.fps');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-webgl');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 600,
    show: !selftest,
    title: 'Quora',
    backgroundColor: '#07060c',
    icon: path.join(root, 'assets', 'quora.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      offscreen: selftest
    }
  });
  win.removeMenu();
  win.loadFile(path.join(root, 'index.html'), selftest ? { query: { selftest: '1' } } : undefined);

  win.webContents.on('console-message', (details) => {
    if (selftest || details.level === 'error') console.log('[page]', details.message);
  });

  if (!selftest) return;

  win.webContents.once('did-finish-load', async () => {
    const outDir = path.join(root, 'test-output');
    fs.mkdirSync(outDir, { recursive: true });
    const deadline = Date.now() + 25000;
    let result = null;
    while (Date.now() < deadline) {
      try {
        result = await win.webContents.executeJavaScript('window.QUORA_TEST || null');
      } catch (err) {
        result = { ok: false, error: String(err) };
        break;
      }
      if (result) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await new Promise((r) => setTimeout(r, 400));
    try {
      const image = await win.webContents.capturePage();
      fs.writeFileSync(path.join(outDir, 'frame.png'), image.toPNG());
    } catch (err) {
      console.log('[capture]', err.message);
    }
    fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(result, null, 2));
    if (!result || !result.ok) {
      console.error('SELFTEST_FAIL', JSON.stringify(result));
      app.exit(1);
      return;
    }
    console.log('SELFTEST_OK', JSON.stringify(result));
    app.exit(0);
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
