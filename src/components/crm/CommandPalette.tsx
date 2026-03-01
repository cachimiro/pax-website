'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Users,
  Columns3,
  Calendar,
  CheckSquare,
  Settings,
  LayoutDashboard,
  Plus,
  ArrowRight,
  User,
  Briefcase,
} from 'lucide-react'
import { useLeads, useOpportunities, useTasks } from '@/lib/crm/hooks'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  action: () => void
  group: string
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { data: leads = [] } = useLeads()
  const { data: opportunities = [] } = useOpportunities()
  const { data: tasks = [] } = useTasks({ status: 'open' })

  // Open/close with Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const navigate = useCallback(
    (path: string) => {
      setOpen(false)
      router.push(path)
    },
    [router]
  )

  // Build items list
  const items = useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = [
      { id: 'nav-dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, action: () => navigate('/crm'), group: 'Navigation' },
      { id: 'nav-pipeline', label: 'Pipeline', icon: <Columns3 size={16} />, action: () => navigate('/crm/pipeline'), group: 'Navigation' },
      { id: 'nav-leads', label: 'Leads', icon: <Users size={16} />, action: () => navigate('/crm/leads'), group: 'Navigation' },
      { id: 'nav-calendar', label: 'Calendar', icon: <Calendar size={16} />, action: () => navigate('/crm/calendar'), group: 'Navigation' },
      { id: 'nav-tasks', label: 'Tasks', icon: <CheckSquare size={16} />, action: () => navigate('/crm/tasks'), group: 'Navigation' },
      { id: 'nav-settings', label: 'Settings', icon: <Settings size={16} />, action: () => navigate('/crm/settings'), group: 'Navigation' },
    ]

    const actions: CommandItem[] = [
      { id: 'action-new-lead', label: 'Create new lead', icon: <Plus size={16} />, action: () => navigate('/crm/leads?new=1'), group: 'Actions' },
    ]

    const leadItems: CommandItem[] = leads.slice(0, 20).map((lead) => ({
      id: `lead-${lead.id}`,
      label: lead.name,
      description: lead.email || lead.phone || undefined,
      icon: <User size={16} />,
      action: () => navigate(`/crm/leads/${lead.id}`),
      group: 'Leads',
    }))

    const oppItems: CommandItem[] = opportunities.slice(0, 15).map((opp) => ({
      id: `opp-${opp.id}`,
      label: opp.lead?.name ?? 'Opportunity',
      description: `${opp.stage.replace(/_/g, ' ')}${opp.value_estimate ? ` · £${opp.value_estimate.toLocaleString()}` : ''}`,
      icon: <Briefcase size={16} />,
      action: () => navigate(`/crm/pipeline`),
      group: 'Opportunities',
    }))

    const taskItems: CommandItem[] = tasks.slice(0, 10).map((task) => ({
      id: `task-${task.id}`,
      label: task.type.replace(/_/g, ' '),
      description: task.description || undefined,
      icon: <CheckSquare size={16} />,
      action: () => navigate('/crm/tasks'),
      group: 'Tasks',
    }))

    return [...actions, ...nav, ...leadItems, ...oppItems, ...taskItems]
  }, [leads, opportunities, tasks, navigate])

  // Filter
  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 12)
    const q = query.toLowerCase()
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    ).slice(0, 15)
  }, [items, query])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filtered.length])

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      filtered[selectedIndex].action()
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Group items for display
  const grouped = useMemo(() => {
    const groups: { label: string; items: (CommandItem & { globalIndex: number })[] }[] = []
    let globalIndex = 0
    const seen = new Set<string>()
    for (const item of filtered) {
      if (!seen.has(item.group)) {
        seen.add(item.group)
        groups.push({ label: item.group, items: [] })
      }
      const group = groups.find((g) => g.label === item.group)!
      group.items.push({ ...item, globalIndex })
      globalIndex++
    }
    return groups
  }, [filtered])

  return (
    <>
      {/* Trigger button (replaces search input in Topbar) */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 pl-9 pr-4 py-2 text-sm bg-[var(--warm-50)] border border-transparent rounded-xl
          hover:bg-white hover:border-[var(--warm-100)] hover:shadow-sm
          text-[var(--warm-300)] transition-all duration-200 text-left"
      >
        Search leads, opportunities...
        <kbd className="hidden sm:inline-flex ml-auto text-[9px] text-[var(--warm-300)] bg-white border border-[var(--warm-100)] rounded px-1.5 py-0.5 font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Palette overlay */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[60]">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Palette */}
            <div className="flex items-start justify-center pt-[15vh] px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-[var(--warm-100)]"
              >
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--warm-100)]">
                  <Search size={16} className="text-[var(--warm-300)] shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search or type a command..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 text-sm text-[var(--warm-800)] placeholder:text-[var(--warm-300)] bg-transparent outline-none"
                  />
                  <kbd className="text-[9px] text-[var(--warm-300)] bg-[var(--warm-50)] border border-[var(--warm-100)] rounded px-1.5 py-0.5 font-mono">
                    ESC
                  </kbd>
                </div>

                {/* Results */}
                <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2 scrollbar-fade">
                  {filtered.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-[var(--warm-400)]">No results found</p>
                      <p className="text-xs text-[var(--warm-300)] mt-1">Try a different search term</p>
                    </div>
                  ) : (
                    grouped.map((group) => (
                      <div key={group.label}>
                        <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--warm-300)]">
                          {group.label}
                        </p>
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            data-index={item.globalIndex}
                            onClick={() => item.action()}
                            onMouseEnter={() => setSelectedIndex(item.globalIndex)}
                            className={`
                              w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                              ${item.globalIndex === selectedIndex
                                ? 'bg-[var(--green-50)] text-[var(--green-800)]'
                                : 'text-[var(--warm-700)] hover:bg-[var(--warm-50)]'
                              }
                            `}
                          >
                            <span className={`shrink-0 ${item.globalIndex === selectedIndex ? 'text-[var(--green-600)]' : 'text-[var(--warm-400)]'}`}>
                              {item.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.label}</p>
                              {item.description && (
                                <p className="text-xs text-[var(--warm-400)] truncate">{item.description}</p>
                              )}
                            </div>
                            {item.globalIndex === selectedIndex && (
                              <ArrowRight size={12} className="text-[var(--green-400)] shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer hints */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--warm-100)] bg-[var(--warm-50)]/50">
                  <span className="flex items-center gap-1 text-[10px] text-[var(--warm-300)]">
                    <kbd className="bg-white border border-[var(--warm-100)] rounded px-1 py-0.5 font-mono text-[9px]">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-[var(--warm-300)]">
                    <kbd className="bg-white border border-[var(--warm-100)] rounded px-1 py-0.5 font-mono text-[9px]">↵</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-[var(--warm-300)]">
                    <kbd className="bg-white border border-[var(--warm-100)] rounded px-1 py-0.5 font-mono text-[9px]">esc</kbd>
                    Close
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
