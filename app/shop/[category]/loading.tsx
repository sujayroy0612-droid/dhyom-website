export default function CategoryLoading() {
  return (
    <div className="min-h-screen bg-black-plum">
      <div className="bg-damson pt-28 pb-14 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-2 w-10 bg-[rgba(196,163,115,0.08)] rounded animate-pulse" />
            <div className="h-2 w-2 bg-[rgba(196,163,115,0.06)] rounded animate-pulse" />
            <div className="h-2 w-20 bg-[rgba(196,163,115,0.08)] rounded animate-pulse" />
          </div>
          <div className="h-9 w-48 bg-[rgba(196,163,115,0.08)] rounded animate-pulse mb-5" />
          <div className="w-10 h-px bg-[rgba(196,163,115,0.12)]" />
        </div>
      </div>
      <div className="px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-[rgba(196,163,115,0.04)] border border-[rgba(196,163,115,0.08)] rounded-[6px] p-8 min-h-[180px] animate-pulse flex flex-col justify-between"
            >
              <div className="flex flex-col gap-3">
                <div className="h-5 w-3/4 bg-[rgba(196,163,115,0.08)] rounded" />
                <div className="h-3 w-full bg-[rgba(196,163,115,0.05)] rounded" />
                <div className="h-3 w-4/5 bg-[rgba(196,163,115,0.04)] rounded" />
              </div>
              <div className="h-2 w-12 bg-[rgba(196,163,115,0.07)] rounded mt-6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
