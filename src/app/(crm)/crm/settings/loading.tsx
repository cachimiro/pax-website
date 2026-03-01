export default function SettingsLoading() {
  return (
    <div className="animate-pulse space-y-5">
      {/* Header */}
      <div>
        <div className="h-7 w-24 bg-[var(--warm-100)] rounded-lg" />
        <div className="h-3 w-48 bg-[var(--warm-50)] rounded mt-2" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--warm-100)] pb-px">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-[var(--warm-100)] rounded-t-lg shimmer" />
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] p-5 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-[var(--warm-50)] last:border-0">
            <div className="w-10 h-10 bg-[var(--warm-100)] rounded-full shimmer" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 bg-[var(--warm-100)] rounded shimmer" />
              <div className="h-2.5 w-48 bg-[var(--warm-50)] rounded shimmer" />
            </div>
            <div className="h-8 w-16 bg-[var(--warm-100)] rounded-lg shimmer" />
          </div>
        ))}
      </div>
    </div>
  )
}
