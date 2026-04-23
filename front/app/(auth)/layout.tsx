import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "TalkApp — Acceso",
  description: "Inicia sesión o crea tu cuenta en TalkApp",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
