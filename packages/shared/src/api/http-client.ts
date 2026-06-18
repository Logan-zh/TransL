import { ApiError, parseNestErrorResponse, type ParseNestErrorOptions } from './api-error'

export interface HttpClient {
  request<T>(path: string, options?: RequestInit, retryOnUnauthorized?: boolean): Promise<T>
  refreshAccessToken(): Promise<string | null>
}

export interface CreateHttpClientOptions extends ParseNestErrorOptions {
  resolveUrl: (path: string) => string
  getAccessToken: () => string | null | undefined
  getRefreshToken?: () => string | null | undefined
  onTokensRefreshed?: (accessToken: string, refreshToken: string) => void
  onAuthFailure?: () => void
  /** 401 且無法 refresh 時（或 admin 單 token 模式） */
  onUnauthorized?: (path: string) => void | Promise<void>
  shouldRetryUnauthorized?: (path: string) => boolean
}

export function createHttpClient(options: CreateHttpClientOptions): HttpClient {
  let refreshPromise: Promise<string | null> | null = null

  async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = options.getRefreshToken?.()
    if (!refreshToken) {
      options.onAuthFailure?.()
      return null
    }

    const response = await fetch(options.resolveUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })

    if (!response.ok) {
      options.onAuthFailure?.()
      return null
    }

    const data = (await response.json()) as { accessToken: string; refreshToken: string }
    options.onTokensRefreshed?.(data.accessToken, data.refreshToken)
    return data.accessToken
  }

  async function refreshAccessTokenOnce(): Promise<string | null> {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null
      })
    }
    return refreshPromise
  }

  async function request<T>(
    path: string,
    init: RequestInit = {},
    retryOnUnauthorized = true
  ): Promise<T> {
    const accessToken = options.getAccessToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined)
    }
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    const url = options.resolveUrl(path)
    let response: Response
    try {
      response = await fetch(url, { ...init, headers })
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      throw new ApiError(`無法連線 API（${url}）：${detail}`, 'NETWORK_ERROR', 0)
    }

    const canRetry =
      retryOnUnauthorized &&
      response.status === 401 &&
      accessToken &&
      options.getRefreshToken &&
      (options.shouldRetryUnauthorized?.(path) ?? true)

    if (canRetry) {
      const newToken = await refreshAccessTokenOnce()
      if (newToken) {
        return request<T>(path, init, false)
      }
    }

    if (response.status === 401 && options.onUnauthorized) {
      await options.onUnauthorized(path)
    }

    if (!response.ok) {
      throw await parseNestErrorResponse(response, url, options)
    }

    return response.json() as Promise<T>
  }

  return { request, refreshAccessToken }
}

/** 桌面端 refresh 失敗時拋出 ApiError */
export async function refreshTokensOrThrow(
  client: HttpClient,
  messages: { missing: string; expired: string }
): Promise<void> {
  const token = await client.refreshAccessToken()
  if (!token) {
    throw new ApiError(messages.expired, 'UNAUTHORIZED', 401)
  }
}
