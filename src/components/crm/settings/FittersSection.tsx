'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Send, Loader2, AlertTriangle, Check, Pause, Play, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface SubcontractorRow {
  id: string
  name: string
  email: string
  phone: string | null
  status: 'invited' | 'active' | 'suspended'
  invite_sent_at: string | null
  activated_at: string | null
}

const STATUS_STYLES: Record<string, string> = {
  invited: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
}

export default function FittersSection() {
  const [subs, setSubs] = useState<SubcontractorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePhone, setInvitePhone] = useState('')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  async function fetchSubs() {
    try {
      const res = await fetch('/api/crm/subcontractors')
      if (res.ok) {
        const data = await res.json()
        setSubs(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSubs() }, [])

  async function handleStatusChange(id: string, newStatus: 'active' | 'suspended') {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/crm/subcontractors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) fetchSubs()
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(id: string) {
    setActionLoading(id)
    setConfirmDelete(null)
    try {
      const res = await fetch(`/api/crm/subcontractors/${id}`, { method: 'DELETE' })
      if (res.ok) fetchSubs()
    } finally {
      setActionLoading(null)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim()) return
    setInviting(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/crm/subcontractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          phone: invitePhone.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to invite')
      setSuccess(`Invite sent to ${inviteEmail.trim()}`)
      setInviteName('')
      setInviteEmail('')
      setInvitePhone('')
      fetchSubs()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to invite')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <div className="bg-white rounded-xl border border-[var(--warm-100)] p-5">
        <h3 className="text-sm font-semibold text-[var(--warm-900)] mb-3 flex items-center gap-2">
          <UserPlus size={16} /> Invite New Fitter
        </h3>
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--warm-600)]">Name *</label>
              <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                placeholder="Company or fitter name"
                required
                className="w-full mt-1 px-3 py-2 text-sm border border-[var(--warm-100)] rounded-lg focus:border-[var(--green-500)] focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--warm-600)]">Email *</label>
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="fitter@example.com"
                required
                className="w-full mt-1 px-3 py-2 text-sm border border-[var(--warm-100)] rounded-lg focus:border-[var(--green-500)] focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--warm-600)]">Phone</label>
              <input type="tel" value={invitePhone} onChange={e => setInvitePhone(e.target.value)}
                placeholder="07xxx xxxxxx"
                className="w-full mt-1 px-3 py-2 text-sm border border-[var(--warm-100)] rounded-lg focus:border-[var(--green-500)] focus:outline-none" />
            </div>
          </div>

          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-1">
              <AlertTriangle size={12} /> {error}
            </div>
          )}
          {success && (
            <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 flex items-center gap-1">
              <Check size={12} /> {success}
            </div>
          )}

          <button type="submit" disabled={inviting || !inviteName.trim() || !inviteEmail.trim()}
            className="px-4 py-2 bg-[var(--green-600)] text-white text-sm font-medium rounded-lg hover:bg-[var(--green-700)] transition-colors disabled:opacity-50 flex items-center gap-2">
            {inviting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send Invite
          </button>
        </form>
      </div>

      {/* Fitters list */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--warm-900)] mb-3">
          Fitters ({subs.length})
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[var(--warm-400)]" />
          </div>
        ) : subs.length === 0 ? (
          <div className="text-center py-8 text-sm text-[var(--warm-400)]">
            No fitters yet. Invite one above.
          </div>
        ) : (
          <div className="space-y-2">
            {subs.map(sub => (
              <div key={sub.id} className="bg-white rounded-xl border border-[var(--warm-100)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--warm-900)]">{sub.name}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[sub.status] || ''}`}>
                        {sub.status}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--warm-500)] mt-0.5">{sub.email}</div>
                    {sub.phone && <div className="text-xs text-[var(--warm-500)]">{sub.phone}</div>}
                    {sub.status === 'invited' && sub.invite_sent_at && (
                      <div className="text-[10px] text-[var(--warm-400)] mt-1">
                        Invited {formatDistanceToNow(new Date(sub.invite_sent_at), { addSuffix: true })}
                      </div>
                    )}
                    {sub.activated_at && (
                      <div className="text-[10px] text-green-600 mt-1">
                        Active since {new Date(sub.activated_at).toLocaleDateString('en-GB')}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {actionLoading === sub.id ? (
                      <Loader2 size={14} className="animate-spin text-[var(--warm-400)]" />
                    ) : (
                      <>
                        {sub.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(sub.id, 'suspended')}
                            title="Suspend fitter"
                            className="p-1.5 rounded-lg text-[var(--warm-400)] hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          >
                            <Pause size={14} />
                          </button>
                        )}
                        {sub.status === 'suspended' && (
                          <button
                            onClick={() => handleStatusChange(sub.id, 'active')}
                            title="Reactivate fitter"
                            className="p-1.5 rounded-lg text-[var(--warm-400)] hover:bg-green-50 hover:text-green-600 transition-colors"
                          >
                            <Play size={14} />
                          </button>
                        )}

                        {confirmDelete === sub.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-red-600">Remove?</span>
                            <button
                              onClick={() => handleDelete(sub.id)}
                              className="text-[10px] px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-[10px] px-2 py-1 border border-[var(--warm-200)] rounded-lg hover:bg-[var(--warm-50)]"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(sub.id)}
                            title="Remove fitter"
                            className="p-1.5 rounded-lg text-[var(--warm-400)] hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
