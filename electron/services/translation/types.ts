import { TranslationDirection, TranslationTone } from '../config'

export interface ImageTranslationResult {
  original: string
  translation: string
}

export interface TranslationProvider {
  translate(text: string, direction: TranslationDirection, tone?: TranslationTone): Promise<string>
  translateImage(image: Electron.NativeImage, tone?: TranslationTone): Promise<ImageTranslationResult>
}

function getToneInstruction(tone: TranslationTone, direction?: TranslationDirection): string {
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
  const formatRule =
    '\nPreserve the original line breaks, paragraph breaks, and blank lines. Each line in the source should correspond to a line in the translation.'

  if (direction === 'zh-to-en') {
    return `Translate the following Chinese text to English.
Return only the translation, no explanation.${formatRule}${toneSuffix}

Text:
${text}`
  }

  return `Translate the following English text to Traditional Chinese (zh-TW).
Return only the translation, no explanation.${formatRule}${toneSuffix}

Text:
${text}`
}

function getImageToneInstruction(tone: TranslationTone): string {
  if (tone === 'colloquial') {
    return 'Use a casual, natural tone in the translation.'
  }
  if (tone === 'professional') {
    return 'Use a formal, professional tone in the translation.'
  }
  return ''
}

export function buildImageTranslationPrompt(tone: TranslationTone = 'default'): string {
  const toneLine = getImageToneInstruction(tone)
  const toneSuffix = toneLine ? `\n${toneLine}` : ''

  return `Look at this screenshot and:
1. Extract ALL visible text exactly as it appears, preserving line breaks and blank lines.
2. Translate the text: if it contains Chinese characters, translate to English; otherwise translate to Traditional Chinese (zh-TW).
3. Preserve the same line breaks and paragraph structure in both original and translation.${toneSuffix}

Return ONLY valid JSON with this exact shape, no markdown fences:
{"original":"...","translation":"..."}`
}

export function parseImageTranslationResponse(raw: string): ImageTranslationResult {
  let text = raw.trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    text = jsonMatch[0]
  }

  const parsed = JSON.parse(text) as Partial<ImageTranslationResult>
  if (!parsed.original?.trim() || !parsed.translation?.trim()) {
    throw new Error('Vision API 未回傳有效的原文與譯文。')
  }

  return {
    original: parsed.original.trim(),
    translation: parsed.translation.trim()
  }
}
