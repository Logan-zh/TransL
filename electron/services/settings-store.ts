import Store from 'electron-store'
import { getAutoLaunchEnabled, setAutoLaunchEnabled, syncAutoLaunchSetting } from './auto-launch'
import { AppSettings, DEFAULT_SETTINGS } from './config'

const store = new Store<AppSettings>({
  defaults: DEFAULT_SETTINGS
})

export function getSettings(): AppSettings {
  return {
    provider: store.get('provider'),
    openaiApiKey: store.get('openaiApiKey'),
    geminiApiKey: store.get('geminiApiKey'),
    openaiModel: store.get('openaiModel'),
    geminiModel: store.get('geminiModel'),
    openAtLogin: getAutoLaunchEnabled()
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined && key !== 'openAtLogin') {
      store.set(key as keyof AppSettings, value as AppSettings[keyof AppSettings])
    }
  }

  if (settings.openAtLogin !== undefined) {
    store.set('openAtLogin', settings.openAtLogin)
    setAutoLaunchEnabled(settings.openAtLogin)
  }

  return getSettings()
}

export function applyStoredAutoLaunch(): void {
  syncAutoLaunchSetting(store.get('openAtLogin'))
}
