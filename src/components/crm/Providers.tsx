'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from 'sonner'

export default function CrmProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            refetchOnWindowFocus: true,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="bottom-right"
        gap={8}
        toastOptions={{
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          },
          classNames: {
            success: 'crm-toast-success',
            error: 'crm-toast-error',
            warning: 'crm-toast-warning',
            info: 'crm-toast-info',
          },
        }}
        icons={{
          success: <span className="text-[var(--green-600)]">✓</span>,
          error: <span className="text-red-500">✕</span>,
          warning: <span className="text-amber-500">⚠</span>,
          info: <span className="text-blue-500">ℹ</span>,
        }}
      />
    </QueryClientProvider>
  )
}
