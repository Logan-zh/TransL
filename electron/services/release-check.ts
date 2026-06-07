import { app, dialog, shell } from 'electron'
import type { DesktopReleaseInfo } from '@transl/shared'
import { isNewerVersion } from '@transl/shared'
import { getApiBaseUrl } from './api-config'
import { showTrayBalloon } from './tray'

export type { DesktopReleaseInfo }

export interface UpdateCheckResult {
  status: 'update' | 'current' | 'unavailable'
  current?: string
  latest?: string
  apiUrl?: string
}

export async function fetchPublicRelease(): Promise<DesktopReleaseInfo | null> {
  const apiUrl = `${getApiBaseUrl()}/api/public/release`
  try {
    const response = await fetch(apiUrl)
    if (!response.ok) {
      console.warn('[TransL] release check HTTP', response.status, apiUrl)
      return null
    }
    return (await response.json()) as DesktopReleaseInfo
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn('[TransL] release check failed:', message, apiUrl)
    return null
  }
}

export async function checkForDesktopUpdate(options: {
  silent?: boolean
} = {}): Promise<UpdateCheckResult> {
  const apiUrl = `${getApiBaseUrl()}/api/public/release`
  const release = await fetchPublicRelease()
  if (!release) {
    if (!options.silent) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'TransL 更新',
        message: `目前無法取得版本資訊，請稍後再試或至官網下載。\n\nAPI：${apiUrl}`
      })
    }
    return { status: 'unavailable', apiUrl }
  }

  const current = app.getVersion()
  if (!isNewerVersion(release.version, current)) {
    if (!options.silent) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'TransL 更新',
        message: `您使用的是最新版本（v${current}）。\n\n伺服器最新版：v${release.version}`
      })
    }
    return { status: 'current', current, latest: release.version, apiUrl }
  }

  const notes = release.releaseNotes ? `\n\n${release.releaseNotes}` : ''
  showTrayBalloon(
    'TransL 有新版本',
    `v${release.version} 已發佈（目前 v${current}）`
  )
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

  return { status: 'update', current, latest: release.version, apiUrl }
}
