'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Send } from 'lucide-react'
import type { FittingMessage } from '@/lib/fitter/types'

export default function FitterChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [messages, setMessages] = useState<FittingMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/fitter/jobs/${id}/messages`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages || [])
    } catch {
      // Silently fail on poll
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchMessages()
    // Poll every 10s
    pollRef.current = setInterval(fetchMessages, 10000)
    return () => clearInterval(pollRef.current)
  }, [fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/fitter/jobs/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      })
      if (!res.ok) return
      setText('')
      await fetchMessages()
    } finally {
      setSending(false)
    }
  }

  function formatTime(d: string) {
    return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  // Group messages by date
  const grouped: { date: string; messages: FittingMessage[] }[] = []
  let currentDate = ''
  for (const msg of messages) {
    const date = formatDate(msg.created_at)
    if (date !== currentDate) {
      currentDate = date
      grouped.push({ date, messages: [] })
    }
    grouped[grouped.length - 1].messages.push(msg)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] sm:h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-[var(--warm-100)]">
        <button onClick={() => router.push('/fitter/messages')}
          className="p-2 hover:bg-[var(--warm-100)] rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-[var(--warm-900)]">Office Chat</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-[var(--green-600)]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-sm text-[var(--warm-400)]">
            No messages yet. Start a conversation with the office.
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              <div className="text-center mb-3">
                <span className="text-[10px] bg-[var(--warm-100)] text-[var(--warm-500)] px-2 py-0.5 rounded-full">
                  {group.date}
                </span>
              </div>
              <div className="space-y-2">
                {group.messages.map(msg => (
                  <div key={msg.id}
                    className={`flex ${msg.sender_type === 'fitter' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                      msg.sender_type === 'fitter'
                        ? 'bg-[var(--green-600)] text-white rounded-br-md'
                        : 'bg-white border border-[var(--warm-100)] text-[var(--warm-800)] rounded-bl-md'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <div className={`text-[10px] mt-1 ${
                        msg.sender_type === 'fitter' ? 'text-green-200' : 'text-[var(--warm-400)]'
                      }`}>
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--warm-100)] pt-3 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 text-sm border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none"
        />
        <button onClick={handleSend} disabled={!text.trim() || sending}
          className="px-4 py-2.5 bg-[var(--green-600)] text-white rounded-xl hover:bg-[var(--green-700)] transition-colors disabled:opacity-50">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  )
}
