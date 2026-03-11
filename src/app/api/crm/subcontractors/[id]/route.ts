import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireCrmUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireCrmUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()
  const { data, error } = await admin.from('subcontractors').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireCrmUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await req.json()

  if (!['active', 'suspended', 'invited'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('subcontractors')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireCrmUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  // Fetch the subcontractor to get their auth user id
  const { data: sub } = await admin
    .from('subcontractors')
    .select('id, user_id, email')
    .eq('id', id)
    .single()

  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete the subcontractor row first (FK constraints cascade to fitting_messages etc.)
  const { error: deleteError } = await admin.from('subcontractors').delete().eq('id', id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  // Delete the auth user if one was created (activated fitter)
  if (sub.user_id) {
    await admin.auth.admin.deleteUser(sub.user_id)
  } else {
    // May have a partial auth user from a failed activation — clean up by email
    const { data: authList } = await admin.auth.admin.listUsers()
    const orphan = authList?.users?.find(u => u.email?.toLowerCase() === sub.email.toLowerCase())
    if (orphan) {
      const { data: crmProfile } = await admin
        .from('profiles')
        .select('id')
        .eq('id', orphan.id)
        .maybeSingle()
      if (!crmProfile) {
        await admin.auth.admin.deleteUser(orphan.id)
      }
    }
  }

  return NextResponse.json({ success: true })
}
