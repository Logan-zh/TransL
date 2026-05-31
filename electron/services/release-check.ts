import { app, dialog, shell } from 'electron'
import { getApiBaseUrl } from './api-config'

export interface DesktopReleaseInfo {
  version: string
  downloadUrl: string
  releaseNotes: string | null
}

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

export async function fetchPublicRelease(): Promise<DesktopReleaseInfo | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/public/release`)
    if (!response.ok) {
      return null
    }
    return (await response.json()) as DesktopReleaseInfo
  } catch {
    return null
  }
}

export async function checkForDesktopUpdate(options: {
  silent?: boolean
} = {}): Promise<void> {
  const release = await fetchPublicRelease()
  if (!release) {
    if (!options.silent) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'TransL 更新',
        message: '目前無法取得版本資訊，請稍後再試或至官網下載。'
      })
    }
    return
  }

  const current = app.getVersion()
  if (!isNewerVersion(release.version, current)) {
    if (!options.silent) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'TransL 更新',
        message: `您使用的是最新版本（v${current}）。`
      })
    }
    return
  }

  const notes = release.releaseNotes ? `\n\n${release.releaseNotes}` : ''
  const result = await dialog.showMessageBox({
    type: 'info',
    title: 'TransL 有新版本',
    message: `發現新版本 v${release.version}（目前 v${current}）${notes}`,
    buttons: ['前往下載', '稍後'],
    defaultId: 0,
    cancelId: 1
  })

  if (result.response === 0) {
    await shell.openExternal(release.downloadUrl)
  }
}
