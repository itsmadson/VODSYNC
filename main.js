const { app, BrowserWindow, shell, clipboard, ipcMain, dialog, net } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

function createWindow() {
  // Create the browser window with cyberpunk-themed colors
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
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
  
  return mainWindow;
}

// Create window when Electron is ready
app.whenReady().then(() => {
  const mainWindow = createWindow();
  
  // Handle download file request from renderer
  ipcMain.on('download-file', (event, { url, filename }) => {
    // Show save dialog
    dialog.showSaveDialog(mainWindow, {
      title: 'Save VOD/Clip',
      defaultPath: path.join(app.getPath('downloads'), filename || 'vod.mp4'),
      filters: [
        { name: 'Video Files', extensions: ['mp4', 'ts', 'm3u8'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }).then(result => {
      if (!result.canceled && result.filePath) {
        // Start the download
        downloadFile(url, result.filePath, event);
      }
    }).catch(err => {
      console.error('Error showing save dialog:', err);
      event.sender.send('download-error', { error: 'Failed to open save dialog' });
    });
  });
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Function to download a file from a URL
function downloadFile(url, targetPath, event) {
  const protocol = url.startsWith('https') ? https : http;
  
  // Create download progress notification
  const progressCallback = (receivedBytes, totalBytes) => {
    if (event) {
      event.sender.send('download-progress', { 
        receivedBytes, 
        totalBytes,
        percentage: totalBytes ? Math.round((receivedBytes / totalBytes) * 100) : 0
      });
    }
  };
  
  // Start the request
  const request = protocol.get(url, (response) => {
    // Handle redirects
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      return downloadFile(response.headers.location, targetPath, event);
    }
    
    // Check if the request was successful
    if (response.statusCode !== 200) {
      if (event) {
        event.sender.send('download-error', { 
          error: `Failed to download, status code: ${response.statusCode}` 
        });
      }
      return;
    }
    
    // Get the total size for progress monitoring
    const totalBytes = parseInt(response.headers['content-length'], 10);
    let receivedBytes = 0;
    
    // Create write stream
    const fileStream = fs.createWriteStream(targetPath);
    
    // Handle stream events
    response.pipe(fileStream);
    
    response.on('data', (chunk) => {
      receivedBytes += chunk.length;
      progressCallback(receivedBytes, totalBytes);
    });
    
    fileStream.on('finish', () => {
      fileStream.close();
      if (event) {
        event.sender.send('download-complete', { 
          path: targetPath,
          filename: path.basename(targetPath)
        });
      }
    });
    
    fileStream.on('error', (err) => {
      fs.unlink(targetPath, () => {}); // Delete the file on error
      if (event) {
        event.sender.send('download-error', { error: err.message });
      }
    });
  });
  
  request.on('error', (err) => {
    if (event) {
      event.sender.send('download-error', { error: err.message });
    }
  });
  
  request.end();
}

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});