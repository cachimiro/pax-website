import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/booking/resume?id=<abandonment_id>
 * Returns saved form data so the client can pre-fill fields and resume.
 * Also updates last_activity_at to prevent re-triggering follow-ups.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('form_abandonments')
      .select(
        'name, email, phone, whatsapp_opt_in, last_step, postcode, postcode_location, room, style, package_choice, budget_range, timeline'
      )
      .eq('id', id)
      .in('status', ['active', 'contacted'])
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Update last_activity_at so the cron doesn't re-trigger while they're active
    await supabase
      .from('form_abandonments')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
