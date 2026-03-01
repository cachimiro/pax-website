'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Instant navigation feedback. Starts the progress bar the moment
 * a CRM link is clicked (before the route loads), and completes
 * when the pathname actually changes.
 */
export default function NavigationProgress() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const prevPath = useRef(pathname)
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isNavigating = useRef(false)

  // Start the bar instantly on any internal link click
  const startProgress = useCallback(() => {
    if (isNavigating.current) return
    isNavigating.current = true
    setProgress(15)

    // Trickle: slowly increment to simulate loading
    trickleRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p
        // Slow down as it gets higher
        const increment = p < 30 ? 8 : p < 50 ? 4 : p < 70 ? 2 : 0.5
        return Math.min(p + increment, 90)
      })
    }, 200)
  }, [])

  const completeProgress = useCallback(() => {
    if (trickleRef.current) {
      clearInterval(trickleRef.current)
      trickleRef.current = null
    }
    isNavigating.current = false
    setProgress(100)
    setTimeout(() => setProgress(0), 300)
  }, [])

  // Complete when pathname changes
  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname
      completeProgress()
    }
  }, [pathname, completeProgress])

  // Intercept clicks on links within the CRM
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
      if (!target) return

      const href = target.getAttribute('href')
      if (!href || !href.startsWith('/crm')) return
      if (href === pathname) return

      // Don't intercept external links, new tabs, or modified clicks
      if (target.target === '_blank') return
      if (e.metaKey || e.ctrlKey || e.shiftKey) return

      startProgress()
    }

    // Also intercept programmatic navigation (router.push) via button clicks
    // that navigate (e.g., table rows with onClick -> router.push)
    function handleButtonClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      const row = target.closest('tr[class*="cursor-pointer"], [data-navigate]')
      if (row) {
        startProgress()
      }
    }

    document.addEventListener('click', handleClick, true)
    document.addEventListener('click', handleButtonClick, true)
    return () => {
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('click', handleButtonClick, true)
      if (trickleRef.current) clearInterval(trickleRef.current)
    }
  }, [pathname, startProgress])

  if (progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-[var(--green-500)] to-[var(--orange-400)]"
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
          transition: progress >= 100
            ? 'width 150ms ease-out, opacity 300ms ease-out 150ms'
            : 'width 200ms ease-out',
          boxShadow: '0 0 12px var(--green-500), 0 0 4px var(--green-500)',
        }}
      />
    </div>
  )
}
