import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendQBInvoice } from '@/lib/crm/quickbooks'
import { sendEmail } from '@/lib/crm/messaging/channels'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invoice_id, opportunity_id } = await req.json()
  if (!invoice_id) return NextResponse.json({ error: 'invoice_id required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: inv } = await admin
    .from('invoices')
    .select('*, opportunities(leads(name, email))')
    .eq('id', invoice_id)
    .single()

  if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const lead = (inv.opportunities as Record<string, unknown>)?.leads as Record<string, unknown> | null
  const email = lead?.email as string | null

  if (!email) return NextResponse.json({ error: 'No email on lead' }, { status: 400 })

  const qboInvoiceId = (inv as Record<string, unknown>).qbo_invoice_id as string | null
  const qboPayUrl = (inv as Record<string, unknown>).qbo_pay_url as string | null
  const depositAmount = inv.deposit_amount ?? inv.amount
  const firstName = (lead?.name as string ?? 'there').split(' ')[0]

  // Try QBO resend first
  if (qboInvoiceId) {
    await sendQBInvoice(supabase, qboInvoiceId, email)
  }

  // Also send via CRM email with payment button
  const payLink = qboPayUrl ?? `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'}/my-booking?invoice=${invoice_id}`

  await sendEmail(
    email,
    `Reminder: your deposit invoice — £${Number(depositAmount).toLocaleString('en-GB')}`,
    `Hi ${firstName},

Just a reminder that your deposit invoice of £${Number(depositAmount).toLocaleString('en-GB')} is still outstanding.

[CTA:Pay deposit — £${Number(depositAmount).toLocaleString('en-GB')}|${payLink}]

If you have any questions, just reply to this email.

PaxBespoke`,
    supabase
  )

  await admin
    .from('invoices')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', invoice_id)

  return NextResponse.json({ resent: true })
}
