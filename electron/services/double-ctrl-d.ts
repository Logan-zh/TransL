import { load } from 'koffi'

const DOUBLE_TAP_MS = 800
const POLL_INTERVAL_MS = 40
const TRIGGER_COOLDOWN_MS = 400

const VK_D = 0x44
const VK_CONTROL = 0x11
const VK_SHIFT = 0x10
const VK_MENU = 0x12
const VK_LWIN = 0x5b
const VK_RWIN = 0x5c

const user32 = load('user32.dll')
const GetAsyncKeyState = user32.func('int16 __stdcall GetAsyncKeyState(int32 vKey)')

function isKeyDown(vk: number): boolean {
  return (GetAsyncKeyState(vk) & 0x8000) !== 0
}

function isCtrlHeld(): boolean {
  return isKeyDown(VK_CONTROL)
}

function hasBlockingModifiers(): boolean {
  return isKeyDown(VK_SHIFT) || isKeyDown(VK_MENU) || isKeyDown(VK_LWIN) || isKeyDown(VK_RWIN)
}

let pollTimer: NodeJS.Timeout | null = null
let wasDDown = false
let lastDPressTime = 0
let lastTriggerTime = 0
let onDoubleCtrlD: (() => void) | null = null

export function startDoubleCtrlDListener(handler: () => void): void {
  stopDoubleCtrlDListener()

  onDoubleCtrlD = handler
  wasDDown = false
  lastDPressTime = 0
  lastTriggerTime = 0

  pollTimer = setInterval(() => {
    const dDown = isKeyDown(VK_D)
    const ctrlHeld = isCtrlHeld()

    if (!ctrlHeld) {
      lastDPressTime = 0
    }

    if (dDown && !wasDDown && ctrlHeld && !hasBlockingModifiers()) {
      const now = Date.now()

      if (lastDPressTime > 0 && now - lastDPressTime <= DOUBLE_TAP_MS) {
        if (now - lastTriggerTime >= TRIGGER_COOLDOWN_MS) {
          lastTriggerTime = now
          lastDPressTime = 0
          console.log('[TransL] double Ctrl+D detected')
          onDoubleCtrlD?.()
        }
      } else {
        lastDPressTime = now
      }
    }

    wasDDown = dDown
  }, POLL_INTERVAL_MS)

  console.log('[TransL] Ctrl+D keyboard listener started')
}

export function stopDoubleCtrlDListener(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  onDoubleCtrlD = null
  wasDDown = false
  lastDPressTime = 0
}
