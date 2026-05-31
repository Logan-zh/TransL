import { TranslationDirection, TranslationTone } from '../config'
import {
  buildImageTranslationPrompt,
  buildTranslationPrompt,
  parseImageTranslationResponse,
  TranslationProvider
} from './types'

interface GeminiConfig {
  apiKey: string
  model: string
}

export function createGeminiProvider(config: GeminiConfig): TranslationProvider {
  return {
    async translate(text: string, direction: TranslationDirection, tone: TranslationTone = 'default'): Promise<string> {
      if (!config.apiKey) {
        throw new Error('請在設定中輸入 Gemini API Key。')
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: buildTranslationPrompt(text, direction, tone) }]
            }
          ],
          generationConfig: {
            temperature: 0.3
          }
        })
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Gemini API 錯誤 (${response.status}): ${body}`)
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }

      const translation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (!translation) {
        throw new Error('Gemini 未回傳翻譯內容。')
      }

      return translation
    },

    async translateImage(image: Electron.NativeImage, tone: TranslationTone = 'default') {
      if (!config.apiKey) {
        throw new Error('請在設定中輸入 Gemini API Key。')
      }

      const base64 = image.toPNG().toString('base64')
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: buildImageTranslationPrompt(tone) },
                { inline_data: { mime_type: 'image/png', data: base64 } }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2
          }
        })
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Gemini Vision API 錯誤 (${response.status}): ${body}`)
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (!content) {
        throw new Error('Gemini 未回傳圖片翻譯內容。')
      }

      return parseImageTranslationResponse(content)
    }
  }
}
