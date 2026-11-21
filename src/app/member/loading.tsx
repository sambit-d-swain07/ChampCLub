export default function MemberLoading() {
  return (
    <div className="space-y-8 animate-pulse max-w-5xl mx-auto p-4 sm:p-6 text-[#1B1B1B]">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-60 bg-[#EDECCF] rounded-full"></div>
        <div className="h-4 w-80 bg-[#EDECCF]/60 rounded-full"></div>
      </div>

      {/* Membership Card skeleton */}
      <div className="h-52 rounded-[28px] bg-white border border-[#1B1B1B]/15 p-8 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-6 w-36 bg-[#EDECCF] rounded-full"></div>
            <div className="h-4 w-48 bg-[#EDECCF]/70 rounded-full"></div>
          </div>
          <div className="h-10 w-24 bg-[#EDECCF] rounded-full"></div>
        </div>
        <div className="h-10 w-44 bg-[#EDECCF] rounded-full"></div>
      </div>

      {/* Quick Actions / Recent rows */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-white border border-[#1B1B1B]/15 p-5 shadow-sm space-y-2">
            <div className="h-5 w-24 bg-[#EDECCF] rounded-full"></div>
            <div className="h-3 w-40 bg-[#EDECCF]/60 rounded-full"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
