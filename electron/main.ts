import { config as loadDotenv } from 'dotenv'
import { existsSync } from 'fs'
import { join } from 'path'
import {
  app,
  BrowserWindow,
  clipboard,
  ipcMain,
  screen,
  dialog
} from 'electron'

for (const envPath of [join(process.cwd(), '.env'), join(__dirname, '../../.env')]) {
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath })
    break
  }
}
import { getTextFromClipboard } from './services/clipboard-text'
import { copySelectedTextFromTarget } from './services/copy-selection'
import { startDoubleCopyListener, stopDoubleCopyListener, setDoubleCopySuppressed } from './services/double-copy'
import { captureHotkeyBinding } from './services/hotkey-capture'
import { applyHotkeys, stopAllHotkeys, validateHotkeys } from './services/hotkey-manager'
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
  isScreenshotPickerOpen,
  openScreenshotPicker
} from './services/screenshot-picker'
import {
  startSelectionListener,
  stopSelectionListener
} from './services/selection-listener'
import type { ScreenRect } from './services/config'
import { createTranslationProvider } from './services/translation'
import type { OverlayMode, RetoneOption, SessionInfo, TranslationTone } from './services/config'
import { getSettings, saveSettings, applyStoredAutoLaunch, hasLegacyApiKeys } from './services/settings-store'
import { DEFAULT_HOTKEYS } from './services/config'
import { hasStoredSession } from './services/auth-store'
import {
  ensureAuthenticated,
  getProfile,
  login as apiLogin,
  logout as apiLogout,
  suggestReplyApi
} from './services/api-client'
import { createTray, destroyTray, showTrayBalloon } from './services/tray'
import { getAppIconPath } from './services/icon-path'
import { captureTargetWindow, clearTargetWindow } from './services/window-focus'
import { checkForDesktopUpdate } from './services/release-check'

const OVERLAY_WIDTH = 420
const OVERLAY_MAX_HEIGHT = 460
const SELECTION_TRIGGER_SIZE = 32
const CURSOR_OFFSET = 16

let overlayWindow: BrowserWindow | null = null
let selectionTriggerWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let loginWindow: BrowserWindow | null = null
let isTranslating = false
let suppressOverlayBlur = false
let overlayDragLock = false
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
    movable: true,
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
    if (suppressOverlayBlur || overlayDragLock) {
      return
    }
    hideOverlayWindow()
  })

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })

  return overlayWindow
}

function createSelectionTriggerWindow(): BrowserWindow {
  if (selectionTriggerWindow && !selectionTriggerWindow.isDestroyed()) {
    return selectionTriggerWindow
  }

  selectionTriggerWindow = new BrowserWindow({
    width: SELECTION_TRIGGER_SIZE,
    height: SELECTION_TRIGGER_SIZE,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: true,
    hasShadow: false,
    type: 'toolbar',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  selectionTriggerWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (process.env.ELECTRON_RENDERER_URL) {
    selectionTriggerWindow.loadURL(
      `${process.env.ELECTRON_RENDERER_URL}/selection-trigger/index.html`
    )
  } else {
    selectionTriggerWindow.loadFile(join(__dirname, '../renderer/selection-trigger/index.html'))
  }

  selectionTriggerWindow.on('closed', () => {
    selectionTriggerWindow = null
  })

  return selectionTriggerWindow
}

function hideSelectionTriggerWindow(): void {
  if (selectionTriggerWindow && !selectionTriggerWindow.isDestroyed()) {
    selectionTriggerWindow.hide()
  }
}

function clampSelectionTriggerPosition(x: number, y: number): { x: number; y: number } {
  const display = screen.getDisplayNearestPoint({ x, y })
  const area = display.workArea
  const size = SELECTION_TRIGGER_SIZE

  let px = x + 10
  let py = y - size - 8

  px = Math.max(area.x, Math.min(px, area.x + area.width - size))
  py = Math.max(area.y, Math.min(py, area.y + area.height - size))

  return { x: px, y: py }
}

function showSelectionTriggerWindow(x: number, y: number): void {
  const win = createSelectionTriggerWindow()
  const position = clampSelectionTriggerPosition(x, y)

  win.setBounds({
    x: position.x,
    y: position.y,
    width: SELECTION_TRIGGER_SIZE,
    height: SELECTION_TRIGGER_SIZE
  })
  win.showInactive()
}

function isPointerOverSelectionTrigger(x: number, y: number): boolean {
  if (
    !selectionTriggerWindow ||
    selectionTriggerWindow.isDestroyed() ||
    !selectionTriggerWindow.isVisible()
  ) {
    return false
  }

  const bounds = selectionTriggerWindow.getBounds()
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
  )
}

function isSelectionListenerBlocked(): boolean {
  if (isTranslating) {
    return true
  }

  if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
    return true
  }

  if (isScreenshotPickerOpen()) {
    return true
  }

  if (loginWindow && !loginWindow.isDestroyed() && loginWindow.isFocused()) {
    return true
  }

  if (settingsWindow && !settingsWindow.isDestroyed() && settingsWindow.isFocused()) {
    return true
  }

  return false
}

function createLoginWindow(): BrowserWindow {
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.focus()
    return loginWindow
  }

  loginWindow = new BrowserWindow({
    width: 420,
    height: 480,
    show: false,
    autoHideMenuBar: true,
    title: 'TransL 登入',
    icon: getAppIconPath(),
    resizable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    loginWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/login/index.html`)
  } else {
    loginWindow.loadFile(join(__dirname, '../renderer/login/index.html'))
  }

  loginWindow.once('ready-to-show', () => {
    loginWindow?.show()
  })

  loginWindow.on('closed', () => {
    loginWindow = null
  })

  return loginWindow
}

function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return settingsWindow
  }

  settingsWindow = new BrowserWindow({
    width: 560,
    height: 720,
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

async function getSessionInfo(): Promise<SessionInfo> {
  const legacyApiKeyDetected = hasLegacyApiKeys()
  if (!hasStoredSession()) {
    return { loggedIn: false, profile: null, legacyApiKeyDetected }
  }
  try {
    await ensureAuthenticated()
    const profile = await getProfile()
    return { loggedIn: true, profile, legacyApiKeyDetected }
  } catch {
    return { loggedIn: false, profile: null, legacyApiKeyDetected }
  }
}

function notifySettingsSessionChanged(): void {
  void getSessionInfo().then((session) => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send('session:changed', session)
    }
  })
}

function showOverlayLoading(
  original: string,
  message?: string,
  reposition = true,
  mode: OverlayMode = 'translate'
): void {
  const win = createOverlayWindow()

  if (reposition || !win.isVisible()) {
    const { x, y } = getOverlayPosition()
    win.setBounds({ x, y, width: OVERLAY_WIDTH, height: OVERLAY_MAX_HEIGHT })
  }

  win.webContents.send('translate:loading', { original, message, mode })

  if (win.isVisible()) {
    win.focus()
  } else {
    win.show()
    win.focus()
  }
}

function showOverlayResult(
  original: string,
  translation: string,
  imageDataUrl?: string,
  mode: OverlayMode = 'translate'
): void {
  if (imageDataUrl !== undefined) {
    lastOverlayImageDataUrl = imageDataUrl
  }
  const win = createOverlayWindow()
  win.webContents.send('translate:result', {
    original,
    translation,
    imageDataUrl: imageDataUrl ?? lastOverlayImageDataUrl,
    mode
  })
}

function showOverlayError(message: string): void {
  const win = createOverlayWindow()
  win.webContents.send('translate:error', { message })
}

async function translateText(original: string, tone: TranslationTone = 'default'): Promise<string> {
  await ensureAuthenticated()
  const direction = detectTranslationDirection(original)
  const provider = createTranslationProvider()
  return provider.translate(original, direction, tone)
}

async function handleTranslateOverlay(
  prefilledText?: string,
  reposition = true
): Promise<void> {
  if (isTranslating) {
    return
  }

  hideSelectionTriggerWindow()
  isTranslating = true
  captureTargetWindow()
  lastOverlayImageDataUrl = undefined
  lastScreenshotNativeImage = null
  lastImageBlockLayout = null
  showOverlayLoading('', undefined, reposition)

  try {
    const selectedText = prefilledText ?? (await getTextFromClipboard())
    showOverlayLoading(selectedText, undefined, reposition)

    const translation = await translateText(selectedText)
    showOverlayResult(selectedText, translation)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    showOverlayError(message)
  } finally {
    isTranslating = false
  }
}

async function handleDoubleCopyTranslate(): Promise<void> {
  await handleTranslateOverlay()
}

async function handleSelectionIconTranslate(): Promise<void> {
  hideSelectionTriggerWindow()

  if (isTranslating) {
    return
  }

  setDoubleCopySuppressed(true)
  let clipboardBackup = ''

  try {
    const copied = await copySelectedTextFromTarget()
    clipboardBackup = copied.clipboardBackup
    restoreClipboardText(clipboardBackup)
    await handleTranslateOverlay(copied.text)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    showOverlayLoading('')
    showOverlayError(message)
  } finally {
    setDoubleCopySuppressed(false)
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

async function handleDoubleCtrlQReplySuggest(): Promise<void> {
  if (isTranslating) {
    return
  }

  hideSelectionTriggerWindow()
  isTranslating = true
  captureTargetWindow()
  setDoubleCopySuppressed(true)
  lastOverlayImageDataUrl = undefined
  lastScreenshotNativeImage = null
  lastImageBlockLayout = null
  let clipboardBackup = ''

  try {
    const copied = await copySelectedTextFromTarget()
    clipboardBackup = copied.clipboardBackup
    restoreClipboardText(clipboardBackup)

    showOverlayLoading(copied.text, '思考回覆中…', true, 'reply')

    await ensureAuthenticated()
    const suggestion = await suggestReplyApi(copied.text)
    showOverlayResult(copied.text, suggestion, undefined, 'reply')
  } catch (error) {
    if (clipboardBackup) {
      restoreClipboardText(clipboardBackup)
    }
    const message = error instanceof Error ? error.message : String(error)
    showOverlayError(message)
  } finally {
    setDoubleCopySuppressed(false)
    clearTargetWindow()
    isTranslating = false
  }
}

async function handleDoubleCtrlDTranslatePaste(): Promise<void> {
  if (isTranslating) {
    return
  }

  hideSelectionTriggerWindow()
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
  hideSelectionTriggerWindow()

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

    await ensureAuthenticated()
    const provider = createTranslationProvider()
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
    const hotkeys = getSettings().hotkeys
    const conflict = validateHotkeys(hotkeys)
    if (conflict) {
      dialog.showErrorBox('快捷鍵設定無效', `${conflict}\n\n已改為預設快捷鍵。`)
      saveSettings({ hotkeys: DEFAULT_HOTKEYS })
    }

    applyHotkeys(getSettings().hotkeys, {
      translateOverlay: () => void handleTranslateOverlay(),
      translatePaste: () => void handleDoubleCtrlDTranslatePaste(),
      replySuggest: () => void handleDoubleCtrlQReplySuggest(),
      screenshotTranslate: () => void handleScreenshotTranslate()
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

  ipcMain.on('overlay:drag-start', () => {
    overlayDragLock = true
  })

  ipcMain.on('overlay:drag-end', () => {
    overlayDragLock = false
  })

  ipcMain.handle('overlay:get-position', () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) {
      return [0, 0] as [number, number]
    }
    return overlayWindow.getPosition() as [number, number]
  })

  ipcMain.handle('overlay:set-position', (_event, x: number, y: number) => {
    if (!overlayWindow || overlayWindow.isDestroyed()) {
      return
    }
    overlayWindow.setPosition(Math.round(x), Math.round(y))
  })

  ipcMain.on('selection:activate', () => {
    void handleSelectionIconTranslate()
  })

  ipcMain.handle('overlay:paste', async (_event, text: string) => {
    await handlePasteTranslation(text)
  })

  ipcMain.handle('overlay:retone', async (_event, payload: { original: string; tone: RetoneOption }) => {
    await handleRetone(payload.original, payload.tone)
  })

  ipcMain.handle('settings:get', () => getSettings())

  ipcMain.handle('app:version', () => app.getVersion())

  ipcMain.handle('settings:save', (_event, partial) => {
    const saved = saveSettings(partial)
    const conflict = partial.hotkeys ? validateHotkeys(saved.hotkeys) : null
    if (conflict) {
      throw new Error(conflict)
    }
    setupKeyboardListeners()
    return saved
  })

  ipcMain.handle('hotkey:capture', async () => {
    return captureHotkeyBinding()
  })

  ipcMain.handle('auth:session', () => getSessionInfo())

  ipcMain.handle('auth:login', async (_event, payload: { username: string; password: string }) => {
    const profile = await apiLogin(payload.username, payload.password)
    if (loginWindow && !loginWindow.isDestroyed()) {
      loginWindow.close()
    }
    notifySettingsSessionChanged()
    if (!profile.provider) {
      showTrayBalloon('TransL', '登入成功，但尚未指派翻譯服務，請聯絡管理員。')
    } else {
      showTrayBalloon('TransL', `歡迎 ${profile.username}，翻譯功能已就緒。`)
    }
    return profile
  })

  ipcMain.handle('auth:logout', async () => {
    apiLogout()
    notifySettingsSessionChanged()
  })

  ipcMain.on('auth:open-login', () => {
    createLoginWindow()
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
      void handleTranslateOverlay()
    },
    onOpenSettings: () => {
      createSettingsWindow()
    },
    onReloadListener: () => {
      setupKeyboardListeners()
      showTrayBalloon('TransL', '快捷鍵監聽已重新載入')
    },
    onCheckUpdate: () => {
      void checkForDesktopUpdate()
    },
    onQuit: () => {
      app.quit()
    }
  })

  setupKeyboardListeners()

  startSelectionListener({
    onSelectionGesture: ({ x, y }) => {
      showSelectionTriggerWindow(x, y)
    },
    onPointerDown: () => {
      const cursor = screen.getCursorScreenPoint()
      if (isPointerOverSelectionTrigger(cursor.x, cursor.y)) {
        return
      }
      if (selectionTriggerWindow?.isVisible()) {
        hideSelectionTriggerWindow()
      }
    },
    isBlocked: () => isSelectionListenerBlocked(),
    isPointerOverTrigger: (x, y) => isPointerOverSelectionTrigger(x, y)
  })

  showTrayBalloon(
    'TransL 已啟動',
    '選取文字後可點旁邊圖示翻譯；浮動窗可拖曳標題列移動'
  )
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    createSettingsWindow()
  })

  app.whenReady().then(async () => {
    applyStoredAutoLaunch()
    setupApp()

    // 延後檢查，避免登入視窗搶焦點；silent 僅略過「已是最新／連線失敗」提示
    setTimeout(() => {
      void checkForDesktopUpdate({ silent: true })
    }, 3000)

    if (!hasStoredSession()) {
      createLoginWindow()
      return
    }

    try {
      await ensureAuthenticated()
      const profile = await getProfile()
      if (!profile.provider) {
        showTrayBalloon('TransL', '尚未指派翻譯服務，請聯絡管理員後再使用翻譯功能。')
      }
    } catch {
      createLoginWindow()
    }
  })

  app.on('will-quit', () => {
    stopAllHotkeys()
    stopSelectionListener()
    cancelScreenshotPicker()
    destroyTray()
  })

  app.on('window-all-closed', () => {
    // Keep running in tray
  })
}
