import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/crm/leads/import
 * Import leads from parsed CSV data.
 * Body: { leads: Array<{ name, email?, phone?, postcode?, project_type?, source?, notes? }> }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { leads } = await req.json()

  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: 'leads array required' }, { status: 400 })
  }

  if (leads.length > 500) {
    return NextResponse.json({ error: 'Max 500 leads per import' }, { status: 400 })
  }

  // Validate and clean
  const valid: any[] = []
  const errors: { row: number; error: string }[] = []

  for (let i = 0; i < leads.length; i++) {
    const row = leads[i]
    if (!row.name?.trim()) {
      errors.push({ row: i + 1, error: 'Name is required' })
      continue
    }

    valid.push({
      name: row.name.trim(),
      email: row.email?.trim() || null,
      phone: row.phone?.trim() || null,
      postcode: row.postcode?.trim() || null,
      project_type: row.project_type?.trim() || null,
      source: row.source?.trim() || 'csv_import',
      notes: row.notes?.trim() || null,
      status: 'new',
    })
  }

  // Check for duplicates by email
  if (valid.some((l) => l.email)) {
    const emails = valid.filter((l) => l.email).map((l) => l.email)
    const { data: existing } = await supabase
      .from('leads')
      .select('email')
      .in('email', emails)

    const existingEmails = new Set((existing ?? []).map((e: any) => e.email))
    const dupes = valid.filter((l) => l.email && existingEmails.has(l.email))
    if (dupes.length > 0) {
      for (const d of dupes) {
        errors.push({ row: leads.findIndex((l: any) => l.email === d.email) + 1, error: `Duplicate email: ${d.email}` })
      }
    }
    // Remove duplicates from valid
    const toInsert = valid.filter((l) => !l.email || !existingEmails.has(l.email))
    valid.length = 0
    valid.push(...toInsert)
  }

  let imported = 0
  if (valid.length > 0) {
    const { error } = await supabase.from('leads').insert(valid)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    imported = valid.length
  }

  return NextResponse.json({ imported, skipped: errors.length, errors: errors.slice(0, 20) })
}
