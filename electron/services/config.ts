export type TranslationDirection = 'en-to-zh' | 'zh-to-en'
export type TranslationTone = 'default' | 'colloquial' | 'professional'
export type RetoneOption = 'colloquial' | 'professional'
export type OverlayMode = 'translate' | 'reply'

export interface HotkeyBinding {
  ctrl: boolean
  alt: boolean
  shift: boolean
  /** A–Z, 0–9, or F1–F12 */
  key: string
  /** 0.8 秒內連按兩次主鍵 */
  doubleTap: boolean
}

export type TranslateOverlayHotkey =
  | { mode: 'clipboard' }
  | { mode: 'keyboard'; binding: HotkeyBinding }

export interface AppHotkeys {
  translateOverlay: TranslateOverlayHotkey
  translatePaste: HotkeyBinding
  replySuggest: HotkeyBinding
  screenshotTranslate: HotkeyBinding
}

export const DEFAULT_HOTKEY_TRANSLATE_PASTE: HotkeyBinding = {
  ctrl: true,
  alt: true,
  shift: false,
  key: 'D',
  doubleTap: true
}

export const DEFAULT_HOTKEY_REPLY: HotkeyBinding = {
  ctrl: true,
  alt: false,
  shift: false,
  key: 'Q',
  doubleTap: true
}

export const DEFAULT_HOTKEY_SCREENSHOT: HotkeyBinding = {
  ctrl: true,
  alt: true,
  shift: false,
  key: 'S',
  doubleTap: true
}

export const DEFAULT_HOTKEYS: AppHotkeys = {
  translateOverlay: { mode: 'clipboard' },
  translatePaste: { ...DEFAULT_HOTKEY_TRANSLATE_PASTE },
  replySuggest: { ...DEFAULT_HOTKEY_REPLY },
  screenshotTranslate: { ...DEFAULT_HOTKEY_SCREENSHOT }
}

export interface AppSettings {
  openAtLogin: boolean
  hotkeys: AppHotkeys
}

export const DEFAULT_SETTINGS: AppSettings = {
  openAtLogin: false,
  hotkeys: DEFAULT_HOTKEYS
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface MemberProfile {
  username: string
  displayName: string | null
  status: string
  provider: {
    id: string
    name: string
    provider: string
    model: string
  } | null
}

export interface SessionInfo {
  loggedIn: boolean
  profile: MemberProfile | null
  legacyApiKeyDetected: boolean
}

export interface TranslateResultPayload {
  original: string
  translation: string
  imageDataUrl?: string
  mode?: OverlayMode
}

export interface TranslateErrorPayload {
  message: string
}

export interface TranslateLoadingPayload {
  original: string
  message?: string
  mode?: OverlayMode
}

export interface RetonePayload {
  original: string
  tone: RetoneOption
}

export interface CaptureInitPayload {
  offsetX: number
  offsetY: number
}

export interface ScreenRect {
  x: number
  y: number
  width: number
  height: number
}
