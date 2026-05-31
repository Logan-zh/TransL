import {
  app,
  BrowserWindow,
  clipboard,
  ipcMain,
  screen,
  dialog
} from 'electron'
import { join } from 'path'
import { getTextFromClipboard } from './services/clipboard-text'
import { copySelectedTextFromTarget } from './services/copy-selection'
import { startDoubleCopyListener, stopDoubleCopyListener, setDoubleCopySuppressed } from './services/double-copy'
import { startDoubleCtrlDListener, stopDoubleCtrlDListener } from './services/double-ctrl-d'
import { startDoubleCtrlAltSListener, stopDoubleCtrlAltSListener } from './services/double-ctrl-alt-s'
import { detectTranslationDirection } from './services/language'
import { pasteTranslation } from './services/paste'
import { restoreClipboardText } from './services/clipboard'
import { captureScreenRegion } from './services/screen-capture'
import {
  assignTranslationToBlocks,
  compositeTranslationOnImage
} from './services/image-overlay'
import type { TextOverlayBlock } from './services/translation/types'
import {
  cancelScreenshotPicker,
  completeScreenshotPicker,
  openScreenshotPicker
} from './services/screenshot-picker'
import type { ScreenRect } from './services/config'
import { createTranslationProvider } from './services/translation'
import type { RetoneOption, TranslationTone } from './services/config'
import { getSettings, saveSettings, applyStoredAutoLaunch } from './services/settings-store'
import { createTray, destroyTray, showTrayBalloon } from './services/tray'
import { getAppIconPath } from './services/icon-path'
import { captureTargetWindow, clearTargetWindow } from './services/window-focus'

const OVERLAY_WIDTH = 420
const OVERLAY_MAX_HEIGHT = 460
const CURSOR_OFFSET = 16

let overlayWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let isTranslating = false
let suppressOverlayBlur = false
let lastOverlayImageDataUrl: string | undefined
let lastScreenshotNativeImage: Electron.NativeImage | null = null
let lastImageBlockLayout: TextOverlayBlock[] | null = null

async function buildScreenshotDisplayImage(
  sourceImage: Electron.NativeImage,
  blocks: TextOverlayBlock[]
): Promise<Electron.NativeImage> {
  try {
    return await compositeTranslationOnImage(sourceImage, blocks)
  } catch (error) {
    console.error('[TransL] image overlay failed:', error)
    return sourceImage
  }
}

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
    if (suppressOverlayBlur) {
      return
    }
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

function showOverlayLoading(original: string, message?: string, reposition = true): void {
  const win = createOverlayWindow()

  if (reposition || !win.isVisible()) {
    const { x, y } = getOverlayPosition()
    win.setBounds({ x, y, width: OVERLAY_WIDTH, height: OVERLAY_MAX_HEIGHT })
  }

  win.webContents.send('translate:loading', { original, message })

  if (win.isVisible()) {
    win.focus()
  } else {
    win.show()
    win.focus()
  }
}

function showOverlayResult(original: string, translation: string, imageDataUrl?: string): void {
  if (imageDataUrl !== undefined) {
    lastOverlayImageDataUrl = imageDataUrl
  }
  const win = createOverlayWindow()
  win.webContents.send('translate:result', {
    original,
    translation,
    imageDataUrl: imageDataUrl ?? lastOverlayImageDataUrl
  })
}

function showOverlayError(message: string): void {
  const win = createOverlayWindow()
  win.webContents.send('translate:error', { message })
}

async function translateText(original: string, tone: TranslationTone = 'default'): Promise<string> {
  const direction = detectTranslationDirection(original)
  const settings = getSettings()
  const provider = createTranslationProvider(settings)
  return provider.translate(original, direction, tone)
}

async function handleDoubleCopyTranslate(): Promise<void> {
  if (isTranslating) {
    return
  }

  isTranslating = true
  captureTargetWindow()
  lastOverlayImageDataUrl = undefined
  lastScreenshotNativeImage = null
  lastImageBlockLayout = null
  showOverlayLoading('')

  try {
    const selectedText = await getTextFromClipboard()
    showOverlayLoading(selectedText)

    const translation = await translateText(selectedText)
    showOverlayResult(selectedText, translation)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    showOverlayError(message)
  } finally {
    isTranslating = false
  }
}

async function handleRetone(original: string, tone: RetoneOption): Promise<void> {
  if (isTranslating) {
    return
  }

  isTranslating = true
  showOverlayLoading(original, '調整語氣中…', false)

  try {
    const translation = await translateText(original, tone)

    if (lastScreenshotNativeImage && lastImageBlockLayout) {
      const blocks = assignTranslationToBlocks(
        lastImageBlockLayout.map((block) => ({ ...block, translation: '' })),
        translation
      )
      const composited = await buildScreenshotDisplayImage(lastScreenshotNativeImage, blocks)
      clipboard.writeImage(composited)
      showOverlayResult(original, translation, composited.toDataURL())
      return
    }

    showOverlayResult(original, translation)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    showOverlayError(message)
  } finally {
    isTranslating = false
  }
}

async function handleDoubleCtrlDTranslatePaste(): Promise<void> {
  if (isTranslating) {
    return
  }

  isTranslating = true
  captureTargetWindow()
  setDoubleCopySuppressed(true)
  let clipboardBackup = ''

  try {
    const copied = await copySelectedTextFromTarget()
    clipboardBackup = copied.clipboardBackup

    const translation = await translateText(copied.text)
    await pasteTranslation(translation)
    restoreClipboardText(clipboardBackup)
  } catch (error) {
    if (clipboardBackup) {
      restoreClipboardText(clipboardBackup)
    }
    const message = error instanceof Error ? error.message : String(error)
    dialog.showErrorBox('翻譯貼上失敗', message)
  } finally {
    setDoubleCopySuppressed(false)
    clearTargetWindow()
    isTranslating = false
  }
}

async function handleScreenshotTranslate(): Promise<void> {
  if (isTranslating) {
    return
  }

  hideOverlayWindow()

  const bounds = await openScreenshotPicker()
  if (!bounds || bounds.width < 10 || bounds.height < 10) {
    return
  }

  isTranslating = true
  setDoubleCopySuppressed(true)

  try {
    const image = await captureScreenRegion(bounds)
    clipboard.writeImage(image)

    showOverlayLoading('', '辨識並翻譯圖片中…')

    const settings = getSettings()
    const provider = createTranslationProvider(settings)
    const result = await provider.translateImage(image)

    lastScreenshotNativeImage = image
    lastImageBlockLayout = result.blocks

    const composited = await buildScreenshotDisplayImage(image, result.blocks)
    clipboard.writeImage(composited)

    showOverlayResult(result.original, result.translation, composited.toDataURL())
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    showOverlayError(message)
  } finally {
    setDoubleCopySuppressed(false)
    isTranslating = false
  }
}

async function handlePasteTranslation(text: string): Promise<void> {
  suppressOverlayBlur = true
  hideOverlayWindow()
  await new Promise((resolve) => setTimeout(resolve, 100))

  try {
    await pasteTranslation(text)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    dialog.showErrorBox('貼上失敗', message)
  } finally {
    suppressOverlayBlur = false
    clearTargetWindow()
  }
}

function setupKeyboardListeners(): void {
  try {
    startDoubleCopyListener(() => {
      void handleDoubleCopyTranslate()
    })
    startDoubleCtrlDListener(() => {
      void handleDoubleCtrlDTranslatePaste()
    })
    startDoubleCtrlAltSListener(() => {
      void handleScreenshotTranslate()
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[TransL] keyboard listener failed:', message)
    dialog.showErrorBox(
      '快捷鍵監聽啟動失敗',
      `無法啟動快捷鍵監聽，部分功能將無法使用。\n\n${message}`
    )
  }
}

function setupIpc(): void {
  ipcMain.on('overlay:close', () => {
    hideOverlayWindow()
  })

  ipcMain.handle('overlay:paste', async (_event, text: string) => {
    await handlePasteTranslation(text)
  })

  ipcMain.handle('overlay:retone', async (_event, payload: { original: string; tone: RetoneOption }) => {
    await handleRetone(payload.original, payload.tone)
  })

  ipcMain.handle('settings:get', () => getSettings())

  ipcMain.handle('settings:save', (_event, partial) => {
    return saveSettings(partial)
  })

  ipcMain.on('capture:complete', (_event, bounds: ScreenRect) => {
    completeScreenshotPicker(bounds)
  })

  ipcMain.on('capture:cancel', () => {
    cancelScreenshotPicker()
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
      setupKeyboardListeners()
      showTrayBalloon('TransL', '快捷鍵監聽已重新載入')
    },
    onQuit: () => {
      app.quit()
    }
  })

  setupKeyboardListeners()
  showTrayBalloon(
    'TransL 已啟動',
    'Ctrl 雙擊 C：翻譯｜Ctrl 雙擊 D：翻譯貼上｜Ctrl+Alt 雙擊 S：截圖翻譯'
  )
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    createSettingsWindow()
  })

  app.whenReady().then(() => {
    applyStoredAutoLaunch()
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
    stopDoubleCtrlDListener()
    stopDoubleCtrlAltSListener()
    cancelScreenshotPicker()
    destroyTray()
  })

  app.on('window-all-closed', () => {
    // Keep running in tray
  })
}
