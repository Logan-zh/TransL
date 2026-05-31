import { createBackendTranslationProvider } from './backend'
import { TranslationProvider } from './types'

export function createTranslationProvider(): TranslationProvider {
  return createBackendTranslationProvider()
}
