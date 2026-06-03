"use client";

import { useSearchParams } from "next/navigation";

export function ResetOkBanner() {
  const sp = useSearchParams();
  if (sp.get("reset") !== "ok") return null;
  return (
    <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-100">
      Contraseña actualizada. Ya puedes iniciar sesión.
    </div>
  );
}
