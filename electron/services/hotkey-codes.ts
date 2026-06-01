import type { HotkeyBinding } from './config'

export const VK_CONTROL = 0x11
export const VK_SHIFT = 0x10
export const VK_MENU = 0x12
export const VK_LWIN = 0x5b
export const VK_RWIN = 0x5c

const LETTER_VK: Record<string, number> = {}
for (let i = 0; i < 26; i++) {
  LETTER_VK[String.fromCharCode(65 + i)] = 0x41 + i
}

const DIGIT_VK: Record<string, number> = {}
for (let i = 0; i < 10; i++) {
  DIGIT_VK[String(i)] = 0x30 + i
}

const FUNCTION_VK: Record<string, number> = {}
for (let i = 1; i <= 12; i++) {
  FUNCTION_VK[`F${i}`] = 0x70 + i - 1
}

export const KEY_TO_VK: Record<string, number> = {
  ...LETTER_VK,
  ...DIGIT_VK,
  ...FUNCTION_VK
}

export const SUPPORTED_KEY_LABELS = [
  ...Object.keys(LETTER_VK),
  ...Object.keys(DIGIT_VK),
  ...Object.keys(FUNCTION_VK)
]

export function normalizeHotkeyKey(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase()
  if (!trimmed) {
    return null
  }
  if (KEY_TO_VK[trimmed] !== undefined) {
    return trimmed
  }
  return null
}

export function getVkForKey(key: string): number | undefined {
  return KEY_TO_VK[key]
}

export function formatHotkeyBinding(binding: HotkeyBinding): string {
  const parts: string[] = []
  if (binding.ctrl) parts.push('Ctrl')
  if (binding.alt) parts.push('Alt')
  if (binding.shift) parts.push('Shift')
  parts.push(binding.key)
  const base = parts.join('+')
  return binding.doubleTap ? `${base}（連按兩次）` : base
}

export function bindingKey(binding: HotkeyBinding): string {
  return [
    binding.ctrl ? '1' : '0',
    binding.alt ? '1' : '0',
    binding.shift ? '1' : '0',
    binding.key,
    binding.doubleTap ? '2' : '1'
  ].join('|')
}

export function bindingsConflict(a: HotkeyBinding, b: HotkeyBinding): boolean {
  return bindingKey(a) === bindingKey(b)
}

export function validateHotkeyBinding(binding: HotkeyBinding): string | null {
  if (!getVkForKey(binding.key)) {
    return `不支援的按鍵「${binding.key}」，請使用 A–Z、0–9 或 F1–F12`
  }
  if (!binding.ctrl && !binding.alt && !binding.shift && !binding.doubleTap) {
    return '單次按鍵至少需搭配 Ctrl、Alt 或 Shift 其中一項，或改為「連按兩次」'
  }
  return null
}
