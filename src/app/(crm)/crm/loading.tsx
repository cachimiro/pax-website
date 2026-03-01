export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-32 bg-[var(--warm-100)] rounded-lg" />
          <div className="h-3 w-56 bg-[var(--warm-50)] rounded mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-48 bg-[var(--warm-100)] rounded-lg" />
          <div className="h-9 w-9 bg-[var(--warm-100)] rounded-lg" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-[var(--warm-100)] rounded-lg shimmer" />
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[var(--warm-100)] p-4 h-24">
            <div className="w-7 h-7 bg-[var(--warm-100)] rounded-lg mb-2 shimmer" />
            <div className="h-5 w-16 bg-[var(--warm-100)] rounded mb-1 shimmer" />
            <div className="h-3 w-12 bg-[var(--warm-50)] rounded shimmer" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[var(--warm-100)] p-5 h-64 shimmer" />
        <div className="bg-white rounded-xl border border-[var(--warm-100)] p-5 h-64 shimmer" />
      </div>
    </div>
  )
}
