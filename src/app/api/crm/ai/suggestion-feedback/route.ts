import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { log_id, outcome } = await request.json()
  if (!log_id || !outcome) {
    return NextResponse.json({ error: 'log_id and outcome are required' }, { status: 400 })
  }

  const validOutcomes = ['accepted', 'dismissed', 'snoozed']
  if (!validOutcomes.includes(outcome)) {
    return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
  }

  const { error } = await supabase
    .from('ai_suggestion_log')
    .update({ outcome, acted_at: new Date().toISOString() })
    .eq('id', log_id)

  if (error) {
    console.error('suggestion-feedback update error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
