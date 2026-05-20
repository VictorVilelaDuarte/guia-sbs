"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useRef } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

export function ComerciosFiltros() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const busca = searchParams.get("q") ?? ""
  const status = searchParams.get("status") ?? "todos"
  const categoria = searchParams.get("categoria") ?? "todas"
  const temFiltros = searchParams.has("q") || searchParams.has("status") || searchParams.has("categoria")

  function pushParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "todos" && value !== "todas") {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    router.push(`?${params.toString()}`)
  }

  function handleBusca(value: string) {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => pushParams({ q: value }), 400)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Input
        placeholder="Buscar por nome..."
        defaultValue={busca}
        onChange={(e) => handleBusca(e.target.value)}
        className="h-8 w-56 border-foreground/20"
      />

      <Select value={status} onValueChange={(v) => pushParams({ status: v ?? "todos" })}>
        <SelectTrigger size="sm" className="w-36 border-foreground/20">
          <SelectValue>Todos os status</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os status</SelectItem>
          <SelectItem value="PENDENTE">Pendente</SelectItem>
          <SelectItem value="ATIVO">Ativo</SelectItem>
          <SelectItem value="INATIVO">Inativo</SelectItem>
          <SelectItem value="REJEITADO">Rejeitado</SelectItem>
        </SelectContent>
      </Select>

      <Select value={categoria} onValueChange={(v) => pushParams({ categoria: v ?? "todas" })}>
        <SelectTrigger size="sm" className="w-44 border-foreground/20">
          <SelectValue>Todas as categorias</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as categorias</SelectItem>
          <SelectItem value="RESTAURANTE">Restaurante</SelectItem>
          <SelectItem value="HOSPEDAGEM">Hospedagem</SelectItem>
          <SelectItem value="TURISMO">Turismo</SelectItem>
          <SelectItem value="SERVICO">Serviço</SelectItem>
          <SelectItem value="COMERCIO">Comércio</SelectItem>
          <SelectItem value="ENTRETENIMENTO">Entretenimento</SelectItem>
        </SelectContent>
      </Select>

      {temFiltros && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground"
          onClick={() => router.push("?")}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  )
}
