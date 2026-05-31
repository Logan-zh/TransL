import { load } from 'koffi'
import { delay } from './clipboard'

const user32 = load('user32.dll')

const GetForegroundWindow = user32.func('void * __stdcall GetForegroundWindow()')
const SetForegroundWindow = user32.func('int __stdcall SetForegroundWindow(void * hWnd)')
const keybd_event = user32.func('void __stdcall keybd_event(uchar bVk, uchar bScan, uint dwFlags, ulong dwExtraInfo)')

const KEYEVENTF_KEYUP = 0x0002
const VK_MENU = 0x12

let savedTargetWindow: unknown = null

export function captureTargetWindow(): void {
  savedTargetWindow = GetForegroundWindow()
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
}
