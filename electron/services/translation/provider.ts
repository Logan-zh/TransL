import type {
  ImageTranslationResult,
  TranslationDirection,
  TranslationTargetLang,
  TranslationTone
} from '@transl/shared'

export interface TranslationProvider {
  translate(
    text: string,
    direction: TranslationDirection,
    tone?: TranslationTone,
    targetLang?: TranslationTargetLang
  ): Promise<string>
  translateImage(image: Electron.NativeImage, tone?: TranslationTone): Promise<ImageTranslationResult>
}
