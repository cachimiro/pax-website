'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import MobileSidebar from './MobileSidebar'
import MobileBottomNav from './MobileBottomNav'
import KeyboardShortcuts from './KeyboardShortcuts'
import NavigationProgress from './NavigationProgress'
import PageTransition from './PageTransition'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/crm/types'
import { AIPreferencesProvider } from '@/lib/crm/ai-preferences'

interface CrmShellProps {
  profile: Profile
  children: React.ReactNode
}

export default function CrmShell({ profile, children }: CrmShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/crm/login')
  }, [supabase, router])

  return (
    <AIPreferencesProvider profile={profile}>
      <div className="flex h-screen bg-[var(--warm-white)] overflow-hidden">
        <NavigationProgress />
        <KeyboardShortcuts />
        <Sidebar profile={profile} onSignOut={handleSignOut} />
        <MobileSidebar
          profile={profile}
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onSignOut={handleSignOut}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar
            profile={profile}
            onMenuToggle={() => setMobileMenuOpen(true)}
          />
          <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6 scrollbar-fade">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
        </div>

        <MobileBottomNav />
      </div>
    </AIPreferencesProvider>
  )
}
