'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getTrackingMetrics,
  getSourceMetrics,
  getPageMetrics,
  getSpeedMetrics,
  getDropoffMetrics,
  type TrackingMetrics,
  type SourceMetrics,
  type PageMetrics,
  type SpeedMetric,
  type DropoffMetric,
  type LostReasonMetric,
  type DateRange,
} from '@/lib/crm/tracking'
import { OverviewTab, FunnelTab, SourcesTab, PagesTab, SpeedTab, DropoffTab } from '@/components/crm/tracking'
import {
  BarChart3,
  Filter,
  TrendingUp,
  Globe,
  FileText,
  Clock,
  AlertTriangle,
  RefreshCw,
  Calendar,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import EmptyState from '@/components/crm/EmptyState'
import DailyBriefing from '@/components/crm/DailyBriefing'
import { useOpportunities, useLeads, useTasks } from '@/lib/crm/hooks'
import { Users, DollarSign, Target, CheckSquare, TrendingDown } from 'lucide-react'

type Tab = 'overview' | 'funnel' | 'sources' | 'pages' | 'speed' | 'dropoff'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 size={14} /> },
  { id: 'funnel', label: 'Funnel', icon: <Filter size={14} /> },
  { id: 'sources', label: 'Sources', icon: <Globe size={14} /> },
  { id: 'pages', label: 'Pages', icon: <FileText size={14} /> },
  { id: 'speed', label: 'Speed', icon: <Clock size={14} /> },
  { id: 'dropoff', label: 'Drop-off', icon: <AlertTriangle size={14} /> },
]

type RangePreset = '7d' | '30d' | '90d' | 'ytd' | 'custom'

function getDateRange(preset: RangePreset): DateRange {
  const now = new Date()
  const to = now.toISOString()
  let from: Date

  switch (preset) {
    case '7d':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'ytd':
      from = new Date(now.getFullYear(), 0, 1)
      break
    default:
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  return { from: from.toISOString(), to }
}

function getPriorRange(range: DateRange): DateRange {
  const fromMs = new Date(range.from).getTime()
  const toMs = new Date(range.to).getTime()
  const duration = toMs - fromMs
  return {
    from: new Date(fromMs - duration).toISOString(),
    to: range.from,
  }
}

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [rangePreset, setRangePreset] = useState<RangePreset>('30d')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tabUnderline, setTabUnderline] = useState({ left: 0, width: 0 })
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Data state
  const [metrics, setMetrics] = useState<TrackingMetrics | null>(null)
  const [priorMetrics, setPriorMetrics] = useState<TrackingMetrics | null>(null)
  const [sources, setSources] = useState<SourceMetrics[]>([])
  const [pages, setPages] = useState<PageMetrics[]>([])
  const [speeds, setSpeeds] = useState<SpeedMetric[]>([])
  const [dropoffs, setDropoffs] = useState<DropoffMetric[]>([])
  const [lostReasons, setLostReasons] = useState<LostReasonMetric[]>([])

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const supabase = createClient()
      const range = getDateRange(rangePreset)
      const prior = getPriorRange(range)

      const [m, pm, s, p, sp, d] = await Promise.all([
        getTrackingMetrics(supabase, range),
        getTrackingMetrics(supabase, prior),
        getSourceMetrics(supabase, range),
        getPageMetrics(supabase, range),
        getSpeedMetrics(supabase, range),
        getDropoffMetrics(supabase, range),
      ])

      setMetrics(m)
      setPriorMetrics(pm)
      setSources(s)
      setPages(p)
      setSpeeds(sp)
      setDropoffs(d.dropoffs)
      setLostReasons(d.lostReasons)
    } catch (err) {
      console.error('Failed to fetch tracking data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [rangePreset])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const el = tabRefs.current[tab]
    if (el) {
      setTabUnderline({ left: el.offsetLeft, width: el.offsetWidth })
    }
  }, [tab])

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading text-xl font-semibold text-[var(--warm-900)]">Dashboard</h1>
          <p className="text-sm text-[var(--warm-500)] mt-0.5">Website tracking & pipeline analytics</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date range selector */}
          <div className="flex items-center bg-white border border-[var(--warm-100)] rounded-lg overflow-hidden shadow-sm">
            <Calendar size={14} className="text-[var(--warm-400)] ml-2.5" />
            {(['7d', '30d', '90d', 'ytd'] as RangePreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => setRangePreset(preset)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  rangePreset === preset
                    ? 'bg-[var(--green-600)] text-white'
                    : 'text-[var(--warm-500)] hover:text-[var(--warm-700)] hover:bg-[var(--warm-50)]'
                }`}
              >
                {preset === 'ytd' ? 'YTD' : preset}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 bg-white border border-[var(--warm-100)] rounded-lg shadow-sm hover:bg-[var(--warm-50)] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={`text-[var(--warm-500)] ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* AI Daily Briefing */}
      <DailyBriefing />

      {/* CRM Metrics */}
      <CrmMetrics />

      {/* Website Analytics Tabs */}
      <div className="relative flex items-center gap-1 mb-6 overflow-x-auto pb-px -mx-1 px-1 border-b border-[var(--warm-100)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[t.id] = el }}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'text-[var(--green-700)]'
                : 'text-[var(--warm-500)] hover:text-[var(--warm-700)]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
        <motion.div
          className="absolute bottom-0 h-[2px] bg-[var(--green-600)] rounded-full"
          animate={{ left: tabUnderline.left, width: tabUnderline.width }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : metrics ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={refreshing ? 'opacity-60 pointer-events-none transition-opacity' : ''}
          >
            {tab === 'overview' && <OverviewTab metrics={metrics} priorMetrics={priorMetrics} />}
            {tab === 'funnel' && <FunnelTab sources={sources} />}
            {tab === 'sources' && <SourcesTab sources={sources} />}
            {tab === 'pages' && <PagesTab pages={pages} />}
            {tab === 'speed' && <SpeedTab speeds={speeds} />}
            {tab === 'dropoff' && <DropoffTab dropoffs={dropoffs} lostReasons={lostReasons} />}
          </motion.div>
        </AnimatePresence>
      ) : (
        <EmptyState
          icon={<TrendingUp size={24} />}
          title="No tracking data yet"
          description="Data will appear as visitors browse your site"
          tip="Make sure the tracking script is installed on your public pages"
        />
      )}
    </div>
  )
}

function CrmMetrics() {
  const { data: opportunities = [] } = useOpportunities()
  const { data: leads = [] } = useLeads()
  const { data: tasks = [] } = useTasks({ status: 'open' })

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Pipeline value (active opportunities)
  const activeStages = new Set(['new_enquiry', 'call1_scheduled', 'qualified', 'call2_scheduled', 'proposal_agreed', 'awaiting_deposit', 'deposit_paid', 'onboarding_scheduled', 'onboarding_complete', 'production', 'installation'])
  const activeOpps = opportunities.filter((o) => activeStages.has(o.stage))
  const pipelineValue = activeOpps.reduce((sum, o) => sum + (o.value_estimate ?? 0), 0)

  // Revenue (complete opportunities)
  const completeOpps = opportunities.filter((o) => o.stage === 'complete')
  const revenueThisMonth = completeOpps
    .filter((o) => new Date(o.updated_at) >= monthAgo)
    .reduce((sum, o) => sum + (o.value_estimate ?? 0), 0)

  // Leads this week
  const leadsThisWeek = leads.filter((l) => new Date(l.created_at) >= weekAgo).length

  // Conversion rate (complete / total non-lost)
  const totalClosed = opportunities.filter((o) => o.stage === 'complete' || o.stage === 'lost').length
  const wonCount = completeOpps.length
  const conversionRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0

  // Open tasks
  const overdueTasks = tasks.filter((t) => t.due_at && new Date(t.due_at) < now).length

  const metrics = [
    { label: 'Pipeline Value', value: `£${(pipelineValue / 1000).toFixed(1)}k`, icon: <DollarSign size={14} />, color: 'text-emerald-600 bg-emerald-50', tooltip: 'Total estimated value of all active opportunities (excludes lost and complete).' },
    { label: 'Revenue (30d)', value: `£${(revenueThisMonth / 1000).toFixed(1)}k`, icon: <TrendingUp size={14} />, color: 'text-blue-600 bg-blue-50', tooltip: 'Sum of completed deal values in the last 30 days.' },
    { label: 'Leads (7d)', value: String(leadsThisWeek), icon: <Users size={14} />, color: 'text-purple-600 bg-purple-50', tooltip: 'Number of new leads created in the last 7 days.' },
    { label: 'Win Rate', value: `${conversionRate}%`, icon: <Target size={14} />, color: 'text-amber-600 bg-amber-50', tooltip: 'Percentage of opportunities won vs total closed (won + lost). All time.' },
    { label: 'Open Tasks', value: `${tasks.length}${overdueTasks > 0 ? ` (${overdueTasks} overdue)` : ''}`, icon: <CheckSquare size={14} />, color: overdueTasks > 0 ? 'text-red-600 bg-red-50' : 'text-[var(--warm-600)] bg-[var(--warm-50)]', tooltip: 'Tasks with status "open". Overdue = past their due date.' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {metrics.map((m) => (
        <div key={m.label} className="bg-white rounded-xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4" title={m.tooltip}>
          <div className={`inline-flex p-1.5 rounded-lg ${m.color} mb-2`}>
            {m.icon}
          </div>
          <div className="text-lg font-bold text-[var(--warm-800)]">{m.value}</div>
          <div className="text-[10px] text-[var(--warm-400)] uppercase tracking-wider">{m.label}</div>
        </div>
      ))}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[var(--warm-100)] p-4 h-24">
            <div className="w-7 h-7 bg-[var(--warm-100)] rounded-lg mb-2" />
            <div className="h-5 w-16 bg-[var(--warm-100)] rounded mb-1" />
            <div className="h-3 w-12 bg-[var(--warm-50)] rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[var(--warm-100)] p-5 h-64" />
        <div className="bg-white rounded-xl border border-[var(--warm-100)] p-5 h-64" />
      </div>
    </div>
  )
}
