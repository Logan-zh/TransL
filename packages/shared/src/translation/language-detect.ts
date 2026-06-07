import type { TranslationDirection } from './translation.types'

/** 繁體／簡體中文（含擴展區） */
export const CHINESE_CHAR_PATTERN = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/

const HANGUL_PATTERN = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/
const JAPANESE_KANA_PATTERN = /[\u3040-\u309F\u30A0-\u30FF]/

/**
 * 中文 → 英文；其餘語言（英、韓、日等）→ 繁體中文。
 * API 仍使用 en-to-zh 表示「譯為繁中」，非僅英文。
 */
export function detectTranslationDirection(text: string): TranslationDirection {
  return CHINESE_CHAR_PATTERN.test(text) ? 'zh-to-en' : 'en-to-zh'
}

export type SpeechLang = 'zh-TW' | 'en-US' | 'ko-KR' | 'ja-JP'

export function detectSpeechLang(text: string): SpeechLang {
  if (CHINESE_CHAR_PATTERN.test(text)) {
    return 'zh-TW'
  }
  if (HANGUL_PATTERN.test(text)) {
    return 'ko-KR'
  }
  if (JAPANESE_KANA_PATTERN.test(text)) {
    return 'ja-JP'
  }
  return 'en-US'
}
