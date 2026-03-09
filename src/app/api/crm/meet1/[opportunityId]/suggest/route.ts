import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOpenAI, MODEL } from '@/lib/crm/openai'
import type { FinishType } from '@/lib/crm/types'

type Params = { params: Promise<{ opportunityId: string }> }

/**
 * POST /api/crm/meet1/[opportunityId]/suggest
 *
 * Lightweight AI helper for the Call Guide. Takes the current guide state
 * and returns non-blocking suggestions:
 *   - finish_hint: recommended finish type based on space constraints
 *   - notes_summary: condensed summary of structured data + free-text notes
 *
 * Called in two situations:
 *   1. On guide open (mode: 'prefill') — returns finish_hint only
 *   2. When salesperson clicks "Summarise notes" (mode: 'summarise') — returns notes_summary
 */
export async function POST(req: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { opportunityId } = await params
  const admin = createAdminClient()
  const body = await req.json()
  const { mode, guideState } = body as {
    mode: 'prefill' | 'summarise'
    guideState: Record<string, unknown>
  }

  // Fetch lead + opportunity context
  const { data: opp } = await admin
    .from('opportunities')
    .select('lead_id, package_complexity, stage')
    .eq('id', opportunityId)
    .single()

  let lead = null
  if (opp?.lead_id) {
    const { data } = await admin
      .from('leads')
      .select('name, project_type, budget_band, space_constraints, measurements, notes')
      .eq('id', opp.lead_id)
      .single()
    lead = data
  }

  const openai = getOpenAI()

  // ── Mode: prefill — suggest finish type based on space constraints ──────────
  if (mode === 'prefill') {
    const constraints: string[] = (guideState.space_constraints as string[]) ?? lead?.space_constraints ?? []
    const pkg = (guideState.package_confirmed as string) ?? opp?.package_complexity

    // Budget package has no finish type — skip
    if (pkg === 'budget' || !pkg || pkg === 'unsure') {
      return NextResponse.json({ finish_hint: null })
    }

    if (constraints.length === 0) {
      return NextResponse.json({ finish_hint: null })
    }

    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a PaxBespoke design assistant. Based on the space constraints provided, suggest the most appropriate finish type for a fitted wardrobe installation.

Available finish types:
- skirting_board: Used when the room has existing skirting boards that need to be matched or worked around. Most common finish.
- flush_fit: Used for clean, minimal look with no visible gaps. Best for straight walls with no skirting or coving.
- cornice: Used when the room has coving or cornice at the ceiling that needs to be matched.
- other: For unusual situations not covered above.

Respond with JSON: { "finish_type": string, "reason": string }
- finish_type must be one of: skirting_board, flush_fit, cornice, other
- reason must be one short sentence (max 12 words)`,
          },
          {
            role: 'user',
            content: `Space constraints: ${constraints.join(', ')}
Package: ${pkg}
Room type: ${lead?.project_type ?? 'bedroom'}`,
          },
        ],
      })

      const content = completion.choices[0]?.message?.content
      if (!content) return NextResponse.json({ finish_hint: null })

      const parsed = JSON.parse(content)
      const validTypes: FinishType[] = ['skirting_board', 'flush_fit', 'cornice', 'other']
      const finishType = validTypes.includes(parsed.finish_type) ? parsed.finish_type : null

      return NextResponse.json({
        finish_hint: finishType
          ? { finish_type: finishType as FinishType, reason: String(parsed.reason ?? '') }
          : null,
      })
    } catch (err) {
      console.error('[MEET1-SUGGEST] prefill error:', err)
      return NextResponse.json({ finish_hint: null })
    }
  }

  // ── Mode: summarise — condense guide data + notes into clean summary ────────
  if (mode === 'summarise') {
    const gs = guideState

    // Build a structured description of what was captured
    const parts: string[] = []

    if (gs.room_confirmed) parts.push(`Room: ${gs.room_confirmed}`)
    if (gs.space_constraints && (gs.space_constraints as string[]).length > 0) {
      parts.push(`Space constraints: ${(gs.space_constraints as string[]).join(', ')}`)
    }
    if (gs.package_confirmed) parts.push(`Package confirmed: ${gs.package_confirmed}`)
    if (gs.budget_responsibility_confirmed) parts.push('Customer confirmed responsibility for measurements (Budget package)')

    // Obstacles
    const obstacleMap: Record<string, string> = {
      obstacle_bed: 'Bed',
      obstacle_radiator: 'Radiator',
      obstacle_curtain_rail: 'Curtain rail',
      obstacle_coving: 'Coving',
      obstacle_picture_rail: 'Picture rail',
    }
    const presentObstacles = Object.entries(obstacleMap)
      .filter(([key]) => gs[key] === 'present')
      .map(([, label]) => label)
    const unknownObstacles = Object.entries(obstacleMap)
      .filter(([key]) => gs[key] === 'unknown')
      .map(([, label]) => label)

    if (presentObstacles.length > 0) parts.push(`Obstacles present: ${presentObstacles.join(', ')}`)
    if (unknownObstacles.length > 0) parts.push(`Obstacles to confirm: ${unknownObstacles.join(', ')}`)
    if (gs.obstacle_other) parts.push(`Other obstacle: ${gs.obstacle_other}`)

    // Finish
    if (gs.finish_type) {
      parts.push(`Finish type: ${gs.finish_type}`)
      const fd = gs.finish_details as Record<string, unknown> ?? {}
      if (gs.finish_type === 'skirting_board') {
        if (fd.height_mm) parts.push(`Skirting height: ${fd.height_mm}mm`)
        if (fd.photos_received) parts.push('Skirting photos received')
      } else if (gs.finish_type === 'flush_fit') {
        if (fd.gap_noted) parts.push('Gap tolerance noted')
        if (fd.notes) parts.push(`Flush fit notes: ${fd.notes}`)
      } else if (gs.finish_type === 'cornice') {
        if (fd.cornice_height_mm) parts.push(`Cornice height: ${fd.cornice_height_mm}mm`)
        if (fd.photos_received) parts.push('Cornice photos received')
      }
    }

    if (gs.call_notes) parts.push(`\nSalesperson notes:\n${gs.call_notes}`)

    const structuredData = parts.join('\n')

    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `You are a CRM assistant for PaxBespoke. Write a concise, professional post-call summary for a Meet 1 consultation.

Rules:
- 3–5 sentences maximum
- Lead with the package and room type
- Include key obstacles and finish details
- End with the agreed next action
- Plain prose, no bullet points, no headers
- Do not invent information not present in the data`,
          },
          {
            role: 'user',
            content: `Customer: ${lead?.name ?? 'Customer'}
Captured during Meet 1:\n${structuredData}`,
          },
        ],
      })

      const summary = completion.choices[0]?.message?.content?.trim() ?? null
      return NextResponse.json({ notes_summary: summary })
    } catch (err) {
      console.error('[MEET1-SUGGEST] summarise error:', err)
      return NextResponse.json({ notes_summary: null })
    }
  }

  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
}
