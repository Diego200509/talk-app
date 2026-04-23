"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
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
    <div className="rounded-2xl border border-white/10 bg-[#121217] p-8 shadow-[0_0_48px_rgba(147,51,234,0.18)] sm:p-10">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">Crea tu cuenta</h2>
        <p className="mt-2 text-sm text-zinc-400">Únete a TalkApp en segundos</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Nombre
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              autoComplete="name"
              placeholder="Tu nombre"
              className={cn(
                "h-12 w-full rounded-xl border border-white/10 bg-[#1a1a22] pl-10 pr-3 text-sm text-white outline-none ring-violet-500/40 placeholder:text-zinc-600 focus:border-violet-500/50 focus:ring-2",
                errors.name && "border-red-500/50 ring-red-500/30"
              )}
              {...register("name")}
            />
          </div>
          {errors.name && <p className="mt-1.5 text-xs text-red-400">{errors.name.message}</p>}
        </div>

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
            Confirmar contraseña
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
          {isSubmitting ? "Creando cuenta…" : (
            <span className="inline-flex items-center gap-2">
              Registrarme
              <ArrowRight className="size-4" />
            </span>
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-400">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-violet-400 hover:text-violet-300">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
