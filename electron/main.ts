import { config as loadDotenv } from 'dotenv'
import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { onAppReady, onWillQuit } from './runtime'
import { createSettingsWindow } from './windows'

for (const envPath of [join(process.cwd(), '.env'), join(__dirname, '../../.env')]) {
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath })
    break
  }
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
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
