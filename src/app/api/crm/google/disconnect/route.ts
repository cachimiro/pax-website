import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptToken, revokeToken } from '@/lib/crm/google'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // Load config
  const { data: config } = await supabase
    .from('google_config')
    .select('id, access_token_encrypted, refresh_token_encrypted')
    .limit(1)
    .single()

  if (!config) {
    return NextResponse.json({ error: 'No Google account connected' }, { status: 404 })
  }

  // Revoke tokens with Google
  try {
    const accessToken = decryptToken(config.access_token_encrypted)
    await revokeToken(accessToken)
  } catch {
    // Continue even if revocation fails — we still remove from DB
  }

  try {
    const refreshToken = decryptToken(config.refresh_token_encrypted)
    await revokeToken(refreshToken)
  } catch {
    // Continue
  }

  // Delete from DB
  await supabase.from('google_config').delete().eq('id', config.id)

  return NextResponse.json({ disconnected: true })
}
