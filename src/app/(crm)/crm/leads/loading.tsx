export default function LeadsLoading() {
  return (
    <div className="animate-pulse space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-20 bg-[var(--warm-100)] rounded-lg" />
          <div className="h-3 w-24 bg-[var(--warm-50)] rounded mt-2" />
        </div>
        <div className="h-10 w-28 bg-[var(--warm-100)] rounded-xl" />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 h-10 bg-[var(--warm-100)] rounded-xl shimmer" />
        <div className="h-10 w-36 bg-[var(--warm-100)] rounded-xl shimmer" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-[var(--warm-100)] bg-[var(--warm-50)]/50">
          {[80, 120, 60, 80, 60, 70].map((w, i) => (
            <div key={i} className="h-3 bg-[var(--warm-100)] rounded shimmer" style={{ width: w }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4 border-b border-[var(--warm-50)]"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 bg-[var(--warm-100)] rounded-full shimmer" />
              <div className="h-4 w-28 bg-[var(--warm-100)] rounded shimmer" />
            </div>
            <div className="h-3 w-36 bg-[var(--warm-50)] rounded shimmer hidden md:block" />
            <div className="h-3 w-16 bg-[var(--warm-50)] rounded shimmer hidden lg:block" />
            <div className="h-3 w-20 bg-[var(--warm-50)] rounded shimmer hidden lg:block" />
            <div className="h-5 w-16 bg-[var(--warm-100)] rounded-full shimmer" />
            <div className="h-3 w-16 bg-[var(--warm-50)] rounded shimmer hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
