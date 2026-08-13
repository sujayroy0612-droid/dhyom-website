export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-black-plum pt-20">
      <div className="max-w-6xl mx-auto px-6 py-14 lg:py-20">

        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-3 mb-10 flex-wrap">
          {[10, 2, 16, 2, 24, 2, 32].map((w, i) => (
            <div
              key={i}
              className="h-2 bg-[rgba(196,163,115,0.08)] rounded animate-pulse"
              style={{ width: `${w * 4}px` }}
            />
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">
          {/* Image skeleton */}
          <div className="w-full lg:w-1/2 flex-shrink-0">
            <div className="aspect-square bg-[rgba(196,163,115,0.05)] rounded-[6px] border border-[rgba(196,163,115,0.08)] animate-pulse" />
          </div>

          {/* Info skeleton */}
          <div className="w-full lg:w-1/2 flex flex-col gap-6">
            <div className="h-2 w-28 bg-[rgba(196,163,115,0.08)] rounded animate-pulse" />
            <div className="flex flex-col gap-2">
              <div className="h-8 w-4/5 bg-[rgba(196,163,115,0.08)] rounded animate-pulse" />
              <div className="h-8 w-3/5 bg-[rgba(196,163,115,0.07)] rounded animate-pulse" />
            </div>
            <div className="w-10 h-px bg-[rgba(196,163,115,0.12)]" />
            <div className="h-6 w-20 bg-[rgba(196,163,115,0.10)] rounded animate-pulse" />
            <div className="flex flex-col gap-2">
              <div className="h-4 w-full bg-[rgba(196,163,115,0.06)] rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-[rgba(196,163,115,0.05)] rounded animate-pulse" />
              <div className="h-4 w-4/5 bg-[rgba(196,163,115,0.05)] rounded animate-pulse" />
            </div>
            <div className="w-full h-px bg-[rgba(196,163,115,0.08)]" />
            <div className="flex flex-col gap-4">
              <div className="h-2 w-16 bg-[rgba(196,163,115,0.08)] rounded animate-pulse" />
              <div className="h-10 w-28 bg-[rgba(196,163,115,0.08)] rounded animate-pulse" />
              <div className="h-10 w-44 bg-[rgba(196,163,115,0.08)] rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
