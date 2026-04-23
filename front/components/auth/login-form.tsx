"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
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
    <div className="rounded-2xl border border-white/10 bg-[#121217] p-8 shadow-[0_0_48px_rgba(147,51,234,0.18)] sm:p-10">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">Bienvenido de vuelta</h2>
        <p className="mt-2 text-sm text-zinc-400">Inicia sesión en tu cuenta</p>
      </div>

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
          {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Contraseña
            </label>
            <Link
              href="/recuperar"
              className="text-xs font-medium text-violet-400 hover:text-violet-300"
            >
              ¿Olvidaste?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Tu contraseña segura"
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
          {isSubmitting ? "Entrando…" : (
            <span className="inline-flex items-center gap-2">
              Iniciar sesión
              <ArrowRight className="size-4" />
            </span>
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-400">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-violet-400 hover:text-violet-300">
          Regístrate gratis
        </Link>
      </p>
    </div>
  );
}
