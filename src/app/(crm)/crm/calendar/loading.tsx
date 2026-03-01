export default function CalendarLoading() {
  return (
    <div className="animate-pulse space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="h-7 w-24 bg-[var(--warm-100)] rounded-lg" />
          <div className="h-3 w-40 bg-[var(--warm-50)] rounded mt-2" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 bg-[var(--warm-100)] rounded-xl shimmer" />
          <div className="h-10 w-44 bg-[var(--warm-100)] rounded-xl shimmer" />
          <div className="h-10 w-16 bg-[var(--warm-100)] rounded-xl shimmer" />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-[var(--warm-100)] overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--warm-100)]">
          <div className="p-2" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="p-3 text-center border-l border-[var(--warm-50)]">
              <div className="h-2.5 w-8 bg-[var(--warm-100)] rounded mx-auto mb-1 shimmer" />
              <div className="h-5 w-5 bg-[var(--warm-100)] rounded mx-auto shimmer" />
            </div>
          ))}
        </div>

        {/* Time rows */}
        {Array.from({ length: 8 }).map((_, hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--warm-50)] min-h-[64px]">
            <div className="p-2 text-right pr-3">
              <div className="h-2.5 w-8 bg-[var(--warm-50)] rounded ml-auto shimmer" />
            </div>
            {Array.from({ length: 7 }).map((_, day) => (
              <div key={day} className="border-l border-[var(--warm-50)] p-1 min-h-[64px]">
                {hour % 3 === 0 && day % 2 === 0 && (
                  <div className="h-8 bg-[var(--warm-50)] rounded-lg shimmer" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
