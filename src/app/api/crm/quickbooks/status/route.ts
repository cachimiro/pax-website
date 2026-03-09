import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('quickbooks_config')
    .select('realm_id, company_name, environment, connected_at, token_expires_at')
    .limit(1)
    .maybeSingle()

  const hasCredentials = !!(process.env.QB_CLIENT_ID && process.env.QB_CLIENT_SECRET)

  if (!data) {
    return NextResponse.json({
      connected: false,
      has_credentials: hasCredentials,
    })
  }

  const tokenExpired = new Date(data.token_expires_at) < new Date()

  return NextResponse.json({
    connected: true,
    has_credentials: hasCredentials,
    realm_id: data.realm_id,
    company_name: data.company_name,
    environment: data.environment,
    connected_at: data.connected_at,
    token_expired: tokenExpired,
  })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('quickbooks_config').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  return NextResponse.json({ disconnected: true })
}
