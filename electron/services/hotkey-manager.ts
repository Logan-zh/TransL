import type { AppHotkeys } from './config'
import { bindingsConflict, validateHotkeyBinding } from './hotkey-codes'
import { clearHotkeyBindings, registerHotkeyBinding } from './hotkey-listener'
import { startDoubleCopyListener, stopDoubleCopyListener } from './double-copy'

export interface HotkeyHandlers {
  translateOverlay: () => void
  translatePaste: () => void
  replySuggest: () => void
  screenshotTranslate: () => void
}

export function validateHotkeys(hotkeys: AppHotkeys): string | null {
  const keyboardBindings: Array<{ label: string; binding: import('./config').HotkeyBinding }> = []

  if (hotkeys.translateOverlay.mode === 'keyboard') {
    const err = validateHotkeyBinding(hotkeys.translateOverlay.binding)
    if (err) {
      return `翻譯浮動窗：${err}`
    }
    keyboardBindings.push({ label: '翻譯浮動窗', binding: hotkeys.translateOverlay.binding })
  }

  const labeled: Array<[string, import('./config').HotkeyBinding]> = [
    ['翻譯貼上', hotkeys.translatePaste],
    ['回覆建議', hotkeys.replySuggest],
    ['截圖翻譯', hotkeys.screenshotTranslate]
  ]

  for (const [label, binding] of labeled) {
    const err = validateHotkeyBinding(binding)
    if (err) {
      return `${label}：${err}`
    }
    keyboardBindings.push({ label, binding })
  }

  for (let i = 0; i < keyboardBindings.length; i++) {
    for (let j = i + 1; j < keyboardBindings.length; j++) {
      if (bindingsConflict(keyboardBindings[i].binding, keyboardBindings[j].binding)) {
        return `「${keyboardBindings[i].label}」與「${keyboardBindings[j].label}」快捷鍵相同，請修改其中一項`
      }
    }
  }

  return null
}

export function applyHotkeys(hotkeys: AppHotkeys, handlers: HotkeyHandlers): void {
  stopDoubleCopyListener()
  clearHotkeyBindings()

  if (hotkeys.translateOverlay.mode === 'clipboard') {
    startDoubleCopyListener(handlers.translateOverlay)
  } else {
    registerHotkeyBinding('translateOverlay', hotkeys.translateOverlay.binding, handlers.translateOverlay)
  }

  registerHotkeyBinding('translatePaste', hotkeys.translatePaste, handlers.translatePaste)
  registerHotkeyBinding('replySuggest', hotkeys.replySuggest, handlers.replySuggest)
  registerHotkeyBinding(
    'screenshotTranslate',
    hotkeys.screenshotTranslate,
    handlers.screenshotTranslate
  )
}

export function stopAllHotkeys(): void {
  stopDoubleCopyListener()
  clearHotkeyBindings()
}
