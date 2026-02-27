import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 300 // cache for 5 minutes

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('service_regions')
    .select('id, name, status')
    .neq('status', 'inactive')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
