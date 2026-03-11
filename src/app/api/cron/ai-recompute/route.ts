import { NextRequest, NextResponse } from 'next/server'

// Vercel cron wrapper — calls recompute-insights with the cron secret
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const res = await fetch(new URL('/api/crm/ai/recompute-insights', request.url).toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
