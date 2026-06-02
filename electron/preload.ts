import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppHotkeys,
  AppSettings,
  CaptureInitPayload,
  HotkeyBinding,
  MemberProfile,
  RetoneOption,
  ScreenRect,
  SessionInfo,
  TranslateErrorPayload,
  TranslateLoadingPayload,
  TranslateOverlayHotkey,
  TranslateResultPayload
} from './services/config'

export interface ElectronAPI {
  onTranslateLoading: (callback: (payload: TranslateLoadingPayload) => void) => () => void
  onTranslateResult: (callback: (payload: TranslateResultPayload) => void) => () => void
  onTranslateError: (callback: (payload: TranslateErrorPayload) => void) => () => void
  closeOverlay: () => void
  setOverlayDragging: (active: boolean) => void
  getOverlayPosition: () => Promise<[number, number]>
  setOverlayPosition: (x: number, y: number) => Promise<void>
  pasteTranslation: (text: string) => Promise<void>
  activateSelectionTranslate: () => void
  retoneTranslation: (original: string, tone: RetoneOption) => Promise<void>
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>
  captureHotkey: () => Promise<HotkeyBinding>
  getSession: () => Promise<SessionInfo>
  onSessionChanged: (callback: (session: SessionInfo) => void) => () => void
  getAppVersion: () => Promise<string>
  login: (payload: { username: string; password: string }) => Promise<MemberProfile>
  logout: () => Promise<void>
  openLogin: () => void
  onCaptureInit: (callback: (payload: CaptureInitPayload) => void) => () => void
  completeCapture: (bounds: ScreenRect) => void
  cancelCapture: () => void
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
  setOverlayDragging: (active) => {
    ipcRenderer.send(active ? 'overlay:drag-start' : 'overlay:drag-end')
  },
  getOverlayPosition: () => ipcRenderer.invoke('overlay:get-position'),
  setOverlayPosition: (x, y) => ipcRenderer.invoke('overlay:set-position', x, y),
  pasteTranslation: (text) => ipcRenderer.invoke('overlay:paste', text),
  activateSelectionTranslate: () => {
    ipcRenderer.send('selection:activate')
  },
  retoneTranslation: (original, tone) => ipcRenderer.invoke('overlay:retone', { original, tone }),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  captureHotkey: () => ipcRenderer.invoke('hotkey:capture'),
  getSession: () => ipcRenderer.invoke('auth:session'),
  onSessionChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, session: SessionInfo): void => {
      callback(session)
    }
    ipcRenderer.on('session:changed', listener)
    return () => ipcRenderer.removeListener('session:changed', listener)
  },
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  login: (payload) => ipcRenderer.invoke('auth:login', payload),
  logout: () => ipcRenderer.invoke('auth:logout'),
  openLogin: () => ipcRenderer.send('auth:open-login'),
  onCaptureInit: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: CaptureInitPayload): void => {
      callback(payload)
    }
    ipcRenderer.on('capture:init', listener)
    return () => ipcRenderer.removeListener('capture:init', listener)
  },
  completeCapture: (bounds) => {
    ipcRenderer.send('capture:complete', bounds)
  },
  cancelCapture: () => {
    ipcRenderer.send('capture:cancel')
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
