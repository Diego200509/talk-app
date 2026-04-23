"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logoutRequest } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

type Props = {
  /** Cabecera a todo el ancho (p. ej. vista de chat). */
  wide?: boolean;
};

export function HomeToolbar({ wide }: Props) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  async function logout() {
    try {
      if (token) await logoutRequest();
    } catch {
      /* si el token ya está invalidado, igual limpiamos sesión local */
    }
    router.replace("/login");
    clearSession();
    router.refresh();
  }

  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4 border-b border-zinc-200 py-3.5 dark:border-zinc-800",
        wide ? "w-full px-4 sm:px-6" : "w-full max-w-3xl"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">TalkApp</span>
        {wide && (
          <span className="hidden text-xs font-medium text-zinc-400 sm:inline dark:text-zinc-500">
            Chats
          </span>
        )}
      </div>
      <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 text-sm">
        {user ? (
          <>
            <span className="hidden max-w-[200px] truncate text-zinc-600 sm:inline dark:text-zinc-400">
              {user.email}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full border border-zinc-300 px-3 py-1.5 font-medium text-zinc-800 hover:bg-zinc-100 sm:px-4 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-full border border-zinc-300 px-3 py-1.5 font-medium text-zinc-800 hover:bg-zinc-100 sm:px-4 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="rounded-full bg-violet-600 px-3 py-1.5 font-medium text-white hover:bg-violet-500 sm:px-4"
            >
              Registrarse
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
