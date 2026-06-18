import { resolveApiBaseUrl } from '@transl/shared'

declare const __TRANSL_API_URL__: string | undefined

/** API base URL from TRANSL_API_URL (runtime) or build-time .env, for deployment configuration. */
export function getApiBaseUrl(): string {
  const buildTime =
    typeof __TRANSL_API_URL__ !== 'undefined' && __TRANSL_API_URL__ ? __TRANSL_API_URL__ : undefined
  return resolveApiBaseUrl(process.env.TRANSL_API_URL, buildTime)
}
