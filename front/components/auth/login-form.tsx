"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import {
  AUTH_CARD,
  AUTH_ERROR,
  AUTH_FOOTER,
  AUTH_INPUT,
  AUTH_INPUT_ICON,
  AUTH_LABEL,
  AUTH_LINK,
  AUTH_SUBMIT_BTN,
  AUTH_SUBTITLE,
  AUTH_TITLE,
  AUTH_TOGGLE_PASS,
} from "@/components/auth/auth-form.styles";
import { loginSchema } from "@/lib/auth/schemas";
import { loginRequest } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { z } from "zod";

type Form = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPass, setShowPass] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: Form) {
    setApiError(null);
    try {
      const { token, user } = await loginRequest(values.email, values.password);
      setSession(token, user);
      router.replace("/chat");
      router.refresh();
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setApiError(msg ?? "No se pudo iniciar sesión");
    }
  }

  return (
    <div className={AUTH_CARD}>
      <div className="mb-8">
        <h2 className={AUTH_TITLE}>Bienvenido de vuelta</h2>
        <p className={AUTH_SUBTITLE}>Inicia sesión en tu cuenta</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label className={AUTH_LABEL}>Correo electrónico</label>
          <div className="relative">
            <Mail className={AUTH_INPUT_ICON} />
            <input
              type="email"
              autoComplete="email"
              placeholder="nombre@ejemplo.com"
              className={cn(AUTH_INPUT, "pl-10 pr-3", errors.email && "border-red-500/50 ring-red-500/30")}
              {...register("email")}
            />
          </div>
          {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className={cn(AUTH_LABEL, "mb-0")}>Contraseña</label>
            <Link href="/recuperar" className={cn("text-xs", AUTH_LINK)}>
              ¿Olvidaste?
            </Link>
          </div>
          <div className="relative">
            <Lock className={AUTH_INPUT_ICON} />
            <input
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Tu contraseña segura"
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

        {apiError ? <p className={AUTH_ERROR}>{apiError}</p> : null}

        <Button type="submit" disabled={isSubmitting} className={cn(AUTH_SUBMIT_BTN)}>
          {isSubmitting ? (
            "Entrando…"
          ) : (
            <span className="inline-flex items-center gap-2">
              Iniciar sesión
              <ArrowRight className="size-4" />
            </span>
          )}
        </Button>
      </form>

      <p className={AUTH_FOOTER}>
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className={AUTH_LINK}>
          Regístrate gratis
        </Link>
      </p>
    </div>
  );
}
