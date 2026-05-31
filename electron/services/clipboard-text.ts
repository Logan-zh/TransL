import { delay, readClipboardText } from './clipboard'

export class ClipboardError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClipboardError'
  }
}

export async function getTextFromClipboard(): Promise<string> {
  await delay(100)

  const text = readClipboardText().trim()
  if (!text) {
    throw new ClipboardError('剪貼簿沒有文字，請先選取文字並按 Ctrl+C 複製。')
  }

  return text
}
