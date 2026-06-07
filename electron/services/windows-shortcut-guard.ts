import { WIN_SCREENSHOT_SUPPRESS_MS } from './hotkey-constants'
import { getVkForKey, VK_LWIN, VK_RWIN, VK_SHIFT } from './hotkey-codes'
import { isKeyDown } from './win32'

const VK_S = getVkForKey('S')!

let screenshotShortcutSuppressUntil = 0
let wasScreenshotChordDown = false

function isWinDown(): boolean {
  return isKeyDown(VK_LWIN) || isKeyDown(VK_RWIN)
}

export function isWindowsScreenshotChordDown(): boolean {
  return isWinDown() && isKeyDown(VK_SHIFT) && isKeyDown(VK_S)
}

export function isWindowsScreenshotShortcutGuarded(): boolean {
  return isWindowsScreenshotChordDown() || Date.now() < screenshotShortcutSuppressUntil
}

/** 偵測 Win+Shift+S 按下，回傳是否剛進入抑制期 */
export function updateWindowsScreenshotGuard(): boolean {
  const chordDown = isWindowsScreenshotChordDown()
  const enteredGuard = chordDown && !wasScreenshotChordDown
  if (enteredGuard) {
    screenshotShortcutSuppressUntil = Date.now() + WIN_SCREENSHOT_SUPPRESS_MS
  }
  wasScreenshotChordDown = chordDown
  return enteredGuard
}
