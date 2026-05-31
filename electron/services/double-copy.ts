import { load } from 'koffi'

const DOUBLE_COPY_MS = 800
const POLL_INTERVAL_MS = 40
const TRIGGER_COOLDOWN_MS = 400

const user32 = load('user32.dll')
const getClipboardSequenceNumber = user32.func('uint32 GetClipboardSequenceNumber()')

let pollTimer: NodeJS.Timeout | null = null
let lastSeq = 0
let lastChangeTime = 0
let lastTriggerTime = 0
let onDoubleCopy: (() => void) | null = null

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

    const now = Date.now()
    if (lastChangeTime > 0 && now - lastChangeTime <= DOUBLE_COPY_MS) {
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
