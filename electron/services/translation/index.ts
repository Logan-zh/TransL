import { AppSettings } from '../config'
import { createGeminiProvider } from './gemini'
import { createOpenAIProvider } from './openai'
import { TranslationProvider } from './types'

export function createTranslationProvider(settings: AppSettings): TranslationProvider {
  if (settings.provider === 'gemini') {
    return createGeminiProvider({
      apiKey: settings.geminiApiKey,
      model: settings.geminiModel
    })
  }

  return createOpenAIProvider({
    apiKey: settings.openaiApiKey,
    model: settings.openaiModel
  })
}
