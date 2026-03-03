import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignOffToken } from '@/lib/fitter/tokens'

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

    // Get subcontractor
    const { data: sub } = await admin
      .from('subcontractors')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'No active subcontractor record' }, { status: 403 })
    }

    // Verify job belongs to this fitter and is in completed status
    const { data: job } = await admin
      .from('fitting_jobs')
      .select('*')
      .eq('id', id)
      .eq('subcontractor_id', sub.id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Job must be in "completed" status before sign-off' },
        { status: 400 }
      )
    }

    const body = await req.json()

    if (body.method === 'in_person') {
      // In-person sign-off: both signatures provided
      const { fitter_signature, customer_signature, customer_signer_name, customer_signer_relation } = body

      if (!fitter_signature || !customer_signature || !customer_signer_name) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const now = new Date().toISOString()
      const { error: updateErr } = await admin
        .from('fitting_jobs')
        .update({
          status: 'signed_off',
          sign_off_method: 'in_person',
          fitter_signature,
          fitter_signed_at: now,
          customer_signature,
          customer_signed_at: now,
          customer_signer_name,
          customer_signer_relation: customer_signer_relation || 'owner',
          signed_off_at: now,
          updated_at: now,
        })
        .eq('id', id)

      if (updateErr) throw updateErr

      console.log(`Job ${job.job_code} signed off in-person by ${customer_signer_name}`)

      // Notify office
      try {
        const { notifyOfficeJobSignedOff } = await import('@/lib/fitter/notifications')
        await notifyOfficeJobSignedOff(job.job_code, job.customer_name || 'Customer', customer_signer_name, 'in_person')
      } catch (notifErr) {
        console.error('Failed to send sign-off notification:', notifErr)
      }

      return NextResponse.json({ success: true, method: 'in_person' })

    } else if (body.method === 'remote_link') {
      // Generate sign-off token and send email
      const { send_to, fitter_signature } = body

      if (!send_to) {
        return NextResponse.json({ error: 'Email address required' }, { status: 400 })
      }

      const token = generateSignOffToken(id)

      const updates: Record<string, unknown> = {
        sign_off_method: 'remote_link',
        sign_off_token: token,
        sign_off_sent_to: send_to,
        sign_off_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (fitter_signature) {
        updates.fitter_signature = fitter_signature
        updates.fitter_signed_at = new Date().toISOString()
      }

      const { error: updateErr } = await admin
        .from('fitting_jobs')
        .update(updates)
        .eq('id', id)

      if (updateErr) throw updateErr

      // Send email with sign-off link
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://paxbespoke.co.uk'
      const signOffUrl = `${baseUrl}/sign-off/${token}`

      // Send email via existing channel
      try {
        const { sendEmail } = await import('@/lib/crm/messaging/channels')
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Fitting Sign-Off Required</h2>
            <p>Hi,</p>
            <p>Your PaxBespoke wardrobe fitting (${job.job_code}) has been completed. Please review and sign off the work by clicking the link below:</p>
            <p style="margin: 24px 0;">
              <a href="${signOffUrl}" style="background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Review &amp; Sign Off
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">This link expires in 7 days.</p>
            <p style="color: #666; font-size: 14px;">If you have any questions, please contact us.</p>
          </div>
        `
        await sendEmail(send_to, `PaxBespoke Fitting Sign-Off — ${job.job_code}`, html)
      } catch (emailErr) {
        console.error('Failed to send sign-off email:', emailErr)
        // Don't fail the request — token is saved, can be resent
      }

      console.log(`Sign-off link sent to ${send_to} for job ${job.job_code}`)
      return NextResponse.json({ success: true, method: 'remote_link' })

    } else {
      return NextResponse.json({ error: 'Invalid method' }, { status: 400 })
    }
  } catch (err: unknown) {
    console.error('Sign-off error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sign-off failed' },
      { status: 500 }
    )
  }
}
