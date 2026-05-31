import {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  dialog
} from 'electron'
import { join } from 'path'
import { getTextFromClipboard } from './services/clipboard-text'
import { startDoubleCopyListener, stopDoubleCopyListener } from './services/double-copy'
import { detectTranslationDirection } from './services/language'
import { createTranslationProvider } from './services/translation'
import { getSettings, saveSettings } from './services/settings-store'
import { createTray, destroyTray, showTrayBalloon } from './services/tray'
import { getAppIconPath } from './services/icon-path'

const OVERLAY_WIDTH = 420
const OVERLAY_MAX_HEIGHT = 320
const CURSOR_OFFSET = 16

let overlayWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let isTranslating = false

function getOverlayPosition(): { x: number; y: number } {
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const { x: workX, y: workY, width: workWidth, height: workHeight } = display.workArea

  let x = cursor.x + CURSOR_OFFSET
  let y = cursor.y + CURSOR_OFFSET

  if (x + OVERLAY_WIDTH > workX + workWidth) {
    x = cursor.x - OVERLAY_WIDTH - CURSOR_OFFSET
  }
  if (y + OVERLAY_MAX_HEIGHT > workY + workHeight) {
    y = cursor.y - OVERLAY_MAX_HEIGHT - CURSOR_OFFSET
  }

  x = Math.max(workX, Math.min(x, workX + workWidth - OVERLAY_WIDTH))
  y = Math.max(workY, Math.min(y, workY + workHeight - 80))

  return { x, y }
}

function createOverlayWindow(): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow
  }

  overlayWindow = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: OVERLAY_MAX_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: true,
    hasShadow: true,
    type: 'toolbar',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (process.env.ELECTRON_RENDERER_URL) {
    overlayWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/overlay/index.html`)
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/overlay/index.html'))
  }

  overlayWindow.on('blur', () => {
    hideOverlayWindow()
  })

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })

  return overlayWindow
}

function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return settingsWindow
  }

  settingsWindow = new BrowserWindow({
    width: 520,
    height: 520,
    show: false,
    autoHideMenuBar: true,
    title: 'TransL 設定',
    icon: getAppIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    settingsWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/settings/index.html`)
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/settings/index.html'))
  }

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show()
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  return settingsWindow
}

function hideOverlayWindow(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide()
  }
}

function showOverlayLoading(original: string): void {
  const win = createOverlayWindow()
  const { x, y } = getOverlayPosition()

  win.setBounds({ x, y, width: OVERLAY_WIDTH, height: OVERLAY_MAX_HEIGHT })
  win.webContents.send('translate:loading', { original })

  if (win.isVisible()) {
    win.focus()
  } else {
    win.show()
    win.focus()
  }
}

function showOverlayResult(original: string, translation: string): void {
  const win = createOverlayWindow()
  win.webContents.send('translate:result', { original, translation })
}

function showOverlayError(message: string): void {
  const win = createOverlayWindow()
  win.webContents.send('translate:error', { message })
}

async function handleDoubleCopyTranslate(): Promise<void> {
  if (isTranslating) {
    return
  }

  isTranslating = true
  showOverlayLoading('')

  try {
    const selectedText = await getTextFromClipboard()
    showOverlayLoading(selectedText)

    const direction = detectTranslationDirection(selectedText)
    const settings = getSettings()
    const provider = createTranslationProvider(settings)
    const translation = await provider.translate(selectedText, direction)

    showOverlayResult(selectedText, translation)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    showOverlayError(message)
  } finally {
    isTranslating = false
  }
}

function setupDoubleCopyListener(): void {
  try {
    startDoubleCopyListener(() => {
      void handleDoubleCopyTranslate()
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[TransL] keyboard listener failed:', message)
    dialog.showErrorBox(
      '剪貼簿監聽啟動失敗',
      `無法啟動剪貼簿監聽，雙擊 Ctrl+C 翻譯功能將無法使用。\n\n${message}`
    )
  }
}

function setupIpc(): void {
  ipcMain.on('overlay:close', () => {
    hideOverlayWindow()
  })

  ipcMain.handle('settings:get', () => getSettings())

  ipcMain.handle('settings:save', (_event, partial) => {
    return saveSettings(partial)
  })
}

function setupApp(): void {
  setupIpc()

  createTray({
    onTranslateClipboard: () => {
      void handleDoubleCopyTranslate()
    },
    onOpenSettings: () => {
      createSettingsWindow()
    },
    onReloadListener: () => {
      setupDoubleCopyListener()
      showTrayBalloon('TransL', '剪貼簿監聽已重新載入')
    },
    onQuit: () => {
      app.quit()
    }
  })

  setupDoubleCopyListener()
  showTrayBalloon('TransL 已啟動', '選取文字後，0.8 秒內連按兩次 Ctrl+C 即可翻譯')
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    createSettingsWindow()
  })

  app.whenReady().then(() => {
    setupApp()

    const settings = getSettings()
    const hasApiKey =
      (settings.provider === 'openai' && settings.openaiApiKey) ||
      (settings.provider === 'gemini' && settings.geminiApiKey)

    if (!hasApiKey) {
      createSettingsWindow()
    }
  })

  app.on('will-quit', () => {
    stopDoubleCopyListener()
    destroyTray()
  })

  app.on('window-all-closed', () => {
    // Keep running in tray
  })
}
