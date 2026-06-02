export default function App(): JSX.Element {
  return (
    <button
      type="button"
      className="selection-trigger-btn"
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
  )
}
