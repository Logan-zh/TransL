import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ApiError } from './api/api-error'
import { createHttpClient } from './api/http-client'
import { resolveApiBaseUrl } from './util/api-base-url'
import { formatIpcInvokeError } from './util/ipc-error'
import { resolvePublicDownloadUrl } from './util/resolve-public-download-url'

describe('resolveApiBaseUrl', () => {
  it('prefers runtime TRANSL_API_URL over build-time', () => {
    expect(resolveApiBaseUrl('https://api-demol.towkr.com', 'https://api-transl.towkr.com')).toBe(
      'https://api-demol.towkr.com'
    )
  })

  it('uses build-time URL when runtime is empty', () => {
    expect(resolveApiBaseUrl('', 'https://api-demol.towkr.com')).toBe('https://api-demol.towkr.com')
  })

  it('strips trailing slashes', () => {
    expect(resolveApiBaseUrl('https://api-demol.towkr.com/')).toBe('https://api-demol.towkr.com')
  })

  it('falls back to localhost for dev', () => {
    expect(resolveApiBaseUrl(undefined, undefined)).toBe('http://localhost:3000')
  })
})

describe('formatIpcInvokeError', () => {
  it('removes Electron IPC prefix from login errors', () => {
    expect(
      formatIpcInvokeError(
        "Error invoking remote method 'auth:login': Error: 無法連線 API（https://api-demol.towkr.com/api/auth/login）：fetch failed"
      )
    ).toBe('Error: 無法連線 API（https://api-demol.towkr.com/api/auth/login）：fetch failed')
  })

  it('leaves plain messages unchanged', () => {
    expect(formatIpcInvokeError('帳號或密碼錯誤')).toBe('帳號或密碼錯誤')
  })
})

describe('createHttpClient network errors', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.stubGlobal('fetch', originalFetch)
  })

  it('throws ApiError NETWORK_ERROR on fetch failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'))

    const client = createHttpClient({
      resolveUrl: (path) => `https://api-demol.towkr.com${path}`,
      getAccessToken: () => null
    })

    await expect(
      client.request('/api/auth/login', { method: 'POST', body: '{}' }, false)
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiError)
      const apiError = error as ApiError
      expect(apiError.code).toBe('NETWORK_ERROR')
      expect(apiError.message).toContain('api-demol.towkr.com')
      expect(apiError.message).toContain('fetch failed')
      return true
    })
  })
})

describe('resolvePublicDownloadUrl', () => {
  it('resolves API relative download path with site origin', () => {
    expect(
      resolvePublicDownloadUrl('/downloads/DEMOL-Setup-latest.exe', 'https://demol.towkr.com')
    ).toBe('https://demol.towkr.com/downloads/DEMOL-Setup-latest.exe')
  })
})
