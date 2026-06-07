import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppHotkeys,
  AppSettings,
  CaptureInitPayload,
  HotkeyBinding,
  MemberProfile,
  RetoneOption,
  TranslationTargetLang,
  ScreenRect,
  SessionInfo,
  TranslateErrorPayload,
  TranslateLoadingPayload,
  TranslateOverlayHotkey,
  TranslateResultPayload
} from './services/config'
import { IPC } from './services/ipc-channels'

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
  dismissSelectionTrigger: () => void
  retoneTranslation: (
    original: string,
    options: { tone?: RetoneOption; targetLang?: TranslationTargetLang }
  ) => Promise<void>
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
    ipcRenderer.on(IPC.TRANSLATE_LOADING, listener)
    return () => ipcRenderer.removeListener(IPC.TRANSLATE_LOADING, listener)
  },
  onTranslateResult: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: TranslateResultPayload): void => {
      callback(payload)
    }
    ipcRenderer.on(IPC.TRANSLATE_RESULT, listener)
    return () => ipcRenderer.removeListener(IPC.TRANSLATE_RESULT, listener)
  },
  onTranslateError: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: TranslateErrorPayload): void => {
      callback(payload)
    }
    ipcRenderer.on(IPC.TRANSLATE_ERROR, listener)
    return () => ipcRenderer.removeListener(IPC.TRANSLATE_ERROR, listener)
  },
  closeOverlay: () => {
    ipcRenderer.send(IPC.OVERLAY_CLOSE)
  },
  setOverlayDragging: (active) => {
    ipcRenderer.send(active ? IPC.OVERLAY_DRAG_START : IPC.OVERLAY_DRAG_END)
  },
  getOverlayPosition: () => ipcRenderer.invoke(IPC.OVERLAY_GET_POSITION),
  setOverlayPosition: (x, y) => ipcRenderer.invoke(IPC.OVERLAY_SET_POSITION, x, y),
  pasteTranslation: (text) => ipcRenderer.invoke(IPC.OVERLAY_PASTE, text),
  activateSelectionTranslate: () => {
    ipcRenderer.send(IPC.SELECTION_ACTIVATE)
  },
  dismissSelectionTrigger: () => {
    ipcRenderer.send(IPC.SELECTION_DISMISS)
  },
  retoneTranslation: (original, options) =>
    ipcRenderer.invoke(IPC.OVERLAY_RETONE, { original, ...options }),
  getSettings: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
  saveSettings: (settings) => ipcRenderer.invoke(IPC.SETTINGS_SAVE, settings),
  captureHotkey: () => ipcRenderer.invoke(IPC.HOTKEY_CAPTURE),
  getSession: () => ipcRenderer.invoke(IPC.AUTH_SESSION),
  onSessionChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, session: SessionInfo): void => {
      callback(session)
    }
    ipcRenderer.on(IPC.SESSION_CHANGED, listener)
    return () => ipcRenderer.removeListener(IPC.SESSION_CHANGED, listener)
  },
  getAppVersion: () => ipcRenderer.invoke(IPC.APP_VERSION),
  login: (payload) => ipcRenderer.invoke(IPC.AUTH_LOGIN, payload),
  logout: () => ipcRenderer.invoke(IPC.AUTH_LOGOUT),
  openLogin: () => ipcRenderer.send(IPC.AUTH_OPEN_LOGIN),
  onCaptureInit: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: CaptureInitPayload): void => {
      callback(payload)
    }
    ipcRenderer.on(IPC.CAPTURE_INIT, listener)
    return () => ipcRenderer.removeListener(IPC.CAPTURE_INIT, listener)
  },
  completeCapture: (bounds) => {
    ipcRenderer.send(IPC.CAPTURE_COMPLETE, bounds)
  },
  cancelCapture: () => {
    ipcRenderer.send(IPC.CAPTURE_CANCEL)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
