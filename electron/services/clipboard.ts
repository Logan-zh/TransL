import { clipboard } from 'electron'

export function backupClipboardText(): string {
  return clipboard.readText()
}

export function readClipboardText(): string {
  return clipboard.readText()
}

export function restoreClipboardText(text: string): void {
  clipboard.writeText(text)
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
