import { createClient } from '@/lib/supabase/server'
import CrmShell from '@/components/crm/CrmShell'
import CrmProviders from '@/components/crm/Providers'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CRM | PaxBespoke',
  robots: { index: false, follow: false },
}

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  console.log('[CRM Layout] user:', user?.id, 'role:', user?.user_metadata?.role)

  // Auth pages (login, mfa-setup, mfa-verify) render without the shell
  if (!user) {
    console.log('[CRM Layout] No user — rendering without shell')
    return <CrmProviders>{children}</CrmProviders>
  }

  // Fetch profile for the shell
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  console.log('[CRM Layout] profile:', profile?.id, 'error:', profileError?.message)

  if (!profile) {
    console.log('[CRM Layout] No profile found — rendering without shell')
    // User exists in auth but no profile — admin needs to create it
    return <CrmProviders>{children}</CrmProviders>
  }

  return (
    <CrmProviders>
      <CrmShell profile={profile}>
        {children}
      </CrmShell>
    </CrmProviders>
  )
}
