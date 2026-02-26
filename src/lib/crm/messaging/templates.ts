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
    id: 'confirmation_enquiry',
    name: 'Enquiry Confirmation',
    subject: 'Thanks for your enquiry, {{first_name}}',
    body: `Hi {{first_name}},

Thanks for getting in touch about your {{project_type}} project. We've received your details and one of our team will be in contact shortly to arrange your free consultation.

In the meantime, feel free to browse our recent projects at https://paxbespoke.uk/projects

Best regards,
The PaxBespoke Team`,
    channels: ['email', 'whatsapp'],
  },
  {
    id: 'call1_reminder',
    name: 'Call 1 Reminder',
    subject: 'Reminder: Your consultation is coming up',
    body: `Hi {{first_name}},

Just a reminder about your consultation with {{owner_name}} on {{date}} at {{time}}.

Please have a few photos of your space ready if possible — it helps us give you the best advice.

See you soon!
PaxBespoke`,
    channels: ['email', 'sms', 'whatsapp'],
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
