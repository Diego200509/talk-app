import { Outfit } from "next/font/google";
import { TalkAppLogo } from "@/components/auth/talk-app-logo";

const taglineFont = Outfit({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

type Props = { children: React.ReactNode };

export function AuthShell({ children }: Props) {
  return (
    <div className="talk-auth-shell flex min-h-screen flex-col bg-[var(--talk-auth-bg)] text-[var(--talk-text)] lg:flex-row">
      <aside className="talk-auth-aside relative flex flex-col justify-center gap-6 px-10 py-14 lg:w-[44%] lg:min-h-screen lg:py-20">
        <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(168,85,247,0.35),transparent_50%)] dark:opacity-40" />
        <div className="relative z-10 flex w-full flex-col items-center px-2 text-center lg:px-4">
          <div className="mb-1 flex w-full justify-center lg:mb-2">
            <TalkAppLogo className="drop-shadow-[0_0_24px_rgba(168,85,247,0.4)]" />
          </div>
          <p
            className={`${taglineFont.className} mt-5 w-full max-w-md text-center text-2xl font-medium leading-snug tracking-tight text-[var(--talk-auth-tagline)] drop-shadow-[0_0_24px_rgba(232,121,249,0.35)] sm:text-3xl lg:mt-7 lg:text-4xl`}
          >
            Conecta. Habla. Colabora.
          </p>
        </div>
      </aside>

      <main className="talk-auth-main relative flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[var(--talk-auth-main-glow)]" />
        <div className="relative z-10 w-full max-w-md">{children}</div>
        <p className="relative z-10 mt-8 text-center text-xs text-[var(--talk-muted)]">
          © {new Date().getFullYear()} TalkApp
        </p>
      </main>
    </div>
  );
}
