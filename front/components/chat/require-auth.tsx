"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

type Props = { children: React.ReactNode };

/** Mismo fondo que login/chat para evitar flash blanco entre rutas. */
const shellBg = "min-h-dvh w-full bg-[#0B0B0F]";

export function RequireAuth({ children }: Props) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const persistApi = (useAuthStore as typeof useAuthStore & {
      persist?: {
        hasHydrated?: () => boolean;
        onFinishHydration?: (callback: () => void) => () => void;
      };
    }).persist;

    if (!persistApi) {
      const task = setTimeout(() => setReady(true), 0);
      return () => clearTimeout(task);
    }

    if (persistApi.hasHydrated?.()) {
      const task = setTimeout(() => setReady(true), 0);
      return () => clearTimeout(task);
    }

    const unsubscribe = persistApi.onFinishHydration?.(() => setReady(true));
    return () => {
      unsubscribe?.();
    };
  }, []);

  useLayoutEffect(() => {
    if (ready && !token) {
      router.replace("/login");
    }
  }, [ready, token, router]);

  if (!ready) {
    return (
      <div className={`flex items-center justify-center text-sm text-zinc-600 ${shellBg}`}>
        Cargando…
      </div>
    );
  }

  if (!token) {
    return <div className={shellBg} aria-hidden />;
  }

  return <>{children}</>;
}
