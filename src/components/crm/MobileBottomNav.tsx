'use client'

import { useState, type ComponentType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  Columns3,
  Users,
  Calendar,
  CheckSquare,
  MoreHorizontal,
  Wrench,
  BarChart3,
  Settings,
  X,
} from 'lucide-react'
import type { Profile } from '@/lib/crm/types'
import { getNavItems } from '@/lib/crm/permissions'

const ICON_MAP: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  Kanban: Columns3,
  Users,
  Calendar,
  CheckSquare,
  Wrench,
  BarChart3,
  Settings,
}

// Primary items always visible in the bottom bar
const PRIMARY_HREFS = ['/crm', '/crm/pipeline', '/crm/leads', '/crm/calendar', '/crm/tasks']

interface MobileBottomNavProps {
  profile?: Profile
}

export default function MobileBottomNav({ profile }: MobileBottomNavProps) {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  const allNavItems = profile ? getNavItems(profile.role) : []
  const primaryItems = allNavItems.filter((item) => PRIMARY_HREFS.includes(item.href))
  const overflowItems = allNavItems.filter((item) => !PRIMARY_HREFS.includes(item.href))

  const isOverflowActive = overflowItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-[var(--warm-100)] z-30 safe-area-bottom">
        <div className="flex items-center justify-around py-1.5">
          {primaryItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/crm' && pathname.startsWith(item.href))
            const Icon = ICON_MAP[item.icon] ?? LayoutDashboard

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                  isActive ? 'text-[var(--green-700)]' : 'text-[var(--warm-400)]'
                }`}
              >
                <Icon size={18} />
                <span className="text-[9px] font-medium">{item.label}</span>
                {isActive && <div className="w-1 h-1 rounded-full bg-[var(--green-600)] mt-0.5" />}
              </Link>
            )
          })}

          {/* More button — only shown when there are overflow items */}
          {overflowItems.length > 0 && (
            <button
              onClick={() => setSheetOpen(true)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                isOverflowActive ? 'text-[var(--green-700)]' : 'text-[var(--warm-400)]'
              }`}
            >
              <MoreHorizontal size={18} />
              <span className="text-[9px] font-medium">More</span>
              {isOverflowActive && <div className="w-1 h-1 rounded-full bg-[var(--green-600)] mt-0.5" />}
            </button>
          )}
        </div>
      </nav>

      {/* Bottom sheet overlay */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="md:hidden fixed inset-0 bg-black/30 z-40"
              onClick={() => setSheetOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl safe-area-bottom"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-[var(--warm-200)]" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--warm-100)]">
                <span className="text-sm font-semibold text-[var(--warm-800)]">More</span>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--warm-400)] hover:text-[var(--warm-600)] hover:bg-[var(--warm-50)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Overflow nav items */}
              <div className="px-3 py-3 flex flex-col gap-1">
                {overflowItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const Icon = ICON_MAP[item.icon] ?? LayoutDashboard

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSheetOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                        isActive
                          ? 'bg-[var(--green-50)] text-[var(--green-700)]'
                          : 'text-[var(--warm-700)] hover:bg-[var(--warm-50)]'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-sm font-medium">{item.label}</span>
                      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--green-600)]" />}
                    </Link>
                  )
                })}
              </div>

              {/* Bottom padding for safe area */}
              <div className="h-4" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
