import { TranslationDirection } from './config'

const CHINESE_CHAR_PATTERN = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/

export function detectTranslationDirection(text: string): TranslationDirection {
  return CHINESE_CHAR_PATTERN.test(text) ? 'zh-to-en' : 'en-to-zh'
}
