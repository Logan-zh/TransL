import { TranslationDirection, TranslationTone } from '../config'
import {
  buildImageTranslationPrompt,
  buildTranslationPrompt,
  parseImageTranslationResponse,
  TranslationProvider
} from './types'

interface OpenAIConfig {
  apiKey: string
  model: string
}

export function createOpenAIProvider(config: OpenAIConfig): TranslationProvider {
  return {
    async translate(text: string, direction: TranslationDirection, tone: TranslationTone = 'default'): Promise<string> {
      if (!config.apiKey) {
        throw new Error('請在設定中輸入 OpenAI API Key。')
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'user',
              content: buildTranslationPrompt(text, direction, tone)
            }
          ],
          temperature: 0.3
        })
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`OpenAI API 錯誤 (${response.status}): ${body}`)
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }

      const translation = data.choices?.[0]?.message?.content?.trim()
      if (!translation) {
        throw new Error('OpenAI 未回傳翻譯內容。')
      }

      return translation
    },

    async translateImage(image: Electron.NativeImage, tone: TranslationTone = 'default') {
      if (!config.apiKey) {
        throw new Error('請在設定中輸入 OpenAI API Key。')
      }

      const pngBuffer = image.toPNG()
      const base64 = pngBuffer.toString('base64')
      const dataUrl = `data:image/png;base64,${base64}`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: buildImageTranslationPrompt(tone) },
                { type: 'image_url', image_url: { url: dataUrl } }
              ]
            }
          ],
          temperature: 0.2
        })
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`OpenAI Vision API 錯誤 (${response.status}): ${body}`)
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }

      const content = data.choices?.[0]?.message?.content?.trim()
      if (!content) {
        throw new Error('OpenAI 未回傳圖片翻譯內容。')
      }

      return parseImageTranslationResponse(content)
    }
  }
}
