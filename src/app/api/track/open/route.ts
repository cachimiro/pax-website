import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

/**
 * GET /api/track/open?mid=<message_log_id>&lid=<lead_id>
 * Tracking pixel for email opens. Returns a 1x1 transparent GIF.
 * No auth — embedded in emails as <img> tag.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const messageLogId = searchParams.get('mid')
  const leadId = searchParams.get('lid')

  // Rate limit: 100 opens per message per hour (prevents pixel reload spam)
  if (messageLogId) {
    const rl = rateLimit(`open:${messageLogId}`, { limit: 100, windowSeconds: 3600 })
    if (!rl.allowed) {
      return new NextResponse(PIXEL, {
        status: 200,
        headers: { 'Content-Type': 'image/gif', 'Content-Length': String(PIXEL.length), 'Cache-Control': 'no-store' },
      })
    }
  }

  // Record the open event (fire-and-forget)
  if (messageLogId) {
    const supabase = createAdminClient()
    supabase
      .from('email_events')
      .insert({
        message_log_id: messageLogId,
        lead_id: leadId,
        event_type: 'open',
        ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
        user_agent: req.headers.get('user-agent') ?? null,
      })
      .then(({ error }) => {
        if (error) console.error('Open tracking error:', error)
      })
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(PIXEL.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}
