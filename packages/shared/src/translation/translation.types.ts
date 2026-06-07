export type TranslationDirection = 'en-to-zh' | 'zh-to-en'
export type TranslationTone = 'default' | 'colloquial' | 'professional'
export type TranslationTargetLang = 'zh' | 'en' | 'ko' | 'ja'

export interface TextOverlayBlock {
  original: string
  translation: string
  x: number
  y: number
  width: number
  height: number
}

export interface ImageTranslationResult {
  original: string
  translation: string
  blocks: TextOverlayBlock[]
}

const TARGET_LANG_LABEL: Record<TranslationTargetLang, string> = {
  zh: 'Traditional Chinese (zh-TW)',
  en: 'English',
  ko: 'Korean',
  ja: 'Japanese'
}

function getToneInstruction(tone: TranslationTone, direction?: TranslationDirection): string {
  if (tone === 'colloquial') {
    return direction === 'zh-to-en'
      ? 'Use natural, idiomatic English that a native speaker would write or say in everyday life. Prefer common collocations and spoken-style phrasing over literal word-for-word translation. Use contractions where natural. Keep it conversational, locally natural, and easy to understand—not stiff, textbook-like, or overly formal.'
      : 'Use natural, idiomatic Traditional Chinese (zh-TW) as native speakers would in daily conversation—口語化、在地化，避免生硬直譯、書面套話或過度正式用語。'
  }

  if (tone === 'professional') {
    return direction === 'zh-to-en'
      ? 'Use formal, professional English suitable for business or academic contexts.'
      : 'Use formal, professional Traditional Chinese (zh-TW) suitable for business or academic contexts.'
  }

  return ''
}

function getToneInstructionForTarget(
  tone: TranslationTone,
  target: TranslationTargetLang
): string {
  if (tone === 'colloquial') {
    if (target === 'zh') {
      return 'Use natural, idiomatic Traditional Chinese (zh-TW) as native speakers would in daily conversation—口語化、在地化，避免生硬直譯、書面套話或過度正式用語。'
    }
    if (target === 'en') {
      return 'Use natural, idiomatic English that a native speaker would write or say in everyday life. Prefer common collocations and spoken-style phrasing over literal word-for-word translation. Use contractions where natural. Keep it conversational, locally natural, and easy to understand—not stiff, textbook-like, or overly formal.'
    }
    if (target === 'ko') {
      return 'Use natural, idiomatic Korean as native speakers would in daily conversation—口語化、在地化，避免生硬直譯或過度正式用語。'
    }
    return 'Use natural, idiomatic Japanese as native speakers would in daily conversation—口語化、自然な言い回し，避免生硬直譯或過度正式用語。'
  }

  if (tone === 'professional') {
    if (target === 'zh') {
      return 'Use formal, professional Traditional Chinese (zh-TW) suitable for business or academic contexts.'
    }
    if (target === 'en') {
      return 'Use formal, professional English suitable for business or academic contexts.'
    }
    if (target === 'ko') {
      return 'Use formal, professional Korean suitable for business or academic contexts.'
    }
    return 'Use formal, professional Japanese suitable for business or academic contexts.'
  }

  return ''
}

export function buildTranslationPrompt(
  text: string,
  direction: TranslationDirection,
  tone: TranslationTone = 'default',
  targetLang?: TranslationTargetLang
): string {
  const formatRule =
    '\nPreserve the original line breaks, paragraph breaks, and blank lines. Each line in the source should correspond to a line in the translation.'

  if (targetLang) {
    const label = TARGET_LANG_LABEL[targetLang]
    const toneLine = getToneInstructionForTarget(tone, targetLang)
    const toneSuffix = toneLine ? `\n${toneLine}` : ''
    return `Translate the following text into ${label}.
Automatically detect the source language (e.g. Chinese, English, Korean, Japanese, or other languages). If the text is already in ${label}, return it unchanged.
Return only the translation, no explanation.${formatRule}${toneSuffix}

Text:
${text}`
  }

  const toneLine = getToneInstruction(tone, direction)
  const toneSuffix = toneLine ? `\n${toneLine}` : ''

  if (direction === 'zh-to-en') {
    return `Translate the following Chinese text to English.
Return only the translation, no explanation.${formatRule}${toneSuffix}

Text:
${text}`
  }

  return `Translate the following text into Traditional Chinese (zh-TW).
Automatically detect the source language (e.g. English, Korean, Japanese, or other languages). If the text is already in Traditional Chinese, return it unchanged.
Return only the translation, no explanation.${formatRule}${toneSuffix}

Text:
${text}`
}

export function buildReplySuggestionPrompt(text: string): string {
  const isChinese = /[\u4e00-\u9fff]/.test(text)
  const langRule = isChinese
    ? 'Write all output in Traditional Chinese (zh-TW).'
    : 'Write all output in English.'

  return `The user selected a message they received and needs help deciding how to reply.

${langRule}

Return ONLY the following structure (no markdown fences):

【理解】
One or two short sentences summarizing the sender's intent or tone.

【建議回覆】
1. First ready-to-send reply option (natural, polite unless context suggests otherwise)
2. Second option with a different tone or approach when useful
3. Third option only if it adds meaningful variety; omit if two options are enough

Keep each reply option concise and copy-paste ready. Do not add extra commentary outside this format.

Message:
${text}`
}

function getImageToneInstruction(tone: TranslationTone): string {
  if (tone === 'colloquial') {
    return 'Use a natural, idiomatic, conversational tone—as a native speaker would express it, not a literal translation.'
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
2. Translate the text: if it contains Chinese characters, translate to English; otherwise detect the source language and translate into Traditional Chinese (zh-TW).
3. Preserve the same line breaks and paragraph structure in both original and translation.
4. For each visible text line or paragraph, estimate its bounding box on the image using normalized coordinates from 0 to 1 (relative to image width/height).${toneSuffix}

Return ONLY valid JSON with this exact shape, no markdown fences:
{"original":"...","translation":"...","blocks":[{"original":"...","translation":"...","x":0.1,"y":0.2,"width":0.5,"height":0.08}]}

Rules for blocks:
- One block per text line or short paragraph that appears in the image.
- x,y = top-left corner; width,height = box size; all values between 0 and 1.
- Each block must include its own original and translation text.
- blocks must cover the main visible text regions in reading order.`
}

function parseBlocks(raw: unknown): TextOverlayBlock[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const blocks: TextOverlayBlock[] = []

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const block = item as Partial<TextOverlayBlock>
    if (
      typeof block.x !== 'number' ||
      typeof block.y !== 'number' ||
      typeof block.width !== 'number' ||
      typeof block.height !== 'number' ||
      !block.translation?.trim()
    ) {
      continue
    }

    blocks.push({
      original: block.original?.trim() ?? '',
      translation: block.translation.trim(),
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height
    })
  }

  return blocks
}

export function parseImageTranslationResponse(raw: string): ImageTranslationResult {
  let text = raw.trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    text = jsonMatch[0]
  }

  const parsed = JSON.parse(text) as Partial<ImageTranslationResult> & { blocks?: unknown }
  if (!parsed.original?.trim() || !parsed.translation?.trim()) {
    throw new Error('Vision API 未回傳有效的原文與譯文。')
  }

  let blocks = parseBlocks(parsed.blocks)
  if (blocks.length === 0) {
    blocks = [
      {
        original: parsed.original.trim(),
        translation: parsed.translation.trim(),
        x: 0.04,
        y: 0.1,
        width: 0.92,
        height: 0.8
      }
    ]
  }

  return {
    original: parsed.original.trim(),
    translation: parsed.translation.trim(),
    blocks
  }
}
