import { useEffect, useRef } from 'react'

type DragState = {
  startScreenX: number
  startScreenY: number
  originX: number
  originY: number
}

export function useOverlayDrag(): {
  dragHandleProps: {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  }
} {
  const dragRef = useRef<DragState | null>(null)

  useEffect(() => {
    const onPointerMove = (event: PointerEvent): void => {
      const drag = dragRef.current
      if (!drag) {
        return
      }

      const x = drag.originX + (event.screenX - drag.startScreenX)
      const y = drag.originY + (event.screenY - drag.startScreenY)
      void window.electronAPI.setOverlayPosition(x, y)
    }

    const endDrag = (): void => {
      if (!dragRef.current) {
        return
      }
      dragRef.current = null
      window.electronAPI.setOverlayDragging(false)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      if (dragRef.current) {
        window.electronAPI.setOverlayDragging(false)
      }
    }
  }, [])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) {
      return
    }

    if ((event.target as HTMLElement).closest('button')) {
      return
    }

    void (async () => {
      const [originX, originY] = await window.electronAPI.getOverlayPosition()
      dragRef.current = {
        startScreenX: event.screenX,
        startScreenY: event.screenY,
        originX,
        originY
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      window.electronAPI.setOverlayDragging(true)
    })()
  }

  return { dragHandleProps: { onPointerDown } }
}
