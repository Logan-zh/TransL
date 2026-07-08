import { writeFileSync } from 'fs'
import { resolve } from 'path'
import sharp from 'sharp'

const resourcesDir = resolve('resources')
const iconPng = resolve(resourcesDir, 'icon.png')
const trayPng = resolve(resourcesDir, 'tray.png')
const iconIco = resolve(resourcesDir, 'icon.ico')
const icoSizes = [256, 128, 64, 48, 32, 16]

const BG = '#1e293b'
const LETTER = '#f8fafc'
const BORDER = '#334155'

function iconSvg(size, { rounded = true, border = false } = {}) {
  const radius = rounded ? size * 0.2 : 0
  const fontSize = Math.round(size * 0.58)
  const borderEl = border
    ? `<rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="${radius}" fill="none" stroke="${BORDER}" stroke-width="${Math.max(1, size / 128)}"/>`
    : ''

  return Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BG}"/>
  ${borderEl}
  <text
    x="50%"
    y="50%"
    font-family="Segoe UI, Helvetica, Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="700"
    fill="${LETTER}"
    text-anchor="middle"
    dominant-baseline="middle"
  >D</text>
</svg>`)
}

function buildIco(pngBuffers) {
  const count = pngBuffers.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(count, 4)

  const entries = []
  let offset = 6 + count * 16

  for (let i = 0; i < count; i++) {
    const png = pngBuffers[i]
    const size = icoSizes[i]
    const entry = Buffer.alloc(16)
    entry[0] = size >= 256 ? 0 : size
    entry[1] = size >= 256 ? 0 : size
    entry[2] = 0
    entry[3] = 0
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    offset += png.length
  }

  return Buffer.concat([header, ...entries, ...pngBuffers])
}

async function renderPng(size, options) {
  return sharp(iconSvg(size, options)).png().toBuffer()
}

async function main() {
  const masterSize = 512
  const master = await renderPng(masterSize, { rounded: true, border: true })
  writeFileSync(iconPng, master)
  console.log(`Wrote ${iconPng} (${master.length} bytes)`)

  const tray = await renderPng(32, { rounded: true, border: true })
  writeFileSync(trayPng, tray)
  console.log(`Wrote ${trayPng} (${tray.length} bytes)`)

  const pngBuffers = await Promise.all(
    icoSizes.map((size) => renderPng(size, { rounded: true, border: size >= 48 }))
  )
  const icoBuffer = buildIco(pngBuffers)
  writeFileSync(iconIco, icoBuffer)
  console.log(`Wrote ${iconIco} (${icoBuffer.length} bytes, ${icoSizes.length} sizes)`)
}

await main()
