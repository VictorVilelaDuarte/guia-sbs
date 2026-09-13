"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, Loader2, Store } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Nome do comércio no cabeçalho do painel, virando seletor quando o usuário tem
// acesso a mais de uma loja (dono de várias lojas). Trocar leva para a entrada
// do painel: a tela atual pode não existir na outra loja (categoria, papel, plano).
export function SeletorLoja({
  lojas,
  atualId,
  nomeAtual,
}: {
  lojas: { id: string; nome: string }[]
  atualId: string
  nomeAtual: string
}) {
  const router = useRouter()
  const [trocando, setTrocando] = useState(false)

  if (lojas.length < 2) {
    return <h1 className="text-2xl font-bold truncate">{nomeAtual}</h1>
  }

  async function trocar(id: string) {
    if (id === atualId) return
    setTrocando(true)
    try {
      const res = await fetch("/api/comerciante/comercio-ativo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comercioId: id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? "Não foi possível trocar de loja.")
        setTrocando(false)
        return
      }
      router.replace("/comerciante")
      router.refresh()
    } catch {
      toast.error("Falha de conexão.")
      setTrocando(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={trocando}
        className="flex max-w-full items-center gap-2 rounded-md text-left outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Trocar de loja"
      >
        <span className="text-2xl font-bold truncate">{nomeAtual}</span>
        {trocando ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
        ) : (
          <ChevronsUpDown className="h-5 w-5 shrink-0" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Suas lojas</DropdownMenuLabel>
          {lojas.map((l) => (
            <DropdownMenuItem key={l.id} onClick={() => trocar(l.id)}>
              <Store className="mr-2 h-4 w-4" />
              <span className="flex-1 truncate">{l.nome}</span>
              {l.id === atualId && <Check className="ml-2 h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
