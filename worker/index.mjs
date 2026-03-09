/**
 * Background worker for Digital Ocean App Platform.
 * Calls the Next.js cron API endpoints on a schedule.
 *
 * Env vars used:
 *   WORKER_BASE_URL  — production app URL (falls back to NEXT_PUBLIC_SITE_URL)
 *   CRM_WEBHOOK_SECRET — auth header for cron endpoints
 */

const BASE_URL =
  process.env.WORKER_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'http://localhost:3000'

const SECRET = process.env.CRM_WEBHOOK_SECRET || ''

if (!SECRET) {
  console.error('[WORKER] CRM_WEBHOOK_SECRET is not set — cron calls will be unauthorized')
}

// ─── Job definitions ─────────────────────────────────────────────────────────

const jobs = [
  { name: 'messages',      path: '/api/cron/messages',      intervalMs: 2 * 60 * 1000 },
  { name: 'meetings',      path: '/api/cron/meetings',      intervalMs: 5 * 60 * 1000 },
  { name: 'abandonments',  path: '/api/cron/abandonments',  intervalMs: 10 * 60 * 1000 },
  { name: 'offer-expiry', path: '/api/cron/offer-expiry',  intervalMs: 5 * 60 * 1000 },
]

// ─── Runner ──────────────────────────────────────────────────────────────────

async function runJob(job) {
  const url = `${BASE_URL}${job.path}`
  const start = Date.now()
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-webhook-secret': SECRET,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(55_000), // 55s timeout per job
    })
    const body = await res.text()
    const ms = Date.now() - start
    if (res.ok) {
      console.log(`[WORKER] ${job.name} OK (${ms}ms): ${body.substring(0, 200)}`)
    } else {
      console.error(`[WORKER] ${job.name} FAILED ${res.status} (${ms}ms): ${body.substring(0, 200)}`)
    }
  } catch (err) {
    const ms = Date.now() - start
    console.error(`[WORKER] ${job.name} ERROR (${ms}ms):`, err.message)
  }
}

// ─── Start all intervals ─────────────────────────────────────────────────────

console.log(`[WORKER] Starting background worker`)
console.log(`[WORKER] Base URL: ${BASE_URL}`)
console.log(`[WORKER] Jobs: ${jobs.map(j => `${j.name} (every ${j.intervalMs / 1000}s)`).join(', ')}`)

// Run all jobs once on startup (after a short delay for the main app to be ready)
setTimeout(() => {
  console.log('[WORKER] Running initial pass for all jobs...')
  jobs.forEach(job => runJob(job))
}, 10_000)

// Then schedule each on its interval
for (const job of jobs) {
  setInterval(() => runJob(job), job.intervalMs)
}

// Keep process alive and handle signals
process.on('SIGTERM', () => {
  console.log('[WORKER] Received SIGTERM, shutting down')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('[WORKER] Received SIGINT, shutting down')
  process.exit(0)
})
