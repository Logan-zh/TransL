import {
  clearAuthTokens,
  getAuthTokens,
  isAccessTokenValid,
  saveAuthTokens
} from './auth-store'
import type { AuthTokens, MemberProfile } from './config'
import { getApiBaseUrl } from './api-config'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function getBaseUrl(): string {
  return getApiBaseUrl()
}

async function parseError(response: Response, requestUrl: string): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as {
    message?: string | string[] | { code?: string; message?: string }
    code?: string
  }

  if (typeof body.message === 'object' && body.message !== null && !Array.isArray(body.message)) {
    const nested = body.message
    return new ApiError(
      formatErrorMessage(nested.message ?? '請求失敗', response.status, requestUrl),
      nested.code,
      response.status
    )
  }

  const message = Array.isArray(body.message)
    ? body.message.join(', ')
    : body.message ?? `HTTP ${response.status}`
  const code =
    typeof body.message === 'object' && body.message !== null && !Array.isArray(body.message)
      ? body.message.code
      : body.code
  const hint =
    code === 'QUOTA_EXCEEDED' ? ' 請至官網會員入口查看本月配額。' : ''
  return new ApiError(
    formatErrorMessage(`${message}${hint}`, response.status, requestUrl),
    code,
    response.status
  )
}

function formatErrorMessage(message: string, status: number, requestUrl: string): string {
  if (status === 404) {
    return `${message}（${requestUrl}）— 請確認 TRANSL_API_URL 指向 NestJS API（:3000），且 nginx 有轉發 /api/`
  }
  return message
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const tokens = getAuthTokens()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined)
  }
  if (tokens?.accessToken) {
    headers.Authorization = `Bearer ${tokens.accessToken}`
  }

  const url = `${getBaseUrl()}${path}`
  const response = await fetch(url, {
    ...options,
    headers
  })

  if (response.status === 401 && retry && tokens?.refreshToken) {
    await refreshTokens()
    return request<T>(path, options, false)
  }

  if (!response.ok) {
    throw await parseError(response, url)
  }

  return response.json() as Promise<T>
}

function decodeExpiry(accessToken: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString('utf8')
    ) as { exp?: number }
    return payload.exp ? payload.exp * 1000 : Date.now() + 3_600_000
  } catch {
    return Date.now() + 3_600_000
  }
}

export async function login(username: string, password: string): Promise<MemberProfile> {
  const result = await request<{
    accessToken: string
    refreshToken: string
    member: { username: string }
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  }, false)

  const tokens: AuthTokens = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: decodeExpiry(result.accessToken)
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

  const result = await fetch(`${getBaseUrl()}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokens.refreshToken })
  })

  if (!result.ok) {
    clearAuthTokens()
    throw new ApiError('登入已過期，請重新登入', 'UNAUTHORIZED', 401)
  }

  const data = (await result.json()) as { accessToken: string; refreshToken: string }
  saveAuthTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: decodeExpiry(data.accessToken)
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
  direction: 'en-to-zh' | 'zh-to-en',
  tone: 'default' | 'colloquial' | 'professional' = 'default',
  targetLang?: 'zh' | 'en' | 'ko' | 'ja'
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
  tone: 'default' | 'colloquial' | 'professional' = 'default'
): Promise<{
  original: string
  translation: string
  blocks: Array<{
    original: string
    translation: string
    x: number
    y: number
    width: number
    height: number
  }>
}> {
  await ensureAuthenticated()
  return request('/api/translate/image', {
    method: 'POST',
    body: JSON.stringify({ imageBase64, tone })
  })
}

export async function retoneApi(
  original: string,
  options: {
    tone?: 'colloquial' | 'professional'
    targetLang?: 'zh' | 'en' | 'ko' | 'ja'
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
