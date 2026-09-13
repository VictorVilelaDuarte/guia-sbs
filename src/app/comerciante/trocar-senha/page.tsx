import { redirect } from "next/navigation"
import { MapPin } from "lucide-react"
import { auth, signOut } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TrocarSenhaForm } from "./trocar-senha-form"

// Fora do route group (painel) de propósito: o layout do painel redireciona
// para cá quando `trocarSenha` está ligado — dentro dele, o redirect cairia em loop.
export default async function TrocarSenhaPage() {
  const session = await auth()
  if (!session) redirect("/admin/login")
  if (session.user.role !== "COMERCIANTE") redirect("/admin")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { trocarSenha: true, name: true },
  })
  if (!user) redirect("/admin/login")

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <MapPin className="h-4 w-4" />
          </div>
          <span className="font-semibold">Guia SBS</span>
        </div>

        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10 space-y-4">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">
              {user.trocarSenha ? `Olá, ${user.name.split(" ")[0]}! Crie sua senha` : "Alterar senha"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {user.trocarSenha
                ? "Você entrou com uma senha temporária. Para continuar, defina uma senha só sua."
                : "Informe a senha atual e a nova senha."}
            </p>
          </div>
          <TrocarSenhaForm obrigatoria={user.trocarSenha} />
        </div>

        <form
          className="text-center"
          action={async () => {
            "use server"
            await signOut({ redirectTo: "/admin/login" })
          }}
        >
          <button type="submit" className="text-sm text-muted-foreground hover:underline">
            Sair
          </button>
        </form>
      </div>
    </div>
  )
}
