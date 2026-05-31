import { Menu, Tray, nativeImage } from 'electron'
import { getTrayIconPath } from './icon-path'

let tray: Tray | null = null

function getTrayIcon(): Electron.NativeImage {
  const icon = nativeImage.createFromPath(getTrayIconPath())
  if (icon.isEmpty()) {
    return nativeImage.createFromPath(getTrayIconPath().replace('tray.png', 'icon.png'))
  }
  return icon
}

export interface TrayHandlers {
  onOpenSettings: () => void
  onTranslateClipboard: () => void
  onReloadListener: () => void
  onQuit: () => void
}

export function createTray(handlers: TrayHandlers): Tray {
  if (tray) {
    return tray
  }

  tray = new Tray(getTrayIcon())
  tray.setToolTip('TransL — 按住 Ctrl 在 0.8 秒內連按兩次 C')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '翻譯目前剪貼簿',
      click: handlers.onTranslateClipboard
    },
    {
      label: '設定',
      click: handlers.onOpenSettings
    },
    {
      label: '重新載入監聽',
      click: handlers.onReloadListener
    },
    { type: 'separator' },
    {
      label: '結束',
      click: handlers.onQuit
    }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('double-click', handlers.onOpenSettings)

  return tray
}

export function showTrayBalloon(title: string, content: string): void {
  if (!tray) {
    return
  }

  tray.displayBalloon({ title, content, icon: getTrayIcon() })
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
