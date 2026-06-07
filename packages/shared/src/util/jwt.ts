export function decodeJwtExpiry(accessToken: string, fallbackMs = 3_600_000): number {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString('utf8')
    ) as { exp?: number }
    return payload.exp ? payload.exp * 1000 : Date.now() + fallbackMs
  } catch {
    return Date.now() + fallbackMs
  }
}
