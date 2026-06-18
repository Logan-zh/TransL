const DEFAULT_API_URL = 'http://localhost:3000'

/** Resolve API base URL: runtime env overrides build-time, then default. */
export function resolveApiBaseUrl(
  runtimeUrl?: string,
  buildTimeUrl?: string,
  defaultUrl = DEFAULT_API_URL
): string {
  const runtime = runtimeUrl?.trim()
  if (runtime) {
    return runtime.replace(/\/$/, '')
  }
  const build = buildTimeUrl?.trim()
  if (build) {
    return build.replace(/\/$/, '')
  }
  return defaultUrl.replace(/\/$/, '')
}
