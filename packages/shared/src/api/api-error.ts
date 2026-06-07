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

export interface NestErrorBody {
  message?: string | string[] | { code?: string; message?: string }
  code?: string
}

export interface ParseNestErrorOptions {
  requestUrl?: string
  formatNotFound?: (message: string, url: string) => string
  quotaExceededHint?: string
}

export function parseNestErrorBody(
  body: NestErrorBody,
  status: number,
  options: ParseNestErrorOptions = {}
): ApiError {
  const { requestUrl = '', formatNotFound, quotaExceededHint = '' } = options

  if (typeof body.message === 'object' && body.message !== null && !Array.isArray(body.message)) {
    const nested = body.message
    return new ApiError(
      formatNestMessage(nested.message ?? '請求失敗', status, requestUrl, formatNotFound),
      nested.code,
      status
    )
  }

  const message = Array.isArray(body.message)
    ? body.message.join(', ')
    : body.message ?? `HTTP ${status}`
  const code = body.code
  const hint = code === 'QUOTA_EXCEEDED' ? quotaExceededHint : ''

  return new ApiError(
    formatNestMessage(`${message}${hint}`, status, requestUrl, formatNotFound),
    code,
    status
  )
}

export async function parseNestErrorResponse(
  response: Response,
  requestUrl: string,
  options: ParseNestErrorOptions = {}
): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as NestErrorBody
  return parseNestErrorBody(body, response.status, { ...options, requestUrl })
}

function formatNestMessage(
  message: string,
  status: number,
  requestUrl: string,
  formatNotFound?: (message: string, url: string) => string
): string {
  if (status === 404 && formatNotFound && requestUrl) {
    return formatNotFound(message, requestUrl)
  }
  return message
}
