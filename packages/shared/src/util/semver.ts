function parseVersionParts(version: string): number[] {
  return version
    .replace(/^v/i, '')
    .split('.')
    .map((part) => parseInt(part.replace(/[^0-9].*$/, ''), 10) || 0)
}

export function isNewerVersion(latest: string, current: string): boolean {
  const a = parseVersionParts(latest)
  const b = parseVersionParts(current)
  const len = Math.max(a.length, b.length)

  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) {
      return diff > 0
    }
  }
  return false
}
