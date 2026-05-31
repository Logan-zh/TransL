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
