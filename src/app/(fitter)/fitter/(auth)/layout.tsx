'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { Wrench, LayoutDashboard, MessageSquare, LogOut, Loader2, Clipboard, CalendarDays } from 'lucide-react'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/fitter', label: 'Jobs', icon: LayoutDashboard },
  { href: '/fitter/board', label: 'Board', icon: Clipboard },
  { href: '/fitter/availability', label: 'Schedule', icon: CalendarDays },
  { href: '/fitter/messages', label: 'Messages', icon: MessageSquare },
]

export default function FitterAuthLayout({ children }: { children: React.ReactNode }) {
  const [fitterName, setFitterName] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || user.user_metadata?.role !== 'fitter') {
        router.push('/fitter/login')
        return
      }
      setFitterName(user.user_metadata?.name || user.email || 'Fitter')
      setLoading(false)
    })
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/fitter/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--warm-50)] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--green-600)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--warm-50)] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[var(--warm-100)] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--green-600)] flex items-center justify-center">
              <Wrench size={16} className="text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold text-[var(--warm-900)]">PaxBespoke</div>
              <div className="text-[11px] text-[var(--warm-500)]">{fitterName}</div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="text-[var(--warm-400)] hover:text-red-500 transition-colors p-2">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4">
        {children}
      </main>

      {/* Bottom nav (mobile-friendly with safe area) */}
      <nav className="bg-white border-t border-[var(--warm-100)] sticky bottom-0 z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-4xl mx-auto flex">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || (item.href !== '/fitter' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}
                className={`flex-1 flex flex-col items-center py-2 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'text-[var(--green-600)]'
                    : 'text-[var(--warm-400)] hover:text-[var(--warm-600)]'
                }`}>
                <Icon size={20} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
