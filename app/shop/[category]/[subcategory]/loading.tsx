export default function SubcategoryLoading() {
  return (
    <div className="min-h-screen bg-black-plum">
      <div className="bg-damson pt-28 pb-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-2 w-10 bg-[rgba(196,163,115,0.08)] rounded animate-pulse" />
            <div className="h-2 w-2 bg-[rgba(196,163,115,0.06)] rounded animate-pulse" />
            <div className="h-2 w-16 bg-[rgba(196,163,115,0.07)] rounded animate-pulse" />
            <div className="h-2 w-2 bg-[rgba(196,163,115,0.06)] rounded animate-pulse" />
            <div className="h-2 w-24 bg-[rgba(196,163,115,0.08)] rounded animate-pulse" />
          </div>
          <div className="h-9 w-56 bg-[rgba(196,163,115,0.08)] rounded animate-pulse mb-5" />
          <div className="w-10 h-px bg-[rgba(196,163,115,0.12)] mb-5" />
          <div className="h-3 w-80 bg-[rgba(196,163,115,0.05)] rounded animate-pulse" />
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-[rgba(196,163,115,0.12)] to-transparent" />
      <div className="px-6 py-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[rgba(196,163,115,0.04)] border border-[rgba(196,163,115,0.08)] rounded-[6px] overflow-hidden animate-pulse">
              <div className="aspect-square bg-[rgba(196,163,115,0.05)]" />
              <div className="p-5 flex flex-col gap-3">
                <div className="h-2 w-20 bg-[rgba(196,163,115,0.07)] rounded" />
                <div className="h-4 w-4/5 bg-[rgba(196,163,115,0.08)] rounded" />
                <div className="h-3 w-full bg-[rgba(196,163,115,0.05)] rounded" />
                <div className="flex justify-between pt-3 border-t border-[rgba(196,163,115,0.07)]">
                  <div className="h-4 w-16 bg-[rgba(196,163,115,0.09)] rounded" />
                  <div className="h-4 w-10 bg-[rgba(196,163,115,0.06)] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
