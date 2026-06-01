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
  onCheckUpdate: () => void
  onQuit: () => void
}

export function createTray(handlers: TrayHandlers): Tray {
  if (tray) {
    return tray
  }

  tray = new Tray(getTrayIcon())
  tray.setToolTip('TransL — 可在設定中自訂快捷鍵')

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
    {
      label: '檢查更新',
      click: handlers.onCheckUpdate
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
