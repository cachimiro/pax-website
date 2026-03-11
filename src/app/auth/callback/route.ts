import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Handles Supabase email link callbacks (invite, recovery, magic link).
 *
 * Supabase sends a `code` param (PKCE flow) which must be exchanged server-side
 * for a session before redirecting. Without this route, users land on the
 * redirectTo URL unauthenticated and get bounced to login.
 *
 * The `next` param carries the intended destination set in redirectTo.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/crm/onboarding'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Ensure next is a relative path to prevent open redirect
      const destination = next.startsWith('/') ? next : '/crm/onboarding'
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  // Exchange failed or no code — redirect to the correct portal's login
  const isFitterFlow = next.startsWith('/fitter')
  const errorDest = isFitterFlow ? '/fitter/login?error=link_expired' : '/crm/login?error=link_expired'
  return NextResponse.redirect(`${origin}${errorDest}`)
}
