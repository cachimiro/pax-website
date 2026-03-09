import { google } from 'googleapis'
import { createOAuth2Client, encryptToken, decryptToken } from '@/lib/crm/google'
import { createAdminClient } from '@/lib/supabase/admin'

const FITTER_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
]

function getFitterRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || ''
  return `${base}/api/fitter/google/callback`
}

/** Generate OAuth URL for fitter calendar connection */
export function getFitterAuthUrl(fitterId: string): string {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getFitterRedirectUri()
  )
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: FITTER_SCOPES,
    state: fitterId,
  })
}

/** Exchange auth code for tokens and store on subcontractor */
export async function exchangeFitterCode(code: string, subcontractorId: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getFitterRedirectUri()
  )
  const { tokens } = await client.getToken(code)
  const admin = createAdminClient()

  const encrypted = encryptToken(JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  }))

  // Get calendar ID (primary)
  client.setCredentials(tokens)
  const calendar = google.calendar({ version: 'v3', auth: client })
  const { data: calList } = await calendar.calendarList.list()
  const primary = calList.items?.find(c => c.primary)

  await admin
    .from('subcontractors')
    .update({
      google_token: encrypted,
      google_calendar_id: primary?.id || 'primary',
      calendar_sync_enabled: true,
    })
    .eq('id', subcontractorId)

  return { calendarId: primary?.id || 'primary' }
}

/** Get an authenticated calendar client for a fitter */
async function getFitterCalendarClient(subcontractorId: string) {
  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('subcontractors')
    .select('google_token, google_calendar_id, calendar_sync_enabled')
    .eq('id', subcontractorId)
    .single()

  if (!sub?.google_token || !sub.calendar_sync_enabled) return null

  const tokenData = JSON.parse(decryptToken(sub.google_token))
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getFitterRedirectUri()
  )
  client.setCredentials(tokenData)

  // Refresh if expired
  if (tokenData.expiry_date && tokenData.expiry_date < Date.now() + 5 * 60 * 1000) {
    try {
      const { credentials } = await client.refreshAccessToken()
      const newEncrypted = encryptToken(JSON.stringify({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || tokenData.refresh_token,
        expiry_date: credentials.expiry_date,
      }))
      await admin
        .from('subcontractors')
        .update({ google_token: newEncrypted })
        .eq('id', subcontractorId)
      client.setCredentials(credentials)
    } catch {
      // Token refresh failed — disable sync
      await admin
        .from('subcontractors')
        .update({ calendar_sync_enabled: false })
        .eq('id', subcontractorId)
      return null
    }
  }

  return {
    calendar: google.calendar({ version: 'v3', auth: client }),
    calendarId: sub.google_calendar_id || 'primary',
  }
}

/** Create a calendar event for a fitting job */
export async function createFittingEvent(
  subcontractorId: string,
  job: {
    id: string
    job_code: string
    customer_name: string | null
    customer_address: string | null
    scheduled_date: string
    estimated_duration_hours: number
    scope_of_work?: string | null
  }
) {
  const client = await getFitterCalendarClient(subcontractorId)
  if (!client) return null

  const start = new Date(job.scheduled_date)
  const end = new Date(start.getTime() + (job.estimated_duration_hours || 8) * 3600000)

  const { data: event } = await client.calendar.events.insert({
    calendarId: client.calendarId,
    requestBody: {
      summary: `Fitting: ${job.customer_name || 'Customer'} (${job.job_code})`,
      description: [
        `Job: ${job.job_code}`,
        job.scope_of_work ? `Scope: ${job.scope_of_work}` : '',
        `PaxBespoke Fitting`,
      ].filter(Boolean).join('\n'),
      location: job.customer_address || undefined,
      start: { dateTime: start.toISOString(), timeZone: 'Europe/London' },
      end: { dateTime: end.toISOString(), timeZone: 'Europe/London' },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'popup', minutes: 1440 }, // 24h before
        ],
      },
    },
  })

  // Store event ID on the job
  if (event?.id) {
    const admin = createAdminClient()
    await admin
      .from('fitting_jobs')
      .update({ google_event_id: event.id })
      .eq('id', job.id)
  }

  return event?.id || null
}

/** Delete a calendar event when a job is cancelled/declined */
export async function deleteFittingEvent(subcontractorId: string, eventId: string) {
  const client = await getFitterCalendarClient(subcontractorId)
  if (!client) return

  try {
    await client.calendar.events.delete({
      calendarId: client.calendarId,
      eventId,
    })
  } catch {
    // Event may already be deleted
  }
}

/** Query FreeBusy for a fitter on a given date range */
export async function queryFitterFreeBusy(
  subcontractorId: string,
  timeMin: string,
  timeMax: string,
): Promise<{ busy: { start: string; end: string }[] } | null> {
  const client = await getFitterCalendarClient(subcontractorId)
  if (!client) return null

  const { data } = await client.calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      timeZone: 'Europe/London',
      items: [{ id: client.calendarId }],
    },
  })

  const busy = data.calendars?.[client.calendarId]?.busy || []
  return { busy: busy.map(b => ({ start: b.start || '', end: b.end || '' })) }
}
