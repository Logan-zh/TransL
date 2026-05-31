import Store from 'electron-store'
import { getAutoLaunchEnabled, setAutoLaunchEnabled, syncAutoLaunchSetting } from './auto-launch'
import { AppSettings, DEFAULT_SETTINGS } from './config'

interface LegacySettings extends AppSettings {
  provider?: string
  openaiApiKey?: string
  geminiApiKey?: string
  openaiModel?: string
  geminiModel?: string
}

const store = new Store<LegacySettings>({
  defaults: {
    ...DEFAULT_SETTINGS,
    provider: 'openai',
    openaiApiKey: '',
    geminiApiKey: '',
    openaiModel: 'gpt-4o-mini',
    geminiModel: 'gemini-2.0-flash'
  }
})

export function getSettings(): AppSettings {
  return {
    openAtLogin: getAutoLaunchEnabled()
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  if (settings.openAtLogin !== undefined) {
    store.set('openAtLogin', settings.openAtLogin)
    setAutoLaunchEnabled(settings.openAtLogin)
  }

  return getSettings()
}

export function hasLegacyApiKeys(): boolean {
  const openai = store.get('openaiApiKey', '')
  const gemini = store.get('geminiApiKey', '')
  return Boolean(openai || gemini)
}

export function applyStoredAutoLaunch(): void {
  syncAutoLaunchSetting(store.get('openAtLogin', false))
}
