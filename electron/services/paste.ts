import { clipboard } from 'electron'
import { keyboard, Key } from '@nut-tree-fork/nut-js'
import { delay } from './clipboard'
import { restoreTargetWindow } from './window-focus'

keyboard.config.autoDelayMs = 50

export async function pasteTranslation(text: string): Promise<void> {
  clipboard.writeText(text)
  await delay(80)

  const focused = await restoreTargetWindow()
  if (!focused) {
    await delay(150)
  }

  await keyboard.pressKey(Key.LeftControl, Key.V)
  await keyboard.releaseKey(Key.V, Key.LeftControl)
}
