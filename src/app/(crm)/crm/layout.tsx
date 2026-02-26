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

  // Auth pages (login, mfa-setup, mfa-verify) render without the shell
  if (!user) {
    return <CrmProviders>{children}</CrmProviders>
  }

  // Fetch profile for the shell
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
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
