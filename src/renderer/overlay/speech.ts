const CHINESE_CHAR_PATTERN = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/
const MAX_SPEECH_CHARS = 300

export function detectSpeechLang(text: string): 'zh-TW' | 'en-US' {
  return CHINESE_CHAR_PATTERN.test(text) ? 'zh-TW' : 'en-US'
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
