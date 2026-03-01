'use client'

import type { TrackingMetrics } from '@/lib/crm/tracking'
import {
  Users,
  PhoneCall,
  CheckCircle,
  PoundSterling,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

interface Props {
  metrics: TrackingMetrics
  priorMetrics: TrackingMetrics | null
}

export default function OverviewTab({ metrics, priorMetrics }: Props) {
  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Unique Visitors"
          value={metrics.uniqueVisitors.toLocaleString('en-GB')}
          icon={<Users size={16} />}
          color="blue"
          change={pctChange(metrics.uniqueVisitors, priorMetrics?.uniqueVisitors)}
        />
        <KpiCard
          label="Enquiries"
          value={String(metrics.enquiries)}
          subtext={`${fmtPct(metrics.enquiryRate)} of visitors`}
          icon={<PhoneCall size={16} />}
          color="green"
          change={pctChange(metrics.enquiries, priorMetrics?.enquiries)}
        />
        <KpiCard
          label="Qualified"
          value={String(metrics.qualified)}
          subtext={`${fmtPct(metrics.qualifiedRate)} of enquiries`}
          icon={<CheckCircle size={16} />}
          color="emerald"
          change={pctChange(metrics.qualified, priorMetrics?.qualified)}
        />
        <KpiCard
          label="Deposits"
          value={String(metrics.depositsCount)}
          subtext={`${fmtPct(metrics.depositRate)} of qualified`}
          icon={<PoundSterling size={16} />}
          color="orange"
          change={pctChange(metrics.depositsCount, priorMetrics?.depositsCount)}
        />
        <KpiCard
          label="Rev / Visitor"
          value={`£${metrics.revenuePerVisitor.toFixed(2)}`}
          icon={<TrendingUp size={16} />}
          color="purple"
          change={pctChange(metrics.revenuePerVisitor, priorMetrics?.revenuePerVisitor)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[var(--warm-100)] shadow-sm p-5 card-hover-border">
          <h3 className="text-sm font-semibold text-[var(--warm-700)] mb-4">Conversion Funnel</h3>
          <FunnelChart metrics={metrics} />
        </div>

        {/* Revenue metrics */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[var(--warm-100)] shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[var(--warm-700)] mb-3">Revenue</h3>
            <div className="space-y-3">
              <RevenueRow label="Total Revenue" value={`£${metrics.totalRevenue.toLocaleString('en-GB')}`} />
              <RevenueRow label="Per Enquiry" value={`£${metrics.revenuePerEnquiry.toFixed(0)}`} />
              <RevenueRow label="Per Qualified" value={`£${metrics.revenuePerQualified.toFixed(0)}`} />
              <RevenueRow label="Per Deposit" value={`£${metrics.revenuePerDeposit.toFixed(0)}`} />
            </div>
          </div>

          {/* Benchmarks */}
          <div className="bg-white rounded-xl border border-[var(--warm-100)] shadow-sm p-5">
            <h3 className="text-sm font-semibold text-[var(--warm-700)] mb-3">vs Targets</h3>
            <div className="space-y-3">
              <BenchmarkBar label="Visitor → Enquiry" actual={metrics.enquiryRate} targetMin={2} targetMax={5} />
              <BenchmarkBar label="Enquiry → Qualified" actual={metrics.qualifiedRate} targetMin={40} targetMax={60} />
              <BenchmarkBar label="Qualified → Deposit" actual={metrics.depositRate} targetMin={30} targetMax={50} />
              <BenchmarkBar label="Visitor → Deposit" actual={metrics.visitorToDepositRate} targetMin={0.5} targetMax={2} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  subtext,
  icon,
  color,
  change,
}: {
  label: string
  value: string
  subtext?: string
  icon: React.ReactNode
  color: string
  change: number | null
}) {
  const bgMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-[var(--green-50)] text-[var(--green-700)]',
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-[var(--orange-50)] text-[var(--orange-600)]',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--warm-100)] shadow-sm p-4 card-hover-border">
      <div className="flex items-center justify-between mb-2">
        <div className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${bgMap[color] ?? bgMap.blue}`}>
          {icon}
        </div>
        {change !== null && <ChangeIndicator value={change} />}
      </div>
      <p className="text-lg font-bold text-[var(--warm-900)] font-heading animate-number-pop">{value}</p>
      {subtext && <p className="text-[10px] text-[var(--warm-400)] mt-0.5">{subtext}</p>}
      <p className="text-[11px] text-[var(--warm-500)] mt-1">{label}</p>
    </div>
  )
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return null
  const positive = value > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(value).toFixed(0)}%
    </span>
  )
}

function FunnelChart({ metrics }: { metrics: TrackingMetrics }) {
  const stages = [
    { label: 'Visitors', count: metrics.uniqueVisitors, color: 'bg-blue-400' },
    { label: 'Enquiries', count: metrics.enquiries, color: 'bg-[var(--green-500)]' },
    { label: 'Qualified', count: metrics.qualified, color: 'bg-emerald-500' },
    { label: 'Call 2 Done', count: metrics.call2Done, color: 'bg-amber-400' },
    { label: 'Deposits', count: metrics.depositsCount, color: 'bg-[var(--orange-500)]' },
    { label: 'Completed', count: metrics.completedCount, color: 'bg-emerald-600' },
  ]

  const maxCount = Math.max(...stages.map((s) => s.count), 1)

  return (
    <div className="space-y-2.5">
      {stages.map((stage, i) => {
        const width = Math.max((stage.count / maxCount) * 100, 3)
        const prev = i > 0 ? stages[i - 1].count : null
        const dropPct = prev && prev > 0 ? ((prev - stage.count) / prev * 100).toFixed(0) : null

        return (
          <div key={stage.label} className="flex items-center gap-3">
            <span className="text-[10px] text-[var(--warm-500)] w-20 text-right truncate">
              {stage.label}
            </span>
            <div className="flex-1 h-7 bg-[var(--warm-50)] rounded-full overflow-hidden">
              <div
                className={`h-full ${stage.color} rounded-full transition-all duration-700 flex items-center justify-end pr-2`}
                style={{ width: `${width}%` }}
              >
                {stage.count > 0 && (
                  <span className="text-[10px] font-semibold text-white">
                    {stage.count.toLocaleString('en-GB')}
                  </span>
                )}
              </div>
            </div>
            {dropPct && (
              <span className="text-[10px] text-red-400 w-10 text-right">
                -{dropPct}%
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function RevenueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[var(--warm-500)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--warm-800)] font-heading">{value}</span>
    </div>
  )
}

function BenchmarkBar({
  label,
  actual,
  targetMin,
  targetMax,
}: {
  label: string
  actual: number
  targetMin: number
  targetMax: number
}) {
  const maxScale = targetMax * 2
  const barWidth = Math.min((actual / maxScale) * 100, 100)
  const targetMinPos = (targetMin / maxScale) * 100
  const targetMaxPos = (targetMax / maxScale) * 100
  const inRange = actual >= targetMin && actual <= targetMax
  const above = actual > targetMax

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[var(--warm-500)]">{label}</span>
        <span className={`text-[10px] font-medium ${inRange || above ? 'text-emerald-600' : 'text-amber-600'}`}>
          {fmtPct(actual)}
        </span>
      </div>
      <div className="relative h-3 bg-[var(--warm-50)] rounded-full overflow-hidden">
        {/* Target zone */}
        <div
          className="absolute top-0 h-full bg-emerald-100 rounded-full"
          style={{ left: `${targetMinPos}%`, width: `${targetMaxPos - targetMinPos}%` }}
        />
        {/* Actual bar */}
        <div
          className={`absolute top-0 h-full rounded-full transition-all duration-500 ${
            inRange || above ? 'bg-emerald-500' : 'bg-amber-400'
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[8px] text-[var(--warm-300)]">{fmtPct(targetMin)}</span>
        <span className="text-[8px] text-[var(--warm-300)]">{fmtPct(targetMax)}</span>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPct(n: number): string {
  return n < 10 ? `${n.toFixed(1)}%` : `${Math.round(n)}%`
}

function pctChange(current: number, prior: number | undefined | null): number | null {
  if (prior == null || prior === 0) return null
  return ((current - prior) / prior) * 100
}
