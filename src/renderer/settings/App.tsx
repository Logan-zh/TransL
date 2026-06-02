import { FormEvent, useEffect, useState } from 'react'
import type {
  AppHotkeys,
  HotkeyBinding,
  SessionInfo,
  TranslateOverlayHotkey
} from '../../../electron/services/config'
import {
  DEFAULT_HOTKEYS,
  DEFAULT_HOTKEY_TRANSLATE_PASTE
} from '../../../electron/services/config'
import { formatHotkeyBinding, normalizeHotkeyKey } from '../../../electron/services/hotkey-codes'

function cloneBinding(binding: HotkeyBinding): HotkeyBinding {
  return { ...binding }
}

function HotkeyBindingEditor({
  label,
  binding,
  onChange,
  onCapture,
  capturing
}: {
  label: string
  binding: HotkeyBinding
  onChange: (binding: HotkeyBinding) => void
  onCapture: () => void
  capturing: boolean
}): JSX.Element {
  return (
    <div className="hotkey-row">
      <div className="hotkey-row-head">
        <span className="hotkey-label">{label}</span>
        <span className="hotkey-preview">{formatHotkeyBinding(binding)}</span>
      </div>
      <div className="hotkey-modifiers">
        <label>
          <input
            type="checkbox"
            checked={binding.ctrl}
            onChange={(e) => onChange({ ...binding, ctrl: e.target.checked })}
          />
          Ctrl
        </label>
        <label>
          <input
            type="checkbox"
            checked={binding.alt}
            onChange={(e) => onChange({ ...binding, alt: e.target.checked })}
          />
          Alt
        </label>
        <label>
          <input
            type="checkbox"
            checked={binding.shift}
            onChange={(e) => onChange({ ...binding, shift: e.target.checked })}
          />
          Shift
        </label>
        <label className="hotkey-key-field">
          主鍵
          <input
            type="text"
            maxLength={3}
            value={binding.key}
            onChange={(e) => {
              const key = normalizeHotkeyKey(e.target.value) ?? e.target.value.toUpperCase()
              onChange({ ...binding, key })
            }}
            placeholder="D、C、F4"
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={binding.doubleTap}
            onChange={(e) => onChange({ ...binding, doubleTap: e.target.checked })}
          />
          連按兩次
        </label>
      </div>
      <div className="hotkey-row-actions">
        <button type="button" className="settings-secondary" onClick={onCapture} disabled={capturing}>
          {capturing ? '請按下快捷鍵…' : '錄製'}
        </button>
      </div>
    </div>
  )
}

export default function App(): JSX.Element {
  const [openAtLogin, setOpenAtLogin] = useState(false)
  const [hotkeys, setHotkeys] = useState<AppHotkeys>(DEFAULT_HOTKEYS)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [capturingId, setCapturingId] = useState<string | null>(null)

  const refresh = async (): Promise<void> => {
    const [settings, sessionInfo] = await Promise.all([
      window.electronAPI.getSettings(),
      window.electronAPI.getSession()
    ])
    setOpenAtLogin(settings.openAtLogin)
    setHotkeys(settings.hotkeys)
    setSession(sessionInfo)
  }

  useEffect(() => {
    void refresh().catch((error) => {
      setMessage(error instanceof Error ? error.message : '載入失敗')
    })

    const unsubSession = window.electronAPI.onSessionChanged((sessionInfo) => {
      setSession(sessionInfo)
    })

    const onFocus = (): void => {
      void refresh().catch(() => {})
    }
    window.addEventListener('focus', onFocus)

    return () => {
      unsubSession()
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await window.electronAPI.saveSettings({ openAtLogin, hotkeys })
      setMessage('設定已儲存，快捷鍵已套用。')
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

  const captureFor = async (targetId: string, apply: (binding: HotkeyBinding) => void): Promise<void> => {
    setCapturingId(targetId)
    setMessage(null)
    try {
      const binding = await window.electronAPI.captureHotkey()
      apply(binding)
      setMessage(`已錄製：${formatHotkeyBinding(binding)}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '錄製失敗')
    } finally {
      setCapturingId(null)
    }
  }

  const setOverlay = (overlay: TranslateOverlayHotkey): void => {
    setHotkeys((prev) => ({ ...prev, translateOverlay: overlay }))
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
        <p>登入後可自訂全域快捷鍵；變更後請按「儲存設定」。</p>
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
        <section className="settings-section hotkeys-card">
          <h2>快捷鍵</h2>
          <p className="settings-hint">
            支援 Ctrl / Alt / Shift 組合，主鍵為 A–Z、0–9、F1–F12。可勾選「連按兩次」或按「錄製」自動偵測。
          </p>

          <div className="hotkey-group">
            <h3>翻譯浮動窗</h3>
            <label className="hotkey-mode">
              <input
                type="radio"
                name="overlayMode"
                checked={hotkeys.translateOverlay.mode === 'clipboard'}
                onChange={() => setOverlay({ mode: 'clipboard' })}
              />
              剪貼簿雙複製（預設：0.8 秒內連按兩次 Ctrl+C）
            </label>
            <label className="hotkey-mode">
              <input
                type="radio"
                name="overlayMode"
                checked={hotkeys.translateOverlay.mode === 'keyboard'}
                onChange={() =>
                  setOverlay({
                    mode: 'keyboard',
                    binding: cloneBinding(DEFAULT_HOTKEY_TRANSLATE_PASTE)
                  })
                }
              />
              自訂按鍵
            </label>
            {hotkeys.translateOverlay.mode === 'keyboard' && (
              <HotkeyBindingEditor
                label="翻譯浮動窗"
                binding={hotkeys.translateOverlay.binding}
                onChange={(binding) => setOverlay({ mode: 'keyboard', binding })}
                capturing={capturingId === 'translateOverlay'}
                onCapture={() =>
                  void captureFor('translateOverlay', (binding) =>
                    setOverlay({ mode: 'keyboard', binding })
                  )
                }
              />
            )}
          </div>

          <HotkeyBindingEditor
            label="翻譯並貼上"
            binding={hotkeys.translatePaste}
            onChange={(translatePaste) => setHotkeys((prev) => ({ ...prev, translatePaste }))}
            capturing={capturingId === 'translatePaste'}
            onCapture={() =>
              void captureFor('translatePaste', (translatePaste) =>
                setHotkeys((prev) => ({ ...prev, translatePaste }))
              )
            }
          />

          <HotkeyBindingEditor
            label="回覆建議"
            binding={hotkeys.replySuggest}
            onChange={(replySuggest) => setHotkeys((prev) => ({ ...prev, replySuggest }))}
            capturing={capturingId === 'replySuggest'}
            onCapture={() =>
              void captureFor('replySuggest', (replySuggest) =>
                setHotkeys((prev) => ({ ...prev, replySuggest }))
              )
            }
          />

          <HotkeyBindingEditor
            label="截圖翻譯"
            binding={hotkeys.screenshotTranslate}
            onChange={(screenshotTranslate) =>
              setHotkeys((prev) => ({ ...prev, screenshotTranslate }))
            }
            capturing={capturingId === 'screenshotTranslate'}
            onCapture={() =>
              void captureFor('screenshotTranslate', (screenshotTranslate) =>
                setHotkeys((prev) => ({ ...prev, screenshotTranslate }))
              )
            }
          />

          <button
            type="button"
            className="settings-secondary hotkey-reset-all"
            onClick={() => setHotkeys(DEFAULT_HOTKEYS)}
          >
            全部恢復預設
          </button>
        </section>

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

        <button type="submit" className="settings-save" disabled={saving || capturingId !== null}>
          {saving ? '儲存中…' : '儲存設定'}
        </button>
        {message && (
          <p className={`settings-message${message.includes('失敗') || message.includes('相同') ? ' settings-message-error' : ''}`}>
            {message}
          </p>
        )}
      </form>

      <footer className="settings-footer">
        <p>預設：翻譯浮動窗＝Ctrl+C×2｜翻譯貼上＝Ctrl+Alt+D×2｜回覆建議＝Ctrl+Q×2｜截圖＝Ctrl+Alt+S×2</p>
      </footer>
    </div>
  )
}
