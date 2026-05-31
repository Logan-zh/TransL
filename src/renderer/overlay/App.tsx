import { useEffect, useRef, useState } from 'react'
import ZoomableImage from './ZoomableImage'

type OverlayState =
  | { status: 'idle' }
  | { status: 'loading'; original: string; message?: string }
  | { status: 'success'; original: string; translation: string; imageDataUrl?: string }
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
  const modifyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsubLoading = window.electronAPI.onTranslateLoading((payload) => {
      setShowModifyMenu(false)
      setState({ status: 'loading', original: payload.original, message: payload.message })
    })

    const unsubResult = window.electronAPI.onTranslateResult((payload) => {
      setShowModifyMenu(false)
      setState({
        status: 'success',
        original: payload.original,
        translation: payload.translation,
        imageDataUrl: payload.imageDataUrl
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

  const handleRetone = (tone: 'colloquial' | 'professional'): void => {
    if (state.status !== 'success') {
      return
    }

    setShowModifyMenu(false)
    void window.electronAPI.retoneTranslation(state.original, tone)
  }

  if (state.status === 'idle') {
    return <div className="overlay-card overlay-hidden" />
  }

  return (
    <div className="overlay-card">
      <div className="overlay-header">
        <span className="overlay-title">TransL</span>
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
            {state.message ?? (state.original ? '翻譯中…' : '讀取剪貼簿…')}
          </p>
          {state.original && (
            <p className="overlay-original">{truncate(state.original, MAX_ORIGINAL_PREVIEW)}</p>
          )}
        </div>
      )}

      {state.status === 'success' && (
        <>
          {state.imageDataUrl && (
            <ZoomableImage src={state.imageDataUrl} alt="譯文圖預覽" />
          )}

          <div className={`overlay-body${state.imageDataUrl ? ' overlay-body-with-image' : ''}`}>
            <p className="overlay-original">
              {state.imageDataUrl ? state.original : truncate(state.original, MAX_ORIGINAL_PREVIEW)}
            </p>
            <p className="overlay-translation">{state.translation}</p>
          </div>

          {state.imageDataUrl && (
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
                  <button type="button" onClick={() => handleRetone('colloquial')}>
                    更平易近人
                  </button>
                  <button type="button" onClick={() => handleRetone('professional')}>
                    更專業
                  </button>
                </div>
              )}
            </div>
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
