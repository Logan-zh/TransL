import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

function pngToIco(pngBuffer) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)

  const entry = Buffer.alloc(16)
  entry[0] = 0
  entry[1] = 0
  entry[2] = 0
  entry[3] = 0
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(pngBuffer.length, 8)
  entry.writeUInt32LE(22, 12)

  return Buffer.concat([header, entry, pngBuffer])
}

const iconPng = resolve('resources/icon.png')
const iconIco = resolve('resources/icon.ico')
const pngBuffer = readFileSync(iconPng)
const icoBuffer = pngToIco(pngBuffer)

writeFileSync(iconIco, icoBuffer)
console.log(`Wrote ${iconIco} (${icoBuffer.length} bytes)`)
