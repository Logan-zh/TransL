import { join } from 'path'
import type { BrowserWindow } from 'electron'
import { BrowserWindow as BrowserWindowClass, screen } from 'electron'
import type { TextOverlayBlock } from '@transl/shared'
import {
  assignTranslationToBlocks,
  compositeTranslationOnImage
} from './services/image-overlay'
import { isScreenshotPickerOpen } from './services/screenshot-picker'
import { getAppIconPath } from './services/icon-path'
import { APP_NAME } from './services/brand'
import { IPC } from './services/ipc-channels'
import type { OverlayMode } from './services/config'

export const OVERLAY_WIDTH = 420
export const OVERLAY_MAX_HEIGHT = 460
export const SELECTION_TRIGGER_BTN = 32
export const SELECTION_TRIGGER_GAP = 4
export const SELECTION_TRIGGER_WIDTH = SELECTION_TRIGGER_BTN * 2 + SELECTION_TRIGGER_GAP
export const SELECTION_TRIGGER_HEIGHT = SELECTION_TRIGGER_BTN
export const CURSOR_OFFSET = 16

export const appState = {
  overlayWindow: null as BrowserWindow | null,
  selectionTriggerWindow: null as BrowserWindow | null,
  settingsWindow: null as BrowserWindow | null,
  loginWindow: null as BrowserWindow | null,
  isTranslating: false,
  suppressOverlayBlur: false,
  overlayDragLock: false,
  lastOverlayImageDataUrl: undefined as string | undefined,
  lastScreenshotNativeImage: null as Electron.NativeImage | null,
  lastImageBlockLayout: null as TextOverlayBlock[] | null
}

export async function buildScreenshotDisplayImage(
  sourceImage: Electron.NativeImage,
  blocks: TextOverlayBlock[]
): Promise<Electron.NativeImage> {
  try {
    return await compositeTranslationOnImage(sourceImage, blocks)
  } catch (error) {
    console.error('[DEMOL] image overlay failed:', error)
    return sourceImage
  }
}

export function clampOverlayPosition(x: number, y: number): { x: number; y: number } {
  const display = screen.getDisplayNearestPoint({ x, y })
  const { x: workX, y: workY, width: workWidth, height: workHeight } = display.workArea

  return {
    x: Math.max(workX, Math.min(x, workX + workWidth - OVERLAY_WIDTH)),
    y: Math.max(workY, Math.min(y, workY + workHeight - OVERLAY_MAX_HEIGHT))
  }
}

/** 視窗左上角：預設在錨點（通常為滑鼠）右下方 */
export function getOverlayPosition(anchor?: { x: number; y: number }): { x: number; y: number } {
  const cursor = anchor ?? screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const { x: workX, y: workY, width: workWidth, height: workHeight } = display.workArea

  let x = cursor.x + CURSOR_OFFSET
  let y = cursor.y + CURSOR_OFFSET

  if (x + OVERLAY_WIDTH > workX + workWidth) {
    x = cursor.x - OVERLAY_WIDTH - CURSOR_OFFSET
  }

  // 下方空間不足時向上平移貼齊工作區底部，避免整窗翻到游標上方而離選取處太遠
  if (y + OVERLAY_MAX_HEIGHT > workY + workHeight) {
    y = workY + workHeight - OVERLAY_MAX_HEIGHT
  }

  return clampOverlayPosition(x, y)
}

export function createOverlayWindow(): BrowserWindow {
  if (appState.overlayWindow && !appState.overlayWindow.isDestroyed()) {
    return appState.overlayWindow
  }

  appState.overlayWindow = new BrowserWindowClass({
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

  appState.overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  appState.overlayWindow.setMinimumSize(OVERLAY_WIDTH, 80)
  appState.overlayWindow.setMaximumSize(OVERLAY_WIDTH, OVERLAY_MAX_HEIGHT)

  if (process.env.ELECTRON_RENDERER_URL) {
    appState.overlayWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/overlay/index.html`)
  } else {
    appState.overlayWindow.loadFile(join(__dirname, '../renderer/overlay/index.html'))
  }

  appState.overlayWindow.on('blur', () => {
    if (appState.suppressOverlayBlur || appState.overlayDragLock) {
      return
    }
    hideOverlayWindow()
  })

  appState.overlayWindow.on('closed', () => {
    appState.overlayWindow = null
  })

  return appState.overlayWindow
}

function createSelectionTriggerWindow(): BrowserWindow {
  if (appState.selectionTriggerWindow && !appState.selectionTriggerWindow.isDestroyed()) {
    return appState.selectionTriggerWindow
  }

  appState.selectionTriggerWindow = new BrowserWindowClass({
    width: SELECTION_TRIGGER_WIDTH,
    height: SELECTION_TRIGGER_HEIGHT,
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

  appState.selectionTriggerWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (process.env.ELECTRON_RENDERER_URL) {
    appState.selectionTriggerWindow.loadURL(
      `${process.env.ELECTRON_RENDERER_URL}/selection-trigger/index.html`
    )
  } else {
    appState.selectionTriggerWindow.loadFile(
      join(__dirname, '../renderer/selection-trigger/index.html')
    )
  }

  appState.selectionTriggerWindow.on('closed', () => {
    appState.selectionTriggerWindow = null
  })

  return appState.selectionTriggerWindow
}

export function hideSelectionTriggerWindow(): void {
  if (appState.selectionTriggerWindow && !appState.selectionTriggerWindow.isDestroyed()) {
    appState.selectionTriggerWindow.hide()
  }
}

function clampSelectionTriggerPosition(x: number, y: number): { x: number; y: number } {
  const display = screen.getDisplayNearestPoint({ x, y })
  const area = display.workArea
  let px = x + 10
  let py = y + 8

  px = Math.max(area.x, Math.min(px, area.x + area.width - SELECTION_TRIGGER_WIDTH))
  py = Math.max(area.y, Math.min(py, area.y + area.height - SELECTION_TRIGGER_HEIGHT))

  return { x: px, y: py }
}

export function showSelectionTriggerWindow(x: number, y: number): void {
  const win = createSelectionTriggerWindow()
  const position = clampSelectionTriggerPosition(x, y)

  win.setBounds({
    x: position.x,
    y: position.y,
    width: SELECTION_TRIGGER_WIDTH,
    height: SELECTION_TRIGGER_HEIGHT
  })
  win.showInactive()
}

export function isPointerOverSelectionTrigger(x: number, y: number): boolean {
  if (
    !appState.selectionTriggerWindow ||
    appState.selectionTriggerWindow.isDestroyed() ||
    !appState.selectionTriggerWindow.isVisible()
  ) {
    return false
  }

  const bounds = appState.selectionTriggerWindow.getBounds()
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
  )
}

export function isSelectionListenerBlocked(): boolean {
  if (appState.isTranslating) {
    return true
  }

  if (
    appState.overlayWindow &&
    !appState.overlayWindow.isDestroyed() &&
    appState.overlayWindow.isVisible()
  ) {
    return true
  }

  if (isScreenshotPickerOpen()) {
    return true
  }

  if (appState.loginWindow && !appState.loginWindow.isDestroyed() && appState.loginWindow.isFocused()) {
    return true
  }

  if (
    appState.settingsWindow &&
    !appState.settingsWindow.isDestroyed() &&
    appState.settingsWindow.isFocused()
  ) {
    return true
  }

  return false
}

export function createLoginWindow(): BrowserWindow {
  if (appState.loginWindow && !appState.loginWindow.isDestroyed()) {
    appState.loginWindow.focus()
    return appState.loginWindow
  }

  appState.loginWindow = new BrowserWindowClass({
    width: 420,
    height: 480,
    show: false,
    autoHideMenuBar: true,
    title: `${APP_NAME} 登入`,
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
    appState.loginWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/login/index.html`)
  } else {
    appState.loginWindow.loadFile(join(__dirname, '../renderer/login/index.html'))
  }

  appState.loginWindow.once('ready-to-show', () => {
    appState.loginWindow?.show()
  })

  appState.loginWindow.on('closed', () => {
    appState.loginWindow = null
  })

  return appState.loginWindow
}

export function createSettingsWindow(): BrowserWindow {
  if (appState.settingsWindow && !appState.settingsWindow.isDestroyed()) {
    appState.settingsWindow.focus()
    return appState.settingsWindow
  }

  appState.settingsWindow = new BrowserWindowClass({
    width: 560,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    title: `${APP_NAME} 設定`,
    icon: getAppIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    appState.settingsWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/settings/index.html`)
  } else {
    appState.settingsWindow.loadFile(join(__dirname, '../renderer/settings/index.html'))
  }

  appState.settingsWindow.once('ready-to-show', () => {
    appState.settingsWindow?.show()
  })

  appState.settingsWindow.on('closed', () => {
    appState.settingsWindow = null
  })

  return appState.settingsWindow
}

export function hideOverlayWindow(): void {
  if (appState.overlayWindow && !appState.overlayWindow.isDestroyed()) {
    appState.overlayWindow.hide()
  }
}

export function showOverlayLoading(
  original: string,
  message?: string,
  reposition = true,
  mode: OverlayMode = 'translate',
  anchor?: { x: number; y: number }
): void {
  const win = createOverlayWindow()

  if (!win.isVisible() || reposition) {
    const { x, y } = getOverlayPosition(anchor)
    win.setBounds({ x, y, width: OVERLAY_WIDTH, height: OVERLAY_MAX_HEIGHT })
  }

  win.webContents.send(IPC.TRANSLATE_LOADING, { original, message, mode })

  if (win.isVisible()) {
    win.focus()
  } else {
    win.show()
    win.focus()
  }
}

export function showOverlayResult(
  original: string,
  translation: string,
  imageDataUrl?: string,
  mode: OverlayMode = 'translate'
): void {
  if (imageDataUrl !== undefined) {
    appState.lastOverlayImageDataUrl = imageDataUrl
  }
  const win = createOverlayWindow()
  win.webContents.send(IPC.TRANSLATE_RESULT, {
    original,
    translation,
    imageDataUrl: imageDataUrl ?? appState.lastOverlayImageDataUrl,
    mode
  })
}

export function showOverlayError(message: string): void {
  const win = createOverlayWindow()
  win.webContents.send(IPC.TRANSLATE_ERROR, { message })
}

export function assignScreenshotBlockTranslations(
  translation: string
): TextOverlayBlock[] {
  return assignTranslationToBlocks(
    (appState.lastImageBlockLayout ?? []).map((block) => ({ ...block, translation: '' })),
    translation
  )
}
