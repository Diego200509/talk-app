import { Outfit } from "next/font/google";
import { TalkAppLogo } from "@/components/auth/talk-app-logo";

/** Sans geométrica, distinta del cuerpo (Plus Jakarta), muy legible en oscuro. */
const taglineFont = Outfit({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

type Props = { children: React.ReactNode };

export function AuthShell({ children }: Props) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0B0B0F] text-white">
      <aside className="relative flex flex-col justify-center gap-6 px-10 py-14 lg:w-[44%] lg:min-h-screen lg:py-20 bg-gradient-to-br from-[#1e0b3a] via-[#2d1250] to-[#0f0520]">
        <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(168,85,247,0.35),transparent_50%)]" />
        <div className="relative z-10 flex w-full flex-col items-center px-2 text-center lg:px-4">
          <div className="mb-1 flex w-full justify-center lg:mb-2">
            <TalkAppLogo className="drop-shadow-[0_0_24px_rgba(168,85,247,0.4)]" />
          </div>
          <p
            className={`${taglineFont.className} mt-5 w-full max-w-md text-center text-2xl font-medium leading-snug tracking-tight text-fuchsia-200 drop-shadow-[0_0_24px_rgba(232,121,249,0.35)] sm:text-3xl lg:mt-7 lg:text-4xl`}
          >
            Conecta. Habla. Colabora.
          </p>
        </div>
      </aside>

      <main
        className="relative flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8"
        style={{
          backgroundColor: "#0B0B0F",
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(147,51,234,0.12),transparent_55%)]" />
        <div className="relative z-10 w-full max-w-md">{children}</div>
        <p className="relative z-10 mt-8 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} TalkApp
        </p>
      </main>
    </div>
  );
}
