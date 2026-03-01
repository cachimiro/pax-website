'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  MessageSquare,
  Smartphone,
  AlertTriangle,
  ShieldOff,
  Copy,
  Clock,
  Send,
  X,
  Check,
  Sparkles,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import Button from './Button'
import ModalWrapper from './ModalWrapper'
import { useAICompose } from '@/lib/crm/ai-hooks'
import { useAIPreferences } from '@/lib/crm/ai-preferences'
import { useGoogleStatus, useChannelStatus } from '@/lib/crm/hooks'
import type { Lead, MessageChannel, OpportunityWithLead, MessageLog } from '@/lib/crm/types'

interface SendConfirmationProps {
  open: boolean
  onClose: () => void
  lead: Lead
  channel: MessageChannel
  subject?: string
  body: string
  templateId?: string
  senderName: string
  onSend: (data: { channel: MessageChannel; subject?: string; body: string }) => Promise<void>
  recentMessages?: { body: string; created_at: string }[]
  // AI compose context (optional — Phase C)
  opportunity?: OpportunityWithLead | null
  intent?: string
  messages?: MessageLog[]
}

const channelConfig: Record<MessageChannel, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  email: { label: 'Email', icon: <Mail size={14} />, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  sms: { label: 'SMS', icon: <Smartphone size={14} />, color: 'text-violet-600', bgColor: 'bg-violet-50' },
  whatsapp: { label: 'WhatsApp', icon: <MessageSquare size={14} />, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
}

export default function SendConfirmation({
  open,
  onClose,
  lead,
  channel: initialChannel,
  subject: initialSubject,
  body: initialBody,
  senderName,
  onSend,
  recentMessages = [],
  opportunity,
  intent,
  messages: messageLog,
}: SendConfirmationProps) {
  const [channel, setChannel] = useState<MessageChannel>(initialChannel)
  const [body, setBody] = useState(initialBody)
  const [subject, setSubject] = useState(initialSubject ?? '')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [aiDrafted, setAiDrafted] = useState(false)

  const { composeOn, prefs } = useAIPreferences()
  const compose = useAICompose()
  const { data: googleStatus } = useGoogleStatus()
  const { data: channelStatus } = useChannelStatus()
  const gmailConnected = googleStatus?.connected && googleStatus?.email_active && !googleStatus?.needs_reauth

  // Channel configuration warnings
  const channelWarning = useMemo(() => {
    if (!channelStatus) return null
    if (channel === 'email' && !channelStatus.email.configured) return 'Email is not configured. Messages will be logged but not delivered.'
    if (channel === 'sms' && !channelStatus.sms.configured) return 'SMS is not configured. Set up Twilio in Settings > Integrations.'
    if (channel === 'whatsapp' && !channelStatus.whatsapp.configured) return 'WhatsApp is not configured. Set up Twilio WhatsApp in Settings > Integrations.'
    return null
  }, [channel, channelStatus])

  async function handleAIDraft() {
    if (compose.isPending) return
    // Warn if user has edited the body
    if (aiDrafted && body !== initialBody) {
      const confirmed = window.confirm('This will replace your current message. Continue?')
      if (!confirmed) return
    }
    try {
      const result = await compose.mutateAsync({
        lead,
        opportunity,
        channel,
        tone: prefs.compose_tone,
        intent,
        recentMessages: messageLog?.slice(0, 5),
      })
      setBody(result.body)
      if (result.subject && channel === 'email') {
        setSubject(result.subject)
      }
      setAiDrafted(true)
    } catch {
      toast.error('AI draft failed — you can still type manually')
    }
  }

  // Validation
  const canUseChannel = useMemo(() => ({
    email: !!lead.email,
    sms: !!lead.phone,
    whatsapp: !!lead.phone,
  }), [lead])

  const isOptedOut = lead.opted_out

  // Duplicate detection — same body sent in last 24h
  const isDuplicate = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    return recentMessages.some(
      (m) =>
        new Date(m.created_at).getTime() > dayAgo &&
        m.body.trim().toLowerCase() === body.trim().toLowerCase()
    )
  }, [recentMessages, body])

  // Contact validation
  const contactValid = canUseChannel[channel]
  const contactError = !contactValid
    ? channel === 'email'
      ? 'No email address on file'
      : 'No phone number on file'
    : null

  async function handleSend() {
    if (!contactValid || isOptedOut || !body.trim()) return
    setSending(true)
    try {
      await onSend({ channel, subject: channel === 'email' ? subject : undefined, body })
      setSent(true)

      // Show undo toast
      toast.success(
        `Message sent to ${lead.name} via ${channelConfig[channel].label}`,
        {
          action: {
            label: 'Undo',
            onClick: () => {
              toast.info('Message cancelled (undo not yet implemented)')
            },
          },
          duration: 5000,
        }
      )

      setTimeout(() => onClose(), 600)
    } catch {
      toast.error('Failed to send message. It has been queued for retry.')
    } finally {
      setSending(false)
    }
  }

  const charCount = body.length
  const isLong = channel === 'sms' && charCount > 160

  return (
    <ModalWrapper open={open} onClose={onClose} maxWidth="max-w-lg">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--green-100)] to-[var(--green-50)] flex items-center justify-center">
              <Send size={16} className="text-[var(--green-600)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--warm-900)]">Send message</h3>
              <p className="text-[11px] text-[var(--warm-400)]">to {lead.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--warm-300)] hover:text-[var(--warm-500)] hover:bg-[var(--warm-50)] rounded-lg transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Opt-out warning */}
        {isOptedOut && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 border border-red-200 mb-4"
          >
            <ShieldOff size={14} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-red-700">This lead has opted out</p>
              <p className="text-[10px] text-red-500 mt-0.5">They have requested not to receive communications. Sending is blocked.</p>
            </div>
          </motion.div>
        )}

        {/* Channel selector */}
        <div className="mb-4">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--warm-400)] mb-2 block">Channel</label>
          <div className="flex gap-2">
            {(Object.keys(channelConfig) as MessageChannel[]).map((ch) => {
              const cfg = channelConfig[ch]
              const available = canUseChannel[ch]
              const isSelected = channel === ch
              return (
                <button
                  key={ch}
                  onClick={() => available && setChannel(ch)}
                  disabled={!available}
                  className={`
                    flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all
                    ${isSelected
                      ? `${cfg.bgColor} ${cfg.color} ring-1 ring-current/20 shadow-sm`
                      : available
                        ? 'text-[var(--warm-500)] hover:bg-[var(--warm-50)] border border-[var(--warm-100)]'
                        : 'text-[var(--warm-300)] bg-[var(--warm-50)]/50 cursor-not-allowed opacity-50 border border-transparent'
                    }
                  `}
                  title={!available ? (ch === 'email' ? 'No email on file' : 'No phone on file') : undefined}
                >
                  {cfg.icon}
                  {cfg.label}
                  {!available && <X size={10} className="ml-0.5" />}
                </button>
              )
            })}
          </div>
          {contactError && (
            <p className="text-[10px] text-red-500 mt-1.5 flex items-center gap-1">
              <AlertTriangle size={10} /> {contactError}
            </p>
          )}
          {!contactError && channelWarning && (
            <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
              <AlertTriangle size={10} /> {channelWarning}
            </p>
          )}
        </div>

        {/* Subject (email only) */}
        {channel === 'email' && (
          <div className="mb-3">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--warm-400)] mb-1.5 block">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none focus:ring-1 focus:ring-[var(--green-100)] text-[var(--warm-800)] placeholder:text-[var(--warm-300)]"
              placeholder="Message subject..."
            />
          </div>
        )}

        {/* AI Draft button */}
        {composeOn && !isOptedOut && (
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleAIDraft}
                disabled={compose.isPending}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all
                  ${compose.isPending
                    ? 'bg-[var(--warm-50)] text-[var(--warm-400)] cursor-wait'
                    : 'bg-gradient-to-r from-violet-50 to-blue-50 text-violet-600 hover:from-violet-100 hover:to-blue-100 hover:shadow-sm'
                  }
                `}
              >
                {compose.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                {compose.isPending ? 'Drafting...' : aiDrafted ? 'Regenerate' : 'Draft with AI'}
              </button>
              {aiDrafted && !compose.isPending && (
                <span className="text-[10px] text-[var(--warm-400)] flex items-center gap-1">
                  <Check size={10} className="text-[var(--green-500)]" />
                  AI draft — edit freely
                </span>
              )}
            </div>
          </div>
        )}

        {/* Message body */}
        <div className="mb-4">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--warm-400)] mb-1.5 block">Message</label>
          <div className="relative">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              disabled={compose.isPending}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:border-[var(--green-500)] focus:outline-none focus:ring-1 focus:ring-[var(--green-100)] text-[var(--warm-800)] placeholder:text-[var(--warm-300)] resize-none leading-relaxed transition-all ${
                compose.isPending
                  ? 'border-violet-200 bg-violet-50/30'
                  : aiDrafted
                  ? 'border-violet-200 bg-white'
                  : 'border-[var(--warm-100)] bg-white'
              }`}
              placeholder="Type your message..."
            />
            {compose.isPending && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-100">
                  <Loader2 size={14} className="animate-spin text-violet-500" />
                  <span className="text-xs text-violet-600 font-medium">AI is writing...</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className={`text-[10px] ${isLong ? 'text-amber-500' : 'text-[var(--warm-300)]'}`}>
              {charCount} characters{isLong ? ' (will be split into multiple SMS)' : ''}
            </span>
            <span className="text-[10px] text-[var(--warm-300)] flex items-center gap-1">
              {channel === 'email' && gmailConnected ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  From {googleStatus?.email}
                </>
              ) : (
                <>Sending as {senderName}</>
              )}
            </span>
          </div>
        </div>

        {/* Duplicate warning */}
        {isDuplicate && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 mb-4"
          >
            <Copy size={13} className="text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-medium text-amber-700">Similar message sent recently</p>
              <p className="text-[10px] text-amber-500">A message with the same content was sent in the last 24 hours.</p>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            loading={sending}
            success={sent}
            disabled={!contactValid || isOptedOut || !body.trim()}
            icon={<Send size={14} />}
            className="flex-1"
          >
            Send now
          </Button>
        </div>
      </div>
    </ModalWrapper>
  )
}
