"use client";

import { useState } from "react";
import BulkGiftingModal from "./BulkGiftingModal";

export default function BulkGiftingTrigger({ subcategory }: { subcategory: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-shrink-0 font-display text-[0.52rem] tracking-[0.18em] uppercase text-[rgba(245,237,224,0.65)] border border-[rgba(245,237,224,0.18)] hover:border-[rgba(245,237,224,0.40)] hover:text-ivory px-5 py-2.5 rounded-[3px] transition-all duration-200"
      >
        Enquire →
      </button>
      {open && <BulkGiftingModal subcategory={subcategory} onClose={() => setOpen(false)} />}
    </>
  );
}
