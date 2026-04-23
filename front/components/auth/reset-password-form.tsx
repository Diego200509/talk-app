"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock } from "lucide-react";
import { resetSchema } from "@/lib/auth/schemas";
import { resetPasswordRequest } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { z } from "zod";

type Form = z.infer<typeof resetSchema>;

type Props = { token: string };

export function ResetPasswordForm({ token }: Props) {
  const router = useRouter();
  const clearSession = useAuthStore((s) => s.clearSession);
  const [showPass, setShowPass] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(resetSchema) });

  async function onSubmit(values: Form) {
    setApiError(null);
    try {
      await resetPasswordRequest(token, values.password);
      clearSession();
      router.replace("/login?reset=ok");
      router.refresh();
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setApiError(msg ?? "No se pudo actualizar la contraseña");
    }
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#121217] p-8 text-center shadow-[0_0_48px_rgba(147,51,234,0.18)]">
        <p className="text-sm text-zinc-400">Enlace inválido. Solicita uno nuevo desde recuperar cuenta.</p>
        <Link href="/recuperar" className="mt-4 inline-block text-sm font-medium text-violet-400 hover:text-violet-300">
          Recuperar cuenta
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#121217] p-8 shadow-[0_0_48px_rgba(147,51,234,0.18)] sm:p-10">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">Nueva contraseña</h2>
        <p className="mt-2 text-sm text-zinc-400">Elige una contraseña segura</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type={showPass ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className={cn(
                "h-12 w-full rounded-xl border border-white/10 bg-[#1a1a22] pl-10 pr-11 text-sm text-white outline-none ring-violet-500/40 placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-2",
                errors.password && "border-red-500/50 ring-red-500/30"
              )}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Confirmar
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type={showPass ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repite la contraseña"
              className={cn(
                "h-12 w-full rounded-xl border border-white/10 bg-[#1a1a22] pl-10 pr-3 text-sm text-white outline-none ring-violet-500/40 placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-2",
                errors.confirm && "border-red-500/50 ring-red-500/30"
              )}
              {...register("confirm")}
            />
          </div>
          {errors.confirm && (
            <p className="mt-1.5 text-xs text-red-400">{errors.confirm.message}</p>
          )}
        </div>

        {apiError && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {apiError}
          </p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "h-12 w-full rounded-xl border-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-base font-semibold text-white shadow-lg shadow-violet-900/40 hover:from-violet-500 hover:to-fuchsia-500"
          )}
        >
          {isSubmitting ? "Guardando…" : "Guardar contraseña"}
        </Button>

        <Link href="/login" className="block text-center text-sm text-zinc-400 hover:text-zinc-200">
          Volver al inicio de sesión
        </Link>
      </form>
    </div>
  );
}
