import Store from 'electron-store'
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
    geminiModel: store.get('geminiModel')
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) {
      store.set(key as keyof AppSettings, value as AppSettings[keyof AppSettings])
    }
  }
  return getSettings()
}
