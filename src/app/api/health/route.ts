import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface ServiceCheck {
  status: 'ok' | 'error' | 'unconfigured'
  detail?: string
  latency_ms?: number
}

/** GET /api/health — system health check for all integrations */
export async function GET() {
  const checks: Record<string, ServiceCheck> = {}
  const start = Date.now()

  // Supabase
  try {
    const t0 = Date.now()
    const supabase = createAdminClient()
    const { error } = await supabase.from('profiles').select('id').limit(1)
    checks.supabase = error
      ? { status: 'error', detail: error.message, latency_ms: Date.now() - t0 }
      : { status: 'ok', latency_ms: Date.now() - t0 }
  } catch (err: any) {
    checks.supabase = { status: 'error', detail: err.message }
  }

  // Google (Gmail + Calendar)
  try {
    const supabase = createAdminClient()
    const { data: config } = await supabase
      .from('google_config')
      .select('email, email_active, calendar_active, needs_reauth')
      .limit(1)
      .single()

    if (!config) {
      checks.google = { status: 'unconfigured', detail: 'No Google account connected' }
    } else if (config.needs_reauth) {
      checks.google = { status: 'error', detail: `${config.email} needs re-authentication` }
    } else {
      checks.google = {
        status: 'ok',
        detail: `${config.email} (email: ${config.email_active ? 'on' : 'off'}, calendar: ${config.calendar_active ? 'on' : 'off'})`,
      }
    }
  } catch (err: any) {
    checks.google = { status: 'error', detail: err.message }
  }

  // Twilio (SMS)
  const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)
  checks.twilio_sms = twilioConfigured
    ? { status: 'ok', detail: `From: ${process.env.TWILIO_PHONE_NUMBER}` }
    : { status: 'unconfigured', detail: 'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER missing' }

  // Twilio (WhatsApp)
  const waConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER)
  checks.twilio_whatsapp = waConfigured
    ? { status: 'ok', detail: `From: ${(process.env.TWILIO_WHATSAPP_NUMBER ?? '').replace('whatsapp:', '')}` }
    : { status: 'unconfigured', detail: 'TWILIO_WHATSAPP_NUMBER missing' }

  // Stripe
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY
  checks.stripe = stripeConfigured
    ? { status: 'ok', detail: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'Live mode' : 'Test mode' }
    : { status: 'unconfigured', detail: 'STRIPE_SECRET_KEY missing' }

  // OpenAI
  const openaiConfigured = !!process.env.OPENAI_API_KEY
  checks.openai = openaiConfigured
    ? { status: 'ok' }
    : { status: 'unconfigured', detail: 'OPENAI_API_KEY missing — AI features disabled' }

  // Overall status
  const hasErrors = Object.values(checks).some((c) => c.status === 'error')
  const allOk = Object.values(checks).every((c) => c.status === 'ok')

  return NextResponse.json({
    status: hasErrors ? 'degraded' : allOk ? 'healthy' : 'partial',
    uptime_ms: Date.now() - start,
    checks,
    timestamp: new Date().toISOString(),
  })
}
