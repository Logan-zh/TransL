import { keyboard, Key } from '@nut-tree-fork/nut-js'
import { backupClipboardText, readClipboardText, delay } from './clipboard'
import { restoreTargetWindow } from './window-focus'
import { ClipboardError } from './clipboard-text'

keyboard.config.autoDelayMs = 50

export async function copySelectedTextFromTarget(): Promise<{ text: string; clipboardBackup: string }> {
  const clipboardBackup = backupClipboardText()

  await delay(80)
  await restoreTargetWindow()
  await delay(100)

  await keyboard.pressKey(Key.LeftControl, Key.C)
  await keyboard.releaseKey(Key.C, Key.LeftControl)
  await delay(150)

  const text = readClipboardText().trim()
  if (!text) {
    throw new ClipboardError('無法取得選取文字，請先框選文字。')
  }

  return { text, clipboardBackup }
}
