"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { MoreHorizontal, CheckCircle, XCircle, Star, StarOff } from "lucide-react"

interface Comercio {
  id: string
  nome: string
  status: string
  plan: { slug: string; nome: string }
}

export function ComerciosActions({ comercio }: { comercio: Comercio }) {
  const router = useRouter()

  async function updateComercio(data: Record<string, string>) {
    const res = await fetch(`/api/admin/comercios/${comercio.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      toast.error("Erro ao atualizar comércio.")
      return
    }
    router.refresh()
  }

  const isPremium = comercio.plan.slug === "premium"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {comercio.status !== "ATIVO" && (
          <DropdownMenuItem
            onClick={() => {
              updateComercio({ status: "ATIVO" })
              toast.success("Comércio aprovado.")
            }}
          >
            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
            Aprovar
          </DropdownMenuItem>
        )}
        {comercio.status !== "REJEITADO" && (
          <DropdownMenuItem
            onClick={() => {
              updateComercio({ status: "REJEITADO" })
              toast.success("Comércio rejeitado.")
            }}
          >
            <XCircle className="mr-2 h-4 w-4 text-red-500" />
            Rejeitar
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {!isPremium ? (
          <DropdownMenuItem
            onClick={() => {
              updateComercio({ planSlug: "premium" })
              toast.success("Plano alterado para Premium.")
            }}
          >
            <Star className="mr-2 h-4 w-4 text-yellow-500" />
            Tornar Premium
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => {
              updateComercio({ planSlug: "free" })
              toast.success("Plano alterado para Gratuito.")
            }}
          >
            <StarOff className="mr-2 h-4 w-4" />
            Remover Premium
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
