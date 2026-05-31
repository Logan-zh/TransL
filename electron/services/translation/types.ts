import { TranslationDirection, TranslationTone } from '../config'

export interface TranslationProvider {
  translate(text: string, direction: TranslationDirection, tone?: TranslationTone): Promise<string>
}

function getToneInstruction(tone: TranslationTone, direction: TranslationDirection): string {
  if (tone === 'colloquial') {
    return direction === 'zh-to-en'
      ? 'Use casual, conversational English that sounds natural and easy to understand.'
      : 'Use casual, everyday Traditional Chinese (zh-TW) that sounds natural and easy to understand.'
  }

  if (tone === 'professional') {
    return direction === 'zh-to-en'
      ? 'Use formal, professional English suitable for business or academic contexts.'
      : 'Use formal, professional Traditional Chinese (zh-TW) suitable for business or academic contexts.'
  }

  return ''
}

export function buildTranslationPrompt(
  text: string,
  direction: TranslationDirection,
  tone: TranslationTone = 'default'
): string {
  const toneLine = getToneInstruction(tone, direction)
  const toneSuffix = toneLine ? `\n${toneLine}` : ''

  if (direction === 'zh-to-en') {
    return `Translate the following Chinese text to English.
Return only the translation, no explanation.${toneSuffix}

Text:
${text}`
  }

  return `Translate the following English text to Traditional Chinese (zh-TW).
Return only the translation, no explanation.${toneSuffix}

Text:
${text}`
}
