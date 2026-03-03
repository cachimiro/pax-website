'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Loader2, AlertCircle, ArrowLeft, Camera, Video, Trash2,
  Upload, Image as ImageIcon, Plus, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { FittingJob } from '@/lib/fitter/types'

type MediaType = 'photos_before' | 'photos_after' | 'videos'

const SECTIONS: { key: MediaType; label: string; icon: typeof Camera; accept: string; min: number }[] = [
  { key: 'photos_before', label: 'Before Photos', icon: Camera, accept: 'image/*', min: 5 },
  { key: 'photos_after', label: 'After Photos', icon: ImageIcon, accept: 'image/*', min: 5 },
  { key: 'videos', label: 'Videos', icon: Video, accept: 'video/*', min: 2 },
]

export default function FitterPhotosPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [job, setJob] = useState<FittingJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState<Record<string, boolean>>({})

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/fitter/jobs/${id}`)
      if (!res.ok) throw new Error('Failed to load job')
      const data = await res.json()
      setJob(data.job)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchJob() }, [fetchJob])

  async function handleUpload(files: FileList, mediaType: MediaType) {
    if (!job || files.length === 0) return
    setUploading(prev => ({ ...prev, [mediaType]: true }))
    setError('')

    try {
      const supabase = createClient()
      const newUrls: string[] = []

      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${job.id}/${mediaType}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('fitting-media')
          .upload(path, file, { cacheControl: '3600', upsert: false })

        if (uploadErr) throw uploadErr

        const { data: urlData } = supabase.storage
          .from('fitting-media')
          .getPublicUrl(path)

        newUrls.push(urlData.publicUrl)
      }

      // Update job with new URLs
      const currentUrls = (job[mediaType] as string[]) || []
      const updatedUrls = [...currentUrls, ...newUrls]

      const res = await fetch(`/api/fitter/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [mediaType]: updatedUrls }),
      })

      if (!res.ok) throw new Error('Failed to save')
      const data = await res.json()
      setJob(data.job)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(prev => ({ ...prev, [mediaType]: false }))
    }
  }

  async function handleDelete(mediaType: MediaType, url: string) {
    if (!job) return
    setError('')

    try {
      const currentUrls = (job[mediaType] as string[]) || []
      const updatedUrls = currentUrls.filter(u => u !== url)

      const res = await fetch(`/api/fitter/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [mediaType]: updatedUrls }),
      })

      if (!res.ok) throw new Error('Failed to delete')
      const data = await res.json()
      setJob(data.job)

      // Also delete from storage
      const supabase = createClient()
      const path = url.split('/fitting-media/')[1]
      if (path) {
        await supabase.storage.from('fitting-media').remove([path])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[var(--green-600)]" />
      </div>
    )
  }

  if (!job) return null

  const isReadOnly = ['completed', 'signed_off', 'approved', 'rejected', 'cancelled'].includes(job.status)

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/fitter/job/${id}`)}
          className="p-2 hover:bg-[var(--warm-100)] rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-[var(--warm-900)]">Photos & Videos</h1>
          <p className="text-xs text-[var(--warm-500)]">{job.job_code} — {job.customer_name}</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {SECTIONS.map(section => {
        const urls = (job[section.key] as string[]) || []
        const Icon = section.icon
        const isVideo = section.key === 'videos'
        const count = urls.length
        const met = count >= section.min

        return (
          <div key={section.key} className="bg-white rounded-xl border border-[var(--warm-100)] overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-[var(--warm-50)]">
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-[var(--warm-500)]" />
                <span className="text-sm font-semibold text-[var(--warm-900)]">{section.label}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  met ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {count}/{section.min} min
                </span>
              </div>
              {!isReadOnly && (
                <UploadButton
                  accept={section.accept}
                  uploading={!!uploading[section.key]}
                  onFiles={(files) => handleUpload(files, section.key)}
                  capture={!isVideo}
                />
              )}
            </div>

            {urls.length === 0 ? (
              <div className="p-8 text-center text-[var(--warm-400)]">
                <Upload size={24} className="mx-auto mb-2" />
                <p className="text-sm">No {isVideo ? 'videos' : 'photos'} yet</p>
                <p className="text-xs mt-1">Minimum {section.min} required</p>
              </div>
            ) : (
              <div className={`p-3 grid ${isVideo ? 'grid-cols-1' : 'grid-cols-3'} gap-2`}>
                {urls.map((url, i) => (
                  <MediaItem
                    key={i}
                    url={url}
                    isVideo={isVideo}
                    readOnly={isReadOnly}
                    onDelete={() => handleDelete(section.key, url)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function UploadButton({
  accept, uploading, onFiles, capture,
}: {
  accept: string
  uploading: boolean
  onFiles: (files: FileList) => void
  capture: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        capture={capture ? 'environment' : undefined}
        className="hidden"
        onChange={e => {
          if (e.target.files) onFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[var(--green-600)] text-white rounded-lg hover:bg-[var(--green-700)] transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
        {uploading ? 'Uploading...' : 'Add'}
      </button>
    </>
  )
}

function MediaItem({
  url, isVideo, readOnly, onDelete,
}: {
  url: string
  isVideo: boolean
  readOnly: boolean
  onDelete: () => void
}) {
  const [showFull, setShowFull] = useState(false)

  return (
    <>
      <div className="relative group rounded-lg overflow-hidden bg-[var(--warm-50)]">
        {isVideo ? (
          <video src={url} controls className="w-full rounded-lg" preload="metadata" />
        ) : (
          <button onClick={() => setShowFull(true)} className="w-full">
            <img src={url} alt="" className="w-full aspect-square object-cover" />
          </button>
        )}
        {!readOnly && (
          <button onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="absolute top-1 right-1 p-1.5 bg-red-500/80 text-white rounded-full backdrop-blur-sm">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Full-screen preview */}
      {showFull && !isVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowFull(false)}>
          <button className="absolute top-4 right-4 p-2 text-white">
            <X size={24} />
          </button>
          <img src={url} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </>
  )
}
