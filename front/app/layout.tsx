import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { TALKAPP_LOGO_PATH } from "@/lib/brand";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-app-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-app-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "TalkApp",
  description: "Conecta. Habla. Colabora.",
  icons: {
    icon: [{ url: TALKAPP_LOGO_PATH, type: "image/png" }],
    apple: [{ url: TALKAPP_LOGO_PATH, type: "image/png" }],
    shortcut: TALKAPP_LOGO_PATH,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("talkapp-theme");var th=t==="light"?"light":"dark";document.documentElement.setAttribute("data-theme",th);document.documentElement.classList.toggle("dark",th==="dark");}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-[var(--talk-app-bg)] font-sans text-[var(--talk-text)]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
