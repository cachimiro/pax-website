import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = () => process.env.CRM_WEBHOOK_SECRET || 'dev-secret'

interface InvitePayload {
  subcontractor_id: string
  email: string
  exp: number
}

export function generateInviteToken(subcontractorId: string, email: string, expiresInDays = 30): string {
  const payload: InvitePayload = {
    subcontractor_id: subcontractorId,
    email,
    exp: Math.floor(Date.now() / 1000) + expiresInDays * 86400,
  }
  const data = JSON.stringify(payload)
  const encoded = Buffer.from(data).toString('base64url')
  const sig = createHmac('sha256', SECRET()).update(encoded).digest('hex')
  return `${encoded}.${sig}`
}

export function verifyInviteToken(token: string): InvitePayload | null {
  try {
    const [encoded, sig] = token.split('.')
    if (!encoded || !sig) return null
    const expectedSig = createHmac('sha256', SECRET()).update(encoded).digest('hex')
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expectedSig, 'hex')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const payload: InvitePayload = JSON.parse(Buffer.from(encoded, 'base64url').toString())
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

// Sign-off tokens for customer remote signing
interface SignOffPayload {
  fitting_job_id: string
  exp: number
}

export function generateSignOffToken(fittingJobId: string, expiresInDays = 7): string {
  const payload: SignOffPayload = {
    fitting_job_id: fittingJobId,
    exp: Math.floor(Date.now() / 1000) + expiresInDays * 86400,
  }
  const data = JSON.stringify(payload)
  const encoded = Buffer.from(data).toString('base64url')
  const sig = createHmac('sha256', SECRET()).update(encoded).digest('hex')
  return `${encoded}.${sig}`
}

export function verifySignOffToken(token: string): SignOffPayload | null {
  try {
    const [encoded, sig] = token.split('.')
    if (!encoded || !sig) return null
    const expectedSig = createHmac('sha256', SECRET()).update(encoded).digest('hex')
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expectedSig, 'hex')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const payload: SignOffPayload = JSON.parse(Buffer.from(encoded, 'base64url').toString())
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
