import { writeFileSync } from 'fs'
import { resolve } from 'path'
import sharp from 'sharp'

const resourcesDir = resolve('resources')
const iconPng = resolve(resourcesDir, 'icon.png')
const iconIco = resolve(resourcesDir, 'icon.ico')
const sizes = [256, 128, 64, 48, 32, 16]

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
    const size = sizes[i]
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

async function main() {
  const pngBuffers = await Promise.all(
    sizes.map((size) => sharp(iconPng).resize(size, size, { fit: 'cover' }).png().toBuffer())
  )

  const icoBuffer = buildIco(pngBuffers)
  writeFileSync(iconIco, icoBuffer)
  console.log(`Wrote ${iconIco} (${icoBuffer.length} bytes, ${sizes.length} sizes)`)
}

await main()
