"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock } from "lucide-react";
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
  AUTH_TITLE,
  AUTH_TOGGLE_PASS,
} from "@/components/auth/auth-form.styles";
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
      <div className={cn(AUTH_CARD, "text-center")}>
        <p className={AUTH_SUBTITLE}>Enlace inválido. Solicita uno nuevo desde recuperar cuenta.</p>
        <Link href="/recuperar" className={cn("mt-4 inline-block", AUTH_LINK)}>
          Recuperar cuenta
        </Link>
      </div>
    );
  }

  return (
    <div className={AUTH_CARD}>
      <div className="mb-8">
        <h2 className={AUTH_TITLE}>Nueva contraseña</h2>
        <p className={AUTH_SUBTITLE}>Elige una contraseña segura</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label className={AUTH_LABEL}>Contraseña</label>
          <div className="relative">
            <Lock className={AUTH_INPUT_ICON} />
            <input
              type={showPass ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className={cn(
                AUTH_INPUT,
                "pl-10 pr-11",
                errors.password && "border-red-500/50 ring-red-500/30"
              )}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className={AUTH_TOGGLE_PASS}
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className={AUTH_LABEL}>Confirmar</label>
          <div className="relative">
            <Lock className={AUTH_INPUT_ICON} />
            <input
              type={showPass ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repite la contraseña"
              className={cn(
                AUTH_INPUT,
                "pl-10 pr-3",
                errors.confirm && "border-red-500/50 ring-red-500/30"
              )}
              {...register("confirm")}
            />
          </div>
          {errors.confirm && (
            <p className="mt-1.5 text-xs text-red-500">{errors.confirm.message}</p>
          )}
        </div>

        {apiError ? <p className={AUTH_ERROR}>{apiError}</p> : null}

        <Button type="submit" disabled={isSubmitting} className={cn(AUTH_SUBMIT_BTN)}>
          {isSubmitting ? "Guardando…" : "Guardar contraseña"}
        </Button>

        <Link href="/login" className={cn("block text-center", AUTH_LINK_MUTED)}>
          Volver al inicio de sesión
        </Link>
      </form>
    </div>
  );
}
