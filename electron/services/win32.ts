import { load } from 'koffi'

const user32 = load('user32.dll')

export const GetAsyncKeyState = user32.func('int16 __stdcall GetAsyncKeyState(int32 vKey)')
export const getClipboardSequenceNumber = user32.func('uint32 GetClipboardSequenceNumber()')
export const GetForegroundWindow = user32.func('void * __stdcall GetForegroundWindow()')
export const SetForegroundWindow = user32.func('int __stdcall SetForegroundWindow(void * hWnd)')
export const GetWindowThreadProcessId = user32.func(
  'uint32 __stdcall GetWindowThreadProcessId(void * hWnd, _Out_ uint32 * lpdwProcessId)'
)
export const keybd_event = user32.func(
  'void __stdcall keybd_event(uchar bVk, uchar bScan, uint dwFlags, ulong dwExtraInfo)'
)

export const KEYEVENTF_KEYUP = 0x0002

export function isKeyDown(vk: number): boolean {
  return (GetAsyncKeyState(vk) & 0x8000) !== 0
}
