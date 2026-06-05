export default function App(): JSX.Element {
  return (
    <div className="selection-trigger-bar">
      <button
        type="button"
        className="selection-trigger-btn selection-trigger-btn-translate"
        aria-label="翻譯選取文字"
        onClick={() => window.electronAPI.activateSelectionTranslate()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M4 5h8v2H6.4l5.3 5.3-1.4 1.4L5 8.4V11H3V5zm9 9h8v6h-2v-2.6l-5.3 5.3-1.4-1.4L16 15.6V19h-2v-5z"
          />
        </svg>
      </button>
      <button
        type="button"
        className="selection-trigger-btn selection-trigger-btn-close"
        aria-label="關閉"
        onClick={() => window.electronAPI.dismissSelectionTrigger()}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.89 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"
          />
        </svg>
      </button>
    </div>
  )
}
