import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  RetoneOption,
  TranslateErrorPayload,
  TranslateLoadingPayload,
  TranslateResultPayload
} from './services/config'

export interface ElectronAPI {
  onTranslateLoading: (callback: (payload: TranslateLoadingPayload) => void) => () => void
  onTranslateResult: (callback: (payload: TranslateResultPayload) => void) => () => void
  onTranslateError: (callback: (payload: TranslateErrorPayload) => void) => () => void
  closeOverlay: () => void
  pasteTranslation: (text: string) => Promise<void>
  retoneTranslation: (original: string, tone: RetoneOption) => Promise<void>
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>
}

const api: ElectronAPI = {
  onTranslateLoading: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: TranslateLoadingPayload): void => {
      callback(payload)
    }
    ipcRenderer.on('translate:loading', listener)
    return () => ipcRenderer.removeListener('translate:loading', listener)
  },
  onTranslateResult: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: TranslateResultPayload): void => {
      callback(payload)
    }
    ipcRenderer.on('translate:result', listener)
    return () => ipcRenderer.removeListener('translate:result', listener)
  },
  onTranslateError: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: TranslateErrorPayload): void => {
      callback(payload)
    }
    ipcRenderer.on('translate:error', listener)
    return () => ipcRenderer.removeListener('translate:error', listener)
  },
  closeOverlay: () => {
    ipcRenderer.send('overlay:close')
  },
  pasteTranslation: (text) => ipcRenderer.invoke('overlay:paste', text),
  retoneTranslation: (original, tone) => ipcRenderer.invoke('overlay:retone', { original, tone }),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings)
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
