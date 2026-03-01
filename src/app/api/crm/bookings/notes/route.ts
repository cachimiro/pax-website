import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processPostCallNotes } from '@/lib/crm/post-call-ai'
import { z } from 'zod'

const schema = z.object({
  booking_id: z.string().uuid(),
  notes: z.string().min(1).max(10000),
})

/**
 * POST /api/crm/bookings/notes
 * Submit post-call notes for AI analysis and stage suggestion.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  const { booking_id, notes } = parsed.data

  // Verify booking exists
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, opportunity_id')
    .eq('id', booking_id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const result = await processPostCallNotes(supabase, booking_id, notes, user.id)

  return NextResponse.json({
    suggestion: result.suggestion,
    auto_moved: result.autoMoved,
    new_stage: result.newStage,
  })
}
