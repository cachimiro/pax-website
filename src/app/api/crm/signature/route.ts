import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface SignatureConfig {
  name: string
  role: string
  phone: string
  email: string
  tagline: string
  logo_url: string
  website_url: string
}

const DEFAULTS: SignatureConfig = {
  name: 'PaxBespoke',
  role: '',
  phone: '',
  email: '',
  tagline: 'Premium Bespoke Wardrobes',
  logo_url: 'https://paxbespoke.uk/images/logo-full.png',
  website_url: 'https://paxbespoke.uk',
}

/** GET /api/crm/signature — read current email signature config */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: config } = await supabase
    .from('google_config')
    .select('signature_config, email')
    .limit(1)
    .single()

  if (!config) {
    return NextResponse.json({ signature: DEFAULTS })
  }

  const sig = (config.signature_config ?? {}) as Partial<SignatureConfig>
  return NextResponse.json({
    signature: {
      ...DEFAULTS,
      email: sig.email || config.email || DEFAULTS.email,
      ...sig,
    },
  })
}

/** PUT /api/crm/signature — update email signature config (admin only) */
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json()
  const signature: SignatureConfig = {
    name: body.name ?? DEFAULTS.name,
    role: body.role ?? '',
    phone: body.phone ?? '',
    email: body.email ?? '',
    tagline: body.tagline ?? DEFAULTS.tagline,
    logo_url: body.logo_url ?? DEFAULTS.logo_url,
    website_url: body.website_url ?? DEFAULTS.website_url,
  }

  const { data: existing } = await supabase
    .from('google_config')
    .select('id')
    .limit(1)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'No Google account connected. Connect Google first.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('google_config')
    .update({ signature_config: signature })
    .eq('id', existing.id)

  if (error) {
    // Column might not exist yet — graceful fallback
    if (error.code === '42703') {
      return NextResponse.json({ error: 'Run migration 009_email_signature.sql first' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ signature })
}
