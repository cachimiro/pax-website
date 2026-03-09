export interface MessageTemplate {
  id: string
  name: string
  subject: string
  body: string
  channels: ('email' | 'sms' | 'whatsapp')[]
}

/**
 * Placeholders: {{name}}, {{first_name}}, {{owner_name}}, {{date}}, {{time}},
 * {{project_type}}, {{amount}}, {{booking_link}}, {{payment_link}}
 */
export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'call1_confirmed',
    name: 'Call 1 Booking Confirmation',
    subject: 'Your consultation is confirmed — {{date}} at {{time}}',
    body: `Hi {{first_name}},

Your free consultation with {{owner_name}} is confirmed for {{date}} at {{time}}.

[CTA:Join video call|{{meet_link}}]
[CTA:Manage booking|{{cta_manage_booking}}]

What to have ready (optional):
• A few photos of the space
• Any inspiration images you like
• Rough dimensions if you have them

Nothing is required — we'll cover everything on the call.

See you soon,
{{owner_name}}`,
    channels: ['email', 'sms', 'whatsapp'],
  },
  {
    id: 'call1_reminder',
    name: 'Call 1 Reminder (24h)',
    subject: 'Your consultation is tomorrow at {{time}}',
    body: `Hi {{first_name}},

Just a reminder — your consultation with {{owner_name}} is tomorrow, {{date}} at {{time}}.

[CTA:Join video call|{{meet_link}}]
[CTA:Manage booking|{{cta_manage_booking}}]

If you have a few photos of your space, bring them along — it helps us give you the most relevant advice.

See you tomorrow,
{{owner_name}}`,
    channels: ['email', 'sms', 'whatsapp'],
  },
  {
    id: 'call1_reminder_2h',
    name: 'Call 1 Reminder (2h)',
    subject: 'Your consultation is in 2 hours',
    body: `Hi {{first_name}},

Quick reminder — your consultation with {{owner_name}} is in 2 hours at {{time}}.

Join here: {{meet_link}}

Speak soon!
PaxBespoke`,
    channels: ['sms', 'whatsapp'],
  },
  {
    id: 'call2_invite',
    name: 'Call 2 Invite',
    subject: 'Your design options are ready, {{first_name}}',
    body: `Hi {{first_name}},

We've put together some options for your {{project_type}} project and we'd love to walk you through them.

[CTA:Book your design call|{{booking_link}}]

Looking forward to it,
{{owner_name}}`,
    channels: ['email', 'whatsapp'],
  },
  {
    id: 'call2_confirmed',
    name: 'Call 2 Booking Confirmation',
    subject: 'Your design call is confirmed — {{date}} at {{time}}',
    body: `Hi {{first_name}},

Your design call with {{owner_name}} is confirmed for {{date}} at {{time}}.

We've prepared options for your {{project_type}} project and can't wait to show you.

[CTA:Join video call|{{meet_link}}]
[CTA:Manage booking|{{cta_manage_booking}}]

See you then,
{{owner_name}}`,
    channels: ['email', 'sms', 'whatsapp'],
  },
  {
    id: 'call2_reminder',
    name: 'Call 2 Reminder (24h)',
    subject: 'Your design call is tomorrow at {{time}}',
    body: `Hi {{first_name}},

Just a reminder — your design call with {{owner_name}} is tomorrow, {{date}} at {{time}}.

We'll walk through the options we've prepared for your {{project_type}} project.

[CTA:Join video call|{{meet_link}}]
[CTA:Manage booking|{{cta_manage_booking}}]

See you tomorrow,
{{owner_name}}`,
    channels: ['email', 'sms', 'whatsapp'],
  },
  {
    id: 'deposit_request',
    name: 'Deposit Request',
    subject: 'Secure your project — deposit of £{{amount}}',
    body: `Hi {{first_name}},

Thanks for confirming your {{project_type}} project. To secure your slot, please pay the deposit of £{{amount}}.

[CTA:Pay deposit — £{{amount}}|{{payment_link}}]

Once received, we'll book your onboarding visit to take measurements and finalise everything.

Any questions, just reply to this email.

{{owner_name}}`,
    channels: ['email', 'whatsapp'],
  },
  {
    id: 'onboarding_invite',
    name: 'Onboarding Invite',
    subject: 'Next step: book your onboarding visit',
    body: `Hi {{first_name}},

Your deposit is confirmed — thank you!

The next step is your onboarding visit, where we'll take detailed measurements and finalise your design choices.

[CTA:Book your onboarding visit|{{booking_link}}]

{{owner_name}}`,
    channels: ['email', 'whatsapp'],
  },
  {
    id: 'onboarding_confirmed',
    name: 'Onboarding Booking Confirmation',
    subject: 'Your onboarding visit is confirmed — {{date}} at {{time}}',
    body: `Hi {{first_name}},

Your onboarding visit with {{owner_name}} is confirmed for {{date}} at {{time}}.

During the visit we'll:
• Take detailed measurements
• Finalise your design choices
• Confirm materials and finishes

Please make sure the wardrobe area is accessible on the day.

[CTA:Manage booking|{{cta_manage_booking}}]

See you then,
{{owner_name}}`,
    channels: ['email', 'sms', 'whatsapp'],
  },
  {
    id: 'review_request',
    name: 'Review Request',
    subject: 'How did we do, {{first_name}}?',
    body: `Hi {{first_name}},

Your {{project_type}} project is complete — we hope you love the result!

If you have a moment, a quick review makes a real difference and helps other homeowners find us.

[CTA:Leave a review|https://g.page/paxbespoke/review]

Thank you for choosing PaxBespoke.

{{owner_name}}`,
    channels: ['email', 'whatsapp'],
  },
]

/**
 * Interpolate placeholders in a template string.
 */
export function interpolate(template: string, vars: Record<string, string>): string {
  // Replace variables, using empty string for missing/empty values
  let result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')

  // Remove lines whose only dynamic content was a variable that resolved to empty.
  // Patterns: "Join here: " (trailing empty), "→ Pay now: " (CTA with no link),
  // or standalone lines that were just a variable (now blank).
  const lines = result.split('\n')
  const cleaned: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip lines that end with a colon/colon-space and the next line is empty
    // (e.g., "Join your video call here:" followed by empty — the link was missing)
    if (trimmed.endsWith(':') && i + 1 < lines.length && lines[i + 1].trim() === '') {
      // Check if this looks like a link-label line (contains words like "here", "Join", "link", "→")
      const isLinkLabel = /(?:here|join|link|→|view|pay|book|select|proceed)/i.test(trimmed)
      if (isLinkLabel) {
        i++ // skip the empty line after it too
        continue
      }
    }

    // Skip lines that are just punctuation/arrows after variable removal
    // e.g., "→ " or "• " with nothing after
    if (/^[\s→•\-]+$/.test(line) && trimmed.length > 0) {
      continue
    }

    cleaned.push(line)
  }

  result = cleaned.join('\n')

  // Collapse 3+ consecutive blank lines into 2
  result = result.replace(/\n{3,}/g, '\n\n')

  return result.trim()
}

/**
 * Fetch a template by slug from the DB, falling back to hardcoded defaults.
 */
export async function getTemplateBySlug(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  slug: string
): Promise<{ subject: string; body: string; channels: ('email' | 'sms' | 'whatsapp')[] } | null> {
  const { data } = await supabase
    .from('message_templates')
    .select('subject, body, channels, active')
    .eq('slug', slug)
    .single()

  if (data && data.active) {
    return { subject: data.subject, body: data.body, channels: data.channels }
  }

  // Fallback to hardcoded
  const fallback = DEFAULT_TEMPLATES.find((t) => t.id === slug)
  if (fallback) return { subject: fallback.subject, body: fallback.body, channels: fallback.channels }

  return null
}

/**
 * Fetch all active templates triggered by a given stage.
 */
export async function getTemplatesForStage(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  stage: string
): Promise<Array<{
  slug: string
  subject: string
  body: string
  channels: ('email' | 'sms' | 'whatsapp')[]
  delay_rule: string
  delay_minutes: number
}>> {
  const { data } = await supabase
    .from('message_templates')
    .select('slug, subject, body, channels, delay_rule, delay_minutes')
    .eq('trigger_stage', stage)
    .eq('active', true)
    .order('sort_order', { ascending: true })

  return data ?? []
}
