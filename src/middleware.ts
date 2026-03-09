import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Run the standard session refresh first
  const response = await updateSession(request)
  const { pathname } = request.nextUrl

  // Only apply extra guards to CRM routes
  if (!pathname.startsWith('/crm')) return response

  // Skip auth/onboarding routes to avoid redirect loops
  const publicCrmPaths = ['/crm/login', '/crm/onboarding', '/crm/mfa-setup', '/crm/mfa-verify']
  if (publicCrmPaths.some((p) => pathname.startsWith(p))) return response

  // Read the session from cookies (already refreshed above)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return response // updateSession already handles redirect to login

  // Fetch profile for role + onboarding checks
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_complete')
    .eq('id', user.id)
    .single()

  if (!profile) return response

  // Guard 1: incomplete onboarding → redirect to onboarding
  if (profile.onboarding_complete === false) {
    const url = request.nextUrl.clone()
    url.pathname = '/crm/onboarding'
    return NextResponse.redirect(url)
  }

  // Guard 2: non-admin accessing settings → redirect to dashboard
  if (pathname.startsWith('/crm/settings') && profile.role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = '/crm'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/crm/:path*',
    '/fitter/:path*',
  ],
}
