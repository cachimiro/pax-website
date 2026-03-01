import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/track/click?mid=<message_log_id>&lid=<lead_id>&url=<encoded_url>
 * Click tracking redirect. Records the click then 302 redirects to the target URL.
 * No auth — embedded in emails as link wrapper.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const messageLogId = searchParams.get('mid')
  const leadId = searchParams.get('lid')
  const targetUrl = searchParams.get('url')

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  // Record the click event (fire-and-forget)
  if (messageLogId) {
    const supabase = createAdminClient()
    supabase
      .from('email_events')
      .insert({
        message_log_id: messageLogId,
        lead_id: leadId,
        event_type: 'click',
        url: targetUrl,
        ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
        user_agent: req.headers.get('user-agent') ?? null,
      })
      .then(({ error }) => {
        if (error) console.error('Click tracking error:', error)
      })
  }

  return NextResponse.redirect(targetUrl, 302)
}
