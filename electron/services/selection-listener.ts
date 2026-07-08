import { screen } from 'electron'
import { delay } from './clipboard'
import { POLL_INTERVAL_MS } from './hotkey-constants'
import { getForegroundSettleDelayMs, hasTextSelectionAtPoint } from './uia-selection'
import { captureTargetWindow, hasForegroundContextChanged } from './window-focus'
import { isKeyDown } from './win32'
import { hideSelectionTriggerWindow } from '../windows'

const MIN_DRAG_PX = 4
// After selection is triggered (mouse left released), if the user moves
// the cursor too far away from that trigger point, cancel the hint button.
const MAX_HINT_MOVE_PX = 150
const DOUBLE_CLICK_MS = 500
const MAX_CLICK_MOVE_PX = 10
const VK_LBUTTON = 0x01

function isLeftButtonDown(): boolean {
  return isKeyDown(VK_LBUTTON)
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
let isCheckingDoubleClick = false
let lastReleaseTime = 0
let lastReleaseX = 0
let lastReleaseY = 0
let clickCount = 0
let triggerOrigin: { x: number; y: number } | null = null

function notifySelectionGesture(x: number, y: number): void {
  if (!options || options.isBlocked() || options.isPointerOverTrigger(x, y)) {
    return
  }

  triggerOrigin = { x, y }
  options.onSelectionGesture({ x, y })
}

async function tryNotifyAfterDoubleClick(x: number, y: number): Promise<void> {
  if (!options || options.isBlocked() || options.isPointerOverTrigger(x, y) || isCheckingDoubleClick) {
    return
  }

  isCheckingDoubleClick = true
  try {
    await delay(getForegroundSettleDelayMs())

    if (!options || options.isBlocked() || options.isPointerOverTrigger(x, y)) {
      return
    }

    if (hasForegroundContextChanged()) {
      return
    }

    const hasText = await hasTextSelectionAtPoint(x, y)
    if (!hasText) {
      return
    }

    notifySelectionGesture(x, y)
  } finally {
    isCheckingDoubleClick = false
  }
}

function handlePointerRelease(cursorX: number, cursorY: number): void {
  const dx = cursorX - downX
  const dy = cursorY - downY
  const distance = Math.hypot(dx, dy)
  const now = Date.now()

  // Drag selection gesture
  if (distance >= MIN_DRAG_PX) {
    clickCount = 0
    notifySelectionGesture(cursorX, cursorY)
    return
  }

  const nearLastClick =
    lastReleaseTime > 0 &&
    now - lastReleaseTime <= DOUBLE_CLICK_MS &&
    Math.hypot(cursorX - lastReleaseX, cursorY - lastReleaseY) <= MAX_CLICK_MOVE_PX

  if (nearLastClick) {
    clickCount += 1
  } else {
    clickCount = 1
  }

  lastReleaseTime = now
  lastReleaseX = cursorX
  lastReleaseY = cursorY

  if (clickCount >= 2) {
    clickCount = 0
    void tryNotifyAfterDoubleClick(cursorX, cursorY)
  }
}

export function startSelectionListener(listenerOptions: SelectionListenerOptions): void {
  stopSelectionListener()
  options = listenerOptions
  isPointerDown = false
  isCheckingDoubleClick = false
  lastReleaseTime = 0
  clickCount = 0
  triggerOrigin = null

  pollTimer = setInterval(() => {
    if (!options) {
      return
    }

    const down = isLeftButtonDown()
    const cursor = screen.getCursorScreenPoint()

    // Cancel hint when user moves too far away after releasing left button.
    if (!down && triggerOrigin) {
      const cancelDistance = Math.hypot(cursor.x - triggerOrigin.x, cursor.y - triggerOrigin.y)
      if (cancelDistance > MAX_HINT_MOVE_PX) {
        triggerOrigin = null
        hideSelectionTriggerWindow()
      }
    }

    if (down && !isPointerDown) {
      if (options.isBlocked() || options.isPointerOverTrigger(cursor.x, cursor.y)) {
        return
      }
      options.onPointerDown?.()
      isPointerDown = true
      downX = cursor.x
      downY = cursor.y
      triggerOrigin = null
      captureTargetWindow()
      return
    }

    if (!down && isPointerDown) {
      isPointerDown = false
      handlePointerRelease(cursor.x, cursor.y)
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
  isCheckingDoubleClick = false
  lastReleaseTime = 0
  clickCount = 0
  triggerOrigin = null
}
