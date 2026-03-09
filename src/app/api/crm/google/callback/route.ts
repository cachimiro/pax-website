import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCode, getUserEmail, encryptToken, SCOPES } from '@/lib/crm/google'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')
  // state = 'onboarding' for per-user calendar connect, undefined for admin shared connect
  const state = request.nextUrl.searchParams.get('state') ?? ''

  const forwardedHost = request.headers.get('x-forwarded-host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const baseUrl = forwardedHost ? `${proto}://${forwardedHost}` : request.nextUrl.origin

  const isOnboarding = state === 'onboarding'
  const successUrl = isOnboarding
    ? `${baseUrl}/crm/onboarding?google=connected`
    : `${baseUrl}/crm/settings?tab=integrations&google=connected`
  const errorBase = isOnboarding
    ? `${baseUrl}/crm/onboarding?google=error`
    : `${baseUrl}/crm/settings?tab=integrations&google=error`

  if (error) return NextResponse.redirect(`${errorBase}&reason=${error}`)
  if (!code) return NextResponse.redirect(`${errorBase}&reason=no_code`)
  if (!user) return NextResponse.redirect(`${errorBase}&reason=not_authenticated`)

  try {
    const tokens = await exchangeCode(code)
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${errorBase}&reason=no_tokens`)
    }

    const email = await getUserEmail(tokens.access_token)
    const expiresAt = new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000)

    if (isOnboarding) {
      // ── Per-user calendar connect (onboarding flow) ──────────────────────
      const { error: updateError } = await supabase.from('profiles').update({
        google_access_token_enc: encryptToken(tokens.access_token),
        google_refresh_token_enc: encryptToken(tokens.refresh_token),
        google_token_expires_at: expiresAt.toISOString(),
        google_email: email,
        google_calendar_connected: true,
      }).eq('id', user.id)

      if (updateError) {
        console.error('Profile Google update error:', updateError)
        return NextResponse.redirect(`${errorBase}&reason=db_error`)
      }
    } else {
      // ── Shared admin Google config (existing behaviour) ───────────────────
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()

      if (profile?.role !== 'admin') {
        return NextResponse.redirect(`${errorBase}&reason=not_admin`)
      }

      await supabase.from('google_config').delete().neq('id', '00000000-0000-0000-0000-000000000000')

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
        return NextResponse.redirect(`${errorBase}&reason=db_error`)
      }
    }

    return NextResponse.redirect(successUrl)
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    return NextResponse.redirect(`${errorBase}&reason=exchange_failed`)
  }
}
