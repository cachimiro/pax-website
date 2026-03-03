import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Subcontractor } from './types'

/**
 * Verify the current user is an active fitter.
 * Returns the subcontractor record or null.
 */
export async function getFitterSession(): Promise<{
  userId: string
  subcontractor: Subcontractor
} | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null
  if (user.user_metadata?.role !== 'fitter') return null

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('subcontractors')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!sub) return null

  return { userId: user.id, subcontractor: sub as Subcontractor }
}
