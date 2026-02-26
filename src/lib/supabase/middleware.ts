import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refreshes the Supabase session and enforces auth + MFA on /crm/* routes.
 * Returns a redirect response if the user is not authenticated or MFA is incomplete.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Only protect /crm/* routes (except login, mfa-setup, mfa-verify)
  const isCrmRoute = pathname.startsWith('/crm')
  const isAuthRoute = ['/crm/login', '/crm/mfa-setup', '/crm/mfa-verify'].some(
    (route) => pathname === route
  )

  if (!isCrmRoute) {
    return supabaseResponse
  }

  // Not logged in → redirect to login
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/crm/login'
    return NextResponse.redirect(url)
  }

  // Logged in but on login page → redirect to pipeline
  if (user && pathname === '/crm/login') {
    // Check MFA status first
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const totp = factors?.totp ?? []

    if (totp.length === 0) {
      const url = request.nextUrl.clone()
      url.pathname = '/crm/mfa-setup'
      return NextResponse.redirect(url)
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.currentLevel !== 'aal2') {
      const url = request.nextUrl.clone()
      url.pathname = '/crm/mfa-verify'
      return NextResponse.redirect(url)
    }

    const url = request.nextUrl.clone()
    url.pathname = '/crm/pipeline'
    return NextResponse.redirect(url)
  }

  // Logged in, not on auth routes → enforce MFA
  if (user && !isAuthRoute) {
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const totp = factors?.totp ?? []

    // No MFA enrolled → force setup
    if (totp.length === 0) {
      const url = request.nextUrl.clone()
      url.pathname = '/crm/mfa-setup'
      return NextResponse.redirect(url)
    }

    // MFA enrolled but not verified this session
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.currentLevel !== 'aal2') {
      const url = request.nextUrl.clone()
      url.pathname = '/crm/mfa-verify'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
