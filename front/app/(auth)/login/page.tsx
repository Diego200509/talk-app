import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed";
import { ResetOkBanner } from "@/components/auth/reset-ok-banner";

export default function LoginPage() {
  return (
    <>
      <RedirectIfAuthed />
      <Suspense fallback={null}>
        <ResetOkBanner />
      </Suspense>
      <LoginForm />
    </>
  );
}
