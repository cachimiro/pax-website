import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { data: messages } = await admin
      .from('fitting_messages')
      .select('*')
      .eq('fitting_job_id', id)
      .order('created_at', { ascending: true })

    // Mark fitter messages as read
    await admin
      .from('fitting_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('fitting_job_id', id)
      .eq('sender_type', 'fitter')
      .is('read_at', null)

    return NextResponse.json({ messages: messages || [] })
  } catch (err: unknown) {
    console.error('CRM messages GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: msg, error } = await admin
      .from('fitting_messages')
      .insert({
        fitting_job_id: id,
        sender_type: 'office',
        sender_id: user.id,
        message: body.message.trim(),
        attachments: body.attachments || [],
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ message: msg })
  } catch (err: unknown) {
    console.error('CRM message POST error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
