'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Global keyboard shortcuts for the CRM.
 * / — Focus search
 * g then p — Go to pipeline
 * g then l — Go to leads
 * g then c — Go to calendar
 * g then t — Go to tasks
 * g then d — Go to dashboard
 */
export default function KeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    let gPressed = false
    let gTimeout: NodeJS.Timeout

    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger in inputs
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return
      }

      // / to focus search
      if (e.key === '/') {
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')
        searchInput?.focus()
        return
      }

      // g + key navigation
      if (e.key === 'g') {
        gPressed = true
        clearTimeout(gTimeout)
        gTimeout = setTimeout(() => { gPressed = false }, 500)
        return
      }

      if (gPressed) {
        gPressed = false
        switch (e.key) {
          case 'p': router.push('/crm/pipeline'); break
          case 'l': router.push('/crm/leads'); break
          case 'c': router.push('/crm/calendar'); break
          case 't': router.push('/crm/tasks'); break
          case 'd': router.push('/crm'); break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(gTimeout)
    }
  }, [router])

  return null
}
