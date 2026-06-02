import { app } from 'electron'
import { join } from 'path'

export function getResourcesPath(...segments: string[]): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'resources', ...segments)
  }

  return join(app.getAppPath(), 'resources', ...segments)
}

export function getTrayIconPath(): string {
  return getResourcesPath('tray.png')
}

export function getAppIconPath(): string {
  if (process.platform === 'win32') {
    return getResourcesPath('icon.ico')
  }
  return getResourcesPath('icon.png')
}
