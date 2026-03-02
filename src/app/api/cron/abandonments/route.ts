import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/cron/abandonments
 * Detects form abandonments and queues follow-up emails.
 * Runs every 10 minutes via Vercel cron.
 *
 * Logic:
 * 1. Find active abandonments with email where last_activity > 30 min ago
 * 2. Check if they've since completed a booking (matching email in leads)
 * 3. Queue the appropriate follow-up email based on time since abandonment
 * 4. Create a partial lead record for CRM visibility
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '')
  const webhookSecret = req.headers.get('x-webhook-secret')

  const isAuthorized =
    (cronSecret && cronSecret === process.env.CRON_SECRET) ||
    (webhookSecret && webhookSecret === process.env.CRM_WEBHOOK_SECRET)

  if (!isAuthorized) {
    // Also allow admin session
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }
  }

  try {
    const supabase = createAdminClient()
    const now = new Date()
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString()

    // Find active abandonments with email, inactive for 30+ minutes
    const { data: abandonments } = await supabase
      .from('form_abandonments')
      .select('*')
      .eq('status', 'active')
      .not('email', 'is', null)
      .lt('last_activity_at', thirtyMinAgo)
      .order('last_activity_at', { ascending: true })
      .limit(50)

    if (!abandonments?.length) {
      return NextResponse.json({ processed: 0, converted: 0, queued: 0 })
    }

    let processed = 0
    let converted = 0
    let queued = 0

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'

    // Load abandonment templates
    const { data: templates } = await supabase
      .from('message_templates')
      .select('slug, subject, body, channels, delay_minutes')
      .eq('trigger_stage', 'form_abandoned')
      .eq('active', true)
      .order('delay_minutes', { ascending: true })

    for (const ab of abandonments) {
      processed++

      // Check if this person has since completed a booking
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('email', ab.email)
        .neq('status', 'abandoned')
        .gte('created_at', ab.created_at)
        .limit(1)
        .single()

      if (existingLead) {
        // They completed the form — mark as converted
        await supabase
          .from('form_abandonments')
          .update({ status: 'converted', converted_lead_id: existingLead.id })
          .eq('id', ab.id)
        converted++
        continue
      }

      // Determine which follow-up to send based on time since abandonment
      const minutesSinceAbandonment = Math.floor(
        (now.getTime() - new Date(ab.created_at).getTime()) / (60 * 1000)
      )

      // Find the right template: the one whose delay_minutes has passed
      // but hasn't been sent yet (check followup_count)
      const followupsSent = ab.followup_count ?? 0

      if (!templates?.length) continue

      // Templates are ordered by delay_minutes ascending
      // Send the next one that's due
      const nextTemplate = templates[followupsSent]
      if (!nextTemplate) continue // All follow-ups already sent
      if (minutesSinceAbandonment < nextTemplate.delay_minutes) continue // Not time yet

      // Create a partial lead if this is the first follow-up
      let leadId: string | null = null
      if (followupsSent === 0) {
        const { data: partialLead } = await supabase
          .from('leads')
          .insert({
            name: ab.name || 'Unknown',
            email: ab.email,
            phone: ab.phone || null,
            postcode: ab.postcode || null,
            project_type: ab.room || null,
            budget_band: ab.budget_range || null,
            source: 'form_abandonment',
            status: 'abandoned',
            notes: buildAbandonmentNotes(ab),
            traffic_source: classifySource(ab.utm_source, ab.utm_medium, ab.referrer),
            utm_source: ab.utm_source || null,
            utm_medium: ab.utm_medium || null,
            utm_campaign: ab.utm_campaign || null,
            utm_content: ab.utm_content || null,
            utm_term: ab.utm_term || null,
            landing_page: ab.landing_page || null,
            referrer: ab.referrer || null,
            device_type: ab.device_type || null,
            visitor_id: ab.visitor_id || null,
          })
          .select('id')
          .single()

        leadId = partialLead?.id ?? null
      } else {
        // Find the existing partial lead
        const { data: existingPartial } = await supabase
          .from('leads')
          .select('id')
          .eq('email', ab.email)
          .eq('source', 'form_abandonment')
          .limit(1)
          .single()

        leadId = existingPartial?.id ?? null
      }

      if (!leadId) continue

      // Build template variables
      const firstName = (ab.name || '').split(' ')[0] || 'there'
      const resumeLink = `${baseUrl}/book?resume=${ab.id}`

      const variables: Record<string, string> = {
        name: ab.name || '',
        first_name: firstName,
        owner_name: 'PaxBespoke',
        project_type: ab.room || 'wardrobe',
        resume_link: resumeLink,
        booking_link: resumeLink,
      }

      const subject = interpolate(nextTemplate.subject, variables)
      const body = interpolate(nextTemplate.body, variables)

      // Check for duplicate: don't re-queue the same template
      const { data: existingMsg } = await supabase
        .from('message_logs')
        .select('id')
        .eq('lead_id', leadId)
        .eq('template', nextTemplate.slug)
        .in('status', ['queued', 'sent', 'sending'])
        .limit(1)
        .single()

      if (existingMsg) continue // Already queued/sent

      // Queue the email
      for (const channel of nextTemplate.channels as string[]) {
        if (channel === 'email' && !ab.email) continue
        if ((channel === 'sms' || channel === 'whatsapp') && !ab.phone) continue
        // Only send WhatsApp if they opted in
        if (channel === 'whatsapp' && !ab.whatsapp_opt_in) continue

        await supabase.from('message_logs').insert({
          lead_id: leadId,
          channel,
          template: nextTemplate.slug,
          status: 'queued',
          scheduled_for: null, // Send immediately (cron/messages will pick it up)
          metadata: {
            subject,
            body,
            auto_triggered: true,
            trigger_stage: 'form_abandoned',
            abandonment_id: ab.id,
            resume_link: resumeLink,
          },
        })
      }

      // Update abandonment record
      await supabase
        .from('form_abandonments')
        .update({
          followup_count: followupsSent + 1,
          last_followup_at: now.toISOString(),
          status: followupsSent + 1 >= (templates?.length ?? 0) ? 'contacted' : 'active',
        })
        .eq('id', ab.id)

      queued++
    }

    // GDPR cleanup: delete unconverted abandonments older than 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { count: deletedCount } = await supabase
      .from('form_abandonments')
      .delete({ count: 'exact' })
      .in('status', ['active', 'contacted'])
      .lt('created_at', thirtyDaysAgo)

    return NextResponse.json({
      processed,
      converted,
      queued,
      gdpr_deleted: deletedCount ?? 0,
      timestamp: now.toISOString(),
    })
  } catch (err: any) {
    console.error('Abandonment cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function buildAbandonmentNotes(ab: Record<string, any>): string {
  const parts: string[] = []
  parts.push(`Form abandoned at step ${ab.last_step} (${ab.last_step_label || 'unknown'})`)
  if (ab.room) parts.push(`Room: ${ab.room}`)
  if (ab.style) parts.push(`Style: ${ab.style}`)
  if (ab.package_choice) parts.push(`Package: ${ab.package_choice}`)
  if (ab.budget_range) parts.push(`Budget: ${ab.budget_range}`)
  if (ab.timeline) parts.push(`Timeline: ${ab.timeline}`)
  if (ab.postcode_location) parts.push(`Location: ${ab.postcode_location}`)
  return parts.join('\n')
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

function classifySource(
  utmSource: string | null | undefined,
  utmMedium: string | null | undefined,
  referrer: string | null | undefined
): string {
  if (utmSource) {
    const src = utmSource.toLowerCase()
    if (src.includes('google')) return utmMedium === 'cpc' ? 'Google Ads' : 'Google Organic'
    if (src.includes('facebook') || src.includes('fb')) return 'Facebook'
    if (src.includes('instagram') || src.includes('ig')) return 'Instagram'
    return utmSource
  }
  if (referrer) {
    const ref = referrer.toLowerCase()
    if (ref.includes('google')) return 'Google Organic'
    if (ref.includes('facebook')) return 'Facebook'
    if (ref.includes('instagram')) return 'Instagram'
    return 'Referral'
  }
  return 'Direct'
}
