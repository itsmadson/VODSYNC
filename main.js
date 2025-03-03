const { app, BrowserWindow, shell, clipboard } = require('electron');

const path = require('path');

function createWindow() {

// Create the browser window with cyberpunk-themed colors

const mainWindow = new BrowserWindow({

width: 1000,

height: 800,

backgroundColor: '#0a0a0a',
autoHideMenuBar: true,

webPreferences: {

nodeIntegration: true,

contextIsolation: false,

preload: path.join(__dirname, 'preload.js')

}

});

// Load the HTML file

mainWindow.loadFile('index.html');

// Handle external links

mainWindow.webContents.setWindowOpenHandler(({ url }) => {

if (url.startsWith('http')) {

shell.openExternal(url);

return { action: 'deny' };

}

return { action: 'allow' };

});

// Open DevTools in development

// mainWindow.webContents.openDevTools();

}

// Create window when Electron is ready

app.whenReady().then(() => {

createWindow();

app.on('activate', function () {

if (BrowserWindow.getAllWindows().length === 0) createWindow();

});

});

// Quit when all windows are closed, except on macOS

app.on('window-all-closed', function () {

if (process.platform !== 'darwin') app.quit();

});

