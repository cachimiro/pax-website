'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, X, User, CreditCard, ArrowRight, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface Notification {
  id: string
  type: 'new_lead' | 'payment' | 'stage_change'
  title: string
  body: string
  link: string
  createdAt: Date
  read: boolean
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [showPopup, setShowPopup] = useState<Notification | null>(null)
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const notif: Notification = {
      ...n,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      read: false,
    }
    setNotifications((prev) => [notif, ...prev].slice(0, 50))

    // Show popup
    setShowPopup(notif)
    if (popupTimer.current) clearTimeout(popupTimer.current)
    popupTimer.current = setTimeout(() => setShowPopup(null), 8000)
  }, [])

  // Subscribe to Supabase Realtime
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('crm-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          const lead = payload.new as { id: string; name: string; project_type?: string; postcode?: string; phone?: string }
          addNotification({
            type: 'new_lead',
            title: 'New Enquiry',
            body: `${lead.name}${lead.project_type ? ` — ${lead.project_type}` : ''}${lead.postcode ? ` (${lead.postcode})` : ''}`,
            link: `/crm/leads/${lead.id}`,
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payments' },
        (payload) => {
          const payment = payload.new as { id: string; amount: number; invoice_id: string }
          addNotification({
            type: 'payment',
            title: 'Payment Received',
            body: `£${payment.amount?.toLocaleString('en-GB')} received`,
            link: '/crm/pipeline',
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [addNotification])

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  function dismissPopup() {
    setShowPopup(null)
    if (popupTimer.current) clearTimeout(popupTimer.current)
  }

  const typeConfig = {
    new_lead: { icon: <User size={14} />, color: 'bg-[var(--green-50)] text-[var(--green-700)]', ring: 'ring-[var(--green-200)]' },
    payment: { icon: <CreditCard size={14} />, color: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-200' },
    stage_change: { icon: <ArrowRight size={14} />, color: 'bg-blue-50 text-blue-700', ring: 'ring-blue-200' },
  }

  return (
    <>
      {/* Bell button */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => { setOpen(!open); if (!open) markAllRead() }}
          className="relative p-2 text-[var(--warm-400)] hover:text-[var(--warm-600)] hover:bg-[var(--warm-50)] rounded-xl transition-all"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full ring-2 ring-white px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown panel */}
        {open && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-[var(--warm-100)] shadow-2xl z-50 animate-scale-in overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--warm-100)]">
              <h3 className="text-sm font-semibold text-[var(--warm-800)]">Notifications</h3>
              {notifications.length > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-[var(--warm-400)] hover:text-[var(--warm-600)]">
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={20} className="text-[var(--warm-200)] mx-auto mb-2" />
                  <p className="text-xs text-[var(--warm-400)]">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const tc = typeConfig[n.type]
                  return (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => setOpen(false)}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-[var(--warm-50)] transition-colors border-b border-[var(--warm-50)] ${!n.read ? 'bg-[var(--green-50)]/30' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${tc.color} flex items-center justify-center shrink-0 mt-0.5`}>
                        {tc.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--warm-800)]">{n.title}</p>
                        <p className="text-[11px] text-[var(--warm-500)] truncate">{n.body}</p>
                        <p className="text-[9px] text-[var(--warm-300)] mt-0.5 flex items-center gap-1">
                          <Clock size={8} />
                          {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                        </p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--green-500)] shrink-0 mt-2" />}
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live popup toast */}
      {showPopup && (
        <div className="fixed top-4 right-4 z-[200] animate-scale-in">
          <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-2xl p-4 w-80">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl ${typeConfig[showPopup.type].color} flex items-center justify-center shrink-0`}>
                {typeConfig[showPopup.type].icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--warm-800)]">{showPopup.title}</p>
                  <button onClick={dismissPopup} className="p-0.5 text-[var(--warm-300)] hover:text-[var(--warm-500)]">
                    <X size={12} />
                  </button>
                </div>
                <p className="text-xs text-[var(--warm-500)] mt-0.5">{showPopup.body}</p>
                <Link
                  href={showPopup.link}
                  onClick={dismissPopup}
                  className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-[var(--green-600)] hover:text-[var(--green-800)] transition-colors"
                >
                  View details <ArrowRight size={10} />
                </Link>
              </div>
            </div>
            {/* Auto-dismiss progress bar */}
            <div className="mt-3 h-0.5 bg-[var(--warm-100)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--green-500)] rounded-full animate-shrink-bar" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
