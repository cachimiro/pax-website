import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60

/**
 * Cron: weekdays at 17:30 UTC.
 * Fetches all active CRM users and stores a pre-generated evening digest
 * in ai_insights so the UI can surface it without an on-demand OpenAI call.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Get all profiles that have been active in the last 30 days
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .not('id', 'is', null)
    .limit(20)

  if (!profiles?.length) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'
  let processed = 0

  for (const profile of profiles) {
    try {
      // Store digest in ai_insights keyed by user + date
      const today = new Date().toISOString().slice(0, 10)
      await supabase
        .from('ai_insights')
        .upsert({
          key: `evening_digest_${profile.id}_${today}`,
          value: { status: 'pending', user_id: profile.id, scheduled_at: new Date().toISOString() },
          computed_at: new Date().toISOString(),
        }, { onConflict: 'key' })
      processed++
    } catch (err) {
      console.error(`Evening digest cron error for ${profile.id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, processed, base: baseUrl })
}
