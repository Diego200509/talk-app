"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Mail } from "lucide-react";
import {
  AUTH_CARD,
  AUTH_ERROR,
  AUTH_INPUT,
  AUTH_INPUT_ICON,
  AUTH_LABEL,
  AUTH_LINK,
  AUTH_LINK_MUTED,
  AUTH_SUBMIT_BTN,
  AUTH_SUBTITLE,
  AUTH_SUCCESS,
  AUTH_TITLE,
} from "@/components/auth/auth-form.styles";
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
    <div className={AUTH_CARD}>
      <div className="mb-8">
        <h2 className={AUTH_TITLE}>Recuperar cuenta</h2>
        <p className={AUTH_SUBTITLE}>Te enviamos un enlace si el correo está registrado.</p>
      </div>

      {done ? (
        <div className="space-y-6">
          <p className={AUTH_SUCCESS}>
            Revisa tu bandeja (y spam). El enlace caduca en 1 hora.
          </p>
          <Link href="/login" className={cn("inline-flex items-center gap-2", AUTH_LINK)}>
            <ArrowLeft className="size-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label className={AUTH_LABEL}>Correo electrónico</label>
            <div className="relative">
              <Mail className={AUTH_INPUT_ICON} />
              <input
                type="email"
                autoComplete="email"
                placeholder="nombre@ejemplo.com"
                className={cn(
                  AUTH_INPUT,
                  "pl-10 pr-3",
                  errors.email && "border-red-500/50 ring-red-500/30"
                )}
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {apiError ? <p className={AUTH_ERROR}>{apiError}</p> : null}

          <Button type="submit" disabled={isSubmitting} className={cn(AUTH_SUBMIT_BTN)}>
            {isSubmitting ? "Enviando…" : "Enviar enlace"}
          </Button>

          <Link href="/login" className={cn("flex items-center justify-center gap-2", AUTH_LINK_MUTED)}>
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </form>
      )}
    </div>
  );
}
