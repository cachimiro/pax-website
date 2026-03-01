import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, sendSms, sendWhatsApp } from '@/lib/crm/messaging/channels'
import { interpolate } from '@/lib/crm/messaging/templates'
import type { MessageChannel } from '@/lib/crm/types'

/**
 * POST /api/crm/templates/test
 * Send a test message using a template's content.
 * Body: { subject, body, channel, to }
 * - to: email address or phone number
 * - channel: 'email' | 'sms' | 'whatsapp'
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json()
  const { subject, body: templateBody, channel, to } = body as {
    subject: string
    body: string
    channel: MessageChannel
    to: string
  }

  if (!channel || !to || !templateBody) {
    return NextResponse.json({ error: 'channel, to, and body required' }, { status: 400 })
  }

  // Replace placeholders with test values
  const testVars: Record<string, string> = {
    name: 'Test User',
    first_name: 'Test',
    owner_name: profile?.full_name ?? 'PaxBespoke',
    project_type: 'walk-in wardrobe',
    amount: '1,500',
    date: 'Mon 3 Mar',
    time: '10:00',
    booking_link: 'https://paxbespoke.uk/book',
    payment_link: 'https://paxbespoke.uk/pay/test',
  }

  const interpolatedSubject = interpolate(subject ?? '', testVars)
  const interpolatedBody = interpolate(templateBody, testVars)

  try {
    let result
    switch (channel) {
      case 'email':
        result = await sendEmail(to, interpolatedSubject, interpolatedBody, supabase)
        break
      case 'sms':
        result = await sendSms(to, interpolatedBody)
        break
      case 'whatsapp':
        result = await sendWhatsApp(to, interpolatedBody, undefined, 'Test')
        break
    }

    if (result?.success) {
      return NextResponse.json({
        success: true,
        sentVia: result.sentVia ?? channel,
        externalId: result.externalId,
        detail: result.sentVia === 'dry-run'
          ? 'No credentials configured — message was logged but not actually sent.'
          : `Sent via ${result.sentVia ?? channel}${result.externalId ? ` (ID: ${result.externalId.slice(0, 20)})` : ''}`,
      })
    } else {
      return NextResponse.json({ error: result?.error ?? 'Send failed' }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
