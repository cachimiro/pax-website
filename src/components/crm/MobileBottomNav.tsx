'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Columns3, Users, Calendar, CheckSquare } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/crm', icon: LayoutDashboard, label: 'Home' },
  { href: '/crm/pipeline', icon: Columns3, label: 'Pipeline' },
  { href: '/crm/leads', icon: Users, label: 'Leads' },
  { href: '/crm/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/crm/tasks', icon: CheckSquare, label: 'Tasks' },
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-[var(--warm-100)] z-30 safe-area-bottom">
      <div className="flex items-center justify-around py-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/crm' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
                isActive
                  ? 'text-[var(--green-700)]'
                  : 'text-[var(--warm-400)]'
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-medium">{item.label}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-[var(--green-600)] mt-0.5" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
