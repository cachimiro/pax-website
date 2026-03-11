'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, MessageSquare, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { MessageSummaryItem } from '@/app/api/fitter/messages/summary/route'

export default function FitterMessagesPage() {
  const [summary, setSummary] = useState<MessageSummaryItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/fitter/messages/summary')
      if (!res.ok) return
      const data = await res.json()
      setSummary(data.summary || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  // Realtime: re-fetch when a new message arrives
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('fitter-messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fitting_messages' }, () => {
        fetchSummary()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchSummary])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[var(--green-600)]" />
      </div>
    )
  }

  const totalUnread = summary.reduce((n, s) => n + s.unread_count, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[var(--warm-900)]">Messages</h1>
        {totalUnread > 0 && (
          <span className="text-xs font-bold bg-[var(--green-600)] text-white px-2 py-0.5 rounded-full">
            {totalUnread} unread
          </span>
        )}
      </div>

      {summary.length === 0 ? (
        <div className="text-center py-12 text-[var(--warm-400)]">
          <MessageSquare size={32} className="mx-auto mb-2" />
          <p className="text-sm">No messages yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {summary.map(item => (
            <Link
              key={item.job_id}
              href={`/fitter/job/${item.job_id}/chat`}
              className="block bg-white rounded-xl border border-[var(--warm-100)] p-4 hover:border-[var(--green-300)] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--warm-400)]">{item.job_code}</span>
                    {item.unread_count > 0 && (
                      <span className="text-[10px] font-bold bg-[var(--green-600)] text-white px-1.5 py-0.5 rounded-full">
                        {item.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-[var(--warm-900)] truncate">
                    {item.customer_name || 'Job'}
                  </div>
                  {item.last_message && (
                    <p className="text-xs text-[var(--warm-500)] truncate mt-0.5">{item.last_message}</p>
                  )}
                </div>
                <ChevronRight size={16} className="text-[var(--warm-300)] shrink-0 ml-2" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
