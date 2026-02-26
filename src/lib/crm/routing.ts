import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Assigns a lead to the best available user based on:
 * 1. Service region matching the postcode area (first 2-3 chars)
 * 2. Fewest active opportunities
 * 3. Least recently assigned
 *
 * Also updates the assigned user's last_assigned_at timestamp.
 */
export async function assignOwner(
  supabase: SupabaseClient,
  postcode: string
): Promise<string> {
  // Extract postcode area (e.g., "WA1" from "WA1 1AA", or "M" from "M1 1AA")
  const area = postcode.trim().split(' ')[0].toUpperCase()

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, service_regions, active_opportunities, last_assigned_at')
    .eq('active', true)
    .eq('role', 'sales')

  if (error) throw error
  if (!users?.length) throw new Error('No active sales users available')

  // Filter users whose service_regions contain the postcode area
  const matching = users.filter((u) => {
    if (!u.service_regions?.length) return false
    return u.service_regions.some((region: string) => {
      const r = region.toUpperCase()
      // Match exact area code or prefix
      return area.startsWith(r) || r === area
    })
  })

  // If no region match, fall back to all active sales users
  const candidates = matching.length > 0 ? matching : users

  // Sort: fewest active opportunities first, then least recently assigned
  candidates.sort((a, b) => {
    const oppDiff = (a.active_opportunities ?? 0) - (b.active_opportunities ?? 0)
    if (oppDiff !== 0) return oppDiff

    const aTime = a.last_assigned_at ? new Date(a.last_assigned_at).getTime() : 0
    const bTime = b.last_assigned_at ? new Date(b.last_assigned_at).getTime() : 0
    return aTime - bTime
  })

  const assignee = candidates[0]

  // Update last_assigned_at
  await supabase
    .from('profiles')
    .update({ last_assigned_at: new Date().toISOString() })
    .eq('id', assignee.id)

  return assignee.id
}
