import { google } from 'googleapis'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── OAuth Config ────────────────────────────────────────────────────────────

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/userinfo.email',
]

function getRedirectUri(): string {
  const uri = process.env.GOOGLE_REDIRECT_URI
  if (uri) return uri
  // Fallback: construct from NEXT_PUBLIC_SITE_URL or VERCEL_URL
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL
  if (base) return `${base.startsWith('http') ? base : `https://${base}`}/api/crm/google/callback`
  throw new Error('GOOGLE_REDIRECT_URI or NEXT_PUBLIC_SITE_URL must be set')
}

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  )
}

export function getAuthUrl(state?: string): string {
  const client = createOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Force consent to always get refresh_token
    scope: SCOPES,
    state,
  })
}

export async function exchangeCode(code: string) {
  const client = createOAuth2Client()
  const { tokens } = await client.getToken(code)
  return tokens
}

export async function getUserEmail(accessToken: string): Promise<string> {
  const client = createOAuth2Client()
  client.setCredentials({ access_token: accessToken })
  const oauth2 = google.oauth2({ version: 'v2', auth: client })
  const { data } = await oauth2.userinfo.get()
  return data.email ?? ''
}

export async function revokeToken(token: string): Promise<void> {
  const client = createOAuth2Client()
  try {
    await client.revokeToken(token)
  } catch {
    // Token may already be revoked — ignore
  }
}

// ─── Token Encryption ────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const secret = process.env.GOOGLE_TOKEN_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('GOOGLE_TOKEN_SECRET must be at least 32 hex characters')
  }
  return Buffer.from(secret.slice(0, 64), 'hex') // 32 bytes
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptToken(encrypted: string): string {
  const key = getEncryptionKey()
  const [ivHex, tagHex, ciphertextHex] = encrypted.split(':')
  if (!ivHex || !tagHex || !ciphertextHex) throw new Error('Invalid encrypted token format')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

// ─── Token Refresh ───────────────────────────────────────────────────────────

export interface GoogleConfig {
  id: string
  email: string
  access_token_encrypted: string
  refresh_token_encrypted: string
  token_expires_at: string
  scopes: string[]
  email_active: boolean
  calendar_active: boolean
  connected_by: string
  connected_at: string
  needs_reauth: boolean
  gmail_history_id: string | null
}

/**
 * Get a valid access token, refreshing if expired.
 * Updates the DB if a refresh occurs.
 */
export async function getValidAccessToken(
  supabase: SupabaseClient,
  config: GoogleConfig
): Promise<string> {
  const expiresAt = new Date(config.token_expires_at)
  const now = new Date()

  // If token is still valid (with 5-min buffer), decrypt and return
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return decryptToken(config.access_token_encrypted)
  }

  // Refresh the token
  const refreshToken = decryptToken(config.refresh_token_encrypted)
  const client = createOAuth2Client()
  client.setCredentials({ refresh_token: refreshToken })

  try {
    const { credentials } = await client.refreshAccessToken()
    const newAccessToken = credentials.access_token!
    const newExpiry = new Date(credentials.expiry_date ?? Date.now() + 3600 * 1000)

    // Update DB with new access token
    await supabase
      .from('google_config')
      .update({
        access_token_encrypted: encryptToken(newAccessToken),
        token_expires_at: newExpiry.toISOString(),
        needs_reauth: false,
      })
      .eq('id', config.id)

    return newAccessToken
  } catch (err) {
    // Refresh failed — mark as needing re-auth
    await supabase
      .from('google_config')
      .update({ needs_reauth: true })
      .eq('id', config.id)
    throw new Error('Google token refresh failed — re-authentication required')
  }
}

// ─── Client Factories ────────────────────────────────────────────────────────

export async function getGmailClient(supabase: SupabaseClient, config: GoogleConfig) {
  const accessToken = await getValidAccessToken(supabase, config)
  const client = createOAuth2Client()
  client.setCredentials({ access_token: accessToken })
  return google.gmail({ version: 'v1', auth: client })
}

export async function getCalendarClient(supabase: SupabaseClient, config: GoogleConfig) {
  const accessToken = await getValidAccessToken(supabase, config)
  const client = createOAuth2Client()
  client.setCredentials({ access_token: accessToken })
  return google.calendar({ version: 'v3', auth: client })
}

/**
 * Load the Google config from DB. Returns null if not connected.
 */
export async function loadGoogleConfig(supabase: SupabaseClient): Promise<GoogleConfig | null> {
  const { data } = await supabase
    .from('google_config')
    .select('*')
    .limit(1)
    .single()
  return data as GoogleConfig | null
}

export { SCOPES }
