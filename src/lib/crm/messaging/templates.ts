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
    subject: 'Your consultation is confirmed, {{first_name}}',
    body: `Hi {{first_name}},

Your free consultation with {{owner_name}} is confirmed for {{date}} at {{time}}.

Join your video call here:
{{meet_link}}

What to have ready (optional):
• A few photos of the space
• Any inspiration images you like
• Rough dimensions if you have them

Need to reschedule? Just reply to this message.

See you soon!
PaxBespoke`,
    channels: ['email', 'sms', 'whatsapp'],
  },
  {
    id: 'call1_reminder',
    name: 'Call 1 Reminder (24h)',
    subject: 'Reminder: Your consultation is coming up',
    body: `Hi {{first_name}},

Just a reminder about your consultation with {{owner_name}} tomorrow, {{date}} at {{time}}.

Join your video call here:
{{meet_link}}

Please have a few photos of your space ready if possible — it helps us give you the best advice.

See you soon!
PaxBespoke`,
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
    subject: 'Your design follow-up is ready, {{first_name}}',
    body: `Hi {{first_name}},

Great news — we've put together some options for your {{project_type}} project and we'd love to walk you through them.

Book your follow-up call here: {{booking_link}}

Looking forward to it,
{{owner_name}}`,
    channels: ['email', 'whatsapp'],
  },
  {
    id: 'call2_confirmed',
    name: 'Call 2 Booking Confirmation',
    subject: 'Your design call is confirmed, {{first_name}}',
    body: `Hi {{first_name}},

Your design call with {{owner_name}} is confirmed for {{date}} at {{time}}.

Join your video call here:
{{meet_link}}

We've prepared some options for your {{project_type}} project and can't wait to show you.

See you then!
{{owner_name}}`,
    channels: ['email', 'sms', 'whatsapp'],
  },
  {
    id: 'call2_reminder',
    name: 'Call 2 Reminder (24h)',
    subject: 'Reminder: Your design call is tomorrow',
    body: `Hi {{first_name}},

Just a reminder about your design call with {{owner_name}} tomorrow, {{date}} at {{time}}.

Join your video call here:
{{meet_link}}

We'll walk through the options we've prepared for your {{project_type}} project.

See you then!
PaxBespoke`,
    channels: ['email', 'sms', 'whatsapp'],
  },
  {
    id: 'deposit_request',
    name: 'Deposit Request',
    subject: 'Secure your project — deposit details',
    body: `Hi {{first_name}},

Thanks for confirming your project. To secure your slot, please pay the deposit of £{{amount}} using the link below:

{{payment_link}}

Once received, we'll schedule your onboarding visit.

Best,
{{owner_name}}`,
    channels: ['email', 'whatsapp'],
  },
  {
    id: 'onboarding_invite',
    name: 'Onboarding Invite',
    subject: 'Time to measure up — book your onboarding visit',
    body: `Hi {{first_name}},

Your deposit is confirmed — thank you! The next step is your onboarding visit where we'll take detailed measurements and finalise everything.

Book your onboarding: {{booking_link}}

{{owner_name}}`,
    channels: ['email', 'whatsapp'],
  },
  {
    id: 'onboarding_confirmed',
    name: 'Onboarding Booking Confirmation',
    subject: 'Your onboarding visit is confirmed, {{first_name}}',
    body: `Hi {{first_name}},

Your onboarding visit with {{owner_name}} is confirmed for {{date}} at {{time}}.

During the visit we'll:
• Take detailed measurements
• Finalise your design choices
• Confirm materials and finishes

Please make sure the wardrobe area is accessible.

See you then!
{{owner_name}}`,
    channels: ['email', 'sms', 'whatsapp'],
  },
  {
    id: 'review_request',
    name: 'Review Request',
    subject: 'How did we do, {{first_name}}?',
    body: `Hi {{first_name}},

Your {{project_type}} project is complete! We hope you love the result.

We'd really appreciate a quick review — it helps other homeowners find us:
https://g.page/paxbespoke/review

Thanks for choosing PaxBespoke!`,
    channels: ['email', 'whatsapp'],
  },
]

/**
 * Interpolate placeholders in a template string.
 */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
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
