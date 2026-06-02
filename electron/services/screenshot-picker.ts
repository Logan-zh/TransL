import { BrowserWindow, screen } from 'electron'
import { join } from 'path'

export interface ScreenRect {
  x: number
  y: number
  width: number
  height: number
}

export interface CaptureInitPayload {
  offsetX: number
  offsetY: number
}

let pickerWindow: BrowserWindow | null = null
let pickerResolve: ((value: ScreenRect | null) => void) | null = null

export function isScreenshotPickerOpen(): boolean {
  return pickerWindow !== null && !pickerWindow.isDestroyed()
}

function getVirtualScreenBounds(): ScreenRect {
  const displays = screen.getAllDisplays()
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const display of displays) {
    minX = Math.min(minX, display.bounds.x)
    minY = Math.min(minY, display.bounds.y)
    maxX = Math.max(maxX, display.bounds.x + display.bounds.width)
    maxY = Math.max(maxY, display.bounds.y + display.bounds.height)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

function closePickerWindow(): void {
  if (pickerWindow && !pickerWindow.isDestroyed()) {
    pickerWindow.close()
  }
  pickerWindow = null
}

function finishPicker(result: ScreenRect | null): void {
  const resolve = pickerResolve
  pickerResolve = null
  closePickerWindow()
  resolve?.(result)
}

export function openScreenshotPicker(): Promise<ScreenRect | null> {
  if (pickerWindow && !pickerWindow.isDestroyed()) {
    pickerWindow.focus()
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    pickerResolve = resolve

    const bounds = getVirtualScreenBounds()
    pickerWindow = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      focusable: true,
      hasShadow: false,
      fullscreen: false,
      enableLargerThanScreen: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })

    pickerWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    const initPayload: CaptureInitPayload = {
      offsetX: bounds.x,
      offsetY: bounds.y
    }

    pickerWindow.webContents.once('did-finish-load', () => {
      pickerWindow?.webContents.send('capture:init', initPayload)
      pickerWindow?.show()
      pickerWindow?.focus()
    })

    pickerWindow.on('closed', () => {
      pickerWindow = null
      if (pickerResolve) {
        finishPicker(null)
      }
    })

    if (process.env.ELECTRON_RENDERER_URL) {
      void pickerWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/capture/index.html`)
    } else {
      void pickerWindow.loadFile(join(__dirname, '../renderer/capture/index.html'))
    }
  })
}

export function completeScreenshotPicker(bounds: ScreenRect): void {
  if (!pickerResolve) {
    return
  }
  finishPicker(bounds)
}

export function cancelScreenshotPicker(): void {
  if (!pickerResolve) {
    closePickerWindow()
    return
  }
  finishPicker(null)
}
