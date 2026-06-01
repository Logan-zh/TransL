import { load } from 'koffi'
import type { HotkeyBinding } from './config'
import {
  getVkForKey,
  KEY_TO_VK,
  VK_CONTROL,
  VK_LWIN,
  VK_MENU,
  VK_RWIN,
  VK_SHIFT
} from './hotkey-codes'

const DOUBLE_TAP_MS = 800
const POLL_INTERVAL_MS = 40
const TRIGGER_COOLDOWN_MS = 400

const user32 = load('user32.dll')
const GetAsyncKeyState = user32.func('int16 __stdcall GetAsyncKeyState(int32 vKey)')

export function isKeyDown(vk: number): boolean {
  return (GetAsyncKeyState(vk) & 0x8000) !== 0
}

function modifiersMatch(binding: HotkeyBinding): boolean {
  if (isKeyDown(VK_LWIN) || isKeyDown(VK_RWIN)) {
    return false
  }
  return (
    isKeyDown(VK_CONTROL) === binding.ctrl &&
    isKeyDown(VK_MENU) === binding.alt &&
    isKeyDown(VK_SHIFT) === binding.shift
  )
}

interface BindingState {
  id: string
  binding: HotkeyBinding
  vk: number
  handler: () => void
  wasKeyDown: boolean
  lastPressTime: number
  lastTriggerTime: number
}

let pollTimer: NodeJS.Timeout | null = null
const states: BindingState[] = []

export function registerHotkeyBinding(
  id: string,
  binding: HotkeyBinding,
  handler: () => void
): void {
  const vk = getVkForKey(binding.key)
  if (vk === undefined) {
    throw new Error(`Unsupported hotkey key: ${binding.key}`)
  }

  states.push({
    id,
    binding,
    vk,
    handler,
    wasKeyDown: false,
    lastPressTime: 0,
    lastTriggerTime: 0
  })

  ensurePolling()
}

export function clearHotkeyBindings(): void {
  states.length = 0
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function ensurePolling(): void {
  if (pollTimer) {
    return
  }

  pollTimer = setInterval(() => {
    const now = Date.now()

    for (const state of states) {
      const keyDown = isKeyDown(state.vk)
      const modsOk = modifiersMatch(state.binding)

      if (!modsOk) {
        state.lastPressTime = 0
        state.wasKeyDown = keyDown
        continue
      }

      if (keyDown && !state.wasKeyDown) {
        if (state.binding.doubleTap) {
          if (state.lastPressTime > 0 && now - state.lastPressTime <= DOUBLE_TAP_MS) {
            if (now - state.lastTriggerTime >= TRIGGER_COOLDOWN_MS) {
              state.lastTriggerTime = now
              state.lastPressTime = 0
              console.log(`[TransL] hotkey triggered: ${state.id}`)
              state.handler()
            }
          } else {
            state.lastPressTime = now
          }
        } else if (now - state.lastTriggerTime >= TRIGGER_COOLDOWN_MS) {
          state.lastTriggerTime = now
          console.log(`[TransL] hotkey triggered: ${state.id}`)
          state.handler()
        }
      }

      state.wasKeyDown = keyDown
    }
  }, POLL_INTERVAL_MS)

  console.log('[TransL] hotkey listener started, bindings=', states.length)
}

/** Wait until no keys are pressed (for capture). */
export async function waitForAllKeysReleased(timeoutMs = 3000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  const modifierVks = [VK_CONTROL, VK_MENU, VK_SHIFT, VK_LWIN, VK_RWIN]

  while (Date.now() < deadline) {
    let anyDown = false
    for (const vk of modifierVks) {
      if (isKeyDown(vk)) {
        anyDown = true
        break
      }
    }
    if (!anyDown) {
      for (const key of Object.keys(KEY_TO_VK)) {
        const vk = getVkForKey(key)
        if (vk !== undefined && isKeyDown(vk)) {
          anyDown = true
          break
        }
      }
    }
    if (!anyDown) {
      return true
    }
    await new Promise((r) => setTimeout(r, 40))
  }
  return false
}
