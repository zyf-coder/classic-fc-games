const { app, BrowserWindow, session, shell, globalShortcut } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, '..', 'app', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // ESC 键退出游戏（回到选择页面）
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && input.type === 'keyDown') {
      win.webContents.executeJavaScript(`
        if (typeof goBack === 'function') {
          goBack();
        } else if (typeof exitGame === 'function') {
          exitGame();
        } else {
          // 尝试点击退出按钮
          var exitBtn = document.getElementById('exitBtn');
          if (exitBtn) exitBtn.click();
          // 或者回到游戏选择页面
          var gameSelectPage = document.getElementById('gameSelectPage');
          if (gameSelectPage) {
            document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
            gameSelectPage.classList.add('active');
          }
        }
      `);
    }
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media' || permission === 'notifications');
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
