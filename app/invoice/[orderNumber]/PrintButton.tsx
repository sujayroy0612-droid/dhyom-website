"use client";

export function PrintButton({ orderNumber }: { orderNumber: string }) {
  return (
    <div className="print:hidden fixed top-0 left-0 right-0 bg-[#1a0a12] border-b border-[rgba(196,163,115,0.15)] px-6 py-3 flex items-center gap-4 z-50">
      <p className="font-mono text-[0.62rem] tracking-[0.12em] text-[rgba(196,163,115,0.45)] flex-1">
        Invoice · {orderNumber}
      </p>
      <button
        onClick={() => window.print()}
        className="text-[0.68rem] tracking-[0.12em] uppercase bg-[#C4A373] text-[#1a0a12] font-semibold px-4 py-2 rounded hover:bg-[#d4b383] transition-colors"
      >
        Print / Save PDF
      </button>
      <button
        onClick={() => window.close()}
        className="text-[0.68rem] tracking-[0.12em] uppercase text-[rgba(196,163,115,0.45)] hover:text-[#C4A373] transition-colors px-2 py-2"
      >
        Close
      </button>
    </div>
  );
}
