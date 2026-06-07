import { useEffect, useRef, useState } from 'react'
import type { ScreenRect } from '@desktop'

interface Point {
  x: number
  y: number
}

const MIN_SELECTION = 10

export default function App(): JSX.Element {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [start, setStart] = useState<Point | null>(null)
  const [current, setCurrent] = useState<Point | null>(null)
  const dragging = useRef(false)

  useEffect(() => {
    return window.electronAPI.onCaptureInit((payload) => {
      setOffset({ x: payload.offsetX, y: payload.offsetY })
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        window.electronAPI.cancelCapture()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const selection: ScreenRect | null =
    start && current
      ? {
          x: Math.min(start.x, current.x),
          y: Math.min(start.y, current.y),
          width: Math.abs(current.x - start.x),
          height: Math.abs(current.y - start.y)
        }
      : null

  const finishSelection = (rect: ScreenRect): void => {
    if (rect.width < MIN_SELECTION || rect.height < MIN_SELECTION) {
      return
    }

    window.electronAPI.completeCapture({
      x: offset.x + rect.x,
      y: offset.y + rect.y,
      width: rect.width,
      height: rect.height
    })
  }

  const handleMouseDown = (event: React.MouseEvent): void => {
    if (event.button !== 0) {
      return
    }

    dragging.current = true
    const point = { x: event.clientX, y: event.clientY }
    setStart(point)
    setCurrent(point)
  }

  const handleMouseMove = (event: React.MouseEvent): void => {
    if (!dragging.current) {
      return
    }
    setCurrent({ x: event.clientX, y: event.clientY })
  }

  const handleMouseUp = (event: React.MouseEvent): void => {
    if (!dragging.current || !start) {
      return
    }

    dragging.current = false
    const rect = {
      x: Math.min(start.x, event.clientX),
      y: Math.min(start.y, event.clientY),
      width: Math.abs(event.clientX - start.x),
      height: Math.abs(event.clientY - start.y)
    }

    setStart(null)
    setCurrent(null)
    finishSelection(rect)
  }

  return (
    <div
      className="capture-root"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {selection && selection.width > 0 && selection.height > 0 && (
        <div
          className="capture-selection"
          style={{
            left: selection.x,
            top: selection.y,
            width: selection.width,
            height: selection.height
          }}
        />
      )}

      <div className="capture-hint">拖曳選取要翻譯的區域 · Esc 取消</div>
    </div>
  )
}
