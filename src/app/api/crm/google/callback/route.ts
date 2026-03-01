import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCode, getUserEmail, encryptToken, SCOPES } from '@/lib/crm/google'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  // Base redirect URL — use X-Forwarded-Host (set by Gitpod/Vercel proxy) or fall back to origin
  const forwardedHost = request.headers.get('x-forwarded-host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const baseUrl = forwardedHost ? `${proto}://${forwardedHost}` : request.nextUrl.origin
  const settingsUrl = `${baseUrl}/crm/settings`

  if (error) {
    return NextResponse.redirect(`${settingsUrl}?tab=integrations&google=error&reason=${error}`)
  }

  if (!code) {
    return NextResponse.redirect(`${settingsUrl}?tab=integrations&google=error&reason=no_code`)
  }

  if (!user) {
    return NextResponse.redirect(`${settingsUrl}?tab=integrations&google=error&reason=not_authenticated`)
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.redirect(`${settingsUrl}?tab=integrations&google=error&reason=not_admin`)
  }

  try {
    const tokens = await exchangeCode(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${settingsUrl}?tab=integrations&google=error&reason=no_tokens`)
    }

    const email = await getUserEmail(tokens.access_token)
    const expiresAt = new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000)

    // Delete any existing config (single-account model)
    await supabase.from('google_config').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Insert new config
    const { error: insertError } = await supabase.from('google_config').insert({
      email,
      access_token_encrypted: encryptToken(tokens.access_token),
      refresh_token_encrypted: encryptToken(tokens.refresh_token),
      token_expires_at: expiresAt.toISOString(),
      scopes: SCOPES,
      email_active: true,
      calendar_active: true,
      connected_by: user.id,
      needs_reauth: false,
    })

    if (insertError) {
      console.error('Google config insert error:', insertError)
      return NextResponse.redirect(`${settingsUrl}?tab=integrations&google=error&reason=db_error`)
    }

    return NextResponse.redirect(`${settingsUrl}?tab=integrations&google=connected`)
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    return NextResponse.redirect(`${settingsUrl}?tab=integrations&google=error&reason=exchange_failed`)
  }
}
