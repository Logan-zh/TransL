/** Turn a relative download path into an absolute URL using the site origin. */
export function resolvePublicDownloadUrl(url: string, origin?: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url
  }
  if (url.startsWith('/') && origin) {
    return `${origin.replace(/\/$/, '')}${url}`
  }
  return url
}
