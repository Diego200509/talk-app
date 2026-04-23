"use client";

import { useState } from "react";
import { LogOut, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { logoutRequest } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import { RequireAuth } from "@/components/chat/require-auth";
import { cn } from "@/lib/utils";

type Thread = { id: string; title: string; preview: string; time: string; unread?: number };

const DEMO_MSG = "Hola esto es un chat de ejemplo";
const DEMO_REPLY = "Hola, ¿qué tal?";

const PLACEHOLDER_THREADS: Thread[] = [
  { id: "1", title: "Ana García", preview: DEMO_MSG, time: "14:32", unread: 1 },
  { id: "2", title: "Carlos Ruiz", preview: DEMO_MSG, time: "Ayer" },
  { id: "3", title: "Laura Martín", preview: DEMO_MSG, time: "Lun" },
];

const HEADER_H = "min-h-[56px] md:min-h-[60px]";

function ChatUserStrip() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  async function logout() {
    try {
      if (token) await logoutRequest();
    } catch {
      /* ignorar */
    }
    router.replace("/login");
    clearSession();
    router.refresh();
  }

  const displayName =
    user?.name?.trim() ||
    (user?.email ? user.email.split("@")[0]?.replace(/\./g, " ") : "") ||
    "Usuario";
  const initial = displayName.charAt(0).toUpperCase() || "?";

  return (
    <div className="flex w-full items-center gap-3 border-white/10 bg-[#14141c] px-3 py-2.5 md:border-r">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-bold text-white"
        aria-hidden
      >
        {initial}
      </div>
      <div className="flex min-h-[40px] min-w-0 flex-1 items-center justify-between gap-3">
        <div className="min-w-0 flex-1 py-0.5">
          <p className="text-[10px] font-semibold uppercase leading-none tracking-wide text-zinc-500">
            Tu cuenta
          </p>
          <p className="mt-1 truncate text-sm font-medium leading-tight text-zinc-100">{displayName}</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex shrink-0 items-center gap-1.5 self-center rounded-lg border border-white/10 bg-white/[0.07] px-2.5 py-1.5 text-[11px] font-medium leading-none text-zinc-200 shadow-sm transition-colors hover:border-violet-500/45 hover:bg-violet-500/15 hover:text-white"
        >
          <LogOut className="size-3.5 shrink-0 opacity-85" aria-hidden />
          <span className="hidden sm:inline">Cerrar sesión</span>
          <span className="sm:hidden">Salir</span>
        </button>
      </div>
    </div>
  );
}

function MessageComposer() {
  return (
    <div className="flex min-h-[52px] w-full flex-1 items-end gap-2 bg-[#14141c] p-2 md:min-h-[56px] md:p-2.5">
      <div className="flex min-h-[44px] w-full flex-1 items-end gap-2 rounded-2xl border border-white/10 bg-[#0B0B0F] px-3 py-1.5 ring-violet-500/20 focus-within:border-violet-500/40 focus-within:ring-1">
        <textarea
          readOnly
          rows={1}
          placeholder="Escribe un mensaje…"
          className="max-h-32 min-h-[36px] w-full resize-none bg-transparent py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
          aria-label="Mensaje"
        />
        <button
          type="button"
          disabled
          className="mb-0.5 shrink-0 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white opacity-50"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}

function TalkAppBrand() {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-white/10 bg-[#121217] px-3 py-2.5 sm:px-4",
        HEADER_H
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-600/90 text-sm font-bold text-white shadow-lg shadow-violet-900/30">
        T
      </div>
      <div className="min-w-0 leading-tight">
        <h1 className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">TalkApp</h1>
        <p className="truncate text-xs text-zinc-500">Chats</p>
      </div>
    </div>
  );
}

export function ChatShell() {
  const [activeId, setActiveId] = useState<string | null>(PLACEHOLDER_THREADS[0]?.id ?? null);
  const active = PLACEHOLDER_THREADS.find((t) => t.id === activeId) ?? null;

  return (
    <RequireAuth>
      <div className="flex h-[100dvh] max-h-[100dvh] flex-col bg-[#0B0B0F] text-zinc-100">
        {/* Fila superior: logo (columna bandeja) + cabecera del chat al mismo nivel — sin buscador */}
        <div className="grid shrink-0 grid-cols-1 border-b border-white/10 md:grid-cols-[380px_minmax(0,1fr)]">
          <TalkAppBrand />
          <div
            className={cn(
              "flex items-center gap-3 border-t border-white/10 bg-[#121217] px-3 sm:px-4 md:border-t-0 md:border-l md:border-white/10",
              HEADER_H
            )}
          >
            {active ? (
              <>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white">
                  {active.title.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-zinc-100">{active.title}</h2>
                  <p className="truncate text-xs text-zinc-500">En línea</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">Selecciona una conversación</p>
            )}
          </div>
        </div>

        {/* Cuerpo: bandeja | mensajes */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          <aside
            className={cn(
              "flex min-h-0 w-full shrink-0 flex-col border-white/10 bg-[#121217] md:w-[380px] md:border-r",
              "max-md:h-[min(36vh,260px)] max-md:border-b"
            )}
          >
            <div className="shrink-0 border-b border-white/10 px-4 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Conversaciones</p>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain" role="list">
              {PLACEHOLDER_THREADS.map((t) => {
                const isActive = t.id === activeId;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(t.id)}
                      className={cn(
                        "flex w-full gap-3 border-b border-white/5 px-3 py-3 text-left transition-colors sm:px-4",
                        isActive ? "bg-violet-950/50" : "hover:bg-white/[0.04]"
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                          isActive ? "bg-violet-600" : "bg-zinc-600"
                        )}
                        aria-hidden
                      >
                        {t.title.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={cn(
                              "truncate font-medium",
                              isActive ? "text-violet-200" : "text-zinc-100"
                            )}
                          >
                            {t.title}
                          </span>
                          <span className="shrink-0 text-[11px] text-zinc-500">{t.time}</span>
                        </div>
                        <p className="truncate text-sm text-zinc-500">{t.preview}</p>
                      </div>
                      {t.unread ? (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                          {t.unread}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#0B0B0F]">
            {active ? (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#0c0c10] p-3 sm:p-4">
                <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
                  <div className="self-start max-w-[88%] rounded-2xl rounded-tl-md border border-white/10 bg-[#1a1a22] px-3.5 py-2 text-sm leading-relaxed text-zinc-100 shadow-sm">
                    {DEMO_MSG}
                  </div>
                  <div className="self-end max-w-[88%] rounded-2xl rounded-tr-md bg-gradient-to-br from-violet-600 to-fuchsia-600 px-3.5 py-2 text-sm leading-relaxed text-white shadow-md">
                    {DEMO_REPLY}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-[#0c0c10] px-6 text-center">
                <MessageCircle className="size-12 text-zinc-600" strokeWidth={1.25} />
                <p className="max-w-xs text-sm text-zinc-500">Selecciona un chat</p>
              </div>
            )}
          </section>
        </div>

        <footer className="flex shrink-0 flex-col border-t border-white/10 bg-[#0f0f14] md:flex-row md:items-center">
          <div className="flex w-full shrink-0 md:w-[380px] md:max-w-[380px]">
            <ChatUserStrip />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 border-t border-white/10 md:border-t-0 md:border-l md:border-white/10">
            <MessageComposer />
          </div>
        </footer>
      </div>
    </RequireAuth>
  );
}
