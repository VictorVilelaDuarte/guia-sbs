"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Plus, Pencil, Trash2, Loader2,
  PackageOpen, Eye, EyeOff, UtensilsCrossed, Search, X, Star, Tag, Wrench, Check, FolderPlus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Produto, CardapioCategoria, CatalogoCategoria, TipoProduto } from "./cardapio/types"
import { displayPreco } from "./cardapio/utils"
import { ProdutoDialog } from "./cardapio/produto-dialog"

export function ProdutosManager({
  produtosIniciais,
  categoriasCardapio,
  categoriasCatalogoIniciais = [],
  tipo = "PRODUTO",
  limite,
}: {
  produtosIniciais: Produto[]
  categoriasCardapio: CardapioCategoria[]
  categoriasCatalogoIniciais?: CatalogoCategoria[]
  tipo?: TipoProduto
  limite?: number
}) {
  const label = tipo === "SERVICO" ? "serviço" : "produto"
  const labelPlural = tipo === "SERVICO" ? "serviços" : "produtos"

  // Filtra apenas os itens do tipo correto que não estão vinculados ao cardápio
  const itensFiltradosPorTipo = produtosIniciais.filter(
    (p) => p.tipo === tipo && !p.categoriaCardapioId,
  )

  const [produtos, setProdutos] = useState<Produto[]>(itensFiltradosPorTipo)
  const [categorias, setCategorias] = useState<CatalogoCategoria[]>(categoriasCatalogoIniciais)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)
  const [defaultCatId, setDefaultCatId] = useState<string | undefined>(undefined)
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const [busca, setBusca] = useState("")

  // Estado de criação/edição de categorias
  const [criandoCategoria, setCriandoCategoria] = useState(false)
  const [novoNomeCategoria, setNovoNomeCategoria] = useState("")
  const [salvandoCategoria, setSalvandoCategoria] = useState(false)
  const [editandoCategoriaId, setEditandoCategoriaId] = useState<string | null>(null)
  const [nomeEdicaoCategoria, setNomeEdicaoCategoria] = useState("")

  const atingiuLimite = limite !== undefined && produtos.length >= limite

  const produtosFiltrados = busca.trim()
    ? produtos.filter((p) => {
        const q = busca.toLowerCase()
        return (
          p.titulo.toLowerCase().includes(q) ||
          p.descricao?.toLowerCase().includes(q)
        )
      })
    : produtos

  function abrirNovo(catId?: string) {
    if (atingiuLimite) {
      toast.warning(`Limite de ${limite} ${labelPlural} atingido. Faça upgrade para o plano Premium.`)
      return
    }
    setEditando(null)
    setDefaultCatId(catId)
    setDialogOpen(true)
  }

  function abrirEdicao(produto: Produto) {
    setEditando(produto)
    setDefaultCatId(undefined)
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
    if (!confirm(`Excluir este ${label}?`)) return
    setRemovendoId(id)
    const res = await fetch(`/api/comerciante/produtos/${id}`, { method: "DELETE" })
    setRemovendoId(null)
    if (!res.ok) { toast.error(`Erro ao excluir ${label}.`); return }
    setProdutos((prev) => prev.filter((p) => p.id !== id))
    toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} excluído.`)
  }

  async function criarCategoria() {
    const nome = novoNomeCategoria.trim()
    if (!nome) return
    setSalvandoCategoria(true)
    const res = await fetch("/api/comerciante/catalogo/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, tipo }),
    })
    setSalvandoCategoria(false)
    if (!res.ok) { toast.error("Erro ao criar categoria."); return }
    const nova: CatalogoCategoria = await res.json()
    setCategorias((prev) => [...prev, nova])
    setNovoNomeCategoria("")
    setCriandoCategoria(false)
    toast.success("Categoria criada.")
  }

  async function renomearCategoria(id: string) {
    const nome = nomeEdicaoCategoria.trim()
    if (!nome) return
    const res = await fetch(`/api/comerciante/catalogo/categorias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    })
    if (!res.ok) { toast.error("Erro ao renomear."); return }
    const updated: CatalogoCategoria = await res.json()
    setCategorias((prev) => prev.map((c) => (c.id === id ? { ...c, nome: updated.nome } : c)))
    setEditandoCategoriaId(null)
  }

  async function excluirCategoria(id: string) {
    const temItens = produtos.some((p) => p.categoriaCatalogoId === id)
    const msg = temItens
      ? "Excluir esta categoria? Os itens dela passam para \"Outros\"."
      : "Excluir esta categoria?"
    if (!confirm(msg)) return
    const res = await fetch(`/api/comerciante/catalogo/categorias/${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Erro ao excluir categoria."); return }
    setCategorias((prev) => prev.filter((c) => c.id !== id))
    // Reflete o SetNull localmente: itens da categoria viram "Outros"
    setProdutos((prev) =>
      prev.map((p) =>
        p.categoriaCatalogoId === id
          ? { ...p, categoriaCatalogoId: null, categoriaCatalogo: null }
          : p,
      ),
    )
    toast.success("Categoria excluída.")
  }

  function ItemRow({ p }: { p: Produto }) {
    return (
      <div
        className={cn(
          "group relative flex gap-3 rounded-lg border border-input bg-background p-3 transition-opacity",
          !p.disponivel && "opacity-60",
        )}
      >
        {/* Imagem */}
        <div className="relative h-16 w-16 shrink-0 rounded-md overflow-hidden bg-muted">
          {p.imagens[0] ? (
            <Image src={p.imagens[0]} alt={p.titulo} fill className="object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              {tipo === "SERVICO"
                ? <Wrench className="h-6 w-6 text-muted-foreground/40" />
                : <PackageOpen className="h-6 w-6 text-muted-foreground/40" />}
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
              p.disponivel ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground",
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
    )
  }

  // Itens sem categoria (ou cuja categoria não existe mais) → bloco "Outros"
  const catIds = new Set(categorias.map((c) => c.id))
  const semCategoria = produtos.filter(
    (p) => !p.categoriaCatalogoId || !catIds.has(p.categoriaCatalogoId),
  )
  const buscaAtiva = busca.trim().length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={`Buscar ${labelPlural}...`}
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
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setCriandoCategoria(true)}>
            <FolderPlus className="h-4 w-4 mr-1.5" />
            Categoria
          </Button>
          <Button size="sm" onClick={() => abrirNovo()} disabled={atingiuLimite}>
            <Plus className="h-4 w-4 mr-1.5" />
            {`Novo ${label}`}
          </Button>
        </div>
      </div>

      {/* Criação de categoria inline */}
      {criandoCategoria && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-input p-2">
          <Input
            autoFocus
            placeholder="Nome da categoria (ex: Bebidas)"
            maxLength={80}
            value={novoNomeCategoria}
            onChange={(e) => setNovoNomeCategoria(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); criarCategoria() }
              if (e.key === "Escape") { setCriandoCategoria(false); setNovoNomeCategoria("") }
            }}
            className="h-8"
          />
          <Button size="sm" onClick={criarCategoria} disabled={salvandoCategoria || !novoNomeCategoria.trim()}>
            {salvandoCategoria ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Criar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setCriandoCategoria(false); setNovoNomeCategoria("") }}>
            Cancelar
          </Button>
        </div>
      )}

      <p className={`text-sm ${atingiuLimite ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
        {produtos.length === 0
          ? `Nenhum ${label} cadastrado.`
          : buscaAtiva && produtosFiltrados.length === 0
            ? `Nenhum resultado para "${busca}".`
            : buscaAtiva
              ? `${produtosFiltrados.length} de ${produtos.length} ${produtos.length === 1 ? label : labelPlural}`
              : `${produtos.length}${limite !== undefined ? `/${limite}` : ""} ${produtos.length === 1 ? label : labelPlural}`}
      </p>

      {atingiuLimite && (
        <p className="text-xs text-amber-600 font-medium">
          Limite de {limite} {labelPlural} atingido. Faça upgrade para o plano Premium para adicionar mais.
        </p>
      )}

      {produtos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-lg border border-dashed border-input text-muted-foreground">
          {tipo === "SERVICO" ? (
            <Wrench className="h-10 w-10 opacity-40" />
          ) : (
            <PackageOpen className="h-10 w-10 opacity-40" />
          )}
          <p className="text-sm">Adicione {labelPlural} para exibir no seu perfil.</p>
          <Button variant="outline" size="sm" onClick={() => abrirNovo()}>
            <Plus className="h-4 w-4 mr-1.5" />
            {`Adicionar primeiro ${label}`}
          </Button>
        </div>
      ) : buscaAtiva ? (
        // Durante a busca, lista plana com os resultados (ignora agrupamento)
        produtosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
            <Search className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhum {label} encontrado para &quot;{busca}&quot;.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {produtosFiltrados.map((p) => <ItemRow key={p.id} p={p} />)}
          </div>
        )
      ) : (
        // Agrupado por categoria + bloco "Outros" no fim
        <div className="space-y-6">
          {categorias.map((cat) => {
            const itens = produtos.filter((p) => p.categoriaCatalogoId === cat.id)
            return (
              <div key={cat.id} className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-input pb-1.5">
                  {editandoCategoriaId === cat.id ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <Input
                        autoFocus
                        value={nomeEdicaoCategoria}
                        maxLength={80}
                        onChange={(e) => setNomeEdicaoCategoria(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); renomearCategoria(cat.id) }
                          if (e.key === "Escape") setEditandoCategoriaId(null)
                        }}
                        className="h-7 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => renomearCategoria(cat.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-green-600 hover:bg-green-50 cursor-pointer"
                        aria-label="Salvar"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoCategoriaId(null)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted cursor-pointer"
                        aria-label="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        {cat.nome}
                        <span className="text-xs font-normal text-muted-foreground">
                          {itens.length}
                        </span>
                      </h4>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => abrirNovo(cat.id)}
                          className="flex h-7 items-center gap-1 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Item
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditandoCategoriaId(cat.id); setNomeEdicaoCategoria(cat.nome) }}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          aria-label="Renomear categoria"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => excluirCategoria(cat.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          aria-label="Excluir categoria"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
                {itens.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-1">Nenhum item nesta categoria.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {itens.map((p) => <ItemRow key={p.id} p={p} />)}
                  </div>
                )}
              </div>
            )
          })}

          {/* Bloco "Outros" — itens sem categoria. Sem cabeçalho quando é o
              único grupo (catálogo ainda não usa categorias). */}
          {semCategoria.length > 0 && (
            <div className="space-y-3">
              {categorias.length > 0 && (
                <div className="flex items-center gap-2 border-b border-input pb-1.5">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                    Outros
                    <span className="text-xs font-normal">{semCategoria.length}</span>
                  </h4>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {semCategoria.map((p) => <ItemRow key={p.id} p={p} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <ProdutoDialog
        open={dialogOpen}
        produto={editando}
        tipo={tipo}
        categorias={tipo === "PRODUTO" ? categoriasCardapio : []}
        categoriasCatalogo={categorias}
        defaultCategoriaCatalogoId={defaultCatId}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
