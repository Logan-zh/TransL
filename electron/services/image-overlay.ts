import { nativeImage } from 'electron'
import sharp from 'sharp'
import type { TextOverlayBlock } from './translation/types'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function normalizeBlock(block: TextOverlayBlock): TextOverlayBlock {
  const x = clamp01(block.x)
  const y = clamp01(block.y)
  const width = clamp01(block.width)
  const height = clamp01(block.height)

  return {
    ...block,
    x,
    y,
    width: Math.max(0.02, Math.min(width, 1 - x)),
    height: Math.max(0.02, Math.min(height, 1 - y))
  }
}

function wrapTextToLines(text: string, maxWidthPx: number, fontSize: number): string[] {
  const avgCharWidth = fontSize * 0.55
  const maxChars = Math.max(1, Math.floor(maxWidthPx / avgCharWidth))
  const lines: string[] = []

  for (const paragraph of text.split('\n')) {
    if (!paragraph) {
      lines.push('')
      continue
    }

    let remaining = paragraph
    while (remaining.length > maxChars) {
      let breakAt = remaining.lastIndexOf(' ', maxChars)
      if (breakAt <= 0) {
        breakAt = maxChars
      }
      lines.push(remaining.slice(0, breakAt).trim())
      remaining = remaining.slice(breakAt).trim()
    }
    if (remaining) {
      lines.push(remaining)
    }
  }

  return lines.length > 0 ? lines : ['']
}

function fitFontSize(text: string, boxWidth: number, boxHeight: number): number {
  const lineCount = Math.max(1, text.split('\n').length)
  let fontSize = Math.min(boxHeight * 0.75, boxWidth / 6, 28)

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const lines = wrapTextToLines(text, boxWidth - 8, fontSize)
    const lineHeight = fontSize * 1.25
    const totalHeight = lines.length * lineHeight + 6

    if (totalHeight <= boxHeight && fontSize >= 10) {
      return Math.max(10, Math.round(fontSize))
    }

    fontSize *= 0.88
  }

  return Math.max(9, Math.round(Math.min(boxHeight / lineCount / 1.25, fontSize)))
}

function buildBlockSvg(block: TextOverlayBlock, imageWidth: number, imageHeight: number): string {
  const normalized = normalizeBlock(block)
  const x = Math.round(normalized.x * imageWidth)
  const y = Math.round(normalized.y * imageHeight)
  const width = Math.round(normalized.width * imageWidth)
  const height = Math.round(normalized.height * imageHeight)
  const text = normalized.translation.trim()

  if (!text || width < 4 || height < 4) {
    return ''
  }

  const fontSize = fitFontSize(text, width, height)
  const lines = wrapTextToLines(text, width - 8, fontSize)
  const lineHeight = fontSize * 1.25
  const startY = y + fontSize + 4
  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : lineHeight
      return `<tspan x="${x + 4}" dy="${dy}">${escapeXml(line || ' ')}</tspan>`
    })
    .join('')

  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="2" ry="2" fill="#ffffff" fill-opacity="0.93"/>
    <text x="${x + 4}" y="${startY}" font-family="Segoe UI, Microsoft JhengHei, sans-serif" font-size="${fontSize}" fill="#111111">${tspans}</text>
  `
}

export function assignTranslationToBlocks(
  blocks: TextOverlayBlock[],
  translation: string
): TextOverlayBlock[] {
  if (blocks.length === 0) {
    return blocks
  }

  const lines = translation.split('\n')

  return blocks.map((block, index) => {
    if (index < blocks.length - 1) {
      return { ...block, translation: lines[index] ?? '' }
    }

    return { ...block, translation: lines.slice(index).join('\n') }
  })
}

export async function compositeTranslationOnImage(
  image: Electron.NativeImage,
  blocks: TextOverlayBlock[]
): Promise<Electron.NativeImage> {
  const input = image.toPNG()
  const metadata = await sharp(input).metadata()
  const width = metadata.width ?? 0
  const height = metadata.height ?? 0

  if (width < 1 || height < 1) {
    throw new Error('無法讀取截圖尺寸。')
  }

  const usableBlocks = blocks
    .map((block) => normalizeBlock(block))
    .filter((block) => block.translation.trim())

  if (usableBlocks.length === 0) {
    return image
  }

  const svgBody = usableBlocks
    .map((block) => buildBlockSvg(block, width, height))
    .filter(Boolean)
    .join('')

  if (!svgBody) {
    return image
  }

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${svgBody}</svg>`

  const output = await sharp(input)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer()

  return nativeImage.createFromBuffer(output)
}
