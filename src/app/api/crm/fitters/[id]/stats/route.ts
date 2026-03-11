import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: jobs, error } = await supabase
    .from('fitting_jobs')
    .select('id, job_code, status, scheduled_date, completed_at, fitting_fee, customer_name, customer_address, created_at')
    .eq('subcontractor_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all = jobs ?? []
  const done = all.filter(j => ['completed', 'signed_off', 'approved'].includes(j.status))
  const cancelled = all.filter(j => j.status === 'cancelled')
  const active = all.filter(j => !['completed', 'signed_off', 'approved', 'cancelled', 'rejected'].includes(j.status))

  // Completion rate (exclude cancelled from denominator)
  const eligible = all.filter(j => j.status !== 'cancelled')
  const completionRate = eligible.length > 0 ? Math.round((done.length / eligible.length) * 100) : 0

  // Average turnaround: assigned_at → completed_at (hours)
  const turnarounds = done
    .filter(j => j.completed_at && j.created_at)
    .map(j => (new Date(j.completed_at!).getTime() - new Date(j.created_at).getTime()) / 3_600_000)
  const avgTurnaround = turnarounds.length > 0
    ? Math.round(turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length)
    : null

  // Total earnings
  const totalEarned = done.reduce((sum, j) => sum + (j.fitting_fee ?? 0), 0)

  // Monthly earnings (last 6 months)
  const monthlyMap = new Map<string, number>()
  for (const j of done) {
    if (!j.completed_at) continue
    const key = j.completed_at.slice(0, 7) // YYYY-MM
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + (j.fitting_fee ?? 0))
  }
  // Build last 6 months in order
  const monthly: { month: string; earned: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const key = d.toISOString().slice(0, 7)
    monthly.push({ month: key, earned: monthlyMap.get(key) ?? 0 })
  }

  // Recent jobs (last 10)
  const recent = all.slice(0, 10).map(j => ({
    id: j.id,
    job_code: j.job_code,
    status: j.status,
    scheduled_date: j.scheduled_date,
    completed_at: j.completed_at,
    fitting_fee: j.fitting_fee,
    customer_name: j.customer_name,
  }))

  return NextResponse.json({
    stats: {
      total: all.length,
      active: active.length,
      completed: done.length,
      cancelled: cancelled.length,
      completionRate,
      avgTurnaroundHours: avgTurnaround,
      totalEarned,
    },
    monthly,
    recent,
  })
}
