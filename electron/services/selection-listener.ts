import { screen } from 'electron'
import { load } from 'koffi'
import { captureTargetWindow } from './window-focus'

const POLL_INTERVAL_MS = 40
const MIN_DRAG_PX = 4
const VK_LBUTTON = 0x01

const user32 = load('user32.dll')
const GetAsyncKeyState = user32.func('int16 __stdcall GetAsyncKeyState(int32 vKey)')

function isLeftButtonDown(): boolean {
  return (GetAsyncKeyState(VK_LBUTTON) & 0x8000) !== 0
}

export interface SelectionListenerOptions {
  onSelectionGesture: (payload: { x: number; y: number }) => void
  onPointerDown?: () => void
  isBlocked: () => boolean
  isPointerOverTrigger: (x: number, y: number) => boolean
}

let pollTimer: NodeJS.Timeout | null = null
let options: SelectionListenerOptions | null = null
let isPointerDown = false
let downX = 0
let downY = 0

export function startSelectionListener(listenerOptions: SelectionListenerOptions): void {
  stopSelectionListener()
  options = listenerOptions
  isPointerDown = false

  pollTimer = setInterval(() => {
    if (!options) {
      return
    }

    const down = isLeftButtonDown()
    const cursor = screen.getCursorScreenPoint()

    if (down && !isPointerDown) {
      if (options.isBlocked() || options.isPointerOverTrigger(cursor.x, cursor.y)) {
        return
      }
      options.onPointerDown?.()
      isPointerDown = true
      downX = cursor.x
      downY = cursor.y
      captureTargetWindow()
      return
    }

    if (!down && isPointerDown) {
      isPointerDown = false
      const dx = cursor.x - downX
      const dy = cursor.y - downY
      const distance = Math.hypot(dx, dy)

      if (distance < MIN_DRAG_PX) {
        return
      }

      if (options.isBlocked() || options.isPointerOverTrigger(cursor.x, cursor.y)) {
        return
      }

      options.onSelectionGesture({ x: cursor.x, y: cursor.y })
    }
  }, POLL_INTERVAL_MS)
}

export function stopSelectionListener(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  options = null
  isPointerDown = false
}
