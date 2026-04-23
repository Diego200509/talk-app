import Link from "next/link";
import { HomeToolbar } from "@/components/home-toolbar";

export default function InicioPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10 sm:px-10">
        <HomeToolbar />
        <div className="mt-16 flex flex-col gap-6">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            Inicio
          </h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            La experiencia principal de mensajería está en{" "}
            <Link href="/chat" className="font-medium text-violet-600 hover:underline dark:text-violet-400">
              /chat
            </Link>
            : bandeja a la izquierda y conversación a la derecha.
          </p>
          <Link
            href="/chat"
            className="inline-flex w-fit items-center justify-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-500"
          >
            Ir a los chats
          </Link>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            ¿Necesitas otra cuenta?{" "}
            <Link href="/login" className="font-medium text-violet-600 hover:underline dark:text-violet-400">
              Cambiar de usuario
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
