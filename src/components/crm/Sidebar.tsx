'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Columns3 as Kanban,
  Users,
  Calendar,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BarChart3,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { Profile } from '@/lib/crm/types'
import { getNavItems } from '@/lib/crm/permissions'
import SidebarTooltip from './SidebarTooltip'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  LayoutDashboard,
  Kanban,
  Users,
  Calendar,
  CheckSquare,
  BarChart3,
  Settings,
}

interface SidebarProps {
  profile: Profile
  onSignOut: () => void
}

export default function Sidebar({ profile, onSignOut }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const prevPathname = useRef(pathname)

  // Clear navigating state when pathname changes
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname
      setNavigatingTo(null)
    }
  }, [pathname])
  const navItems = getNavItems(profile.role)

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`
          fixed left-0 top-0 bottom-0 z-40
          flex flex-col
          bg-gradient-to-b from-[var(--green-900)] to-[#073D2E]
          text-white
          hidden md:flex
        `}
      >
        {/* Logo area */}
        <div className={`flex items-center h-16 px-4 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <span className="font-heading text-sm font-bold text-[var(--orange-400)]">P</span>
              </div>
              <span className="font-heading text-base font-semibold tracking-tight">
                PaxBespoke
              </span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="font-heading text-sm font-bold text-[var(--orange-400)]">P</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.icon] || LayoutDashboard
            const isActive = pathname === item.href || (item.href !== '/crm' && pathname.startsWith(item.href + '/'))

            return (
              <SidebarTooltip key={item.href} label={item.label} show={collapsed}>
                <Link
                  href={item.href}
                  onClick={() => {
                    if (!isActive) setNavigatingTo(item.href)
                  }}
                  className={`
                    relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                    transition-all duration-150
                    active:scale-[0.96] active:opacity-80
                    ${isActive
                      ? 'bg-white/15 text-white shadow-sm shadow-black/10'
                      : navigatingTo === item.href
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:bg-white/8 hover:text-white'
                    }
                    ${collapsed ? 'justify-center' : ''}
                  `}
                >
                  {(isActive || navigatingTo === item.href) && (
                    <motion.span
                      layoutId="sidebar-active-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--orange-400)] rounded-r-full"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  {navigatingTo === item.href ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Icon size={18} />
                  )}
                  {!collapsed && (
                    <span className="text-[13px] font-medium">{item.label}</span>
                  )}
                </Link>
              </SidebarTooltip>
            )
          })}
        </nav>

        {/* User section */}
        <div className={`border-t border-white/10 p-3 ${collapsed ? 'px-2' : ''}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--green-500)] to-[var(--green-700)] flex items-center justify-center text-sm font-semibold shrink-0 ring-2 ring-white/20 avatar-hover cursor-default">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              {/* Online dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[var(--green-900)]" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile.full_name}</p>
                <p className="text-[10px] text-white/40 capitalize">{profile.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={onSignOut}
            className={`
              mt-3 flex items-center gap-2 text-white/50 hover:text-white
              transition-colors text-xs w-full px-1 py-1.5 rounded-lg hover:bg-white/5
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut size={14} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-[var(--green-700)] rounded-full flex items-center justify-center text-white/80 hover:text-white shadow-lg border border-white/10 transition-all hover:scale-110"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </motion.aside>

      {/* Spacer */}
      <motion.div
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:block shrink-0"
      />
    </>
  )
}
