export default function PipelineLoading() {
  return (
    <div className="animate-pulse space-y-5">
      {/* Header */}
      <div>
        <div className="h-7 w-24 bg-[var(--warm-100)] rounded-lg" />
        <div className="h-3 w-64 bg-[var(--warm-50)] rounded mt-2" />
      </div>

      {/* Stats bar */}
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] p-5">
        <div className="flex items-center gap-8">
          <div className="space-y-1.5">
            <div className="h-2.5 w-20 bg-[var(--warm-50)] rounded shimmer" />
            <div className="h-7 w-28 bg-[var(--warm-100)] rounded shimmer" />
          </div>
          <div className="w-px h-10 bg-[var(--warm-100)]" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--warm-100)] rounded-lg shimmer" />
              <div className="space-y-1">
                <div className="h-4 w-6 bg-[var(--warm-100)] rounded shimmer" />
                <div className="h-2.5 w-10 bg-[var(--warm-50)] rounded shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Columns */}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, col) => (
          <div key={col} className="flex-shrink-0 w-[280px]">
            {/* Column header */}
            <div className="px-3.5 py-3 rounded-t-2xl bg-[var(--warm-50)] border border-b-0 border-[var(--warm-100)]">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--warm-200)] shimmer" />
                  <div className="h-3 w-20 bg-[var(--warm-100)] rounded shimmer" />
                </div>
                <div className="w-6 h-6 bg-[var(--warm-100)] rounded-full shimmer" />
              </div>
            </div>
            {/* Cards */}
            <div className="rounded-b-2xl border border-t-0 border-[var(--warm-100)] bg-[var(--warm-50)]/50 p-2 space-y-2 min-h-[200px]">
              {Array.from({ length: col < 3 ? 2 : 1 }).map((_, card) => (
                <div key={card} className="bg-white rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden relative">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--warm-100)]" />
                  <div className="pl-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-[var(--warm-100)] rounded-full shimmer" />
                      <div className="h-3.5 bg-[var(--warm-100)] rounded w-24 shimmer" />
                    </div>
                    <div className="h-2.5 bg-[var(--warm-50)] rounded w-16 mb-3 ml-8 shimmer" />
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--warm-50)]">
                      <div className="h-3 bg-[var(--warm-100)] rounded w-14 shimmer" />
                      <div className="w-6 h-6 bg-[var(--warm-100)] rounded-full shimmer" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
