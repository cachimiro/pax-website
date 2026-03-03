'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Eraser } from 'lucide-react'

interface SignatureCanvasProps {
  onSignature: (dataUrl: string) => void
  width?: number
  height?: number
  label?: string
}

export default function SignatureCanvas({
  onSignature,
  width = 400,
  height = 200,
  label = 'Sign here',
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }, [])

  useEffect(() => {
    const ctx = getCtx()
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [getCtx, width, height])

  function getPos(e: React.TouchEvent | React.MouseEvent) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function startDraw(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault()
    setDrawing(true)
    lastPoint.current = getPos(e)
  }

  function draw(e: React.TouchEvent | React.MouseEvent) {
    if (!drawing) return
    e.preventDefault()
    const ctx = getCtx()
    if (!ctx || !lastPoint.current) return

    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPoint.current = pos
    setHasContent(true)
  }

  function endDraw() {
    if (!drawing) return
    setDrawing(false)
    lastPoint.current = null

    if (hasContent) {
      const canvas = canvasRef.current
      if (canvas) {
        onSignature(canvas.toDataURL('image/png'))
      }
    }
  }

  function clear() {
    const ctx = getCtx()
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setHasContent(false)
    onSignature('')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--warm-600)]">{label}</span>
        {hasContent && (
          <button onClick={clear}
            className="flex items-center gap-1 text-xs text-[var(--warm-400)] hover:text-red-500 transition-colors">
            <Eraser size={12} /> Clear
          </button>
        )}
      </div>
      <div className="border-2 border-dashed border-[var(--warm-200)] rounded-xl overflow-hidden bg-white relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full touch-none cursor-crosshair"
          style={{ aspectRatio: `${width}/${height}` }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-sm text-[var(--warm-300)]">Draw signature here</span>
          </div>
        )}
      </div>
    </div>
  )
}
