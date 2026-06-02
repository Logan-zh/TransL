import Store from 'electron-store'
import type { AuthTokens } from './config'

interface AuthStoreSchema {
  tokens: AuthTokens | null
}

const store = new Store<AuthStoreSchema>({
  name: 'transl-auth',
  defaults: {
    tokens: null
  }
})

export function getAuthTokens(): AuthTokens | null {
  return store.get('tokens')
}

export function saveAuthTokens(tokens: AuthTokens): void {
  store.set('tokens', tokens)
}

export function clearAuthTokens(): void {
  store.set('tokens', null)
}

export function isAccessTokenValid(): boolean {
  const tokens = getAuthTokens()
  if (!tokens?.accessToken) {
    return false
  }
  return Date.now() < tokens.expiresAt - 60_000
}

/** 磁碟上仍有可恢復的登入（含 refresh token） */
export function hasStoredSession(): boolean {
  const tokens = getAuthTokens()
  if (!tokens) {
    return false
  }
  return Boolean(tokens.refreshToken) || isAccessTokenValid()
}
