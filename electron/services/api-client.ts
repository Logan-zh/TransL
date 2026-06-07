import {
  ApiError,
  createHttpClient,
  decodeJwtExpiry,
  refreshTokensOrThrow
} from '@transl/shared'
import {
  clearAuthTokens,
  getAuthTokens,
  isAccessTokenValid,
  saveAuthTokens
} from './auth-store'
import type { ImageTranslationResult, TranslationDirection, TranslationTargetLang, TranslationTone } from '@transl/shared'
import type { AuthTokens, MemberProfile, RetoneOption } from './config'
import { getApiBaseUrl } from './api-config'

export { ApiError }

const http = createHttpClient({
  resolveUrl: (path) => `${getApiBaseUrl()}${path}`,
  getAccessToken: () => getAuthTokens()?.accessToken,
  getRefreshToken: () => getAuthTokens()?.refreshToken,
  onTokensRefreshed: (accessToken, refreshToken) => {
    saveAuthTokens({
      accessToken,
      refreshToken,
      expiresAt: decodeJwtExpiry(accessToken)
    })
  },
  onAuthFailure: () => clearAuthTokens(),
  formatNotFound: (message, url) =>
    `${message}（${url}）— 請確認 TRANSL_API_URL 指向 NestJS API（:3000），且 nginx 有轉發 /api/`,
  quotaExceededHint: ' 請至官網會員入口查看本月配額。'
})

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  return http.request<T>(path, options, retry)
}

export async function login(username: string, password: string): Promise<MemberProfile> {
  const result = await request<{
    accessToken: string
    refreshToken: string
    member: { username: string }
  }>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ username, password })
    },
    false
  )

  const tokens: AuthTokens = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: decodeJwtExpiry(result.accessToken)
  }
  saveAuthTokens(tokens)
  return getProfile()
}

export async function refreshTokens(): Promise<void> {
  const tokens = getAuthTokens()
  if (!tokens?.refreshToken) {
    clearAuthTokens()
    throw new ApiError('請重新登入', 'UNAUTHORIZED', 401)
  }

  await refreshTokensOrThrow(http, {
    missing: '請重新登入',
    expired: '登入已過期，請重新登入'
  })
}

export async function ensureAuthenticated(): Promise<void> {
  if (isAccessTokenValid()) {
    return
  }
  const tokens = getAuthTokens()
  if (tokens?.refreshToken) {
    await refreshTokens()
    return
  }
  throw new ApiError('請先登入會員帳號', 'UNAUTHORIZED', 401)
}

export async function getProfile(): Promise<MemberProfile> {
  await ensureAuthenticated()
  return request<MemberProfile>('/api/me')
}

export function logout(): void {
  clearAuthTokens()
}

export async function translateTextApi(
  text: string,
  direction: TranslationDirection,
  tone: TranslationTone = 'default',
  targetLang?: TranslationTargetLang
): Promise<string> {
  await ensureAuthenticated()
  const result = await request<{ translation: string }>('/api/translate/text', {
    method: 'POST',
    body: JSON.stringify({ text, direction, tone, ...(targetLang ? { targetLang } : {}) })
  })
  return result.translation
}

export async function translateImageApi(
  imageBase64: string,
  tone: TranslationTone = 'default'
): Promise<ImageTranslationResult> {
  await ensureAuthenticated()
  return request('/api/translate/image', {
    method: 'POST',
    body: JSON.stringify({ imageBase64, tone })
  })
}

export async function retoneApi(
  original: string,
  options: {
    tone?: RetoneOption
    targetLang?: TranslationTargetLang
  }
): Promise<string> {
  await ensureAuthenticated()
  const result = await request<{ translation: string }>('/api/translate/retone', {
    method: 'POST',
    body: JSON.stringify({ original, ...options })
  })
  return result.translation
}

export async function suggestReplyApi(text: string): Promise<string> {
  await ensureAuthenticated()
  const result = await request<{ suggestion: string }>('/api/translate/reply-suggest', {
    method: 'POST',
    body: JSON.stringify({ text })
  })
  return result.suggestion
}
