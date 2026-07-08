import { config as loadDotenv } from 'dotenv'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'
import { onAppReady, onWillQuit } from './runtime'
import { appState } from './windows'

if (process.platform === 'win32') {
  app.setAppUserModelId('com.demol.app')
}

function loadEnvFiles(): void {
  const candidates = [
    join(process.cwd(), '.env'),
    join(dirname(process.execPath), '.env'),
    join(app.getAppPath(), '.env'),
    join(__dirname, '../../.env')
  ]
  for (const envPath of candidates) {
    if (existsSync(envPath)) {
      loadDotenv({ path: envPath, override: false })
    }
  }
}

loadEnvFiles()

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // If the settings window is already open, just bring it to front.
    // Never open a new window automatically — use the tray icon instead.
    if (appState.settingsWindow && !appState.settingsWindow.isDestroyed()) {
      if (appState.settingsWindow.isMinimized()) appState.settingsWindow.restore()
      appState.settingsWindow.focus()
    }
  })

  app.whenReady().then(() => onAppReady())

  app.on('will-quit', () => {
    onWillQuit()
  })

  app.on('window-all-closed', () => {
    // Keep running in tray
  })
}
