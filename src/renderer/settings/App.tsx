import { FormEvent, useEffect, useState } from 'react'
import type { SessionInfo } from '../../../electron/services/config'

export default function App(): JSX.Element {
  const [openAtLogin, setOpenAtLogin] = useState(false)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = async (): Promise<void> => {
    const [settings, sessionInfo] = await Promise.all([
      window.electronAPI.getSettings(),
      window.electronAPI.getSession()
    ])
    setOpenAtLogin(settings.openAtLogin)
    setSession(sessionInfo)
  }

  useEffect(() => {
    void refresh().catch((error) => {
      setMessage(error instanceof Error ? error.message : '載入失敗')
    })
  }, [])

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await window.electronAPI.saveSettings({ openAtLogin })
      setMessage('設定已儲存。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async (): Promise<void> => {
    await window.electronAPI.logout()
    window.electronAPI.openLogin()
  }

  if (!session) {
    return (
      <div className="settings-page">
        <p>載入中…</p>
      </div>
    )
  }

  const profile = session.profile

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1>TransL 設定</h1>
        <p>2.0 會員版：翻譯服務由管理後台指派，請先登入會員帳號。</p>
      </header>

      <section className="settings-section session-card">
        <h2>登入狀態</h2>
        {session.loggedIn && profile ? (
          <>
            <p>
              <strong>{profile.username}</strong>
              {profile.displayName ? `（${profile.displayName}）` : ''}
            </p>
            <p className="settings-hint">
              指派服務：
              {profile.provider
                ? `${profile.provider.name} (${profile.provider.provider} / ${profile.provider.model})`
                : '尚未指派，請聯絡管理員'}
            </p>
            <button type="button" className="settings-secondary" onClick={() => void handleLogout()}>
              登出
            </button>
          </>
        ) : (
          <>
            <p className="settings-hint">尚未登入</p>
            <button type="button" className="settings-secondary" onClick={() => window.electronAPI.openLogin()}>
              登入
            </button>
          </>
        )}
      </section>

      {session.legacyApiKeyDetected && (
        <p className="settings-warning">
          偵測到 1.x 版本的本機 API Key 設定。2.0 起請改由管理員建立會員帳號登入，本機 Key 已不再使用。
        </p>
      )}

      <form className="settings-form" onSubmit={(e) => void handleSubmit(e)}>
        <section className="settings-section settings-checkbox-row">
          <label htmlFor="openAtLogin" className="settings-checkbox-label">
            <input
              id="openAtLogin"
              type="checkbox"
              checked={openAtLogin}
              onChange={(e) => setOpenAtLogin(e.target.checked)}
            />
            <span>開機時自動啟動</span>
          </label>
        </section>

        <button type="submit" className="settings-save" disabled={saving}>
          {saving ? '儲存中…' : '儲存設定'}
        </button>
        {message && <p className="settings-message">{message}</p>}
      </form>
    </div>
  )
}
