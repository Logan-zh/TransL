import { desktopCapturer, nativeImage, screen } from 'electron'
import type { ScreenRect } from './config'

export async function captureScreenRegion(bounds: ScreenRect): Promise<Electron.NativeImage> {
  if (bounds.width < 1 || bounds.height < 1) {
    throw new Error('截圖範圍太小。')
  }

  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  }
  const display = screen.getDisplayNearestPoint(center)
  const scaleFactor = display.scaleFactor

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.floor(display.bounds.width * scaleFactor),
      height: Math.floor(display.bounds.height * scaleFactor)
    }
  })

  const source =
    sources.find((item) => item.display_id === String(display.id)) ??
    sources.find((item) => item.id.toLowerCase().includes(`screen:${display.id}`)) ??
    sources[0]

  if (!source) {
    throw new Error('無法取得螢幕來源。')
  }

  const fullImage = nativeImage.createFromDataURL(source.thumbnail.toDataURL())
  const relX = bounds.x - display.bounds.x
  const relY = bounds.y - display.bounds.y

  const cropRect = {
    x: Math.max(0, Math.round(relX * scaleFactor)),
    y: Math.max(0, Math.round(relY * scaleFactor)),
    width: Math.round(bounds.width * scaleFactor),
    height: Math.round(bounds.height * scaleFactor)
  }

  const size = fullImage.getSize()
  cropRect.width = Math.min(cropRect.width, size.width - cropRect.x)
  cropRect.height = Math.min(cropRect.height, size.height - cropRect.y)

  if (cropRect.width < 1 || cropRect.height < 1) {
    throw new Error('截圖範圍超出螢幕範圍。')
  }

  return fullImage.crop(cropRect)
}
