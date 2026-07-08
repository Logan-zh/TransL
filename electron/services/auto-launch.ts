import { app } from 'electron'
import { removeAllAppStartupEntries } from './startup-cleanup'

export function getAutoLaunchEnabled(): boolean {
  return app.getLoginItemSettings().openAtLogin
}

export function setAutoLaunchEnabled(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true
  })
}

/** Remove every stale entry, then write a single correct auto-launch entry. */
export function syncAutoLaunchSetting(enabled: boolean): void {
  removeAllAppStartupEntries()

  if (enabled) {
    setAutoLaunchEnabled(true)
    return
  }

  setAutoLaunchEnabled(false)
}
