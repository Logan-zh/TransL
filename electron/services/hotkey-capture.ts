import type { HotkeyBinding } from './config'
import { getVkForKey, VK_CONTROL, VK_MENU, VK_SHIFT } from './hotkey-codes'
import { isKeyDown, waitForAllKeysReleased } from './hotkey-listener'

const DOUBLE_TAP_MS = 800
const CAPTURE_TIMEOUT_MS = 10000
const POLL_MS = 30

function readModifiers(): Pick<HotkeyBinding, 'ctrl' | 'alt' | 'shift'> {
  return {
    ctrl: isKeyDown(VK_CONTROL),
    alt: isKeyDown(VK_MENU),
    shift: isKeyDown(VK_SHIFT)
  }
}

function findPressedMainKey(): string | null {
  for (const key of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')) {
    const vk = getVkForKey(key)
    if (vk !== undefined && isKeyDown(vk)) {
      return key
    }
  }
  for (let i = 1; i <= 12; i++) {
    const label = `F${i}`
    const vk = getVkForKey(label)
    if (vk !== undefined && isKeyDown(vk)) {
      return label
    }
  }
  return null
}

export async function captureHotkeyBinding(): Promise<HotkeyBinding> {
  const ready = await waitForAllKeysReleased(4000)
  if (!ready) {
    throw new Error('請先放開所有按鍵，再按一次「錄製」')
  }

  const deadline = Date.now() + CAPTURE_TIMEOUT_MS

  while (Date.now() < deadline) {
    const key = findPressedMainKey()
    if (!key) {
      await new Promise((r) => setTimeout(r, POLL_MS))
      continue
    }

    const firstMods = readModifiers()

    while (isKeyDown(getVkForKey(key)!)) {
      if (Date.now() > deadline) {
        throw new Error('錄製逾時，請再試一次')
      }
      await new Promise((r) => setTimeout(r, POLL_MS))
    }

    const secondDeadline = Date.now() + DOUBLE_TAP_MS
    while (Date.now() < secondDeadline) {
      const again = findPressedMainKey()
      if (again === key) {
        while (isKeyDown(getVkForKey(key)!)) {
          await new Promise((r) => setTimeout(r, POLL_MS))
        }
        await waitForAllKeysReleased(1000)
        return {
          ...firstMods,
          key,
          doubleTap: true
        }
      }
      await new Promise((r) => setTimeout(r, POLL_MS))
    }

    await waitForAllKeysReleased(1000)
    return {
      ...firstMods,
      key,
      doubleTap: false
    }
  }

  throw new Error('錄製逾時，請再試一次')
}
