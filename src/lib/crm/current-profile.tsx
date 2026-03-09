'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from './types'

interface CurrentProfileContextValue {
  profile: Profile | null
  isAdmin: boolean
  isLoading: boolean
}

const CurrentProfileContext = createContext<CurrentProfileContextValue>({
  profile: null,
  isAdmin: false,
  isLoading: true,
})

export function CurrentProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !mounted) { setIsLoading(false); return }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (mounted) {
        setProfile(data as Profile | null)
        setIsLoading(false)
      }
    })
    return () => { mounted = false }
  }, [supabase])

  return (
    <CurrentProfileContext.Provider value={{
      profile,
      isAdmin: profile?.role === 'admin',
      isLoading,
    }}>
      {children}
    </CurrentProfileContext.Provider>
  )
}

export function useCurrentProfile() {
  return useContext(CurrentProfileContext)
}
