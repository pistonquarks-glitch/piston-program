const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function startBackendServer(callback) {
  const isProd = app.isPackaged;
  const serverPath = isProd 
    ? path.join(__dirname, 'dist', 'server.cjs')
    : path.join(__dirname, 'server.ts');

  console.log('Iniciando servidor backend en:', serverPath);
  
  if (isProd) {
    serverProcess = spawn('node', [serverPath], {
      env: { ...process.env, PORT: 30787, NODE_ENV: 'production' }
    });
  } else {
    serverProcess = spawn('npx', ['tsx', serverPath], {
      env: { ...process.env, PORT: 30787 }
    });
  }

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
    if (data.toString().includes('http://') || data.toString().includes('port') || data.toString().includes('running')) {
      if (callback) callback();
    }
  });

  setTimeout(() => {
    if (callback) callback();
  }, 2500);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'ress',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL('http://localhost:30787');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackendServer(() => {
    createWindow();
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
