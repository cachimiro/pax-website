'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function PageProgress() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const prevPath = useRef(pathname)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (pathname === prevPath.current) return
    prevPath.current = pathname

    // Start progress
    setVisible(true)
    setProgress(30)

    timer.current = setTimeout(() => setProgress(70), 100)
    const t2 = setTimeout(() => setProgress(100), 300)
    const t3 = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 500)

    return () => {
      if (timer.current) clearTimeout(timer.current)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [pathname])

  if (!visible && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[3px]">
      <div
        className="h-full bg-gradient-to-r from-[var(--green-500)] to-[var(--orange-400)] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
          boxShadow: '0 0 12px var(--green-500), 0 0 4px var(--green-500)',
        }}
      />
    </div>
  )
}
