import { clipboard } from 'electron'

export function backupClipboardText(): string {
  return clipboard.readText()
}

export function readClipboardText(): string {
  return clipboard.readText()
}

/** 剪貼簿是否含可翻譯的文字（僅圖片時為 false） */
export function hasClipboardText(): boolean {
  return readClipboardText().trim().length > 0
}

export function restoreClipboardText(text: string): void {
  clipboard.writeText(text)
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
