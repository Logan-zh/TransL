import { FormEvent, useEffect, useState } from 'react'

export default function App(): JSX.Element {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [version, setVersion] = useState('')

  useEffect(() => {
    void window.electronAPI.getAppVersion().then(setVersion)
  }, [])

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await window.electronAPI.login({ username, password })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={(e) => void handleSubmit(e)}>
        <h1>{version ? `TransL v${version}` : 'TransL'}</h1>
        <p className="login-hint">請使用管理後台建立的會員帳號登入</p>
        <label>
          帳號
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          密碼
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="login-error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? '登入中…' : '登入'}
        </button>
      </form>
    </div>
  )
}
