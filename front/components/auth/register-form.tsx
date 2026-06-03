"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
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
import { registerSchema } from "@/lib/auth/schemas";
import { registerRequest } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { z } from "zod";

type Form = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPass, setShowPass] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: Form) {
    setApiError(null);
    try {
      const { token, user } = await registerRequest(values.email, values.password, values.name);
      setSession(token, user);
      router.replace("/chat");
      router.refresh();
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setApiError(msg ?? "No se pudo crear la cuenta");
    }
  }

  return (
    <div className={AUTH_CARD}>
      <div className="mb-8">
        <h2 className={AUTH_TITLE}>Crea tu cuenta</h2>
        <p className={AUTH_SUBTITLE}>Únete a TalkApp en segundos</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label className={AUTH_LABEL}>Nombre</label>
          <div className="relative">
            <User className={AUTH_INPUT_ICON} />
            <input
              type="text"
              autoComplete="name"
              placeholder="Tu nombre"
              className={cn(AUTH_INPUT, "pl-10 pr-3", errors.name && "border-red-500/50 ring-red-500/30")}
              {...register("name")}
            />
          </div>
          {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>}
        </div>

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
          <label className={AUTH_LABEL}>Confirmar contraseña</label>
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
          {isSubmitting ? (
            "Creando cuenta…"
          ) : (
            <span className="inline-flex items-center gap-2">
              Registrarme
              <ArrowRight className="size-4" />
            </span>
          )}
        </Button>
      </form>

      <p className={AUTH_FOOTER}>
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className={AUTH_LINK}>
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
