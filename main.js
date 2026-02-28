const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 450,
    height: 600,
    backgroundColor: '#121212', // Тёмный фон
    webPreferences: {
      // Для безопасности выключаем интеграцию Node.js в интерфейсе
      // Вся работа с API будет идти через обычный браузерный fetch
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.loadFile('index.html');
  
  // Убираем верхнее меню (Файл, Правка и т.д.) для минимализма
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});