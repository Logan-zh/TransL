import { NativeImage } from 'electron'
import { TranslationDirection, TranslationTargetLang, TranslationTone } from '../config'
import { translateImageApi, translateTextApi } from '../api-client'
import { ImageTranslationResult, TranslationProvider } from './types'

export function createBackendTranslationProvider(): TranslationProvider {
  return {
    async translate(
      text: string,
      direction: TranslationDirection,
      tone: TranslationTone = 'default',
      targetLang?: TranslationTargetLang
    ): Promise<string> {
      return translateTextApi(text, direction, tone, targetLang)
    },

    async translateImage(
      image: NativeImage,
      tone: TranslationTone = 'default'
    ): Promise<ImageTranslationResult> {
      const base64 = image.toPNG().toString('base64')
      return translateImageApi(base64, tone)
    }
  }
}
