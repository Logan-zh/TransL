import { delay } from './clipboard'
import { VK_MENU } from './hotkey-codes'
import {
  GetForegroundWindow,
  GetWindowThreadProcessId,
  KEYEVENTF_KEYUP,
  keybd_event,
  SetForegroundWindow
} from './win32'

let savedTargetWindow: unknown = null
let savedTargetProcessId: number | null = null

function getWindowProcessId(hwnd: unknown): number {
  if (!hwnd) {
    return 0
  }

  const pidOut = [0]
  GetWindowThreadProcessId(hwnd, pidOut)
  return pidOut[0] ?? 0
}

export function captureTargetWindow(): void {
  savedTargetWindow = GetForegroundWindow()
  savedTargetProcessId = getWindowProcessId(savedTargetWindow)
}

/** 雙擊後前景是否已切換（例如開啟另一個應用程式） */
export function hasForegroundContextChanged(): boolean {
  if (!savedTargetWindow) {
    return false
  }

  const current = GetForegroundWindow()
  if (!current) {
    return false
  }

  if (current === savedTargetWindow) {
    return false
  }

  const currentPid = getWindowProcessId(current)
  if (savedTargetProcessId !== null && currentPid !== savedTargetProcessId) {
    return true
  }

  return current !== savedTargetWindow
}

export async function restoreTargetWindow(): Promise<boolean> {
  if (!savedTargetWindow) {
    return false
  }

  keybd_event(VK_MENU, 0, 0, 0)
  keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, 0)
  await delay(30)

  const restored = SetForegroundWindow(savedTargetWindow) !== 0
  await delay(200)
  return restored
}

export function clearTargetWindow(): void {
  savedTargetWindow = null
  savedTargetProcessId = null
}
