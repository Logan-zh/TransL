export type TranslationDirection = 'en-to-zh' | 'zh-to-en'
export type TranslationTone = 'default' | 'colloquial' | 'professional'
export type RetoneOption = 'colloquial' | 'professional'

export interface AppSettings {
  openAtLogin: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  openAtLogin: false
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
}

export interface TranslateErrorPayload {
  message: string
}

export interface TranslateLoadingPayload {
  original: string
  message?: string
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
