// Shown automatically by Next.js App Router while the async page fetches from Supabase.
export default function CategoryLoading() {
  return (
    <div className="min-h-screen">

      {/* Header skeleton */}
      <section className="bg-damson pt-28 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-8">
            <div className="h-2 w-10 rounded-full bg-[rgba(196,163,115,0.12)] animate-pulse" />
            <div className="h-2 w-2 rounded-full bg-[rgba(196,163,115,0.08)]" />
            <div className="h-2 w-8 rounded-full bg-[rgba(196,163,115,0.12)] animate-pulse" />
            <div className="h-2 w-2 rounded-full bg-[rgba(196,163,115,0.08)]" />
            <div className="h-2 w-24 rounded-full bg-[rgba(196,163,115,0.20)] animate-pulse" />
          </div>
          {/* Title */}
          <div className="h-10 w-64 rounded bg-[rgba(245,237,224,0.07)] animate-pulse mb-4" />
          <div className="w-10 h-px bg-[rgba(196,163,115,0.20)] mb-5" />
          {/* Description */}
          <div className="h-4 w-96 max-w-full rounded bg-[rgba(245,237,224,0.05)] animate-pulse mb-2" />
          <div className="h-4 w-72 max-w-full rounded bg-[rgba(245,237,224,0.04)] animate-pulse" />
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[rgba(196,163,115,0.20)] to-transparent" />
      </div>

      {/* Grid skeleton */}
      <section className="bg-black-plum py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-damson border border-[rgba(196,163,115,0.10)] rounded-[6px] overflow-hidden"
              >
                {/* Image placeholder */}
                <div className="aspect-square bg-[rgba(255,255,255,0.03)] animate-pulse" />
                {/* Body */}
                <div className="p-5 flex flex-col gap-3">
                  <div className="h-2 w-24 rounded-full bg-[rgba(196,163,115,0.14)] animate-pulse" />
                  <div className="h-4 w-40 rounded bg-[rgba(245,237,224,0.08)] animate-pulse" />
                  <div className="h-3 w-full rounded bg-[rgba(245,237,224,0.05)] animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-[rgba(245,237,224,0.04)] animate-pulse" />
                  <div className="flex items-center justify-between mt-2 pt-3 border-t border-[rgba(196,163,115,0.08)]">
                    <div className="h-5 w-16 rounded bg-[rgba(196,163,115,0.14)] animate-pulse" />
                    <div className="h-8 w-24 rounded-[3px] border border-[rgba(196,163,115,0.14)] animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
