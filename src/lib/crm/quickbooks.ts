/**
 * QuickBooks Online (QBO) integration.
 *
 * All functions dry-run (log only) when QB_CLIENT_ID / QB_CLIENT_SECRET
 * are not set, so the rest of the system works before credentials are added.
 *
 * OAuth flow:
 *   1. /api/crm/quickbooks/auth-url  → redirect user to Intuit
 *   2. /api/crm/quickbooks/callback  → exchange code, store tokens
 *   3. getQBClient()                 → auto-refresh token, return fetch wrapper
 *
 * API base: https://quickbooks.api.intuit.com/v3/company/{realmId}/
 * Sandbox:  https://sandbox-quickbooks.api.intuit.com/v3/company/{realmId}/
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QBConfig {
  realm_id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  company_name: string | null
  environment: 'sandbox' | 'production'
}

export interface QBLineItem {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

export interface QBInvoiceResult {
  qbo_invoice_id: string
  qbo_invoice_number: string
  qbo_pay_url: string | null
  dry_run?: boolean
}

export interface QBCustomerResult {
  qbo_customer_id: string
  dry_run?: boolean
}

// ─── Credentials check ────────────────────────────────────────────────────────

function hasCredentials(): boolean {
  return !!(process.env.QB_CLIENT_ID && process.env.QB_CLIENT_SECRET)
}

function getBaseUrl(environment: 'sandbox' | 'production'): string {
  return environment === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com/v3/company'
    : 'https://quickbooks.api.intuit.com/v3/company'
}

// ─── OAuth helpers ────────────────────────────────────────────────────────────

export function getAuthUrl(state: string): string {
  const clientId = process.env.QB_CLIENT_ID ?? ''
  const redirectUri = process.env.QB_REDIRECT_URI ?? 'https://paxbespoke.uk/api/crm/quickbooks/callback'
  const scope = 'com.intuit.quickbooks.accounting'

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope,
    redirect_uri: redirectUri,
    state,
  })

  return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string, realmId: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
} | null> {
  const clientId = process.env.QB_CLIENT_ID
  const clientSecret = process.env.QB_CLIENT_SECRET
  const redirectUri = process.env.QB_REDIRECT_URI ?? 'https://paxbespoke.uk/api/crm/quickbooks/callback'

  if (!clientId || !clientSecret) return null

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!res.ok) {
    console.error('[QB] Token exchange failed:', await res.text())
    return null
  }

  return res.json()
}

async function refreshAccessToken(config: QBConfig): Promise<QBConfig | null> {
  const clientId = process.env.QB_CLIENT_ID
  const clientSecret = process.env.QB_CLIENT_SECRET

  if (!clientId || !clientSecret) return null

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refresh_token,
    }),
  })

  if (!res.ok) {
    console.error('[QB] Token refresh failed:', await res.text())
    return null
  }

  const data = await res.json()
  return {
    ...config,
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? config.refresh_token,
    token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}

// ─── Config loader ────────────────────────────────────────────────────────────

export async function loadQBConfig(supabase: SupabaseClient): Promise<QBConfig | null> {
  const { data } = await supabase
    .from('quickbooks_config')
    .select('realm_id, access_token, refresh_token, token_expires_at, company_name, environment')
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return data as QBConfig
}

/**
 * Load config, refresh token if within 5 minutes of expiry, return ready config.
 * Persists refreshed token back to DB.
 */
export async function getQBConfig(supabase: SupabaseClient): Promise<QBConfig | null> {
  const config = await loadQBConfig(supabase)
  if (!config) return null

  const expiresAt = new Date(config.token_expires_at)
  const fiveMinutes = 5 * 60 * 1000
  const needsRefresh = expiresAt.getTime() - Date.now() < fiveMinutes

  if (!needsRefresh) return config

  const refreshed = await refreshAccessToken(config)
  if (!refreshed) return config // use stale token, will fail gracefully

  await supabase
    .from('quickbooks_config')
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      token_expires_at: refreshed.token_expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq('realm_id', config.realm_id)

  return refreshed
}

// ─── Authenticated fetch wrapper ──────────────────────────────────────────────

async function qbFetch(
  config: QBConfig,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const base = getBaseUrl(config.environment)
  const url = `${base}/${config.realm_id}/${path}`

  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${config.access_token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
}

// ─── Company info ─────────────────────────────────────────────────────────────

export async function getCompanyInfo(supabase: SupabaseClient): Promise<{ name: string } | null> {
  if (!hasCredentials()) return null

  const config = await getQBConfig(supabase)
  if (!config) return null

  const res = await qbFetch(config, 'companyinfo/' + config.realm_id)
  if (!res.ok) return null

  const data = await res.json()
  return { name: data.CompanyInfo?.CompanyName ?? 'Unknown' }
}

// ─── Customer (create or find by email) ──────────────────────────────────────

export async function createOrFindCustomer(
  supabase: SupabaseClient,
  lead: { name: string; email: string | null; phone?: string | null }
): Promise<QBCustomerResult> {
  if (!hasCredentials()) {
    console.log(`[QB DRY-RUN] createOrFindCustomer: ${lead.name} <${lead.email}>`)
    return { qbo_customer_id: 'dry-run-customer-id', dry_run: true }
  }

  const config = await getQBConfig(supabase)
  if (!config) throw new Error('QuickBooks not connected')

  // Search by email first
  if (lead.email) {
    const query = encodeURIComponent(`SELECT * FROM Customer WHERE PrimaryEmailAddr = '${lead.email}'`)
    const searchRes = await qbFetch(config, `query?query=${query}&minorversion=65`)

    if (searchRes.ok) {
      const searchData = await searchRes.json()
      const existing = searchData.QueryResponse?.Customer?.[0]
      if (existing) {
        return { qbo_customer_id: existing.Id }
      }
    }
  }

  // Create new customer
  const customerBody: Record<string, unknown> = {
    DisplayName: lead.name,
    GivenName: lead.name.split(' ')[0],
    FamilyName: lead.name.split(' ').slice(1).join(' ') || undefined,
  }

  if (lead.email) {
    customerBody.PrimaryEmailAddr = { Address: lead.email }
  }
  if (lead.phone) {
    customerBody.PrimaryPhone = { FreeFormNumber: lead.phone }
  }

  const createRes = await qbFetch(config, 'customer?minorversion=65', {
    method: 'POST',
    body: JSON.stringify(customerBody),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`QB createCustomer failed: ${err}`)
  }

  const createData = await createRes.json()
  return { qbo_customer_id: createData.Customer.Id }
}

// ─── Invoice creation ─────────────────────────────────────────────────────────

export async function createQBInvoice(
  supabase: SupabaseClient,
  params: {
    customerId: string
    lineItems: QBLineItem[]
    memo: string
    dueDate: string // ISO date string YYYY-MM-DD
    customerEmail: string | null
    customerRef: string // display name for the invoice
  }
): Promise<QBInvoiceResult> {
  if (!hasCredentials()) {
    const fakeNumber = `PB-${Date.now().toString().slice(-5)}`
    console.log(`[QB DRY-RUN] createInvoice for ${params.customerRef}: ${params.lineItems.length} lines, due ${params.dueDate}`)
    return {
      qbo_invoice_id: 'dry-run-invoice-id',
      qbo_invoice_number: fakeNumber,
      qbo_pay_url: null,
      dry_run: true,
    }
  }

  const config = await getQBConfig(supabase)
  if (!config) throw new Error('QuickBooks not connected')

  const lines = params.lineItems.map((item, i) => ({
    Id: String(i + 1),
    LineNum: i + 1,
    Description: item.description,
    Amount: item.amount,
    DetailType: 'SalesItemLineDetail',
    SalesItemLineDetail: {
      Qty: item.quantity,
      UnitPrice: item.unit_price,
      // Use a generic service item — QBO requires an ItemRef
      // "1" is the default "Services" item in most QBO accounts
      ItemRef: { value: '1', name: 'Services' },
    },
  }))

  const invoiceBody = {
    CustomerRef: { value: params.customerId },
    DueDate: params.dueDate,
    CustomerMemo: { value: params.memo },
    BillEmail: params.customerEmail ? { Address: params.customerEmail } : undefined,
    EmailStatus: params.customerEmail ? 'NeedToSend' : 'NotSet',
    Line: lines,
  }

  const res = await qbFetch(config, 'invoice?minorversion=65', {
    method: 'POST',
    body: JSON.stringify(invoiceBody),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`QB createInvoice failed: ${err}`)
  }

  const data = await res.json()
  const invoice = data.Invoice

  // Get the Pay Now URL (QBO Payments link)
  const payUrl = await getPayNowUrl(config, invoice.Id)

  return {
    qbo_invoice_id: invoice.Id,
    qbo_invoice_number: invoice.DocNumber,
    qbo_pay_url: payUrl,
  }
}

// ─── Send invoice via QBO email ───────────────────────────────────────────────

export async function sendQBInvoice(
  supabase: SupabaseClient,
  qboInvoiceId: string,
  toEmail: string
): Promise<boolean> {
  if (!hasCredentials()) {
    console.log(`[QB DRY-RUN] sendInvoice ${qboInvoiceId} to ${toEmail}`)
    return true
  }

  const config = await getQBConfig(supabase)
  if (!config) return false

  const res = await qbFetch(
    config,
    `invoice/${qboInvoiceId}/send?sendTo=${encodeURIComponent(toEmail)}&minorversion=65`,
    { method: 'POST', body: '' }
  )

  if (!res.ok) {
    console.error('[QB] sendInvoice failed:', await res.text())
    return false
  }

  return true
}

// ─── Pay Now URL ──────────────────────────────────────────────────────────────

async function getPayNowUrl(config: QBConfig, qboInvoiceId: string): Promise<string | null> {
  // QBO Payments "Pay Now" link format
  // Only available if QBO Payments is enabled on the account
  try {
    const res = await qbFetch(config, `invoice/${qboInvoiceId}?minorversion=65`)
    if (!res.ok) return null

    const data = await res.json()
    // InvoiceLink is present when QBO Payments is enabled
    return data.Invoice?.InvoiceLink ?? null
  } catch {
    return null
  }
}

// ─── Invoice status ───────────────────────────────────────────────────────────

export async function getQBInvoiceStatus(
  supabase: SupabaseClient,
  qboInvoiceId: string
): Promise<'paid' | 'unpaid' | 'overdue' | null> {
  if (!hasCredentials()) return null

  const config = await getQBConfig(supabase)
  if (!config) return null

  const res = await qbFetch(config, `invoice/${qboInvoiceId}?minorversion=65`)
  if (!res.ok) return null

  const data = await res.json()
  const invoice = data.Invoice

  if (!invoice) return null

  if (invoice.Balance === 0) return 'paid'

  const due = new Date(invoice.DueDate)
  if (due < new Date()) return 'overdue'

  return 'unpaid'
}

// ─── Build invoice memo from lead + opportunity data ─────────────────────────

const PACKAGE_LABELS: Record<string, string> = {
  budget: 'Budget Package',
  standard: 'PaxBespoke Package',
  paxbespoke: 'PaxBespoke Package',
  select: 'Select Package',
}

const CONSTRAINT_LABELS: Record<string, string> = {
  'sloped-ceiling': 'Sloped/angled ceiling',
  'tall-ceiling': 'Tall ceiling',
  'chimney-breast': 'Chimney breast',
  'bulkhead': 'Bulkhead',
  'alcoves': 'Alcoves',
  'limited-door-space': 'Limited door space',
}

export function buildInvoiceMemo(params: {
  leadName: string
  postcode: string | null
  projectType: string | null
  packageComplexity: string | null
  measurements: string | null
  spaceConstraints: string[] | null
  doorFinishType: string | null
  doorModel: string | null
  homeVisit: boolean
  designerName: string
  callDate: string | null
  quoteNotes: string | null
}): string {
  const lines: string[] = []

  lines.push(`Customer: ${params.leadName}`)
  if (params.postcode) lines.push(`Location: ${params.postcode}`)
  lines.push('')

  lines.push(`Project: ${params.projectType ?? 'Wardrobe'}`)
  lines.push(`Package: ${PACKAGE_LABELS[params.packageComplexity ?? ''] ?? params.packageComplexity ?? 'TBC'}`)

  if (params.measurements) {
    lines.push(`Measurements: ${params.measurements}`)
  }

  if (params.spaceConstraints?.length) {
    const labels = params.spaceConstraints
      .map((c) => CONSTRAINT_LABELS[c] ?? c)
      .join(', ')
    lines.push(`Space notes: ${labels}`)
  }

  if (params.doorFinishType && params.doorFinishType !== 'unsure') {
    const finishLabel = params.doorFinishType === 'spray-painted'
      ? 'Spray-painted doors'
      : params.doorFinishType === 'vinyl'
        ? 'Vinyl-wrapped doors'
        : params.doorFinishType
    lines.push(`Door finish: ${finishLabel}`)
  }

  if (params.doorModel) {
    lines.push(`Door style reference: ${params.doorModel}`)
  }

  if (params.homeVisit) {
    lines.push('Home visit: Requested')
  }

  lines.push('')
  lines.push(`Designer: ${params.designerName}`)
  if (params.callDate) lines.push(`Consultation: ${params.callDate}`)

  if (params.quoteNotes) {
    lines.push('')
    lines.push(`Notes: ${params.quoteNotes}`)
  }

  return lines.join('\n')
}

// ─── Build line items from quote items + deposit ──────────────────────────────

export function buildLineItems(params: {
  quoteItems: Array<{ description: string; quantity?: number; unit_price?: number; amount: number }>
  totalAmount: number
  depositAmount: number
  projectType: string | null
  packageComplexity: string | null
}): QBLineItem[] {
  // If the quote has explicit line items, use them
  if (params.quoteItems.length > 0) {
    return params.quoteItems.map((item) => ({
      description: item.description,
      quantity: item.quantity ?? 1,
      unit_price: item.unit_price ?? item.amount,
      amount: item.amount,
    }))
  }

  // Fallback: single line item from the total
  const packageLabel = PACKAGE_LABELS[params.packageComplexity ?? ''] ?? 'Bespoke Wardrobe'
  const projectLabel = params.projectType
    ? `${packageLabel} — ${params.projectType}`
    : packageLabel

  return [
    {
      description: projectLabel,
      quantity: 1,
      unit_price: params.totalAmount,
      amount: params.totalAmount,
    },
  ]
}
