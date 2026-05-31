export type TranslationProviderId = 'openai' | 'gemini'
export type TranslationDirection = 'en-to-zh' | 'zh-to-en'
export type TranslationTone = 'default' | 'colloquial' | 'professional'
export type RetoneOption = 'colloquial' | 'professional'

export interface AppSettings {
  provider: TranslationProviderId
  openaiApiKey: string
  geminiApiKey: string
  openaiModel: string
  geminiModel: string
  openAtLogin: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  provider: 'openai',
  openaiApiKey: '',
  geminiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  geminiModel: 'gemini-2.0-flash',
  openAtLogin: false
}

export interface TranslateResultPayload {
  original: string
  translation: string
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
