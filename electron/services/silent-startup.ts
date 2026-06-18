import { app } from 'electron'

/** True when the app was launched at OS login (開機自動啟動). */
export function isSilentStartup(): boolean {
  return app.getLoginItemSettings().wasOpenedAtLogin
}
