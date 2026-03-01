import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface ChannelStatus {
  email: { configured: boolean; provider: 'gmail' | 'resend' | 'none'; detail: string }
  sms: { configured: boolean; detail: string }
  whatsapp: { configured: boolean; detail: string }
}

/** GET /api/crm/channels/status — check which messaging channels are configured */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Email: check Gmail first, then Resend
  let emailStatus: ChannelStatus['email'] = { configured: false, provider: 'none', detail: 'No email provider configured' }

  const { data: googleConfig } = await supabase
    .from('google_config')
    .select('email, email_active, needs_reauth')
    .limit(1)
    .single()

  if (googleConfig?.email_active && !googleConfig.needs_reauth) {
    emailStatus = { configured: true, provider: 'gmail', detail: `Gmail: ${googleConfig.email}` }
  } else if (process.env.RESEND_API_KEY) {
    emailStatus = { configured: true, provider: 'resend', detail: `Resend: ${process.env.EMAIL_FROM ?? 'configured'}` }
  } else if (googleConfig?.needs_reauth) {
    emailStatus = { configured: false, provider: 'gmail', detail: 'Gmail needs re-authentication' }
  }

  // SMS
  const smsConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)
  const smsStatus = {
    configured: smsConfigured,
    detail: smsConfigured ? `From: ${process.env.TWILIO_PHONE_NUMBER}` : 'Twilio SMS not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)',
  }

  // WhatsApp
  const waConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER)
  const waNumber = process.env.TWILIO_WHATSAPP_NUMBER ?? ''
  const waStatus = {
    configured: waConfigured,
    detail: waConfigured ? `From: ${waNumber.replace('whatsapp:', '')}` : 'Twilio WhatsApp not configured (set TWILIO_WHATSAPP_NUMBER)',
  }

  return NextResponse.json({ email: emailStatus, sms: smsStatus, whatsapp: waStatus })
}
