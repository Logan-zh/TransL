const CHINESE_CHAR_PATTERN = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/
const HANGUL_PATTERN = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/
const JAPANESE_KANA_PATTERN = /[\u3040-\u309F\u30A0-\u30FF]/
const MAX_SPEECH_CHARS = 300

export function detectSpeechLang(text: string): 'zh-TW' | 'en-US' | 'ko-KR' | 'ja-JP' {
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

function prepareSpeechText(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= MAX_SPEECH_CHARS) {
    return trimmed
  }

  const chunk = trimmed.slice(0, MAX_SPEECH_CHARS)
  const breakAt = Math.max(
    chunk.lastIndexOf('\n'),
    chunk.lastIndexOf('。'),
    chunk.lastIndexOf('！'),
    chunk.lastIndexOf('？'),
    chunk.lastIndexOf('. '),
    chunk.lastIndexOf('! '),
    chunk.lastIndexOf('? ')
  )

  if (breakAt > MAX_SPEECH_CHARS * 0.4) {
    return chunk.slice(0, breakAt + 1).trim()
  }

  return chunk.trim()
}

export function cancelSpeech(): void {
  window.speechSynthesis.cancel()
}

export function speakText(text: string): Promise<void> {
  const prepared = prepareSpeechText(text)
  if (!prepared) {
    return Promise.resolve()
  }

  cancelSpeech()

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(prepared)
    utterance.lang = detectSpeechLang(prepared)
    utterance.rate = 0.98

    const finish = (): void => {
      resolve()
    }

    utterance.onend = finish
    utterance.onerror = finish
    window.speechSynthesis.speak(utterance)
  })
}
