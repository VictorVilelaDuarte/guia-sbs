"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Plus, Pencil, Trash2, Loader2,
  PackageOpen, Eye, EyeOff, UtensilsCrossed, Search, X, Star, Tag,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Produto, CardapioCategoria } from "./cardapio/types"
import { displayPreco } from "./cardapio/utils"
import { ProdutoDialog } from "./cardapio/produto-dialog"

export function ProdutosManager({
  produtosIniciais,
  categoriasCardapio,
  limite,
}: {
  produtosIniciais: Produto[]
  categoriasCardapio: CardapioCategoria[]
  limite?: number
}) {
  const [produtos, setProdutos] = useState<Produto[]>(produtosIniciais)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const [busca, setBusca] = useState("")

  const atingiuLimite = limite !== undefined && produtos.length >= limite

  const produtosFiltrados = busca.trim()
    ? produtos.filter((p) => {
        const q = busca.toLowerCase()
        return (
          p.titulo.toLowerCase().includes(q) ||
          p.descricao?.toLowerCase().includes(q) ||
          p.categoriaCardapio?.nome.toLowerCase().includes(q)
        )
      })
    : produtos

  function abrirNovo() {
    if (atingiuLimite) {
      toast.warning(`Limite de ${limite} produtos atingido. Faça upgrade para o plano Premium.`)
      return
    }
    setEditando(null)
    setDialogOpen(true)
  }

  function abrirEdicao(produto: Produto) {
    setEditando(produto)
    setDialogOpen(true)
  }

  function handleSaved(saved: Produto) {
    setProdutos((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
  }

  async function toggleDisponivel(produto: Produto) {
    const res = await fetch(`/api/comerciante/produtos/${produto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disponivel: !produto.disponivel }),
    })
    if (!res.ok) { toast.error("Erro ao atualizar."); return }
    const updated: Produto = await res.json()
    setProdutos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este produto?")) return
    setRemovendoId(id)
    const res = await fetch(`/api/comerciante/produtos/${id}`, { method: "DELETE" })
    setRemovendoId(null)
    if (!res.ok) { toast.error("Erro ao excluir produto."); return }
    setProdutos((prev) => prev.filter((p) => p.id !== id))
    toast.success("Produto excluído.")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar produto ou categoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background pl-8 pr-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button size="sm" onClick={abrirNovo} disabled={atingiuLimite}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo produto
        </Button>
      </div>

      <p className={`text-sm ${atingiuLimite ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
        {produtos.length === 0
          ? "Nenhum produto cadastrado."
          : busca && produtosFiltrados.length === 0
            ? `Nenhum resultado para "${busca}".`
            : busca
              ? `${produtosFiltrados.length} de ${produtos.length} ${produtos.length === 1 ? "produto" : "produtos"}`
              : `${produtos.length}${limite !== undefined ? `/${limite}` : ""} ${produtos.length === 1 ? "produto" : "produtos"}`}
      </p>

      {atingiuLimite && (
        <p className="text-xs text-amber-600 font-medium">
          Limite de {limite} produtos atingido. Faça upgrade para o plano Premium para adicionar mais.
        </p>
      )}

      {produtos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-lg border border-dashed border-input text-muted-foreground">
          <PackageOpen className="h-10 w-10 opacity-40" />
          <p className="text-sm">Adicione produtos ou serviços para exibir no seu perfil.</p>
          <Button variant="outline" size="sm" onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar primeiro produto
          </Button>
        </div>
      ) : produtosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
          <Search className="h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhum produto encontrado para &quot;{busca}&quot;.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {produtosFiltrados.map((p) => (
            <div
              key={p.id}
              className={cn(
                "group relative flex gap-3 rounded-lg border border-input bg-background p-3 transition-opacity",
                !p.disponivel && "opacity-60"
              )}
            >
              {/* Imagem (primeira do array) */}
              <div className="relative h-16 w-16 shrink-0 rounded-md overflow-hidden bg-muted">
                {p.imagens[0] ? (
                  <Image src={p.imagens[0]} alt={p.titulo} fill className="object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <PackageOpen className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.titulo}</p>
                {p.descricao && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.descricao}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {p.variacoes.length > 0 ? (
                    <span className="text-xs font-semibold text-primary">
                      {p.variacoes.map((v) => `${v.nome}: ${displayPreco(v.preco)}`).join(" · ")}
                    </span>
                  ) : p.preco != null ? (
                    <span className="text-xs font-semibold text-primary">{displayPreco(p.preco)}</span>
                  ) : null}
                  <span className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                    p.disponivel ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                  )}>
                    {p.disponivel ? "Visível" : "Oculto"}
                  </span>
                  {p.destaque && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 flex items-center gap-1">
                      <Star className="h-2.5 w-2.5" />
                      Destaque
                    </span>
                  )}
                  {p.precoPromo != null && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 flex items-center gap-1">
                      <Tag className="h-2.5 w-2.5" />
                      Promoção
                    </span>
                  )}
                  {p.categoriaCardapioId && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                      <UtensilsCrossed className="h-2.5 w-2.5" />
                      {p.categoriaCardapio?.nome ?? "Cardápio"}
                    </span>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => abrirEdicao(p)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  aria-label="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleDisponivel(p)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  aria-label={p.disponivel ? "Ocultar" : "Mostrar"}
                >
                  {p.disponivel ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={removendoId === p.id}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 cursor-pointer"
                  aria-label="Excluir"
                >
                  {removendoId === p.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProdutoDialog
        open={dialogOpen}
        produto={editando}
        categorias={categoriasCardapio}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
