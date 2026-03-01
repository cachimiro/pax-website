'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText, AlertTriangle, Check, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

interface Props {
  onClose: () => void
}

type Step = 'upload' | 'map' | 'preview' | 'result'

const LEAD_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'postcode', label: 'Postcode' },
  { key: 'project_type', label: 'Project Type' },
  { key: 'source', label: 'Source' },
  { key: 'notes', label: 'Notes' },
]

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  const parse = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue }
      current += ch
    }
    result.push(current.trim())
    return result
  }

  const headers = parse(lines[0])
  const rows = lines.slice(1).map(parse).filter((r) => r.some((c) => c))
  return { headers, rows }
}

export default function CsvImportModal({ onClose }: Props) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: { row: number; error: string }[] } | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { headers, rows } = parseCsv(text)
      if (headers.length === 0) { toast.error('Could not parse CSV'); return }
      setCsvHeaders(headers)
      setCsvRows(rows)

      // Auto-map by fuzzy matching
      const autoMap: Record<string, string> = {}
      for (const field of LEAD_FIELDS) {
        const match = headers.find((h) =>
          h.toLowerCase().replace(/[^a-z]/g, '').includes(field.key.replace(/_/g, ''))
        )
        if (match) autoMap[field.key] = match
      }
      setMapping(autoMap)
      setStep('map')
    }
    reader.readAsText(file)
  }

  function buildLeads(): Record<string, string>[] {
    return csvRows.map((row) => {
      const lead: Record<string, string> = {}
      for (const field of LEAD_FIELDS) {
        const csvCol = mapping[field.key]
        if (csvCol) {
          const idx = csvHeaders.indexOf(csvCol)
          if (idx >= 0 && row[idx]) lead[field.key] = row[idx]
        }
      }
      return lead
    }).filter((l) => l.name)
  }

  async function handleImport() {
    const leads = buildLeads()
    if (leads.length === 0) { toast.error('No valid leads to import'); return }

    setImporting(true)
    try {
      const res = await fetch('/api/crm/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
        setStep('result')
        qc.invalidateQueries({ queryKey: ['leads'] })
      } else {
        toast.error(data.error ?? 'Import failed')
      }
    } catch {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  const previewLeads = buildLeads().slice(0, 5)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--warm-100)]">
          <h2 className="text-sm font-semibold text-[var(--warm-800)]">Import Leads from CSV</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--warm-50)] rounded-lg"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-[var(--green-50)] flex items-center justify-center mb-4">
                <Upload size={24} className="text-[var(--green-600)]" />
              </div>
              <p className="text-sm text-[var(--warm-600)] mb-1">Upload a CSV file</p>
              <p className="text-xs text-[var(--warm-400)] mb-4">First row should be column headers. Max 500 rows.</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--green-600)] rounded-xl hover:bg-[var(--green-700)] transition-colors"
              >
                Choose File
              </button>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'map' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className="text-[var(--warm-400)]" />
                <span className="text-xs text-[var(--warm-500)]">{csvRows.length} rows found, {csvHeaders.length} columns</span>
              </div>
              <div className="space-y-2">
                {LEAD_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-[var(--warm-700)] w-28 shrink-0">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </span>
                    <select
                      value={mapping[field.key] ?? ''}
                      onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs border border-[var(--warm-200)] rounded-lg focus:border-[var(--green-500)] focus:outline-none"
                    >
                      <option value="">— Skip —</option>
                      {csvHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {!mapping.name && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  <AlertTriangle size={12} /> Name column must be mapped
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--warm-500)]">Preview (first 5 of {buildLeads().length} leads):</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--warm-100)]">
                      {LEAD_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                        <th key={f.key} className="text-left px-2 py-1.5 text-[10px] text-[var(--warm-400)] uppercase">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewLeads.map((lead, i) => (
                      <tr key={i} className="border-b border-[var(--warm-50)]">
                        {LEAD_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                          <td key={f.key} className="px-2 py-1.5 text-[var(--warm-600)]">{lead[f.key] ?? '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 4: Result */}
          {step === 'result' && result && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Check size={20} className="text-emerald-600" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[var(--warm-800)]">{result.imported} leads imported</p>
                {result.skipped > 0 && (
                  <p className="text-xs text-amber-600 mt-1">{result.skipped} skipped</p>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-3 space-y-1">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-[10px] text-amber-700">Row {e.row}: {e.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--warm-100)]">
          <button onClick={onClose} className="text-xs text-[var(--warm-500)] hover:text-[var(--warm-700)]">
            {step === 'result' ? 'Close' : 'Cancel'}
          </button>
          <div className="flex gap-2">
            {step === 'map' && (
              <>
                <button onClick={() => setStep('upload')} className="px-3 py-1.5 text-xs text-[var(--warm-500)]">Back</button>
                <button
                  onClick={() => setStep('preview')}
                  disabled={!mapping.name}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[var(--green-600)] rounded-lg hover:bg-[var(--green-700)] disabled:opacity-50"
                >
                  Preview
                </button>
              </>
            )}
            {step === 'preview' && (
              <>
                <button onClick={() => setStep('map')} className="px-3 py-1.5 text-xs text-[var(--warm-500)]">Back</button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[var(--green-600)] rounded-lg hover:bg-[var(--green-700)] disabled:opacity-50"
                >
                  {importing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  Import {buildLeads().length} Leads
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
