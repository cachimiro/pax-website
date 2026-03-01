'use client'

import { createContext, useContext, useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { AIPreferences, Profile } from './types'

const DEFAULTS: Required<AIPreferences> = {
  suggestions_enabled: true,
  compose_enabled: true,
  briefing_enabled: true,
  health_check_enabled: true,
  notification_level: 'normal',
  compose_tone: 'friendly',
  snooze_weekends: true,
}

interface AIPreferencesContextValue {
  prefs: Required<AIPreferences>
  update: (patch: Partial<AIPreferences>) => void
  isUpdating: boolean
  // Convenience flags
  suggestionsOn: boolean
  composeOn: boolean
  briefingOn: boolean
  healthCheckOn: boolean
}

const AIPreferencesContext = createContext<AIPreferencesContextValue | null>(null)

export function AIPreferencesProvider({
  profile,
  children,
}: {
  profile: Profile
  children: React.ReactNode
}) {
  const qc = useQueryClient()
  const [optimistic, setOptimistic] = useState<AIPreferences>({})

  const merged: Required<AIPreferences> = {
    ...DEFAULTS,
    ...(profile.ai_preferences ?? {}),
    ...optimistic,
  }

  const mutation = useMutation({
    mutationFn: async (patch: Partial<AIPreferences>) => {
      const supabase = createClient()
      const newPrefs = { ...profile.ai_preferences, ...patch }
      const { error } = await supabase
        .from('profiles')
        .update({ ai_preferences: newPrefs })
        .eq('id', profile.id)
      if (error) throw error
      return newPrefs
    },
    onMutate: (patch) => {
      setOptimistic((prev) => ({ ...prev, ...patch }))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] })
      qc.invalidateQueries({ queryKey: ['profiles', profile.id] })
    },
    onError: (err: Error, patch) => {
      // Revert optimistic update
      setOptimistic((prev) => {
        const reverted = { ...prev }
        for (const key of Object.keys(patch)) {
          delete reverted[key as keyof AIPreferences]
        }
        return reverted
      })
      toast.error(`Failed to save preference: ${err.message}`)
    },
  })

  const update = useCallback(
    (patch: Partial<AIPreferences>) => {
      mutation.mutate(patch)
    },
    [mutation]
  )

  return (
    <AIPreferencesContext.Provider
      value={{
        prefs: merged,
        update,
        isUpdating: mutation.isPending,
        suggestionsOn: merged.suggestions_enabled,
        composeOn: merged.compose_enabled,
        briefingOn: merged.briefing_enabled,
        healthCheckOn: merged.health_check_enabled,
      }}
    >
      {children}
    </AIPreferencesContext.Provider>
  )
}

export function useAIPreferences(): AIPreferencesContextValue {
  const ctx = useContext(AIPreferencesContext)
  if (!ctx) {
    // Fallback when outside provider (e.g., login page) — all defaults, no-op update
    return {
      prefs: DEFAULTS,
      update: () => {},
      isUpdating: false,
      suggestionsOn: true,
      composeOn: true,
      briefingOn: true,
      healthCheckOn: true,
    }
  }
  return ctx
}

export { DEFAULTS as AI_PREF_DEFAULTS }
