'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Wrench, Loader2, AlertCircle, User, Calendar, MapPin,
  ChevronDown, ChevronRight, ExternalLink, Clock, CheckCircle2,
  UserPlus, Clipboard
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import FittingDetailPanel from '@/components/crm/FittingDetailPanel'
import JobPackForm from '@/components/crm/JobPackForm'

interface FittingJobRow {
  id: string
  job_code: string
  opportunity_id: string
  subcontractor_id: string | null
  status: string
  scheduled_date: string | null
  customer_name: string | null
  customer_address: string | null
  customer_phone: string | null
  notes: string | null
  created_at: string
  checklist_before: Record<string, unknown> | null
  checklist_after: Record<string, unknown> | null
  sign_off_method: string | null
  signed_off_at: string | null
}

interface SubcontractorRow {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
}

interface OpportunityForFitting {
  id: string
  stage: string
  lead: { name: string; phone: string | null; email: string | null; postcode: string | null }
  fitting_slot: { confirmed_date: string | null } | null
  fitting_job: FittingJobRow | null
  value_estimate: number | null
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  offered:     { label: 'Offered',     className: 'bg-purple-100 text-purple-700' },
  assigned:    { label: 'Assigned',    className: 'bg-blue-100 text-blue-700' },
  declined:    { label: 'Declined',    className: 'bg-orange-100 text-orange-700' },
  open_board:  { label: 'Open Board',  className: 'bg-yellow-100 text-yellow-700' },
  claimed:     { label: 'Claimed',     className: 'bg-cyan-100 text-cyan-700' },
  accepted:    { label: 'Accepted',    className: 'bg-indigo-100 text-indigo-700' },
  in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
  completed:   { label: 'Completed',   className: 'bg-green-100 text-green-700' },
  signed_off:  { label: 'Signed Off',  className: 'bg-emerald-100 text-emerald-700' },
  approved:    { label: 'Approved',    className: 'bg-teal-100 text-teal-700' },
  rejected:    { label: 'Rejected',    className: 'bg-red-100 text-red-700' },
  cancelled:   { label: 'Cancelled',   className: 'bg-gray-100 text-gray-500' },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function FittingsPage() {
  const [opportunities, setOpportunities] = useState<OpportunityForFitting[]>([])
  const [subcontractors, setSubcontractors] = useState<SubcontractorRow[]>([])
  const [allJobs, setAllJobs] = useState<FittingJobRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'unassigned' | 'offered' | 'active' | 'board' | 'completed'>('unassigned')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient()

      // Fetch opportunities at fitting stages
      const { data: opps } = await supabase
        .from('opportunities')
        .select(`
          id, stage, value_estimate,
          leads!inner(name, phone, email, postcode)
        `)
        .in('stage', ['fitting_proposed', 'proposal_agreed', 'fitting_confirmed', 'fitter_assigned', 'fitting_in_progress', 'fitting_complete', 'sign_off_pending'])
        .order('updated_at', { ascending: false })

      // Fetch fitting slots
      const oppIds = (opps || []).map(o => o.id)
      const { data: slots } = oppIds.length > 0
        ? await supabase.from('fitting_slots').select('*').in('opportunity_id', oppIds)
        : { data: [] }

      // Fetch fitting jobs — table may not exist yet if migrations are pending
      let jobs: FittingJobRow[] = []
      let allJobsData: FittingJobRow[] = []
      try {
        const [jobsRes, allJobsRes] = await Promise.all([
          oppIds.length > 0
            ? supabase.from('fitting_jobs').select('*').in('opportunity_id', oppIds)
            : Promise.resolve({ data: [], error: null }),
          supabase.from('fitting_jobs').select('*').order('created_at', { ascending: false }),
        ])
        jobs = (jobsRes.data || []) as FittingJobRow[]
        allJobsData = (allJobsRes.data || []) as FittingJobRow[]
      } catch {
        // fitting_jobs table not yet created — show unassigned list without job data
      }

      // Fetch active subcontractors
      const { data: subs } = await supabase
        .from('subcontractors')
        .select('id, name, email, phone, status')
        .eq('status', 'active')

      const slotMap = new Map((slots || []).map(s => [s.opportunity_id, s]))
      const jobMap = new Map(jobs.map(j => [j.opportunity_id, j]))

      const mapped: OpportunityForFitting[] = (opps || []).map((o: Record<string, unknown>) => {
        const lead = o.leads as { name: string; phone: string | null; email: string | null; postcode: string | null }
        return {
          id: o.id as string,
          stage: o.stage as string,
          lead,
          fitting_slot: slotMap.get(o.id as string) || null,
          fitting_job: jobMap.get(o.id as string) || null,
          value_estimate: o.value_estimate as number | null,
        }
      })

      setOpportunities(mapped)
      setSubcontractors(subs || [])
      setAllJobs(allJobsData)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const unassigned = opportunities.filter(o => !o.fitting_job)
  const offeredJobs = allJobs.filter(j => j.status === 'offered')
  const activeJobs = allJobs.filter(j => ['assigned', 'claimed', 'accepted', 'in_progress'].includes(j.status))
  const boardJobs = allJobs.filter(j => j.status === 'open_board')
  const completedJobs = allJobs.filter(j => ['completed', 'signed_off', 'approved'].includes(j.status))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[var(--brand)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-[family-name:var(--font-heading)] font-bold text-[var(--warm-900)]">
            Fittings
          </h1>
          <p className="text-sm text-[var(--warm-500)]">
            Assign fitters and track fitting jobs
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Unassigned" value={unassigned.length} color="text-amber-600" />
        {offeredJobs.length > 0 && <StatCard label="Offered" value={offeredJobs.length} color="text-purple-600" />}
        <StatCard label="Active Jobs" value={activeJobs.length} color="text-blue-600" />
        {boardJobs.length > 0 && <StatCard label="Open Board" value={boardJobs.length} color="text-yellow-600" />}
        <StatCard label="Completed" value={completedJobs.length} color="text-green-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--warm-50)] rounded-xl p-1 overflow-x-auto">
        {([
          { key: 'unassigned' as const, label: `Unassigned (${unassigned.length})` },
          ...(offeredJobs.length > 0 ? [{ key: 'offered' as const, label: `Offered (${offeredJobs.length})` }] : []),
          { key: 'active' as const, label: `Active (${activeJobs.length})` },
          ...(boardJobs.length > 0 ? [{ key: 'board' as const, label: `Board (${boardJobs.length})` }] : []),
          { key: 'completed' as const, label: `Completed (${completedJobs.length})` },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap px-2 ${
              tab === t.key ? 'bg-white shadow-sm text-[var(--warm-900)]' : 'text-[var(--warm-500)] hover:text-[var(--warm-700)]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'unassigned' && (
        <div className="space-y-3">
          {unassigned.length === 0 ? (
            <EmptyState icon={CheckCircle2} text="All fittings are assigned" />
          ) : (
            unassigned.map(opp => (
              <UnassignedCard
                key={opp.id}
                opp={opp}
                subcontractors={subcontractors}
                onAssigned={fetchData}
              />
            ))
          )}
        </div>
      )}

      {tab === 'offered' && (
        <div className="space-y-3">
          {offeredJobs.length === 0 ? (
            <EmptyState icon={Clock} text="No pending offers" />
          ) : (
            offeredJobs.map(job => (
              <JobCard key={job.id} job={job} subcontractors={subcontractors} onClick={() => setSelectedJobId(job.id)} />
            ))
          )}
        </div>
      )}

      {tab === 'active' && (
        <div className="space-y-3">
          {activeJobs.length === 0 ? (
            <EmptyState icon={Wrench} text="No active fitting jobs" />
          ) : (
            activeJobs.map(job => (
              <JobCard key={job.id} job={job} subcontractors={subcontractors} onClick={() => setSelectedJobId(job.id)} />
            ))
          )}
        </div>
      )}

      {tab === 'board' && (
        <div className="space-y-3">
          {boardJobs.length === 0 ? (
            <EmptyState icon={Clipboard} text="No jobs on the open board" />
          ) : (
            boardJobs.map(job => (
              <JobCard key={job.id} job={job} subcontractors={subcontractors} onClick={() => setSelectedJobId(job.id)} />
            ))
          )}
        </div>
      )}

      {tab === 'completed' && (
        <div className="space-y-3">
          {completedJobs.length === 0 ? (
            <EmptyState icon={CheckCircle2} text="No completed jobs yet" />
          ) : (
            completedJobs.map(job => (
              <JobCard key={job.id} job={job} subcontractors={subcontractors} onClick={() => setSelectedJobId(job.id)} />
            ))
          )}
        </div>
      )}

      <FittingDetailPanel
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
        onUpdated={fetchData}
      />
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-[var(--warm-500)]">{label}</div>
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ size?: number }>; text: string }) {
  return (
    <div className="text-center py-12 text-[var(--warm-400)]">
      <Icon size={32} />
      <p className="text-sm mt-2">{text}</p>
    </div>
  )
}

function UnassignedCard({
  opp,
  subcontractors,
  onAssigned,
}: {
  opp: OpportunityForFitting
  subcontractors: SubcontractorRow[]
  onAssigned: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-[var(--warm-100)] overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--warm-50)] transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <UserPlus size={16} className="text-amber-600" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-[var(--warm-900)] truncate">{opp.lead.name}</div>
            <div className="flex items-center gap-3 text-xs text-[var(--warm-500)]">
              {opp.lead.postcode && <span className="flex items-center gap-1"><MapPin size={11} />{opp.lead.postcode}</span>}
              {opp.fitting_slot?.confirmed_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} />{formatDate(opp.fitting_slot.confirmed_date)}
                </span>
              )}
              {opp.value_estimate && <span>£{opp.value_estimate.toLocaleString()}</span>}
              <span className="capitalize">{opp.stage.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>
        {expanded ? <ChevronDown size={16} className="text-[var(--warm-400)]" /> : <ChevronRight size={16} className="text-[var(--warm-400)]" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-[var(--warm-50)]">
              <div className="flex justify-end pt-2 pb-1">
                <Link href={`/crm/pipeline?opp=${opp.id}`}
                  className="text-[10px] text-[var(--brand)] hover:underline flex items-center gap-1">
                  <ExternalLink size={10} /> View in Pipeline
                </Link>
              </div>
              <JobPackForm
                opportunityId={opp.id}
                customerName={opp.lead.name}
                customerPhone={opp.lead.phone}
                customerEmail={opp.lead.email}
                customerAddress={opp.lead.postcode || null}
                confirmedDate={opp.fitting_slot?.confirmed_date || null}
                subcontractors={subcontractors.map(s => ({ id: s.id, name: s.name }))}
                onSubmitted={onAssigned}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function JobCard({ job, subcontractors, onClick }: { job: FittingJobRow; subcontractors: SubcontractorRow[]; onClick?: () => void }) {
  const badge = STATUS_BADGES[job.status] || STATUS_BADGES.assigned
  const fitter = subcontractors.find(s => s.id === job.subcontractor_id)

  return (
    <div className="bg-white rounded-xl border border-[var(--warm-100)] p-4 cursor-pointer hover:border-[var(--brand-light)] transition-colors" onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[var(--warm-400)]">{job.job_code}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <div className="text-sm font-medium text-[var(--warm-900)]">{job.customer_name || 'Customer'}</div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--warm-500)] mt-1">
            {fitter && (
              <span className="flex items-center gap-1"><User size={11} />{fitter.name}</span>
            )}
            {job.customer_address && (
              <span className="flex items-center gap-1"><MapPin size={11} />{job.customer_address}</span>
            )}
            {job.scheduled_date && (
              <span className="flex items-center gap-1"><Clock size={11} />{formatDate(job.scheduled_date)}</span>
            )}
          </div>
          {job.sign_off_method && (
            <div className="text-xs text-green-600 mt-1">
              Signed off: {job.sign_off_method} {job.signed_off_at && `on ${formatDate(job.signed_off_at)}`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
