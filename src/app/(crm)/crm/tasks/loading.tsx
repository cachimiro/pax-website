export default function TasksLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-16 bg-[var(--warm-100)] rounded-lg" />
          <div className="h-3 w-28 bg-[var(--warm-50)] rounded mt-2" />
        </div>
        <div className="h-10 w-28 bg-[var(--warm-100)] rounded-xl" />
      </div>

      {/* Task sections */}
      {Array.from({ length: 3 }).map((_, section) => (
        <div key={section}>
          {/* Section header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[var(--warm-200)] shimmer" />
            <div className="h-3 w-16 bg-[var(--warm-100)] rounded shimmer" />
            <div className="h-4 w-5 bg-[var(--warm-50)] rounded-full shimmer" />
          </div>
          {/* Task rows */}
          <div className="bg-white rounded-2xl border border-[var(--warm-100)] divide-y divide-[var(--warm-50)] overflow-hidden">
            {Array.from({ length: section === 0 ? 3 : 2 }).map((_, row) => (
              <div key={row} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-5 h-5 rounded-full border-2 border-[var(--warm-200)] shimmer" />
                <div className="flex-1 space-y-1">
                  <div className="h-3.5 w-40 bg-[var(--warm-100)] rounded shimmer" />
                  <div className="h-2.5 w-56 bg-[var(--warm-50)] rounded shimmer" />
                </div>
                <div className="h-3 w-14 bg-[var(--warm-50)] rounded shimmer" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
