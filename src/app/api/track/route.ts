import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/track
 * Lightweight pageview beacon. No auth required.
 * Accepts sendBeacon payloads from the public site.
 */
export async function POST(request: NextRequest) {
  try {
    let data: Record<string, string>

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      data = await request.json()
    } else {
      // sendBeacon sends as text/plain
      const text = await request.text()
      data = JSON.parse(text)
    }

    const { visitor_id, page_path, referrer, utm_source, utm_medium, utm_campaign, device_type } = data

    if (!visitor_id || !page_path) {
      return new NextResponse(null, { status: 204 })
    }

    const supabase = createAdminClient()

    await supabase.from('site_sessions').insert({
      visitor_id,
      page_path,
      referrer: referrer || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      device_type: device_type || null,
    })

    return new NextResponse(null, { status: 204 })
  } catch {
    // Never fail — tracking should not break the user experience
    return new NextResponse(null, { status: 204 })
  }
}
