'use client'

import { useState, useEffect, useCallback } from 'react'
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

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'bg-[var(--green-600)] text-white shadow-sm'
                : 'text-[var(--warm-500)] hover:text-[var(--warm-700)] hover:bg-[var(--warm-50)]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : metrics ? (
        <div className={refreshing ? 'opacity-60 pointer-events-none transition-opacity' : ''}>
          {tab === 'overview' && <OverviewTab metrics={metrics} priorMetrics={priorMetrics} />}
          {tab === 'funnel' && <FunnelTab sources={sources} />}
          {tab === 'sources' && <SourcesTab sources={sources} />}
          {tab === 'pages' && <PagesTab pages={pages} />}
          {tab === 'speed' && <SpeedTab speeds={speeds} />}
          {tab === 'dropoff' && <DropoffTab dropoffs={dropoffs} lostReasons={lostReasons} />}
        </div>
      ) : (
        <div className="text-center py-16">
          <TrendingUp size={32} className="text-[var(--warm-200)] mx-auto mb-3" />
          <p className="text-sm text-[var(--warm-400)]">No tracking data available yet</p>
          <p className="text-xs text-[var(--warm-300)] mt-1">Data will appear as visitors browse your site</p>
        </div>
      )}
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
