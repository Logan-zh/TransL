import { useEffect, useRef, useState } from 'react'

interface ZoomableImageProps {
  src: string
  alt: string
}

const MIN_SCALE = 0.5
const MAX_SCALE = 4

function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
}

export default function ZoomableImage({ src, alt }: ZoomableImageProps): JSX.Element {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [src])

  const resetView = (): void => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  const handleWheel = (event: React.WheelEvent): void => {
    event.preventDefault()
    event.stopPropagation()

    const direction = event.deltaY > 0 ? -1 : 1
    setScale((current) => clampScale(current + direction * current * 0.12))
  }

  const handlePointerDown = (event: React.PointerEvent): void => {
    if (event.button !== 0) {
      return
    }

    dragging.current = true
    viewportRef.current?.setPointerCapture(event.pointerId)
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y
    }
  }

  const handlePointerMove = (event: React.PointerEvent): void => {
    if (!dragging.current) {
      return
    }

    setOffset({
      x: dragStart.current.offsetX + (event.clientX - dragStart.current.x),
      y: dragStart.current.offsetY + (event.clientY - dragStart.current.y)
    })
  }

  const stopDragging = (event: React.PointerEvent): void => {
    if (!dragging.current) {
      return
    }

    dragging.current = false
    viewportRef.current?.releasePointerCapture(event.pointerId)
  }

  return (
    <div className="overlay-image-viewer">
      <div className="overlay-image-toolbar">
        <button
          type="button"
          className="overlay-image-btn"
          onClick={() => setScale((current) => clampScale(current - 0.25))}
          aria-label="縮小"
        >
          −
        </button>
        <span className="overlay-image-scale">{Math.round(scale * 100)}%</span>
        <button
          type="button"
          className="overlay-image-btn"
          onClick={() => setScale((current) => clampScale(current + 0.25))}
          aria-label="放大"
        >
          +
        </button>
        <button type="button" className="overlay-image-btn overlay-image-btn-reset" onClick={resetView}>
          重設
        </button>
      </div>

      <div
        ref={viewportRef}
        className="overlay-image-viewport"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onPointerLeave={stopDragging}
      >
        <img
          className="overlay-image-content"
          src={src}
          alt={alt}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
          }}
        />
      </div>

      <div className="overlay-image-hint">滾輪縮放 · 拖曳移動</div>
    </div>
  )
}
