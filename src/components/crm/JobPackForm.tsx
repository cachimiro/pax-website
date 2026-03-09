'use client'

import { useState, useRef } from 'react'
import {
  Loader2, XCircle, Upload, FileText, Trash2, ChevronDown, ChevronUp,
  PoundSterling, Clock, MapPin, Car, Key, FileBox, Wrench, Send, UserCheck
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import FitterAvailabilityGrid from './FitterAvailabilityGrid'

interface SubcontractorOption {
  id: string
  name: string
}

interface JobPackFormProps {
  opportunityId: string
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  customerPostcode: string | null
  confirmedDate: string | null
  subcontractors: SubcontractorOption[]
  onSubmitted: () => void
}

interface DocFile {
  name: string
  url: string
  uploaded_at: string
}

export default function JobPackForm({
  opportunityId, customerName, customerPhone, customerEmail,
  customerPostcode, confirmedDate, subcontractors, onSubmitted,
}: JobPackFormProps) {
  // Fitter & schedule
  const [selectedFitter, setSelectedFitter] = useState('')
  const [scheduledDate, setScheduledDate] = useState(
    confirmedDate ? new Date(confirmedDate).toISOString().slice(0, 16) : ''
  )
  const [estimatedHours, setEstimatedHours] = useState('8')

  // Job pack details
  const [fittingFee, setFittingFee] = useState('')
  const [scopeOfWork, setScopeOfWork] = useState('')
  const [accessNotes, setAccessNotes] = useState('')
  const [parkingInfo, setParkingInfo] = useState('')
  const [ikeaOrderRef, setIkeaOrderRef] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [notes, setNotes] = useState('')

  // Documents
  const [designDocs, setDesignDocs] = useState<DocFile[]>([])
  const [measurementDocs, setMeasurementDocs] = useState<DocFile[]>([])
  const [uploading, setUploading] = useState(false)

  // Mode & state
  const [mode, setMode] = useState<'offer' | 'assign'>('offer')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showDetails, setShowDetails] = useState(true)

  const designInputRef = useRef<HTMLInputElement>(null)
  const measureInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(files: FileList, type: 'design' | 'measurement') {
    setUploading(true)
    try {
      const supabase = createClient()
      const newDocs: DocFile[] = []

      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'pdf'
        const path = `job-docs/${opportunityId}/${type}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('fitting-media')
          .upload(path, file, { cacheControl: '3600' })

        if (uploadErr) throw uploadErr

        const { data: urlData } = supabase.storage
          .from('fitting-media')
          .getPublicUrl(path)

        newDocs.push({ name: file.name, url: urlData.publicUrl, uploaded_at: new Date().toISOString() })
      }

      if (type === 'design') setDesignDocs(prev => [...prev, ...newDocs])
      else setMeasurementDocs(prev => [...prev, ...newDocs])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function removeDoc(type: 'design' | 'measurement', url: string) {
    if (type === 'design') setDesignDocs(prev => prev.filter(d => d.url !== url))
    else setMeasurementDocs(prev => prev.filter(d => d.url !== url))
  }

  async function handleSubmit() {
    if (!selectedFitter) { setError('Select a fitter'); return }
    if (!scheduledDate) { setError('Set a date'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/crm/fittings/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity_id: opportunityId,
          subcontractor_id: selectedFitter,
          mode,
          scheduled_date: scheduledDate || null,
          customer_name: customerName,
          customer_address: customerPostcode || null,
          customer_phone: customerPhone || null,
          customer_email: customerEmail || null,
          fitting_fee: fittingFee ? parseFloat(fittingFee) : null,
          scope_of_work: scopeOfWork || null,
          access_notes: accessNotes || null,
          parking_info: parkingInfo || null,
          ikea_order_ref: ikeaOrderRef || null,
          special_instructions: specialInstructions || null,
          design_documents: designDocs,
          measurement_documents: measurementDocs,
          estimated_duration_hours: parseFloat(estimatedHours) || 8,
          notes: notes || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }
      onSubmitted()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const INPUT = "w-full mt-1 px-3 py-2 text-sm border border-[var(--warm-100)] rounded-lg focus:border-[var(--brand)] focus:outline-none"

  return (
    <div className="space-y-3 pt-3">
      {/* Fitter & Date */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-[var(--warm-600)]">Fitter *</label>
          <select value={selectedFitter} onChange={e => setSelectedFitter(e.target.value)} className={INPUT}>
            <option value="">Select fitter...</option>
            {subcontractors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--warm-600)]">Fitting Date *</label>
          <input type="datetime-local" value={scheduledDate}
            onChange={e => setScheduledDate(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--warm-600)] flex items-center gap-1">
            <Clock size={11} /> Duration (hours)
          </label>
          <input type="number" value={estimatedHours} min="1" max="48" step="0.5"
            onChange={e => setEstimatedHours(e.target.value)} className={INPUT} />
        </div>
      </div>

      {/* Fitter Availability Grid */}
      {scheduledDate && (
        <FitterAvailabilityGrid
          date={scheduledDate}
          selectedFitterId={selectedFitter}
          onSelectFitter={setSelectedFitter}
        />
      )}

      {/* Job Pack Details (collapsible) */}
      <button onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-between text-xs font-semibold text-[var(--warm-700)] py-2 border-t border-[var(--warm-50)]">
        <span className="flex items-center gap-1"><FileBox size={12} /> Job Pack Details</span>
        {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {showDetails && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--warm-600)] flex items-center gap-1">
                <PoundSterling size={11} /> Fitting Fee
              </label>
              <input type="number" value={fittingFee} step="0.01" placeholder="e.g. 450.00"
                onChange={e => setFittingFee(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--warm-600)]">IKEA Order Ref</label>
              <input type="text" value={ikeaOrderRef} placeholder="e.g. 12345678"
                onChange={e => setIkeaOrderRef(e.target.value)} className={INPUT} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--warm-600)] flex items-center gap-1">
              <Wrench size={11} /> Scope of Work
            </label>
            <textarea value={scopeOfWork} rows={2}
              placeholder="e.g. His & hers PAX wardrobes, 3m wall, sliding doors"
              onChange={e => setScopeOfWork(e.target.value)} className={INPUT + " resize-none"} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--warm-600)] flex items-center gap-1">
                <Key size={11} /> Access Notes
              </label>
              <textarea value={accessNotes} rows={2}
                placeholder="e.g. Ring doorbell, side gate code 4521"
                onChange={e => setAccessNotes(e.target.value)} className={INPUT + " resize-none"} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--warm-600)] flex items-center gap-1">
                <Car size={11} /> Parking Info
              </label>
              <textarea value={parkingInfo} rows={2}
                placeholder="e.g. Free on-street, no restrictions"
                onChange={e => setParkingInfo(e.target.value)} className={INPUT + " resize-none"} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--warm-600)]">Special Instructions</label>
            <textarea value={specialInstructions} rows={2}
              placeholder="e.g. Customer has cats, keep doors closed"
              onChange={e => setSpecialInstructions(e.target.value)} className={INPUT + " resize-none"} />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--warm-600)]">Notes for Fitter</label>
            <textarea value={notes} rows={2} placeholder="Any additional notes..."
              onChange={e => setNotes(e.target.value)} className={INPUT + " resize-none"} />
          </div>

          {/* Document uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DocUploadSection
              label="Design Documents"
              docs={designDocs}
              inputRef={designInputRef}
              uploading={uploading}
              onUpload={(files) => handleUpload(files, 'design')}
              onRemove={(url) => removeDoc('design', url)}
            />
            <DocUploadSection
              label="Measurements"
              docs={measurementDocs}
              inputRef={measureInputRef}
              uploading={uploading}
              onUpload={(files) => handleUpload(files, 'measurement')}
              onRemove={(url) => removeDoc('measurement', url)}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-1">
          <XCircle size={12} /> {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        {/* Mode toggle */}
        <div className="flex bg-[var(--warm-50)] rounded-lg p-0.5 text-[11px] font-medium">
          <button onClick={() => setMode('offer')}
            className={`px-3 py-1.5 rounded-md transition-colors ${mode === 'offer' ? 'bg-white shadow-sm text-amber-700' : 'text-[var(--warm-500)]'}`}>
            <Send size={11} className="inline mr-1" />Offer
          </button>
          <button onClick={() => setMode('assign')}
            className={`px-3 py-1.5 rounded-md transition-colors ${mode === 'assign' ? 'bg-white shadow-sm text-[var(--brand)]' : 'text-[var(--warm-500)]'}`}>
            <UserCheck size={11} className="inline mr-1" />Assign
          </button>
        </div>

        <div className="flex-1" />

        <button onClick={handleSubmit} disabled={!selectedFitter || !scheduledDate || submitting}
          className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-opacity disabled:opacity-50 flex items-center gap-2 ${
            mode === 'offer' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[var(--brand)] hover:opacity-90'
          }`}>
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {mode === 'offer' ? 'Send Offer (24h)' : 'Assign Directly'}
        </button>
      </div>

      {mode === 'offer' && (
        <p className="text-[10px] text-[var(--warm-400)]">
          Fitter has 24 hours to accept. If declined or expired, the job moves to the open board.
        </p>
      )}
    </div>
  )
}

function DocUploadSection({
  label, docs, inputRef, uploading, onUpload, onRemove,
}: {
  label: string
  docs: DocFile[]
  inputRef: React.RefObject<HTMLInputElement | null>
  uploading: boolean
  onUpload: (files: FileList) => void
  onRemove: (url: string) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-[var(--warm-600)] flex items-center gap-1">
          <FileText size={11} /> {label}
        </label>
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="text-[10px] text-[var(--brand)] hover:underline flex items-center gap-0.5">
          {uploading ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />} Upload
        </button>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple className="hidden"
          onChange={e => { if (e.target.files) onUpload(e.target.files); e.target.value = '' }} />
      </div>
      {docs.length === 0 ? (
        <div className="text-[10px] text-[var(--warm-400)] py-2">No files uploaded</div>
      ) : (
        <div className="space-y-1">
          {docs.map(doc => (
            <div key={doc.url} className="flex items-center gap-2 text-xs bg-[var(--warm-50)] rounded-lg px-2 py-1.5">
              <FileText size={12} className="text-[var(--warm-400)] shrink-0" />
              <a href={doc.url} target="_blank" rel="noopener" className="truncate flex-1 text-[var(--brand)] hover:underline">
                {doc.name}
              </a>
              <button onClick={() => onRemove(doc.url)} className="text-[var(--warm-400)] hover:text-red-500">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
