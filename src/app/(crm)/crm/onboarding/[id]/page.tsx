'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useOnboarding, useOpportunity } from '@/lib/crm/hooks'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Upload,
  X,
  FileImage,
  Video,
  Save,
  CheckCircle,
  Ruler,
  Home,
  DoorOpen,
  AlertTriangle,
  Paintbrush,
  Truck,
  Wrench,
} from 'lucide-react'
import type { Onboarding } from '@/lib/crm/types'

interface OnboardingForm {
  room_dimensions: string
  ceiling_height: string
  wall_measurements: string
  doors_windows: string
  obstacles: string
  materials: string
  finish: string
  access_notes: string
  install_conditions: string
  video_recording_url: string
  notes: string
}

const SECTIONS = [
  { id: 'dimensions', label: 'Room Dimensions', icon: Ruler, fields: ['room_dimensions', 'ceiling_height', 'wall_measurements'] },
  { id: 'features', label: 'Doors & Windows', icon: DoorOpen, fields: ['doors_windows', 'obstacles'] },
  { id: 'materials', label: 'Materials & Finish', icon: Paintbrush, fields: ['materials', 'finish'] },
  { id: 'access', label: 'Access & Conditions', icon: Truck, fields: ['access_notes', 'install_conditions'] },
]

const FIELD_LABELS: Record<string, { label: string; placeholder: string }> = {
  room_dimensions: { label: 'Room Dimensions', placeholder: 'e.g., 3.2m x 4.1m' },
  ceiling_height: { label: 'Ceiling Height', placeholder: 'e.g., 2.4m' },
  wall_measurements: { label: 'Wall Measurements', placeholder: 'Wall lengths where wardrobes will be fitted' },
  doors_windows: { label: 'Doors & Windows', placeholder: 'Position and size of doors/windows in the room' },
  obstacles: { label: 'Obstacles', placeholder: 'Radiators, sockets, pipes, light switches, etc.' },
  materials: { label: 'Materials', placeholder: 'Frame material, internal fittings required' },
  finish: { label: 'Finish', placeholder: 'Door finish, colour, handle style' },
  access_notes: { label: 'Access Notes', placeholder: 'Parking, stairs, narrow hallways, etc.' },
  install_conditions: { label: 'Install Conditions', placeholder: 'Floor type, wall condition, any prep needed' },
  video_recording_url: { label: 'Video Recording URL', placeholder: 'https://...' },
  notes: { label: 'Additional Notes', placeholder: 'Anything else the team should know' },
}

export default function OnboardingPage() {
  const { id: opportunityId } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const { data: onboarding, isLoading: loadingOnboarding, refetch } = useOnboarding(opportunityId)
  const { data: opportunity } = useOpportunity(opportunityId)

  const [uploading, setUploading] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<OnboardingForm>()

  // Populate form when onboarding data loads
  useEffect(() => {
    if (onboarding) {
      reset({
        room_dimensions: onboarding.room_dimensions ?? '',
        ceiling_height: onboarding.ceiling_height ?? '',
        wall_measurements: onboarding.wall_measurements ?? '',
        doors_windows: onboarding.doors_windows ?? '',
        obstacles: onboarding.obstacles ?? '',
        materials: onboarding.materials ?? '',
        finish: onboarding.finish ?? '',
        access_notes: onboarding.access_notes ?? '',
        install_conditions: onboarding.install_conditions ?? '',
        video_recording_url: onboarding.video_recording_url ?? '',
        notes: onboarding.notes ?? '',
      })
      setMediaFiles(onboarding.media_files ?? [])
    }
  }, [onboarding, reset])

  async function onSave(data: OnboardingForm) {
    setSaving(true)
    try {
      if (onboarding) {
        // Update existing
        const { error } = await supabase
          .from('onboardings')
          .update({ ...data, media_files: mediaFiles })
          .eq('id', onboarding.id)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('onboardings')
          .insert({
            opportunity_id: opportunityId,
            ...data,
            media_files: mediaFiles,
            status: 'pending',
          })

        if (error) throw error
      }

      toast.success('Onboarding saved')
      refetch()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkComplete() {
    if (!onboarding) return

    const { error } = await supabase
      .from('onboardings')
      .update({ status: 'completed' })
      .eq('id', onboarding.id)

    if (error) {
      toast.error(error.message)
      return
    }

    // Also update opportunity stage
    const { error: oppError } = await supabase
      .from('opportunities')
      .update({ stage: 'onboarding_complete', onboarding_completed_at: new Date().toISOString() })
      .eq('id', opportunityId)

    if (oppError) {
      toast.error(oppError.message)
      return
    }

    toast.success('Onboarding marked as complete')
    refetch()
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return

    setUploading(true)
    const newUrls: string[] = []

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `onboarding/${opportunityId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('onboarding-files')
        .upload(path, file)

      if (error) {
        toast.error(`Failed to upload ${file.name}`)
        continue
      }

      const { data: urlData } = supabase.storage
        .from('onboarding-files')
        .getPublicUrl(path)

      newUrls.push(urlData.publicUrl)
    }

    setMediaFiles((prev) => [...prev, ...newUrls])
    setUploading(false)
    e.target.value = ''
  }

  function removeFile(url: string) {
    setMediaFiles((prev) => prev.filter((f) => f !== url))
  }

  if (loadingOnboarding) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-[var(--warm-100)] rounded animate-pulse" />
        <div className="h-96 bg-[var(--warm-50)] rounded-xl animate-pulse" />
      </div>
    )
  }

  const isComplete = onboarding?.status === 'completed' || onboarding?.status === 'verified'

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-[var(--warm-400)] hover:text-[var(--warm-600)] transition-colors mb-3"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-semibold text-[var(--warm-900)]">
              Onboarding
            </h1>
            {opportunity?.lead && (
              <p className="text-sm text-[var(--warm-500)] mt-0.5">
                {(opportunity.lead as any).name}
              </p>
            )}
          </div>
          {onboarding && (
            <span className={`
              px-3 py-1 rounded-full text-xs font-medium capitalize
              ${onboarding.status === 'completed' || onboarding.status === 'verified'
                ? 'bg-emerald-50 text-emerald-700'
                : onboarding.status === 'scheduled'
                ? 'bg-purple-50 text-purple-700'
                : 'bg-amber-50 text-amber-700'
              }
            `}>
              {onboarding.status}
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSave)}>
        {/* Sections */}
        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.id} className="bg-white rounded-xl border border-[var(--warm-100)] shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 bg-[var(--warm-50)] border-b border-[var(--warm-100)]">
                <section.icon size={16} className="text-[var(--warm-500)]" />
                <h3 className="text-sm font-semibold text-[var(--warm-700)]">{section.label}</h3>
              </div>
              <div className="p-5 space-y-4">
                {section.fields.map((field) => {
                  const config = FIELD_LABELS[field]
                  return (
                    <div key={field}>
                      <label className="block text-xs font-medium text-[var(--warm-500)] mb-1">
                        {config.label}
                      </label>
                      <textarea
                        {...register(field as keyof OnboardingForm)}
                        placeholder={config.placeholder}
                        rows={2}
                        disabled={isComplete}
                        className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-lg
                          focus:border-[var(--green-500)] focus:ring-2 focus:ring-[var(--green-100)] focus:outline-none
                          placeholder:text-[var(--warm-300)] text-[var(--warm-800)] resize-none
                          disabled:bg-[var(--warm-50)] disabled:text-[var(--warm-500)]"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Media files */}
          <div className="bg-white rounded-xl border border-[var(--warm-100)] shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-[var(--warm-50)] border-b border-[var(--warm-100)]">
              <FileImage size={16} className="text-[var(--warm-500)]" />
              <h3 className="text-sm font-semibold text-[var(--warm-700)]">Photos & Files</h3>
            </div>
            <div className="p-5">
              {/* Upload area */}
              {!isComplete && (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--warm-200)] rounded-xl cursor-pointer hover:border-[var(--green-500)] hover:bg-[var(--green-50)] transition-all mb-4">
                  <Upload size={24} className="text-[var(--warm-300)] mb-2" />
                  <span className="text-sm text-[var(--warm-500)]">
                    {uploading ? 'Uploading...' : 'Click or drag files to upload'}
                  </span>
                  <span className="text-xs text-[var(--warm-300)] mt-1">Photos, measurements, documents</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}

              {/* File list */}
              {mediaFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {mediaFiles.map((url, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-[var(--warm-100)]">
                      {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img src={url} alt="" className="w-full h-24 object-cover" />
                      ) : (
                        <div className="w-full h-24 bg-[var(--warm-50)] flex items-center justify-center">
                          <FileImage size={24} className="text-[var(--warm-300)]" />
                        </div>
                      )}
                      {!isComplete && (
                        <button
                          type="button"
                          onClick={() => removeFile(url)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Video + Notes */}
          <div className="bg-white rounded-xl border border-[var(--warm-100)] shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-[var(--warm-50)] border-b border-[var(--warm-100)]">
              <Video size={16} className="text-[var(--warm-500)]" />
              <h3 className="text-sm font-semibold text-[var(--warm-700)]">Video & Notes</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--warm-500)] mb-1">Video Recording URL</label>
                <input
                  {...register('video_recording_url')}
                  type="url"
                  placeholder="https://..."
                  disabled={isComplete}
                  className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-lg
                    focus:border-[var(--green-500)] focus:outline-none
                    placeholder:text-[var(--warm-300)] disabled:bg-[var(--warm-50)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--warm-500)] mb-1">Additional Notes</label>
                <textarea
                  {...register('notes')}
                  rows={4}
                  placeholder="Anything else the team should know"
                  disabled={isComplete}
                  className="w-full px-3 py-2 text-sm border border-[var(--warm-200)] rounded-lg
                    focus:border-[var(--green-500)] focus:outline-none resize-none
                    placeholder:text-[var(--warm-300)] disabled:bg-[var(--warm-50)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {!isComplete && (
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--green-700)] hover:bg-[var(--green-900)] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save'}
            </button>

            {onboarding && onboarding.status !== 'completed' && (
              <button
                type="button"
                onClick={handleMarkComplete}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <CheckCircle size={14} />
                Mark Complete
              </button>
            )}
          </div>
        )}

        {isComplete && (
          <div className="flex items-center gap-2 mt-6 p-4 bg-emerald-50 rounded-xl text-sm text-emerald-700">
            <CheckCircle size={16} />
            Onboarding is complete. Production stage is now unlocked.
          </div>
        )}
      </form>
    </div>
  )
}
