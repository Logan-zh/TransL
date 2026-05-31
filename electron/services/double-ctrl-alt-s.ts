import { load } from 'koffi'

const DOUBLE_TAP_MS = 800
const POLL_INTERVAL_MS = 40
const TRIGGER_COOLDOWN_MS = 400

const VK_S = 0x53
const VK_CONTROL = 0x11
const VK_MENU = 0x12
const VK_SHIFT = 0x10
const VK_LWIN = 0x5b
const VK_RWIN = 0x5c

const user32 = load('user32.dll')
const GetAsyncKeyState = user32.func('int16 __stdcall GetAsyncKeyState(int32 vKey)')

function isKeyDown(vk: number): boolean {
  return (GetAsyncKeyState(vk) & 0x8000) !== 0
}

function isCtrlAltHeld(): boolean {
  return isKeyDown(VK_CONTROL) && isKeyDown(VK_MENU)
}

function hasBlockingModifiers(): boolean {
  return isKeyDown(VK_SHIFT) || isKeyDown(VK_LWIN) || isKeyDown(VK_RWIN)
}

let pollTimer: NodeJS.Timeout | null = null
let wasSDown = false
let lastSPressTime = 0
let lastTriggerTime = 0
let onDoubleCtrlAltS: (() => void) | null = null

export function startDoubleCtrlAltSListener(handler: () => void): void {
  stopDoubleCtrlAltSListener()

  onDoubleCtrlAltS = handler
  wasSDown = false
  lastSPressTime = 0
  lastTriggerTime = 0

  pollTimer = setInterval(() => {
    const sDown = isKeyDown(VK_S)
    const modifiersHeld = isCtrlAltHeld()

    if (!modifiersHeld) {
      lastSPressTime = 0
    }

    if (sDown && !wasSDown && modifiersHeld && !hasBlockingModifiers()) {
      const now = Date.now()

      if (lastSPressTime > 0 && now - lastSPressTime <= DOUBLE_TAP_MS) {
        if (now - lastTriggerTime >= TRIGGER_COOLDOWN_MS) {
          lastTriggerTime = now
          lastSPressTime = 0
          console.log('[TransL] double Ctrl+Alt+S detected')
          onDoubleCtrlAltS?.()
        }
      } else {
        lastSPressTime = now
      }
    }

    wasSDown = sDown
  }, POLL_INTERVAL_MS)

  console.log('[TransL] Ctrl+Alt+S keyboard listener started')
}

export function stopDoubleCtrlAltSListener(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  onDoubleCtrlAltS = null
  wasSDown = false
  lastSPressTime = 0
}
