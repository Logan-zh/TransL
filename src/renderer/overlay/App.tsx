import { useEffect, useRef, useState } from 'react'
import { APP_NAME } from '@transl/shared'
import { cancelSpeech, speakText } from './speech'
import { useOverlayDrag } from './useOverlayDrag'
import ZoomableImage from './ZoomableImage'

import type {
  OverlayMode,
  RetoneOption,
  TranslationTargetLang
} from '@desktop'

type OverlayState =
  | { status: 'idle' }
  | { status: 'loading'; original: string; message?: string; mode: OverlayMode }
  | {
      status: 'success'
      original: string
      translation: string
      imageDataUrl?: string
      mode: OverlayMode
    }
  | { status: 'error'; message: string }

const MAX_ORIGINAL_PREVIEW = 200

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

export default function App(): JSX.Element {
  const [state, setState] = useState<OverlayState>({ status: 'idle' })
  const [showModifyMenu, setShowModifyMenu] = useState(false)
  const [isPasting, setIsPasting] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const modifyRef = useRef<HTMLDivElement>(null)
  const { dragHandleProps } = useOverlayDrag()

  useEffect(() => {
    const unsubLoading = window.electronAPI.onTranslateLoading((payload) => {
      setShowModifyMenu(false)
      setState({
        status: 'loading',
        original: payload.original,
        message: payload.message,
        mode: payload.mode ?? 'translate'
      })
    })

    const unsubResult = window.electronAPI.onTranslateResult((payload) => {
      setShowModifyMenu(false)
      setState({
        status: 'success',
        original: payload.original,
        translation: payload.translation,
        imageDataUrl: payload.imageDataUrl,
        mode: payload.mode ?? 'translate'
      })
    })

    const unsubError = window.electronAPI.onTranslateError((payload) => {
      setShowModifyMenu(false)
      setState({ status: 'error', message: payload.message })
    })

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        window.electronAPI.closeOverlay()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      unsubLoading()
      unsubResult()
      unsubError()
      window.removeEventListener('keydown', onKeyDown)
      cancelSpeech()
    }
  }, [])

  useEffect(() => {
    if (!showModifyMenu) {
      return
    }

    const onPointerDown = (event: MouseEvent): void => {
      if (modifyRef.current && !modifyRef.current.contains(event.target as Node)) {
        setShowModifyMenu(false)
      }
    }

    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [showModifyMenu])

  const handlePaste = async (): Promise<void> => {
    if (state.status !== 'success' || isPasting) {
      return
    }

    setIsPasting(true)
    try {
      await window.electronAPI.pasteTranslation(state.translation)
    } finally {
      setIsPasting(false)
    }
  }

  const handleRetone = (tone: RetoneOption): void => {
    if (state.status !== 'success') {
      return
    }

    setShowModifyMenu(false)
    void window.electronAPI.retoneTranslation(state.original, { tone })
  }

  const handleRetarget = (targetLang: TranslationTargetLang): void => {
    if (state.status !== 'success') {
      return
    }

    setShowModifyMenu(false)
    void window.electronAPI.retoneTranslation(state.original, { targetLang })
  }

  const handleSpeak = async (): Promise<void> => {
    if (state.status !== 'success' || isSpeaking) {
      return
    }

    setIsSpeaking(true)
    try {
      await speakText(state.original)
    } finally {
      setIsSpeaking(false)
    }
  }

  if (state.status === 'idle') {
    return <div className="overlay-card overlay-hidden" />
  }

  const mode = state.status === 'error' ? 'translate' : state.mode
  const isReply = mode === 'reply'

  return (
    <div className={`overlay-card${isReply ? ' overlay-card-reply' : ''}`}>
      <div className="overlay-header overlay-drag-handle" {...dragHandleProps}>
        <span className="overlay-title">{isReply ? '回覆建議' : APP_NAME}</span>
        <button
          type="button"
          className="overlay-close"
          onClick={() => window.electronAPI.closeOverlay()}
          aria-label="關閉"
        >
          ×
        </button>
      </div>

      {state.status === 'loading' && (
        <div className="overlay-body">
          <div className="overlay-spinner" />
          <p className="overlay-status">
            {state.message ??
              (isReply ? '思考回覆中…' : state.original ? '翻譯中…' : '讀取剪貼簿…')}
          </p>
          {state.original && (
            <>
              {isReply && <p className="overlay-section-label">對方訊息</p>}
              <p className="overlay-original">{truncate(state.original, MAX_ORIGINAL_PREVIEW)}</p>
            </>
          )}
        </div>
      )}

      {state.status === 'success' && (
        <>
          {!isReply && state.imageDataUrl && (
            <ZoomableImage src={state.imageDataUrl} alt="譯文圖預覽" />
          )}

          <div
            className={`overlay-body${state.imageDataUrl && !isReply ? ' overlay-body-with-image' : ''}${isReply ? ' overlay-body-reply' : ''}`}
          >
            <p className="overlay-section-label">{isReply ? '對方訊息' : '原文'}</p>
            <p className="overlay-original">
              {state.imageDataUrl && !isReply
                ? state.original
                : truncate(state.original, MAX_ORIGINAL_PREVIEW)}
            </p>
            <p className="overlay-section-label">{isReply ? '建議回覆' : '譯文'}</p>
            <p className="overlay-translation">{state.translation}</p>
          </div>

          {!isReply && state.imageDataUrl && (
            <div className="overlay-clipboard-note">譯文圖已複製到剪貼簿（Ctrl+V 可貼上）</div>
          )}

          <div className="overlay-actions">
            <button
              type="button"
              className="overlay-action overlay-action-primary"
              onClick={() => void handlePaste()}
              disabled={isPasting}
            >
              {isPasting ? '貼上中…' : '貼上'}
            </button>

            {!isReply && (
              <button
                type="button"
                className="overlay-action"
                onClick={() => void handleSpeak()}
                disabled={isSpeaking}
              >
                {isSpeaking ? '播放中…' : '發音'}
              </button>
            )}

            {!isReply && (
              <div className="overlay-modify" ref={modifyRef}>
                <button
                  type="button"
                  className="overlay-action"
                  onClick={() => setShowModifyMenu((open) => !open)}
                >
                  修改 ▾
                </button>

                {showModifyMenu && (
                  <div className="overlay-modify-menu">
                    <p className="overlay-modify-menu-label">語氣</p>
                    <button type="button" onClick={() => handleRetone('colloquial')}>
                      更自然
                    </button>
                    <button type="button" onClick={() => handleRetone('professional')}>
                      更專業
                    </button>
                    <div className="overlay-modify-menu-divider" role="separator" />
                    <p className="overlay-modify-menu-label">翻譯為</p>
                    <button type="button" onClick={() => handleRetarget('zh')}>
                      繁中
                    </button>
                    <button type="button" onClick={() => handleRetarget('en')}>
                      英文
                    </button>
                    <button type="button" onClick={() => handleRetarget('ko')}>
                      韓文
                    </button>
                    <button type="button" onClick={() => handleRetarget('ja')}>
                      日文
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {state.status === 'error' && (
        <div className="overlay-body">
          <p className="overlay-error">{state.message}</p>
        </div>
      )}

      <div className="overlay-footer">Esc 關閉</div>
    </div>
  )
}
