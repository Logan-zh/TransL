import { TranslationDirection } from '../config'

export interface TranslationProvider {
  translate(text: string, direction: TranslationDirection): Promise<string>
}

export function buildTranslationPrompt(text: string, direction: TranslationDirection): string {
  if (direction === 'zh-to-en') {
    return `Translate the following Chinese text to English.
Return only the translation, no explanation.

Text:
${text}`
  }

  return `Translate the following English text to Traditional Chinese (zh-TW).
Return only the translation, no explanation.

Text:
${text}`
}
