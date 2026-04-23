import { Suspense } from "react";
import { ResetInner } from "./reset-inner";

export default function RestablecerPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-white/10 bg-[#121217] px-6 py-10 text-center text-sm text-zinc-400">
          Cargando…
        </div>
      }
    >
      <ResetInner />
    </Suspense>
  );
}
