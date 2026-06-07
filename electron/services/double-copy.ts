import { DOUBLE_TAP_MS, POLL_INTERVAL_MS, TRIGGER_COOLDOWN_MS } from './hotkey-constants'
import { getClipboardSequenceNumber } from './win32'

let pollTimer: NodeJS.Timeout | null = null
let lastSeq = 0
let lastChangeTime = 0
let lastTriggerTime = 0
let onDoubleCopy: (() => void) | null = null
let suppressed = false

export function setDoubleCopySuppressed(value: boolean): void {
  suppressed = value
  lastChangeTime = 0
  lastSeq = getClipboardSequenceNumber()
}

/** 重設雙擊 Ctrl+C 計時基準，避免程式內部複製干擾使用者快捷鍵 */
export function syncDoubleCopyBaseline(): void {
  lastChangeTime = 0
  lastSeq = getClipboardSequenceNumber()
}

export function startDoubleCopyListener(handler: () => void): void {
  stopDoubleCopyListener()

  onDoubleCopy = handler
  lastSeq = getClipboardSequenceNumber()
  lastChangeTime = 0
  lastTriggerTime = 0

  pollTimer = setInterval(() => {
    const seq = getClipboardSequenceNumber()
    if (seq === lastSeq) {
      return
    }

    if (suppressed) {
      lastSeq = seq
      return
    }

    const now = Date.now()
    if (lastChangeTime > 0 && now - lastChangeTime <= DOUBLE_TAP_MS) {
      if (now - lastTriggerTime >= TRIGGER_COOLDOWN_MS) {
        lastTriggerTime = now
        lastChangeTime = 0
        lastSeq = seq
        console.log('[TransL] double copy detected, seq=', seq)
        onDoubleCopy?.()
        return
      }
    }

    lastChangeTime = now
    lastSeq = seq
  }, POLL_INTERVAL_MS)

  console.log('[TransL] clipboard sequence listener started, seq=', lastSeq)
}

export function stopDoubleCopyListener(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  lastChangeTime = 0
  onDoubleCopy = null
}
