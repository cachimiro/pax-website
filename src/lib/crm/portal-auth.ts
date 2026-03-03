import { verifyCTAToken } from './cta-tokens'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolve lead_id from either a CTA token or a portal session token.
 * Returns { leadId, opportunityId } or null if auth fails.
 */
export async function resolvePortalAuth(
  admin: SupabaseClient,
  params: { token?: string; session_token?: string },
): Promise<{ leadId: string; opportunityIds: string[] } | null> {
  // Path A: CTA token (from email link)
  if (params.token) {
    const payload = verifyCTAToken(params.token)
    if (!payload || payload.action !== 'manage-booking') return null

    const { data: opp } = await admin
      .from('opportunities')
      .select('id, lead_id')
      .eq('id', payload.opportunity_id)
      .single()

    if (!opp) return null

    // Fetch all opportunities for this lead (any stage — bookings API filters by pending)
    const { data: allOpps } = await admin
      .from('opportunities')
      .select('id')
      .eq('lead_id', opp.lead_id)

    return {
      leadId: opp.lead_id,
      opportunityIds: allOpps?.map(o => o.id) ?? [opp.id],
    }
  }

  // Path B: Session token (from email+phone verification)
  if (params.session_token) {
    const { data: verification } = await admin
      .from('portal_verifications')
      .select('lead_id, expires_at, verified')
      .eq('session_token', params.session_token)
      .eq('verified', true)
      .single()

    if (!verification) return null
    if (new Date(verification.expires_at) < new Date()) return null

    const { data: allOpps } = await admin
      .from('opportunities')
      .select('id')
      .eq('lead_id', verification.lead_id)

    return {
      leadId: verification.lead_id,
      opportunityIds: allOpps?.map(o => o.id) ?? [],
    }
  }

  return null
}
