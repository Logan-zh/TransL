import Store from 'electron-store'
import { getAutoLaunchEnabled, setAutoLaunchEnabled, syncAutoLaunchSetting } from './auto-launch'
import {
  AppHotkeys,
  AppSettings,
  DEFAULT_HOTKEYS,
  DEFAULT_SETTINGS,
  HotkeyBinding,
  TranslateOverlayHotkey
} from './config'

const LEGACY_KEYS = [
  'provider',
  'openaiApiKey',
  'geminiApiKey',
  'openaiModel',
  'geminiModel'
] as const

const store = new Store<AppSettings>({
  defaults: DEFAULT_SETTINGS
})

function purgeLegacyApiKeyFields(): boolean {
  const raw = store.store as Record<string, unknown>
  const hadLegacy = Boolean(raw.openaiApiKey || raw.geminiApiKey)
  for (const key of LEGACY_KEYS) {
    if (key in raw) {
      store.delete(key)
    }
  }
  return hadLegacy
}

export const legacyApiKeyDetected = purgeLegacyApiKeyFields()

export function wasLegacyApiKeyDetected(): boolean {
  return legacyApiKeyDetected
}

function mergeBinding(stored: Partial<HotkeyBinding> | undefined, fallback: HotkeyBinding): HotkeyBinding {
  if (!stored || typeof stored !== 'object') {
    return { ...fallback }
  }
  return {
    ctrl: Boolean(stored.ctrl),
    alt: Boolean(stored.alt),
    shift: Boolean(stored.shift),
    key: typeof stored.key === 'string' ? stored.key.toUpperCase() : fallback.key,
    doubleTap: stored.doubleTap !== undefined ? Boolean(stored.doubleTap) : fallback.doubleTap
  }
}

function mergeOverlayHotkey(stored: unknown): TranslateOverlayHotkey {
  if (!stored || typeof stored !== 'object') {
    return { mode: 'clipboard' }
  }
  const raw = stored as { mode?: string; binding?: Partial<HotkeyBinding> }
  if (raw.mode === 'keyboard' && raw.binding) {
    return {
      mode: 'keyboard',
      binding: mergeBinding(raw.binding, DEFAULT_HOTKEYS.translatePaste)
    }
  }
  return { mode: 'clipboard' }
}

function mergeHotkeys(stored: unknown): AppHotkeys {
  if (!stored || typeof stored !== 'object') {
    return {
      translateOverlay: { ...DEFAULT_HOTKEYS.translateOverlay },
      translatePaste: { ...DEFAULT_HOTKEYS.translatePaste },
      replySuggest: { ...DEFAULT_HOTKEYS.replySuggest },
      screenshotTranslate: { ...DEFAULT_HOTKEYS.screenshotTranslate }
    }
  }

  const raw = stored as Partial<AppHotkeys>
  return {
    translateOverlay: mergeOverlayHotkey(raw.translateOverlay),
    translatePaste: mergeBinding(raw.translatePaste, DEFAULT_HOTKEYS.translatePaste),
    replySuggest: mergeBinding(raw.replySuggest, DEFAULT_HOTKEYS.replySuggest),
    screenshotTranslate: mergeBinding(
      raw.screenshotTranslate,
      DEFAULT_HOTKEYS.screenshotTranslate
    )
  }
}

export function getSettings(): AppSettings {
  const storedShowTrigger = store.get('showSelectionTrigger')
  return {
    openAtLogin: getAutoLaunchEnabled(),
    showSelectionTrigger:
      typeof storedShowTrigger === 'boolean' ? storedShowTrigger : DEFAULT_SETTINGS.showSelectionTrigger,
    hotkeys: mergeHotkeys(store.get('hotkeys'))
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  if (settings.openAtLogin !== undefined) {
    store.set('openAtLogin', settings.openAtLogin)
    setAutoLaunchEnabled(settings.openAtLogin)
  }

  if (settings.hotkeys !== undefined) {
    store.set('hotkeys', settings.hotkeys)
  }

  if (settings.showSelectionTrigger !== undefined) {
    store.set('showSelectionTrigger', settings.showSelectionTrigger)
  }

  return getSettings()
}

export function applyStoredAutoLaunch(): void {
  syncAutoLaunchSetting(store.get('openAtLogin', false))
}
