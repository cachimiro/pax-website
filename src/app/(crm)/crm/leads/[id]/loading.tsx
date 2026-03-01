export default function LeadDetailLoading() {
  return (
    <div className="animate-pulse space-y-5">
      {/* Back button */}
      <div className="h-4 w-28 bg-[var(--warm-100)] rounded" />

      {/* Hero header */}
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--warm-100)] shimmer" />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="h-7 w-40 bg-[var(--warm-100)] rounded-lg shimmer" />
              <div className="h-5 w-20 bg-[var(--warm-50)] rounded-full shimmer" />
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="h-4 w-16 bg-[var(--warm-100)] rounded-full shimmer" />
              <div className="h-3 w-36 bg-[var(--warm-50)] rounded shimmer" />
              <div className="h-3 w-28 bg-[var(--warm-50)] rounded shimmer" />
            </div>
          </div>
        </div>

        {/* AI insight placeholder */}
        <div className="mt-4 h-16 bg-[var(--warm-50)] rounded-xl border border-[var(--warm-100)] shimmer" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-[var(--warm-100)] rounded-lg shimmer" />
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] p-5 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[var(--warm-100)] rounded-lg shimmer" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 bg-[var(--warm-100)] rounded shimmer" />
              <div className="h-2.5 w-48 bg-[var(--warm-50)] rounded shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
