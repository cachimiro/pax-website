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

    if (!user || user.user_metadata?.role !== 'fitter') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify fitter owns this job
    const { data: sub } = await admin
      .from('subcontractors')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: job } = await admin
      .from('fitting_jobs')
      .select('id')
      .eq('id', id)
      .eq('subcontractor_id', sub.id)
      .single()

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    // Fetch messages
    const { data: messages } = await admin
      .from('fitting_messages')
      .select('*')
      .eq('fitting_job_id', id)
      .order('created_at', { ascending: true })

    // Mark office messages as read
    await admin
      .from('fitting_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('fitting_job_id', id)
      .eq('sender_type', 'office')
      .is('read_at', null)

    return NextResponse.json({ messages: messages || [] })
  } catch (err: unknown) {
    console.error('Fitter messages GET error:', err)
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

    if (!user || user.user_metadata?.role !== 'fitter') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: sub } = await admin
      .from('subcontractors')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: job } = await admin
      .from('fitting_jobs')
      .select('id')
      .eq('id', id)
      .eq('subcontractor_id', sub.id)
      .single()

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const body = await req.json()
    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const { data: msg, error } = await admin
      .from('fitting_messages')
      .insert({
        fitting_job_id: id,
        sender_type: 'fitter',
        sender_id: user.id,
        message: body.message.trim(),
        attachments: body.attachments || [],
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ message: msg })
  } catch (err: unknown) {
    console.error('Fitter message POST error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
