import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, getCompanyInfo } from '@/lib/crm/quickbooks'

const CRM_SETTINGS_URL = '/crm/settings?tab=quickbooks'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/crm/login', request.url))

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const realmId = searchParams.get('realmId')
  const error = searchParams.get('error')

  if (error || !code || !realmId) {
    console.error('[QB callback] Error or missing params:', { error, code: !!code, realmId })
    return NextResponse.redirect(
      new URL(`${CRM_SETTINGS_URL}&qb_error=access_denied`, request.url)
    )
  }

  const tokens = await exchangeCodeForTokens(code, realmId)
  if (!tokens) {
    return NextResponse.redirect(
      new URL(`${CRM_SETTINGS_URL}&qb_error=token_exchange_failed`, request.url)
    )
  }

  const environment = (process.env.QB_ENVIRONMENT ?? 'production') as 'sandbox' | 'production'
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Upsert config (only one row ever)
  const { error: upsertError } = await supabase
    .from('quickbooks_config')
    .upsert({
      realm_id: realmId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      environment,
      connected_by: user.id,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'realm_id' })

  if (upsertError) {
    console.error('[QB callback] Failed to store tokens:', upsertError)
    return NextResponse.redirect(
      new URL(`${CRM_SETTINGS_URL}&qb_error=storage_failed`, request.url)
    )
  }

  // Cache company name
  try {
    const info = await getCompanyInfo(supabase)
    if (info?.name) {
      await supabase
        .from('quickbooks_config')
        .update({ company_name: info.name })
        .eq('realm_id', realmId)
    }
  } catch {
    // Non-fatal — company name is cosmetic
  }

  return NextResponse.redirect(
    new URL(`${CRM_SETTINGS_URL}&qb_connected=1`, request.url)
  )
}
