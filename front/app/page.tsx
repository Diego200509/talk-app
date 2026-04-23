import { redirect } from "next/navigation";

/** Entrada principal: pantalla de acceso. */
export default function Home() {
  redirect("/login");
}
