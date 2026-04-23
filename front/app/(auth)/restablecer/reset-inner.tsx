"use client";

import { useSearchParams } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export function ResetInner() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  return <ResetPasswordForm token={token} />;
}
