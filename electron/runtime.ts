import { app, dialog, ipcMain, screen } from 'electron'
import { captureHotkeyBinding } from './services/hotkey-capture'
import { applyHotkeys, stopAllHotkeys, validateHotkeys } from './services/hotkey-manager'
import {
  cancelScreenshotPicker,
  completeScreenshotPicker
} from './services/screenshot-picker'
import { startSelectionListener, stopSelectionListener } from './services/selection-listener'
import { getSettings, saveSettings, applyStoredAutoLaunch } from './services/settings-store'
import { DEFAULT_HOTKEYS, type RetoneOption, type ScreenRect, type TranslationTargetLang } from './services/config'
import { hasStoredSession } from './services/auth-store'
import { ensureAuthenticated, getProfile, login as apiLogin, logout as apiLogout } from './services/api-client'
import { createTray, destroyTray, showTrayBalloon } from './services/tray'
import { checkForDesktopUpdate } from './services/release-check'
import { IPC } from './services/ipc-channels'
import {
  getSessionInfo,
  handleDoubleCtrlDTranslatePaste,
  handleDoubleCtrlQReplySuggest,
  handlePasteTranslation,
  handleRetone,
  handleScreenshotTranslate,
  handleSelectionIconTranslate,
  handleTranslateOverlay,
  notifySettingsSessionChanged
} from './translation-handlers'
import {
  appState,
  createLoginWindow,
  createSettingsWindow,
  hideOverlayWindow,
  hideSelectionTriggerWindow,
  isPointerOverSelectionTrigger,
  isSelectionListenerBlocked,
  clampOverlayPosition,
  OVERLAY_MAX_HEIGHT,
  OVERLAY_WIDTH,
  showSelectionTriggerWindow
} from './windows'

function setupKeyboardListeners(): void {
  try {
    const hotkeys = getSettings().hotkeys
    const conflict = validateHotkeys(hotkeys)
    if (conflict) {
      dialog.showErrorBox('快捷鍵設定無效', `${conflict}\n\n已改為預設快捷鍵。`)
      saveSettings({ hotkeys: DEFAULT_HOTKEYS })
    }

    applyHotkeys(getSettings().hotkeys, {
      translateOverlay: () => {
        const anchor = screen.getCursorScreenPoint()
        void handleTranslateOverlay(undefined, true, anchor)
      },
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

function setupSelectionListener(): void {
  stopSelectionListener()
  hideSelectionTriggerWindow()

  if (!getSettings().showSelectionTrigger) {
    return
  }

  startSelectionListener({
    onSelectionGesture: ({ x, y }) => {
      showSelectionTriggerWindow(x, y)
    },
    onPointerDown: () => {
      const cursor = screen.getCursorScreenPoint()
      if (isPointerOverSelectionTrigger(cursor.x, cursor.y)) {
        return
      }
      if (appState.selectionTriggerWindow?.isVisible()) {
        hideSelectionTriggerWindow()
      }
    },
    isBlocked: () => isSelectionListenerBlocked(),
    isPointerOverTrigger: (x, y) => isPointerOverSelectionTrigger(x, y)
  })
}

function setupIpc(): void {
  ipcMain.on(IPC.OVERLAY_CLOSE, () => hideOverlayWindow())

  ipcMain.on(IPC.OVERLAY_DRAG_START, () => {
    appState.overlayDragLock = true
  })

  ipcMain.on(IPC.OVERLAY_DRAG_END, () => {
    appState.overlayDragLock = false
  })

  ipcMain.handle(IPC.OVERLAY_GET_POSITION, () => {
    if (!appState.overlayWindow || appState.overlayWindow.isDestroyed()) {
      return [0, 0] as [number, number]
    }
    return appState.overlayWindow.getPosition() as [number, number]
  })

  ipcMain.handle(IPC.OVERLAY_SET_POSITION, (_event, x: number, y: number) => {
    if (!appState.overlayWindow || appState.overlayWindow.isDestroyed()) {
      return
    }
    const bounds = appState.overlayWindow.getBounds()
    const height = Math.min(Math.max(bounds.height, 80), OVERLAY_MAX_HEIGHT)
    const clamped = clampOverlayPosition(Math.round(x), Math.round(y))
    appState.overlayWindow.setBounds({
      x: clamped.x,
      y: clamped.y,
      width: OVERLAY_WIDTH,
      height
    })
  })

  ipcMain.on(IPC.SELECTION_ACTIVATE, () => void handleSelectionIconTranslate())
  ipcMain.on(IPC.SELECTION_DISMISS, () => hideSelectionTriggerWindow())
  ipcMain.handle(IPC.OVERLAY_PASTE, async (_event, text: string) => handlePasteTranslation(text))

  ipcMain.handle(
    IPC.OVERLAY_RETONE,
    async (
      _event,
      payload: { original: string; tone?: RetoneOption; targetLang?: TranslationTargetLang }
    ) => {
      await handleRetone(payload.original, {
        tone: payload.tone,
        targetLang: payload.targetLang
      })
    }
  )

  ipcMain.handle(IPC.SETTINGS_GET, () => getSettings())
  ipcMain.handle(IPC.APP_VERSION, () => app.getVersion())

  ipcMain.handle(IPC.SETTINGS_SAVE, (_event, partial) => {
    const saved = saveSettings(partial)
    const conflict = partial.hotkeys ? validateHotkeys(saved.hotkeys) : null
    if (conflict) {
      throw new Error(conflict)
    }
    setupKeyboardListeners()
    setupSelectionListener()
    return saved
  })

  ipcMain.handle(IPC.HOTKEY_CAPTURE, () => captureHotkeyBinding())
  ipcMain.handle(IPC.AUTH_SESSION, () => getSessionInfo())

  ipcMain.handle(IPC.AUTH_LOGIN, async (_event, payload: { username: string; password: string }) => {
    const profile = await apiLogin(payload.username, payload.password)
    if (appState.loginWindow && !appState.loginWindow.isDestroyed()) {
      appState.loginWindow.close()
    }
    notifySettingsSessionChanged()
    if (!profile.provider) {
      showTrayBalloon('TransL', '登入成功，但尚未指派翻譯服務，請聯絡管理員。')
    } else {
      showTrayBalloon('TransL', `歡迎 ${profile.username}，翻譯功能已就緒。`)
    }
    return profile
  })

  ipcMain.handle(IPC.AUTH_LOGOUT, async () => {
    apiLogout()
    notifySettingsSessionChanged()
  })

  ipcMain.on(IPC.AUTH_OPEN_LOGIN, () => createLoginWindow())
  ipcMain.on(IPC.CAPTURE_COMPLETE, (_event, bounds: ScreenRect) => completeScreenshotPicker(bounds))
  ipcMain.on(IPC.CAPTURE_CANCEL, () => cancelScreenshotPicker())
}

export function setupApp(): void {
  setupIpc()

  createTray({
    onTranslateClipboard: () => {
      const anchor = screen.getCursorScreenPoint()
      void handleTranslateOverlay(undefined, true, anchor)
    },
    onOpenSettings: () => createSettingsWindow(),
    onReloadListener: () => {
      setupKeyboardListeners()
      setupSelectionListener()
      showTrayBalloon('TransL', '快捷鍵與選取提示已重新載入')
    },
    onCheckUpdate: () => void checkForDesktopUpdate(),
    onQuit: () => app.quit()
  })

  setupKeyboardListeners()
  setupSelectionListener()

  showTrayBalloon(
    'TransL 已啟動',
    '拖曳選取後可點旁邊圖示翻譯；亦可使用快捷鍵或雙擊 Ctrl+C'
  )
}

export async function onAppReady(): Promise<void> {
  applyStoredAutoLaunch()
  setupApp()

  setTimeout(() => void checkForDesktopUpdate({ silent: true }), 3000)

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
}

export function onWillQuit(): void {
  stopAllHotkeys()
  stopSelectionListener()
  cancelScreenshotPicker()
  destroyTray()
}
