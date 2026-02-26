import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client for server-side operations that bypass RLS.
 * Only use in API routes and server actions — never expose to the browser.
 * Untyped to allow flexible inserts/updates from webhooks and automations.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
