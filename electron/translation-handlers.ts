import { clipboard, dialog, screen } from 'electron'
import { getTextFromClipboard } from './services/clipboard-text'
import { copySelectedTextFromTarget } from './services/copy-selection'
import {
  setDoubleCopySuppressed,
  syncDoubleCopyBaseline
} from './services/double-copy'
import { detectTranslationDirection } from '@transl/shared'
import { pasteTranslation } from './services/paste'
import { restoreClipboardText } from './services/clipboard'
import { captureScreenRegion } from './services/screen-capture'
import { openScreenshotPicker } from './services/screenshot-picker'
import { createTranslationProvider } from './services/translation'
import type {
  RetoneOption,
  SessionInfo,
  TranslationTargetLang,
  TranslationTone
} from './services/config'
import { wasLegacyApiKeyDetected } from './services/settings-store'
import { hasStoredSession } from './services/auth-store'
import {
  ensureAuthenticated,
  getProfile,
  suggestReplyApi
} from './services/api-client'
import { captureTargetWindow, clearTargetWindow } from './services/window-focus'
import { appState } from './windows'
import {
  buildScreenshotDisplayImage,
  hideOverlayWindow,
  hideSelectionTriggerWindow,
  SELECTION_TRIGGER_HEIGHT,
  SELECTION_TRIGGER_WIDTH,
  showOverlayError,
  showOverlayLoading,
  showOverlayResult,
  assignScreenshotBlockTranslations
} from './windows'
import { IPC } from './services/ipc-channels'

export async function getSessionInfo(): Promise<SessionInfo> {
  const legacyApiKeyDetected = wasLegacyApiKeyDetected()
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

export function notifySettingsSessionChanged(): void {
  void getSessionInfo().then((session) => {
    if (appState.settingsWindow && !appState.settingsWindow.isDestroyed()) {
      appState.settingsWindow.webContents.send(IPC.SESSION_CHANGED, session)
    }
  })
}

async function translateText(
  original: string,
  tone: TranslationTone = 'default',
  targetLang?: TranslationTargetLang
): Promise<string> {
  await ensureAuthenticated()
  const direction = detectTranslationDirection(original)
  const provider = createTranslationProvider()
  return provider.translate(original, direction, tone, targetLang)
}

function getSelectionTriggerAnchor(): { x: number; y: number } | undefined {
  if (
    !appState.selectionTriggerWindow ||
    appState.selectionTriggerWindow.isDestroyed() ||
    !appState.selectionTriggerWindow.isVisible()
  ) {
    return undefined
  }

  const bounds = appState.selectionTriggerWindow.getBounds()
  return {
    x: bounds.x + SELECTION_TRIGGER_WIDTH,
    y: bounds.y + SELECTION_TRIGGER_HEIGHT
  }
}

export async function handleTranslateOverlay(
  prefilledText?: string,
  reposition = true,
  anchor?: { x: number; y: number }
): Promise<void> {
  if (appState.isTranslating) {
    return
  }

  const overlayAnchor = anchor ?? getSelectionTriggerAnchor() ?? screen.getCursorScreenPoint()
  hideSelectionTriggerWindow()
  appState.isTranslating = true
  captureTargetWindow()
  appState.lastOverlayImageDataUrl = undefined
  appState.lastScreenshotNativeImage = null
  appState.lastImageBlockLayout = null
  showOverlayLoading('', undefined, reposition, 'translate', overlayAnchor)

  try {
    const selectedText = prefilledText ?? (await getTextFromClipboard())
    showOverlayLoading(selectedText, undefined, false, 'translate')

    const translation = await translateText(selectedText)
    showOverlayResult(selectedText, translation)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    showOverlayError(message)
  } finally {
    appState.isTranslating = false
  }
}

export async function handleDoubleCopyTranslate(): Promise<void> {
  await handleTranslateOverlay()
}

export async function handleSelectionIconTranslate(): Promise<void> {
  if (appState.isTranslating) {
    return
  }

  const overlayAnchor = getSelectionTriggerAnchor() ?? screen.getCursorScreenPoint()
  hideSelectionTriggerWindow()
  setDoubleCopySuppressed(true)
  let clipboardBackup = ''

  try {
    const copied = await copySelectedTextFromTarget()
    clipboardBackup = copied.clipboardBackup
    restoreClipboardText(clipboardBackup)
    await handleTranslateOverlay(copied.text, true, overlayAnchor)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    showOverlayError(message)
  } finally {
    setDoubleCopySuppressed(false)
    syncDoubleCopyBaseline()
  }
}

export async function handleRetone(
  original: string,
  options: { tone?: RetoneOption; targetLang?: TranslationTargetLang }
): Promise<void> {
  if (appState.isTranslating) {
    return
  }

  appState.isTranslating = true
  const loadingMessage = options.targetLang ? '翻譯中…' : '調整語氣中…'
  showOverlayLoading(original, loadingMessage, false)

  try {
    const translation = await translateText(
      original,
      options.tone ?? 'default',
      options.targetLang
    )

    if (appState.lastScreenshotNativeImage && appState.lastImageBlockLayout) {
      const blocks = assignScreenshotBlockTranslations(translation)
      const composited = await buildScreenshotDisplayImage(appState.lastScreenshotNativeImage, blocks)
      clipboard.writeImage(composited)
      showOverlayResult(original, translation, composited.toDataURL())
      return
    }

    showOverlayResult(original, translation)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    showOverlayError(message)
  } finally {
    appState.isTranslating = false
  }
}

export async function handleDoubleCtrlQReplySuggest(): Promise<void> {
  if (appState.isTranslating) {
    return
  }

  hideSelectionTriggerWindow()
  appState.isTranslating = true
  captureTargetWindow()
  setDoubleCopySuppressed(true)
  appState.lastOverlayImageDataUrl = undefined
  appState.lastScreenshotNativeImage = null
  appState.lastImageBlockLayout = null
  let clipboardBackup = ''

  try {
    const copied = await copySelectedTextFromTarget()
    clipboardBackup = copied.clipboardBackup
    restoreClipboardText(clipboardBackup)

    const overlayAnchor = screen.getCursorScreenPoint()
    showOverlayLoading(copied.text, '思考回覆中…', true, 'reply', overlayAnchor)

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
    appState.isTranslating = false
  }
}

export async function handleDoubleCtrlDTranslatePaste(): Promise<void> {
  if (appState.isTranslating) {
    return
  }

  hideSelectionTriggerWindow()
  appState.isTranslating = true
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
    appState.isTranslating = false
  }
}

export async function handleScreenshotTranslate(): Promise<void> {
  if (appState.isTranslating) {
    return
  }

  hideOverlayWindow()
  hideSelectionTriggerWindow()

  const bounds = await openScreenshotPicker()
  if (!bounds || bounds.width < 10 || bounds.height < 10) {
    return
  }

  appState.isTranslating = true
  setDoubleCopySuppressed(true)

  try {
    const image = await captureScreenRegion(bounds)
    clipboard.writeImage(image)

    const overlayAnchor = {
      x: bounds.x + bounds.width,
      y: bounds.y + bounds.height
    }
    showOverlayLoading('', '辨識並翻譯圖片中…', true, 'translate', overlayAnchor)

    await ensureAuthenticated()
    const provider = createTranslationProvider()
    const result = await provider.translateImage(image)

    appState.lastScreenshotNativeImage = image
    appState.lastImageBlockLayout = result.blocks

    const composited = await buildScreenshotDisplayImage(image, result.blocks)
    clipboard.writeImage(composited)

    showOverlayResult(result.original, result.translation, composited.toDataURL())
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    showOverlayError(message)
  } finally {
    setDoubleCopySuppressed(false)
    appState.isTranslating = false
  }
}

export async function handlePasteTranslation(text: string): Promise<void> {
  appState.suppressOverlayBlur = true
  hideOverlayWindow()
  await new Promise((resolve) => setTimeout(resolve, 100))

  try {
    await pasteTranslation(text)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    dialog.showErrorBox('貼上失敗', message)
  } finally {
    appState.suppressOverlayBlur = false
    clearTargetWindow()
  }
}
