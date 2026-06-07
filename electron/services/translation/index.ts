import { createBackendTranslationProvider } from './backend'
import type { TranslationProvider } from './provider'

export type { TranslationProvider } from './provider'

export function createTranslationProvider(): TranslationProvider {
  return createBackendTranslationProvider()
}
