'use client'

import { useState, useMemo } from 'react'
import { useOpportunities, useLeads } from '@/lib/crm/hooks'
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns'
import { BarChart3, TrendingUp, Users, Target, Download, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import type { OpportunityWithLead } from '@/lib/crm/types'

type ReportTab = 'revenue' | 'leads' | 'funnel' | 'performance'

const TABS: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
  { id: 'revenue', label: 'Revenue', icon: <TrendingUp size={14} /> },
  { id: 'leads', label: 'Lead Sources', icon: <Users size={14} /> },
  { id: 'funnel', label: 'Conversion Funnel', icon: <Target size={14} /> },
  { id: 'performance', label: 'Performance', icon: <BarChart3 size={14} /> },
]

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('revenue')
  const [months, setMonths] = useState(6)
  const { data: opportunities = [] } = useOpportunities()
  const { data: leads = [] } = useLeads()

  function exportCsv(headers: string[], rows: string[][]) {
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `paxbespoke-${tab}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-xl font-semibold text-[var(--warm-900)]">Reports</h1>
          <p className="text-sm text-[var(--warm-500)] mt-0.5">Pipeline analytics and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-[var(--warm-100)] rounded-lg overflow-hidden shadow-sm">
            <Calendar size={14} className="text-[var(--warm-400)] ml-2.5" />
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  months === m
                    ? 'bg-[var(--green-600)] text-white'
                    : 'text-[var(--warm-500)] hover:text-[var(--warm-700)]'
                }`}
              >
                {m}mo
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[var(--warm-100)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              tab === t.id
                ? 'text-[var(--green-700)] border-[var(--green-600)]'
                : 'text-[var(--warm-500)] border-transparent hover:text-[var(--warm-700)]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'revenue' && <RevenueReport opportunities={opportunities} months={months} onExport={exportCsv} />}
      {tab === 'leads' && <LeadSourceReport leads={leads} months={months} onExport={exportCsv} />}
      {tab === 'funnel' && <FunnelReport opportunities={opportunities} />}
      {tab === 'performance' && <PerformanceReport opportunities={opportunities} months={months} />}
    </div>
  )
}

// ─── Revenue Report ──────────────────────────────────────────────────────────

function RevenueReport({ opportunities, months, onExport }: { opportunities: OpportunityWithLead[]; months: number; onExport: (h: string[], r: string[][]) => void }) {
  const data = useMemo(() => {
    const now = new Date()
    const result: { month: string; revenue: number; count: number }[] = []

    for (let i = months - 1; i >= 0; i--) {
      const d = subMonths(now, i)
      const start = startOfMonth(d)
      const end = endOfMonth(d)
      const label = format(d, 'MMM yyyy')

      const monthOpps = opportunities.filter((o) => {
        if (o.stage !== 'complete') return false
        const updated = new Date(o.updated_at)
        return updated >= start && updated <= end
      })

      result.push({
        month: label,
        revenue: monthOpps.reduce((s, o) => s + (o.value_estimate ?? 0), 0),
        count: monthOpps.length,
      })
    }
    return result
  }, [opportunities, months])

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0)
  const totalDeals = data.reduce((s, d) => s + d.count, 0)
  const avgDeal = totalDeals > 0 ? totalRevenue / totalDeals : 0

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4">
          <div className="text-[10px] text-[var(--warm-400)] uppercase tracking-wider">Total Revenue</div>
          <div className="text-xl font-bold text-[var(--warm-800)] mt-1">£{totalRevenue.toLocaleString('en-GB')}</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4">
          <div className="text-[10px] text-[var(--warm-400)] uppercase tracking-wider">Deals Closed</div>
          <div className="text-xl font-bold text-[var(--warm-800)] mt-1">{totalDeals}</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4">
          <div className="text-[10px] text-[var(--warm-400)] uppercase tracking-wider">Avg Deal Value</div>
          <div className="text-xl font-bold text-[var(--warm-800)] mt-1">£{Math.round(avgDeal).toLocaleString('en-GB')}</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-xl border border-[var(--warm-100)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--warm-800)]">Monthly Revenue</h3>
          <button
            onClick={() => onExport(['Month', 'Revenue', 'Deals'], data.map((d) => [d.month, String(d.revenue), String(d.count)]))}
            className="flex items-center gap-1 text-[10px] text-[var(--warm-400)] hover:text-[var(--warm-600)]"
          >
            <Download size={10} /> CSV
          </button>
        </div>
        <div className="flex items-end gap-2 h-48">
          {data.map((d, i) => (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-[var(--warm-400)]">£{(d.revenue / 1000).toFixed(1)}k</span>
              <motion.div
                className="w-full bg-[var(--green-500)] rounded-t-md"
                initial={{ height: 0 }}
                animate={{ height: `${Math.max((d.revenue / maxRevenue) * 100, 2)}%` }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              />
              <span className="text-[9px] text-[var(--warm-400)] mt-1">{d.month.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Lead Source Report ──────────────────────────────────────────────────────

function LeadSourceReport({ leads, months, onExport }: { leads: any[]; months: number; onExport: (h: string[], r: string[][]) => void }) {
  const cutoff = subMonths(new Date(), months)

  const sourceData = useMemo(() => {
    const filtered = leads.filter((l) => new Date(l.created_at) >= cutoff)
    const counts: Record<string, number> = {}
    for (const l of filtered) {
      const src = l.source ?? l.utm_source ?? 'Direct'
      counts[src] = (counts[src] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
  }, [leads, cutoff])

  const total = sourceData.reduce((s, d) => s + d.count, 0)
  const colors = ['bg-[var(--green-500)]', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-400', 'bg-cyan-500', 'bg-pink-500']

  return (
    <div className="bg-white rounded-xl border border-[var(--warm-100)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--warm-800)]">Lead Sources ({total} total)</h3>
        <button
          onClick={() => onExport(['Source', 'Count', 'Percentage'], sourceData.map((d) => [d.source, String(d.count), `${Math.round((d.count / total) * 100)}%`]))}
          className="flex items-center gap-1 text-[10px] text-[var(--warm-400)] hover:text-[var(--warm-600)]"
        >
          <Download size={10} /> CSV
        </button>
      </div>
      <div className="space-y-3">
        {sourceData.map((d, i) => {
          const pct = total > 0 ? (d.count / total) * 100 : 0
          return (
            <div key={d.source}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[var(--warm-700)] capitalize">{d.source}</span>
                <span className="text-xs text-[var(--warm-400)]">{d.count} ({Math.round(pct)}%)</span>
              </div>
              <div className="h-2 bg-[var(--warm-50)] rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${colors[i % colors.length]}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                />
              </div>
            </div>
          )
        })}
        {sourceData.length === 0 && (
          <p className="text-xs text-[var(--warm-300)] text-center py-4">No lead data for this period</p>
        )}
      </div>
    </div>
  )
}

// ─── Conversion Funnel ───────────────────────────────────────────────────────

function FunnelReport({ opportunities }: { opportunities: OpportunityWithLead[] }) {
  const stages = [
    { key: 'new_enquiry', label: 'New Enquiry' },
    { key: 'call1_scheduled', label: 'Call 1 Booked' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'call2_scheduled', label: 'Call 2 Booked' },
    { key: 'awaiting_deposit', label: 'Awaiting Deposit' },
    { key: 'deposit_paid', label: 'Deposit Paid' },
    { key: 'complete', label: 'Complete' },
  ]

  // Count opportunities that have reached each stage (current or past)
  const stageOrder = stages.map((s) => s.key)
  const funnelData = stages.map((s) => {
    const idx = stageOrder.indexOf(s.key)
    const count = opportunities.filter((o) => {
      const oppIdx = stageOrder.indexOf(o.stage)
      return oppIdx >= idx || o.stage === 'complete' || o.stage === 'lost'
    }).length
    return { ...s, count }
  })

  const maxCount = Math.max(funnelData[0]?.count ?? 1, 1)

  return (
    <div className="bg-white rounded-xl border border-[var(--warm-100)] p-5">
      <h3 className="text-sm font-semibold text-[var(--warm-800)] mb-4">Stage Conversion Funnel</h3>
      <div className="space-y-2">
        {funnelData.map((s, i) => {
          const pct = (s.count / maxCount) * 100
          const dropoff = i > 0 ? funnelData[i - 1].count - s.count : 0
          return (
            <div key={s.key} className="flex items-center gap-3">
              <span className="text-xs text-[var(--warm-500)] w-32 shrink-0 text-right">{s.label}</span>
              <div className="flex-1 h-8 bg-[var(--warm-50)] rounded-lg overflow-hidden relative">
                <motion.div
                  className="h-full bg-[var(--green-500)] rounded-lg flex items-center justify-end pr-2"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct, 3)}%` }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                >
                  <span className="text-[10px] font-bold text-white">{s.count}</span>
                </motion.div>
              </div>
              {dropoff > 0 && (
                <span className="text-[10px] text-red-400 w-16 shrink-0">-{dropoff} lost</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Performance Report ──────────────────────────────────────────────────────

function PerformanceReport({ opportunities, months }: { opportunities: OpportunityWithLead[]; months: number }) {
  const cutoff = subMonths(new Date(), months)

  const stats = useMemo(() => {
    const recent = opportunities.filter((o) => new Date(o.created_at) >= cutoff)
    const complete = recent.filter((o) => o.stage === 'complete')
    const lost = recent.filter((o) => o.stage === 'lost')

    // Average days to close
    const closeTimes = complete.map((o) => differenceInDays(new Date(o.updated_at), new Date(o.created_at)))
    const avgCloseTime = closeTimes.length > 0 ? Math.round(closeTimes.reduce((s, d) => s + d, 0) / closeTimes.length) : 0

    // Lost reasons
    const reasons: Record<string, number> = {}
    for (const o of lost) {
      const reason = (o as any).lost_reason ?? 'Unknown'
      reasons[reason] = (reasons[reason] ?? 0) + 1
    }
    const lostReasons = Object.entries(reasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)

    return {
      total: recent.length,
      won: complete.length,
      lost: lost.length,
      active: recent.length - complete.length - lost.length,
      avgCloseTime,
      lostReasons,
    }
  }, [opportunities, cutoff])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Opportunities', value: stats.total },
          { label: 'Won', value: stats.won },
          { label: 'Lost', value: stats.lost },
          { label: 'Avg Days to Close', value: `${stats.avgCloseTime}d` },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-[var(--warm-100)] p-4">
            <div className="text-[10px] text-[var(--warm-400)] uppercase tracking-wider">{m.label}</div>
            <div className="text-xl font-bold text-[var(--warm-800)] mt-1">{m.value}</div>
          </div>
        ))}
      </div>

      {stats.lostReasons.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--warm-100)] p-5">
          <h3 className="text-sm font-semibold text-[var(--warm-800)] mb-3">Lost Reasons</h3>
          <div className="space-y-2">
            {stats.lostReasons.map((r) => (
              <div key={r.reason} className="flex items-center justify-between">
                <span className="text-xs text-[var(--warm-600)] capitalize">{r.reason.replace(/_/g, ' ')}</span>
                <span className="text-xs font-medium text-[var(--warm-800)]">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
