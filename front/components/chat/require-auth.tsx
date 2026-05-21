"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { disconnectSocket } from "@/lib/socket";

type Props = { children: React.ReactNode };

/** Mismo fondo que login/chat para evitar flash blanco entre rutas. */
const shellBg = "min-h-dvh w-full bg-[#0B0B0F]";

function waitForAuthHydration(): Promise<void> {
  return new Promise((resolve) => {
    const persistApi = (useAuthStore as typeof useAuthStore & {
      persist?: {
        hasHydrated?: () => boolean;
        onFinishHydration?: (callback: () => void) => () => void;
      };
    }).persist;

    if (!persistApi?.hasHydrated) {
      resolve();
      return;
    }
    if (persistApi.hasHydrated()) {
      resolve();
      return;
    }
    const unsub = persistApi.onFinishHydration?.(() => resolve());
    if (!unsub) resolve();
  });
}

export function RequireAuth({ children }: Props) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void waitForAuthHydration().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    if (!ready) return;
    if (!token) {
      disconnectSocket();
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
