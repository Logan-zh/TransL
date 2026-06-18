import { DOUBLE_TAP_MS, POLL_INTERVAL_MS, TRIGGER_COOLDOWN_MS } from './hotkey-constants'
import { getVkForKey, VK_CONTROL, VK_LWIN, VK_RWIN } from './hotkey-codes'
import { hasClipboardText } from './clipboard'
import {
  isWindowsScreenshotShortcutGuarded,
  updateWindowsScreenshotGuard
} from './windows-shortcut-guard'
import { isKeyDown } from './win32'

const VK_C = getVkForKey('C')!

let pollTimer: NodeJS.Timeout | null = null
let wasKeyDown = false
let lastPressTime = 0
let lastTriggerTime = 0
let onDoubleCopy: (() => void) | null = null
let suppressed = false

export function setDoubleCopySuppressed(value: boolean): void {
  suppressed = value
  lastPressTime = 0
  wasKeyDown = isKeyDown(VK_C)
}

/** 重設雙擊 Ctrl+C 計時基準，避免程式內部模擬複製干擾使用者快捷鍵 */
export function syncDoubleCopyBaseline(): void {
  lastPressTime = 0
  wasKeyDown = isKeyDown(VK_C)
}

export function startDoubleCopyListener(handler: () => void): void {
  stopDoubleCopyListener()

  onDoubleCopy = handler
  lastPressTime = 0
  lastTriggerTime = 0
  wasKeyDown = isKeyDown(VK_C)

  pollTimer = setInterval(() => {
    if (updateWindowsScreenshotGuard()) {
      lastPressTime = 0
    }

    if (suppressed || isWindowsScreenshotShortcutGuarded()) {
      wasKeyDown = isKeyDown(VK_C)
      if (isWindowsScreenshotShortcutGuarded()) {
        lastPressTime = 0
      }
      return
    }

    if (!isKeyDown(VK_CONTROL) || isKeyDown(VK_LWIN) || isKeyDown(VK_RWIN)) {
      lastPressTime = 0
      wasKeyDown = isKeyDown(VK_C)
      return
    }

    const keyDown = isKeyDown(VK_C)
    const now = Date.now()

    if (keyDown && !wasKeyDown) {
      if (lastPressTime > 0 && now - lastPressTime <= DOUBLE_TAP_MS) {
        if (now - lastTriggerTime >= TRIGGER_COOLDOWN_MS) {
          lastPressTime = 0
          if (!hasClipboardText()) {
            console.log('[DEMOL] double Ctrl+C ignored (no text)')
            wasKeyDown = keyDown
            return
          }
          lastTriggerTime = now
          console.log('[DEMOL] double Ctrl+C detected')
          onDoubleCopy?.()
        }
      } else {
        lastPressTime = now
      }
    }

    wasKeyDown = keyDown
  }, POLL_INTERVAL_MS)

  console.log('[DEMOL] double Ctrl+C listener started')
}

export function stopDoubleCopyListener(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  lastPressTime = 0
  wasKeyDown = false
  onDoubleCopy = null
}
