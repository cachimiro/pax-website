import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface EarningsSummary {
  current_month: number
  last_month: number
  all_time: number
  monthly: { month: string; total: number; jobs: number }[]
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'fitter') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: sub } = await admin
      .from('subcontractors')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!sub) return NextResponse.json({ error: 'No subcontractor record' }, { status: 403 })

    const { data: jobs } = await admin
      .from('fitting_jobs')
      .select('fitting_fee, completed_at, status')
      .eq('subcontractor_id', sub.id)
      .in('status', ['completed', 'signed_off', 'approved'])
      .not('fitting_fee', 'is', null)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    let currentMonth = 0
    let lastMonth = 0
    let allTime = 0
    const monthMap = new Map<string, { total: number; jobs: number }>()

    for (const job of jobs ?? []) {
      const fee = Number(job.fitting_fee ?? 0)
      const date = new Date(job.completed_at!)
      allTime += fee

      if (date >= thisMonthStart) currentMonth += fee
      if (date >= lastMonthStart && date <= lastMonthEnd) lastMonth += fee

      // Monthly buckets for chart (last 6 months)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const entry = monthMap.get(key) ?? { total: 0, jobs: 0 }
      entry.total += fee
      entry.jobs++
      monthMap.set(key, entry)
    }

    // Build last 6 months array (including months with no earnings)
    const monthly: { month: string; total: number; jobs: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const entry = monthMap.get(key) ?? { total: 0, jobs: 0 }
      monthly.push({ month: key, ...entry })
    }

    return NextResponse.json({ current_month: currentMonth, last_month: lastMonth, all_time: allTime, monthly })
  } catch (err: unknown) {
    console.error('fitter/earnings error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
