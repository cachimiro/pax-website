'use client'

import { Search, Menu, ChevronRight } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import type { Profile } from '@/lib/crm/types'
import NotificationCenter from './NotificationCenter'
import CommandPalette from './CommandPalette'

interface TopbarProps {
  profile: Profile
  onMenuToggle?: () => void
}

const BREADCRUMB_MAP: Record<string, string> = {
  '/crm': 'Dashboard',
  '/crm/pipeline': 'Pipeline',
  '/crm/leads': 'Leads',
  '/crm/calendar': 'Calendar',
  '/crm/tasks': 'Tasks',
  '/crm/settings': 'Settings',
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Topbar({ profile, onMenuToggle }: TopbarProps) {
  const pathname = usePathname()

  // Build breadcrumbs
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: { label: string; href: string }[] = []
  let path = ''
  for (const seg of segments) {
    path += `/${seg}`
    const label = BREADCRUMB_MAP[path]
    if (label) {
      breadcrumbs.push({ label, href: path })
    } else if (path.startsWith('/crm/leads/') && seg !== 'leads') {
      breadcrumbs.push({ label: 'Detail', href: path })
    }
  }

  const firstName = profile.full_name.split(' ')[0]

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-[var(--warm-100)] flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      {/* Left: mobile menu + breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 text-[var(--warm-500)] hover:text-[var(--warm-700)] hover:bg-[var(--warm-50)] rounded-lg transition-all"
        >
          <Menu size={20} />
        </button>

        {/* Greeting + breadcrumbs */}
        <div className="hidden md:block">
          <p className="text-[11px] text-[var(--warm-400)]">
            {getGreeting()}, {firstName}
          </p>
          <div className="flex items-center gap-1">
            {breadcrumbs.map((crumb, i) => (
              <div key={crumb.href} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={10} className="text-[var(--warm-300)]" />}
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-xs font-medium text-[var(--warm-700)]">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="text-xs text-[var(--warm-400)] hover:text-[var(--warm-600)] transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center: command palette trigger */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-300)] pointer-events-none z-10" />
          <CommandPalette />
        </div>
      </div>

      {/* Right: notifications + avatar */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationCenter />

        {/* User avatar (mobile) */}
        <div className="md:hidden w-8 h-8 rounded-full bg-gradient-to-br from-[var(--green-500)] to-[var(--green-700)] flex items-center justify-center text-white text-sm font-semibold ring-2 ring-[var(--warm-100)]">
          {profile.full_name.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
