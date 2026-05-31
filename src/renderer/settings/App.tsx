import { FormEvent, useEffect, useState } from 'react'

type ProviderId = 'openai' | 'gemini'

interface SettingsForm {
  provider: ProviderId
  openaiApiKey: string
  geminiApiKey: string
  openaiModel: string
  geminiModel: string
}

export default function App(): JSX.Element {
  const [form, setForm] = useState<SettingsForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void window.electronAPI.getSettings().then((settings) => {
      setForm(settings)
    })
  }, [])

  const updateField = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]): void => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    if (!form) return

    setSaving(true)
    setMessage(null)

    try {
      await window.electronAPI.saveSettings(form)
      setMessage('設定已儲存。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  if (!form) {
    return (
      <div className="settings-page">
        <p>載入中…</p>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1>TransL 設定</h1>
        <p>選取文字後，按住 Ctrl 在 0.8 秒內連按兩次 C 呼叫翻譯窗。</p>
      </header>

      <form className="settings-form" onSubmit={(e) => void handleSubmit(e)}>
        <section className="settings-section">
          <label htmlFor="provider">翻譯服務</label>
          <select
            id="provider"
            value={form.provider}
            onChange={(e) => updateField('provider', e.target.value as ProviderId)}
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </section>

        {form.provider === 'openai' && (
          <>
            <section className="settings-section">
              <label htmlFor="openaiApiKey">OpenAI API Key</label>
              <input
                id="openaiApiKey"
                type="password"
                value={form.openaiApiKey}
                onChange={(e) => updateField('openaiApiKey', e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
              />
            </section>
            <section className="settings-section">
              <label htmlFor="openaiModel">OpenAI Model</label>
              <input
                id="openaiModel"
                type="text"
                value={form.openaiModel}
                onChange={(e) => updateField('openaiModel', e.target.value)}
                placeholder="gpt-4o-mini"
              />
            </section>
          </>
        )}

        {form.provider === 'gemini' && (
          <>
            <section className="settings-section">
              <label htmlFor="geminiApiKey">Gemini API Key</label>
              <input
                id="geminiApiKey"
                type="password"
                value={form.geminiApiKey}
                onChange={(e) => updateField('geminiApiKey', e.target.value)}
                placeholder="AIza..."
                autoComplete="off"
              />
            </section>
            <section className="settings-section">
              <label htmlFor="geminiModel">Gemini Model</label>
              <input
                id="geminiModel"
                type="text"
                value={form.geminiModel}
                onChange={(e) => updateField('geminiModel', e.target.value)}
                placeholder="gemini-2.0-flash"
              />
            </section>
          </>
        )}

        <button type="submit" className="settings-save" disabled={saving}>
          {saving ? '儲存中…' : '儲存設定'}
        </button>

        {message && <p className="settings-message">{message}</p>}
      </form>

      <footer className="settings-footer">
        <p>
          使用方式：選取文字 → 0.8 秒內連按兩次 Ctrl+C → 浮動窗顯示譯文。
          也可從系統匣右鍵「翻譯目前剪貼簿」手動觸發。
        </p>
      </footer>
    </div>
  )
}
