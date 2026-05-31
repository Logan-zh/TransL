import { useEffect, useState } from 'react'

type OverlayState =
  | { status: 'idle' }
  | { status: 'loading'; original: string }
  | { status: 'success'; original: string; translation: string }
  | { status: 'error'; message: string }

const MAX_ORIGINAL_PREVIEW = 200

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

export default function App(): JSX.Element {
  const [state, setState] = useState<OverlayState>({ status: 'idle' })

  useEffect(() => {
    const unsubLoading = window.electronAPI.onTranslateLoading((payload) => {
      setState({ status: 'loading', original: payload.original })
    })

    const unsubResult = window.electronAPI.onTranslateResult((payload) => {
      setState({
        status: 'success',
        original: payload.original,
        translation: payload.translation
      })
    })

    const unsubError = window.electronAPI.onTranslateError((payload) => {
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
          <p className="overlay-status">{state.original ? '翻譯中…' : '讀取剪貼簿…'}</p>
          {state.original && (
            <p className="overlay-original">{truncate(state.original, MAX_ORIGINAL_PREVIEW)}</p>
          )}
        </div>
      )}

      {state.status === 'success' && (
        <div className="overlay-body">
          <p className="overlay-original">{truncate(state.original, MAX_ORIGINAL_PREVIEW)}</p>
          <p className="overlay-translation">{state.translation}</p>
        </div>
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
