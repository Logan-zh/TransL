declare const __TRANSL_API_URL__: string | undefined

const DEFAULT_API_URL = 'http://localhost:3000'

/** API base URL from TRANSL_API_URL (runtime) or build-time .env, for deployment configuration. */
export function getApiBaseUrl(): string {
  const runtime = process.env.TRANSL_API_URL?.trim()
  if (runtime) {
    return runtime.replace(/\/$/, '')
  }

  if (typeof __TRANSL_API_URL__ !== 'undefined' && __TRANSL_API_URL__) {
    return __TRANSL_API_URL__.replace(/\/$/, '')
  }

  return DEFAULT_API_URL
}
