import { Suspense } from 'react'
import type { Metadata } from 'next'
import PortalClient from './PortalClient'

export const metadata: Metadata = {
  title: 'Manage My Booking | PaxBespoke',
  description: 'Reschedule or cancel your PaxBespoke booking.',
  robots: 'noindex, nofollow',
}

export default function MyBookingPage() {
  return (
    <div className="min-h-screen bg-[var(--warm-50)]">
      <div className="max-w-lg mx-auto px-4 py-6 sm:py-12">
        <Suspense fallback={
          <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-100 rounded-xl w-3/4 mx-auto" />
              <div className="h-4 bg-gray-100 rounded w-1/2 mx-auto" />
            </div>
          </div>
        }>
          <PortalClient />
        </Suspense>
      </div>
    </div>
  )
}
