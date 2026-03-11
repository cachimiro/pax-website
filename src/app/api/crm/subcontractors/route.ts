import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateInviteToken } from '@/lib/fitter/tokens'
import { sendEmail } from '@/lib/crm/messaging/channels'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('subcontractors')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, email, phone, contact_name, notes } = await request.json()
  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Check for existing subcontractor row
  const { data: existing } = await admin
    .from('subcontractors')
    .select('id, status')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'A subcontractor with this email already exists' }, { status: 409 })
  }

  // Clean up any orphaned auth user with this email (e.g. previously deleted fitter).
  // Without this, createUser would fail and the invite token would never be set.
  const { data: authList } = await admin.auth.admin.listUsers()
  const orphanedAuthUser = authList?.users?.find(
    u => u.email?.toLowerCase() === email.trim().toLowerCase()
  )
  if (orphanedAuthUser) {
    // Only delete if they have no CRM profile — don't touch CRM staff accounts
    const { data: crmProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('id', orphanedAuthUser.id)
      .maybeSingle()
    if (!crmProfile) {
      await admin.auth.admin.deleteUser(orphanedAuthUser.id)
    } else {
      return NextResponse.json(
        { error: 'This email belongs to a CRM staff account and cannot be used for a fitter.' },
        { status: 409 }
      )
    }
  }

  // Create subcontractor
  const { data: sub, error } = await admin
    .from('subcontractors')
    .insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      contact_name: contact_name?.trim() || null,
      notes: notes?.trim() || null,
      status: 'invited',
    })
    .select('id, email')
    .single()

  if (error || !sub) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create' }, { status: 500 })
  }

  // Generate invite token and save
  const token = generateInviteToken(sub.id, sub.email)
  await admin.from('subcontractors').update({
    invite_token: token,
    invite_sent_at: new Date().toISOString(),
  }).eq('id', sub.id)

  // Send invite email
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'
  const activateUrl = `${baseUrl}/fitter/activate?token=${token}`

  await sendEmail(
    sub.email,
    'You\'ve been invited to join PaxBespoke',
    `Hi ${contact_name || name},\n\nYou've been invited to join PaxBespoke as a fitting subcontractor.\n\nClick the link below to set up your account:\n${activateUrl}\n\nThis link expires in 30 days.\n\nPaxBespoke`,
    admin,
  )

  return NextResponse.json({ id: sub.id, message: 'Invitation sent' })
}
