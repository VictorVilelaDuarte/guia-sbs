"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown,
  UtensilsCrossed,
  FolderPlus,
  GripVertical,
  Search,
  X,
  Star,
  Tag,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import type { CardapioCategoria, Produto } from "./types"
import { displayPreco } from "./utils"
import { CategoriaDialog } from "./categoria-dialog"
import { ProdutoDialog } from "./produto-dialog"
import { SortableCategoriaWrapper, SortableItemWrapper } from "./sortable-wrappers"

export function CardapioManager({
  categoriasIniciais,
}: {
  categoriasIniciais: CardapioCategoria[]
}) {
  const [categorias, setCategorias] = useState<CardapioCategoria[]>(categoriasIniciais)
  const [catDialog, setCatDialog] = useState(false)
  const [editandoCat, setEditandoCat] = useState<CardapioCategoria | null>(null)
  const [itemDialog, setItemDialog] = useState(false)
  const [editandoItem, setEditandoItem] = useState<Produto | null>(null)
  const [defaultCatId, setDefaultCatId] = useState<string | undefined>()
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set())
  const [busca, setBusca] = useState("")

  const buscaAtiva = busca.trim().length > 0

  // Durante busca: filtra categorias e produtos que dão match
  const categoriasFiltradas = buscaAtiva
    ? categorias
        .map((cat) => {
          const q = busca.toLowerCase()
          const catMatch = cat.nome.toLowerCase().includes(q)
          const produtosFiltrados = cat.produtos.filter(
            (p) =>
              p.titulo.toLowerCase().includes(q) ||
              p.descricao?.toLowerCase().includes(q)
          )
          if (!catMatch && produtosFiltrados.length === 0) return null
          return { ...cat, produtos: catMatch ? cat.produtos : produtosFiltrados }
        })
        .filter(Boolean) as CardapioCategoria[]
    : categorias

  function toggleColapso(id: string) {
    setColapsadas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Categorias ──

  function handleCatSaved(saved: CardapioCategoria) {
    setCategorias((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], nome: saved.nome }
        return next
      }
      return [...prev, { ...saved, produtos: [] }]
    })
  }

  async function handleDeleteCat(cat: CardapioCategoria) {
    if (!confirm(`Excluir a categoria "${cat.nome}" e todos os seus itens?`)) return
    setRemovendoId(cat.id)
    const res = await fetch(`/api/comerciante/cardapio/categorias/${cat.id}`, { method: "DELETE" })
    setRemovendoId(null)
    if (!res.ok) { toast.error("Erro ao excluir categoria."); return }
    setCategorias((prev) => prev.filter((c) => c.id !== cat.id))
    toast.success("Categoria excluída.")
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function salvarOrdemCategorias(nova: CardapioCategoria[]) {
    await fetch("/api/comerciante/cardapio/ordem", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "categoria", ids: nova.map((c) => c.id) }),
    })
  }

  async function salvarOrdemItens(catId: string, novosProdutos: Produto[]) {
    await fetch("/api/comerciante/cardapio/ordem", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "item", categoriaId: catId, ids: novosProdutos.map((p) => p.id) }),
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId.startsWith("cat-") && overId.startsWith("cat-")) {
      const ids = categorias.map((c) => `cat-${c.id}`)
      const nova = arrayMove(categorias, ids.indexOf(activeId), ids.indexOf(overId))
      setCategorias(nova)
      salvarOrdemCategorias(nova)
      return
    }

    if (activeId.startsWith("item-") && overId.startsWith("item-")) {
      for (const cat of categorias) {
        const ids = cat.produtos.map((p) => `item-${p.id}`)
        if (ids.includes(activeId) && ids.includes(overId)) {
          const novosProdutos = arrayMove(cat.produtos, ids.indexOf(activeId), ids.indexOf(overId))
          setCategorias((prev) =>
            prev.map((c) => (c.id === cat.id ? { ...c, produtos: novosProdutos } : c))
          )
          salvarOrdemItens(cat.id, novosProdutos)
          return
        }
      }
    }
  }

  // ── Produtos ──

  function handleProdutoSaved(saved: Produto) {
    setCategorias((prev) =>
      prev.map((cat) => {
        // Remove de categorias que não são mais a do produto
        if (cat.id !== saved.categoriaCardapioId) {
          return { ...cat, produtos: cat.produtos.filter((p) => p.id !== saved.id) }
        }
        // Atualiza ou adiciona na categoria correta
        const idx = cat.produtos.findIndex((p) => p.id === saved.id)
        if (idx >= 0) {
          const produtos = [...cat.produtos]
          produtos[idx] = saved
          return { ...cat, produtos }
        }
        return { ...cat, produtos: [...cat.produtos, saved] }
      })
    )
  }

  async function toggleDisponivel(produto: Produto) {
    const res = await fetch(`/api/comerciante/produtos/${produto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disponivel: !produto.disponivel }),
    })
    if (!res.ok) { toast.error("Erro ao atualizar."); return }
    const updated: Produto = await res.json()
    handleProdutoSaved(updated)
  }

  async function handleDeleteItem(produto: Produto) {
    if (!confirm(`Excluir "${produto.titulo}"?`)) return
    setRemovendoId(produto.id)
    const res = await fetch(`/api/comerciante/produtos/${produto.id}`, { method: "DELETE" })
    setRemovendoId(null)
    if (!res.ok) { toast.error("Erro ao excluir item."); return }
    setCategorias((prev) =>
      prev.map((cat) => ({ ...cat, produtos: cat.produtos.filter((p) => p.id !== produto.id) }))
    )
    toast.success("Item excluído.")
  }

  // ── Render ──

  const totalItens = categorias.reduce((s, c) => s + c.produtos.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar item ou categoria..."
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
        <Button size="sm" onClick={() => { setEditandoCat(null); setCatDialog(true) }}>
          <FolderPlus className="h-4 w-4 mr-1.5" />
          Nova categoria
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {categorias.length === 0
          ? "Nenhuma categoria criada."
          : buscaAtiva && categoriasFiltradas.length === 0
            ? `Nenhum resultado para "${busca}".`
            : buscaAtiva
              ? `${categoriasFiltradas.reduce((s, c) => s + c.produtos.length, 0)} itens encontrados`
              : `${categorias.length} ${categorias.length === 1 ? "categoria" : "categorias"} · ${totalItens} ${totalItens === 1 ? "item" : "itens"}`}
      </p>

      {/* Empty state */}
      {categorias.length === 0 && !buscaAtiva && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-lg border border-dashed border-input text-muted-foreground">
          <UtensilsCrossed className="h-10 w-10 opacity-40" />
          <p className="text-sm">Crie categorias para organizar o seu cardápio.</p>
          <Button variant="outline" size="sm" onClick={() => { setEditandoCat(null); setCatDialog(true) }}>
            <FolderPlus className="h-4 w-4 mr-1.5" />
            Criar primeira categoria
          </Button>
        </div>
      )}

      {/* Lista de categorias */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={categoriasFiltradas.map((c) => `cat-${c.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {categoriasFiltradas.map((cat) => {
            // durante busca, força expansão de todas as categorias com resultados
            const colapsada = buscaAtiva ? false : colapsadas.has(cat.id)
            return (
              <SortableCategoriaWrapper key={cat.id} id={`cat-${cat.id}`}>
                {({ dragHandleProps }) => (
                  <div className="rounded-xl border border-input overflow-hidden">
                    {/* Header da categoria */}
                    <div className={cn("flex items-center gap-2 bg-muted/40 px-3 py-2.5", !colapsada && "border-b border-input")}>
                      <button
                        type="button"
                        className="flex h-7 w-5 items-center justify-center text-black hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
                        aria-label="Arrastar categoria"
                        {...dragHandleProps}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleColapso(cat.id)}
                        className="flex flex-1 items-center gap-2 text-left min-w-0 cursor-pointer"
                      >
                        <span className="text-sm font-semibold truncate">{cat.nome}</span>
                        <span className="text-xs text-black shrink-0">
                          {buscaAtiva
                            ? `${cat.produtos.length} encontrado${cat.produtos.length !== 1 ? "s" : ""}`
                            : `${cat.produtos.length} ${cat.produtos.length === 1 ? "item" : "itens"}`}
                        </span>
                        <ChevronDown className={cn("h-3.5 w-3.5 text-black shrink-0 transition-transform", colapsada && "-rotate-90")} />
                      </button>

                      <button
                        type="button"
                        onClick={() => { setDefaultCatId(cat.id); setEditandoItem(null); setItemDialog(true) }}
                        className="flex items-center gap-1 text-xs text-black hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Item
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditandoCat(cat); setCatDialog(true) }}
                        className="flex h-7 w-7 items-center justify-center rounded text-black hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCat(cat)}
                        disabled={removendoId === cat.id}
                        className="flex h-7 w-7 items-center justify-center rounded text-black hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {removendoId === cat.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    {/* Itens */}
                    {!colapsada && cat.produtos.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        Nenhum item nesta categoria.{" "}
                        <button
                          type="button"
                          onClick={() => { setDefaultCatId(cat.id); setEditandoItem(null); setItemDialog(true) }}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          Adicionar item
                        </button>
                      </div>
                    ) : !colapsada ? (
                      <SortableContext
                        items={cat.produtos.map((p) => `item-${p.id}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="divide-y divide-input">
                          {cat.produtos.map((produto) => (
                            <SortableItemWrapper key={produto.id} id={`item-${produto.id}`}>
                              {({ dragHandleProps: itemDragHandleProps, isDragging }) => (
                                <div className={cn(
                                  "flex gap-3 p-3 transition-opacity",
                                  !produto.disponivel && "opacity-60",
                                  isDragging && "opacity-40"
                                )}>
                                  {/* Drag handle */}
                                  <button
                                    type="button"
                                    className="flex items-center justify-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none self-center"
                                    aria-label="Arrastar item"
                                    {...itemDragHandleProps}
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </button>

                                  {/* Imagem */}
                                  <div className="relative h-16 w-16 shrink-0 rounded-md overflow-hidden bg-muted">
                                    {produto.imagens[0] ? (
                                      <Image src={produto.imagens[0]} alt={produto.titulo} fill className="object-cover" />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center">
                                        <UtensilsCrossed className="h-5 w-5 text-muted-foreground/40" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{produto.titulo}</p>
                                    {produto.descricao && (
                                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{produto.descricao}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                      {produto.variacoes.length > 0 ? (
                                        <span className="text-xs font-semibold text-primary">
                                          {produto.variacoes.map((v) => `${v.nome}: ${displayPreco(v.preco)}`).join(" · ")}
                                        </span>
                                      ) : produto.preco != null ? (
                                        <span className="text-xs font-semibold text-primary">{displayPreco(produto.preco)}</span>
                                      ) : null}
                                      <span className={cn(
                                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                                        produto.disponivel ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                                      )}>
                                        {produto.disponivel ? "Visível" : "Oculto"}
                                      </span>
                                      {produto.destaque && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 flex items-center gap-1">
                                          <Star className="h-2.5 w-2.5" />
                                          Destaque
                                        </span>
                                      )}
                                      {produto.precoPromo != null && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 flex items-center gap-1">
                                          <Tag className="h-2.5 w-2.5" />
                                          Promoção
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Ações */}
                                  <div className="flex flex-col gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => { setEditandoItem(produto); setItemDialog(true) }}
                                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleDisponivel(produto)}
                                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                    >
                                      {produto.disponivel
                                        ? <EyeOff className="h-3.5 w-3.5" />
                                        : <Eye className="h-3.5 w-3.5" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(produto)}
                                      disabled={removendoId === produto.id}
                                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors cursor-pointer"
                                    >
                                      {removendoId === produto.id
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <Trash2 className="h-3.5 w-3.5" />}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </SortableItemWrapper>
                          ))}
                        </div>
                      </SortableContext>
                    ) : null}
                  </div>
                )}
              </SortableCategoriaWrapper>
            )
          })}
          {buscaAtiva && categoriasFiltradas.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <Search className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhum item encontrado para &quot;{busca}&quot;.</p>
            </div>
          )}
        </SortableContext>
      </DndContext>

      <CategoriaDialog
        open={catDialog}
        categoria={editandoCat}
        onClose={() => setCatDialog(false)}
        onSaved={handleCatSaved}
      />

      <ProdutoDialog
        open={itemDialog}
        produto={editandoItem}
        categorias={categorias}
        defaultCategoriaId={defaultCatId}
        onClose={() => { setItemDialog(false); setDefaultCatId(undefined) }}
        onSaved={handleProdutoSaved}
      />
    </div>
  )
}
