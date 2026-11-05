const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const electron = require('electron/package.json');
const electronDist = path.join(root, 'node_modules', 'electron', 'dist');
const output = path.join(root, 'dist', 'Quora');
const appDir = path.join(output, 'resources', 'app');

if (process.platform !== 'win32') {
  throw new Error('This portable build script creates a Windows x64 app.');
}
if (!fs.existsSync(path.join(electronDist, 'electron.exe'))) {
  throw new Error('Electron runtime is missing. Run npm install and confirm its Electron binary download finished.');
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.cpSync(electronDist, output, { recursive: true, force: true });
fs.mkdirSync(appDir, { recursive: true });

for (const file of ['package.json', 'electron-main.js', 'index.html', 'style.css', 'three.min.js']) {
  fs.copyFileSync(path.join(root, file), path.join(appDir, file));
}
for (const directory of ['src', 'assets']) {
  fs.cpSync(path.join(root, directory), path.join(appDir, directory), { recursive: true, force: true });
}

const stat = fs.statSync(path.join(output, 'electron.exe'));
console.log(`QUORA_PACKAGE_OK ${output} (Electron ${electron.version}; executable ${Math.round(stat.size / 1024 / 1024)} MB)`);
