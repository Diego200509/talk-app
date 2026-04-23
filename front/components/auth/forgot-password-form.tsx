"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Mail } from "lucide-react";
import { forgotSchema } from "@/lib/auth/schemas";
import { forgotPasswordRequest } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { z } from "zod";
import { useState } from "react";

type Form = z.infer<typeof forgotSchema>;

export function ForgotPasswordForm() {
  const [done, setDone] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(forgotSchema) });

  async function onSubmit(values: Form) {
    setApiError(null);
    try {
      await forgotPasswordRequest(values.email);
      setDone(true);
    } catch {
      setApiError("No se pudo enviar la solicitud. Intenta de nuevo.");
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#121217] p-8 shadow-[0_0_48px_rgba(147,51,234,0.18)] sm:p-10">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">Recuperar cuenta</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Te enviamos un enlace si el correo está registrado.
        </p>
      </div>

      {done ? (
        <div className="space-y-6">
          <p className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
            Revisa tu bandeja (y spam). El enlace caduca en 1 hora.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300"
          >
            <ArrowLeft className="size-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                autoComplete="email"
                placeholder="nombre@ejemplo.com"
                className={cn(
                  "h-12 w-full rounded-xl border border-white/10 bg-[#1a1a22] pl-10 pr-3 text-sm text-white outline-none ring-violet-500/40 placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-2",
                  errors.email && "border-red-500/50 ring-red-500/30"
                )}
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
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
            {isSubmitting ? "Enviando…" : "Enviar enlace"}
          </Button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </form>
      )}
    </div>
  );
}
