export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      sp.set(key, String(value))
    }
  }
  const query = sp.toString()
  return query ? `?${query}` : ''
}
