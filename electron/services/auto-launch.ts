import { app } from 'electron'

export function getAutoLaunchEnabled(): boolean {
  return app.getLoginItemSettings().openAtLogin
}

export function setAutoLaunchEnabled(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true
  })
}

export function syncAutoLaunchSetting(enabled: boolean): void {
  const current = getAutoLaunchEnabled()
  if (current !== enabled) {
    setAutoLaunchEnabled(enabled)
  }
}
