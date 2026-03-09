import { NextRequest, NextResponse } from 'next/server'
import { exchangeFitterCode } from '@/lib/fitter/google-calendar'

/** GET — Google OAuth callback for fitter calendar */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state') // subcontractor ID
  const error = req.nextUrl.searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

  if (error) {
    return NextResponse.redirect(`${baseUrl}/fitter/availability?calendar=error&reason=${error}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/fitter/availability?calendar=error&reason=missing_params`)
  }

  try {
    await exchangeFitterCode(code, state)
    return NextResponse.redirect(`${baseUrl}/fitter/availability?calendar=connected`)
  } catch (err) {
    console.error('Fitter Google callback error:', err)
    return NextResponse.redirect(`${baseUrl}/fitter/availability?calendar=error&reason=exchange_failed`)
  }
}
