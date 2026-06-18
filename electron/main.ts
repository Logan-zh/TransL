import { config as loadDotenv } from 'dotenv'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'
import { onAppReady, onWillQuit } from './runtime'
import { createSettingsWindow } from './windows'
import { isSilentStartup } from './services/silent-startup'

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
    if (isSilentStartup()) return
    createSettingsWindow()
  })

  app.whenReady().then(() => onAppReady())

  app.on('will-quit', () => {
    onWillQuit()
  })

  app.on('window-all-closed', () => {
    // Keep running in tray
  })
}
