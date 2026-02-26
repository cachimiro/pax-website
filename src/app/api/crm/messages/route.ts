import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processQueuedMessages } from '@/lib/crm/messaging/send'

/**
 * POST /api/crm/messages
 * Process queued messages. Call this from a cron job or manually.
 * Requires webhook secret for authentication.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret')
  if (!secret || secret !== process.env.CRM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const processed = await processQueuedMessages(supabase)
    return NextResponse.json({ processed })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
