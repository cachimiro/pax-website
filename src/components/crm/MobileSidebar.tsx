'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, LayoutDashboard, Columns3 as Kanban, Users, Calendar, CheckSquare, Settings, LogOut } from 'lucide-react'
import type { Profile } from '@/lib/crm/types'
import { getNavItems } from '@/lib/crm/permissions'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  LayoutDashboard,
  Kanban,
  Users,
  Calendar,
  CheckSquare,
  Settings,
}

interface MobileSidebarProps {
  profile: Profile
  open: boolean
  onClose: () => void
  onSignOut: () => void
}

export default function MobileSidebar({ profile, open, onClose, onSignOut }: MobileSidebarProps) {
  const pathname = usePathname()
  const navItems = getNavItems(profile.role)

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-[var(--green-900)] to-[#073D2E] text-white z-50 md:hidden flex flex-col animate-fade-in shadow-2xl">
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="font-heading text-sm font-bold text-[var(--orange-400)]">P</span>
            </div>
            <span className="font-heading text-base font-semibold">PaxBespoke</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.icon] || LayoutDashboard
            const isActive = pathname === item.href || (item.href !== '/crm' && pathname.startsWith(item.href + '/'))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150
                  active:scale-[0.96] active:opacity-80
                  ${isActive
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-white/60 hover:bg-white/8 hover:text-white'
                  }
                `}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--orange-400)] rounded-r-full" />
                )}
                <Icon size={18} />
                <span className="text-[13px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--green-500)] to-[var(--green-700)] flex items-center justify-center text-sm font-semibold ring-2 ring-white/20">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[var(--green-900)]" />
            </div>
            <div>
              <p className="text-sm font-medium">{profile.full_name}</p>
              <p className="text-[10px] text-white/40 capitalize">{profile.role}</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs w-full px-1 py-1.5 rounded-lg hover:bg-white/5"
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
