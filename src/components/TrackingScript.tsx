'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Lightweight visitor tracking for the public site.
 * - Generates anonymous visitor_id in localStorage (no cookies)
 * - Captures UTM params on first visit → sessionStorage
 * - Sends pageview beacon to /api/track on each navigation
 * - Exposes getTrackingData() for the booking form to read
 */
export default function TrackingScript() {
  const pathname = usePathname()
  const initialized = useRef(false)

  useEffect(() => {
    // Initialize visitor ID
    if (!localStorage.getItem('pax_vid')) {
      localStorage.setItem('pax_vid', generateId())
    }

    // Capture UTMs on first visit of session
    if (!sessionStorage.getItem('pax_utm_captured')) {
      const params = new URLSearchParams(window.location.search)
      const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
      utmKeys.forEach((key) => {
        const val = params.get(key)
        if (val) sessionStorage.setItem(`pax_${key}`, val)
      })

      // Store landing page and referrer
      sessionStorage.setItem('pax_landing_page', window.location.pathname)
      sessionStorage.setItem('pax_referrer', document.referrer || '')
      sessionStorage.setItem('pax_first_visit', new Date().toISOString())
      sessionStorage.setItem('pax_utm_captured', '1')
    }

    initialized.current = true
  }, [])

  // Track pageviews on navigation
  useEffect(() => {
    if (!initialized.current) return

    const visitorId = localStorage.getItem('pax_vid')
    if (!visitorId) return

    // Don't track CRM pages
    if (pathname.startsWith('/crm')) return

    const data = {
      visitor_id: visitorId,
      page_path: pathname,
      referrer: sessionStorage.getItem('pax_referrer') || '',
      utm_source: sessionStorage.getItem('pax_utm_source') || '',
      utm_medium: sessionStorage.getItem('pax_utm_medium') || '',
      utm_campaign: sessionStorage.getItem('pax_utm_campaign') || '',
      device_type: getDeviceType(),
    }

    // Use sendBeacon for reliability (doesn't block navigation)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', JSON.stringify(data))
    } else {
      fetch('/api/track', {
        method: 'POST',
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(() => {})
    }
  }, [pathname])

  return null
}

function generateId(): string {
  return 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

/**
 * Call this from the booking form to get all attribution data.
 */
export function getTrackingData() {
  return {
    visitor_id: localStorage.getItem('pax_vid') || '',
    utm_source: sessionStorage.getItem('pax_utm_source') || '',
    utm_medium: sessionStorage.getItem('pax_utm_medium') || '',
    utm_campaign: sessionStorage.getItem('pax_utm_campaign') || '',
    utm_content: sessionStorage.getItem('pax_utm_content') || '',
    utm_term: sessionStorage.getItem('pax_utm_term') || '',
    landing_page: sessionStorage.getItem('pax_landing_page') || '',
    referrer: sessionStorage.getItem('pax_referrer') || '',
    first_visit_at: sessionStorage.getItem('pax_first_visit') || '',
    device_type: getDeviceType(),
  }
}
