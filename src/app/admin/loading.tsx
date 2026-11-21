export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-pulse p-1">
      {/* Title & subtitle skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-64 bg-slate-200 rounded-md"></div>
        <div className="h-4 w-96 bg-slate-100 rounded-md"></div>
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-white border border-slate-200 p-4 space-y-3 shadow-xs">
            <div className="h-4 w-24 bg-slate-100 rounded"></div>
            <div className="h-8 w-32 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* Charts & Tables skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-72 rounded-xl bg-white border border-slate-200 p-6 shadow-xs">
          <div className="h-5 w-48 bg-slate-200 rounded mb-4"></div>
          <div className="h-48 w-full bg-slate-100 rounded"></div>
        </div>
        <div className="h-72 rounded-xl bg-white border border-slate-200 p-6 shadow-xs">
          <div className="h-5 w-48 bg-slate-200 rounded mb-4"></div>
          <div className="h-48 w-full bg-slate-100 rounded"></div>
        </div>
      </div>
    </div>
  );
}
