"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ImagePlus,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  UtensilsCrossed,
  FolderPlus,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CardapioItem {
  id: string;
  titulo: string;
  descricao: string | null;
  preco: number | null;
  imagem: string | null;
  disponivel: boolean;
  ordem: number;
  categoriaId: string;
}

interface CardapioCategoria {
  id: string;
  nome: string;
  ordem: number;
  itens: CardapioItem[];
}

// ── Utilitários de preço ──────────────────────────────────────────────────────

function formatPreco(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parsePreco(formatted: string): number | null {
  const clean = formatted.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

function displayPreco(preco: number) {
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Dialog de categoria ───────────────────────────────────────────────────────

interface CategoriaDialogProps {
  open: boolean;
  categoria: CardapioCategoria | null;
  onClose: () => void;
  onSaved: (cat: CardapioCategoria) => void;
}

function CategoriaDialog({
  open,
  categoria,
  onClose,
  onSaved,
}: CategoriaDialogProps) {
  const isEdicao = !!categoria;
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setNome(categoria?.nome ?? "");
  }, [open, categoria]);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch(
      isEdicao
        ? `/api/comerciante/cardapio/categorias/${categoria.id}`
        : "/api/comerciante/cardapio/categorias",
      {
        method: isEdicao ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim() }),
      },
    );

    setSaving(false);
    if (!res.ok) {
      toast.error("Erro ao salvar categoria.");
      return;
    }

    const saved: CardapioCategoria = await res.json();
    toast.success(isEdicao ? "Categoria atualizada." : "Categoria criada.");
    onSaved(saved);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isEdicao ? "Editar categoria" : "Nova categoria"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="nome-cat">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nome-cat"
              required
              maxLength={80}
              placeholder="Ex: Entradas, Bebidas, Sobremesas..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdicao ? "Salvar" : "Criar categoria"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog de item ────────────────────────────────────────────────────────────

interface ItemFormState {
  titulo: string;
  descricao: string;
  preco: string;
  imagem: string | null;
  disponivel: boolean;
  categoriaId: string;
}

interface ItemDialogProps {
  open: boolean;
  item: CardapioItem | null;
  categorias: CardapioCategoria[];
  defaultCategoriaId?: string;
  onClose: () => void;
  onSaved: (item: CardapioItem) => void;
}

function ItemDialog({
  open,
  item,
  categorias,
  defaultCategoriaId,
  onClose,
  onSaved,
}: ItemDialogProps) {
  const isEdicao = !!item;
  const [form, setForm] = useState<ItemFormState>({
    titulo: "",
    descricao: "",
    preco: "",
    imagem: null,
    disponivel: true,
    categoriaId: "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(
        item
          ? {
              titulo: item.titulo,
              descricao: item.descricao ?? "",
              preco:
                item.preco != null
                  ? item.preco.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })
                  : "",
              imagem: item.imagem,
              disponivel: item.disponivel,
              categoriaId: item.categoriaId,
            }
          : {
              titulo: "",
              descricao: "",
              preco: "",
              imagem: null,
              disponivel: true,
              categoriaId: defaultCategoriaId ?? categorias[0]?.id ?? "",
            },
      );
    }
  }, [open, item, defaultCategoriaId, categorias]);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) onClose();
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tipo", "cardapio");
    setUploading(true);
    const res = await fetch("/api/comerciante/upload", {
      method: "POST",
      body: fd,
    });
    setUploading(false);
    if (!res.ok) {
      toast.error("Erro ao enviar imagem.");
      return;
    }
    const { url } = await res.json();
    setForm((f) => ({ ...f, imagem: url }));
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      preco: parsePreco(form.preco),
      imagem: form.imagem,
      disponivel: form.disponivel,
      categoriaId: form.categoriaId,
    };

    const res = await fetch(
      isEdicao
        ? `/api/comerciante/cardapio/itens/${item.id}`
        : "/api/comerciante/cardapio/itens",
      {
        method: isEdicao ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    setSaving(false);
    if (!res.ok) {
      toast.error("Erro ao salvar item.");
      return;
    }

    const saved: CardapioItem = await res.json();
    toast.success(isEdicao ? "Item atualizado." : "Item criado.");
    onSaved(saved);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdicao ? "Editar item" : "Novo item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Imagem */}
          <div className="space-y-2">
            <Label>
              Imagem{" "}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <div
              className={cn(
                "relative flex items-center justify-center rounded-lg border-2 border-dashed border-input bg-muted/30 overflow-hidden cursor-pointer transition-colors hover:bg-muted/50",
                form.imagem ? "h-40" : "h-28",
              )}
              onClick={() => fileRef.current?.click()}
            >
              {form.imagem ? (
                <>
                  <Image
                    src={form.imagem}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setForm((f) => ({ ...f, imagem: null }));
                    }}
                    className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                    aria-label="Remover imagem"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-xs">Clique para adicionar imagem</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="categoria-sel">
              Categoria <span className="text-destructive">*</span>
            </Label>
            <select
              id="categoria-sel"
              required
              value={form.categoriaId}
              onChange={(e) =>
                setForm((f) => ({ ...f, categoriaId: e.target.value }))
              }
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="titulo-item">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="titulo-item"
              required
              maxLength={120}
              placeholder="Ex: Salada Caesar, Suco de laranja..."
              value={form.titulo}
              onChange={(e) =>
                setForm((f) => ({ ...f, titulo: e.target.value }))
              }
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao-item">
              Descrição{" "}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <textarea
              id="descricao-item"
              rows={3}
              maxLength={1000}
              placeholder="Ingredientes, observações, acompanhamentos..."
              value={form.descricao}
              onChange={(e) =>
                setForm((f) => ({ ...f, descricao: e.target.value }))
              }
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {/* Preço + Disponível */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preco-item">
                Preço{" "}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="preco-item"
                  inputMode="numeric"
                  placeholder="0,00"
                  className="pl-9"
                  value={form.preco}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      preco: formatPreco(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Disponível</Label>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, disponivel: !f.disponivel }))
                }
                className={cn(
                  "w-full h-9 rounded-md px-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors border",
                  form.disponivel
                    ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    : "bg-muted border-input text-muted-foreground hover:bg-muted/70",
                )}
              >
                {form.disponivel ? (
                  <>
                    <Eye className="h-3.5 w-3.5" /> Visível
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5" /> Oculto
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdicao ? "Salvar" : "Adicionar item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Wrappers sortáveis ────────────────────────────────────────────────────────

function SortableCategoriaWrapper({
  id,
  children,
}: {
  id: string;
  children: (props: {
    dragHandleProps: Record<string, unknown>;
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
}

function SortableItemWrapper({
  id,
  children,
}: {
  id: string;
  children: (props: {
    dragHandleProps: Record<string, unknown>;
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {children({
        dragHandleProps: { ...attributes, ...listeners },
        isDragging,
      })}
    </div>
  );
}

// ── Manager principal ─────────────────────────────────────────────────────────

export function CardapioManager({
  categoriasIniciais,
}: {
  categoriasIniciais: CardapioCategoria[];
}) {
  const [categorias, setCategorias] =
    useState<CardapioCategoria[]>(categoriasIniciais);
  const [catDialog, setCatDialog] = useState(false);
  const [editandoCat, setEditandoCat] = useState<CardapioCategoria | null>(
    null,
  );
  const [itemDialog, setItemDialog] = useState(false);
  const [editandoItem, setEditandoItem] = useState<CardapioItem | null>(null);
  const [defaultCatId, setDefaultCatId] = useState<string | undefined>();
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());

  function toggleColapso(id: string) {
    setColapsadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Categorias ──

  function handleCatSaved(saved: CardapioCategoria) {
    setCategorias((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], nome: saved.nome };
        return next;
      }
      return [...prev, { ...saved, itens: [] }];
    });
  }

  async function handleDeleteCat(cat: CardapioCategoria) {
    if (!confirm(`Excluir a categoria "${cat.nome}" e todos os seus itens?`))
      return;
    setRemovendoId(cat.id);
    const res = await fetch(`/api/comerciante/cardapio/categorias/${cat.id}`, {
      method: "DELETE",
    });
    setRemovendoId(null);
    if (!res.ok) {
      toast.error("Erro ao excluir categoria.");
      return;
    }
    setCategorias((prev) => prev.filter((c) => c.id !== cat.id));
    toast.success("Categoria excluída.");
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function salvarOrdemCategorias(nova: CardapioCategoria[]) {
    await fetch("/api/comerciante/cardapio/ordem", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "categoria", ids: nova.map((c) => c.id) }),
    });
  }

  async function salvarOrdemItens(catId: string, novosItens: CardapioItem[]) {
    await fetch("/api/comerciante/cardapio/ordem", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "item",
        categoriaId: catId,
        ids: novosItens.map((i) => i.id),
      }),
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("cat-") && overId.startsWith("cat-")) {
      const ids = categorias.map((c) => `cat-${c.id}`);
      const nova = arrayMove(
        categorias,
        ids.indexOf(activeId),
        ids.indexOf(overId),
      );
      setCategorias(nova);
      salvarOrdemCategorias(nova);
      return;
    }

    if (activeId.startsWith("item-") && overId.startsWith("item-")) {
      for (const cat of categorias) {
        const ids = cat.itens.map((i) => `item-${i.id}`);
        if (ids.includes(activeId) && ids.includes(overId)) {
          const novosItens = arrayMove(
            cat.itens,
            ids.indexOf(activeId),
            ids.indexOf(overId),
          );
          setCategorias((prev) =>
            prev.map((c) =>
              c.id === cat.id ? { ...c, itens: novosItens } : c,
            ),
          );
          salvarOrdemItens(cat.id, novosItens);
          return;
        }
      }
    }
  }

  // ── Itens ──

  function handleItemSaved(saved: CardapioItem) {
    setCategorias((prev) =>
      prev.map((cat) => {
        if (cat.id !== saved.categoriaId) {
          // Remove item da categoria antiga se mudou de categoria
          return { ...cat, itens: cat.itens.filter((i) => i.id !== saved.id) };
        }
        const idx = cat.itens.findIndex((i) => i.id === saved.id);
        if (idx >= 0) {
          const itens = [...cat.itens];
          itens[idx] = saved;
          return { ...cat, itens };
        }
        return { ...cat, itens: [...cat.itens, saved] };
      }),
    );
  }

  async function toggleDisponivel(item: CardapioItem) {
    const res = await fetch(`/api/comerciante/cardapio/itens/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disponivel: !item.disponivel }),
    });
    if (!res.ok) {
      toast.error("Erro ao atualizar.");
      return;
    }
    const updated: CardapioItem = await res.json();
    handleItemSaved(updated);
  }

  async function handleDeleteItem(item: CardapioItem) {
    if (!confirm(`Excluir "${item.titulo}"?`)) return;
    setRemovendoId(item.id);
    const res = await fetch(`/api/comerciante/cardapio/itens/${item.id}`, {
      method: "DELETE",
    });
    setRemovendoId(null);
    if (!res.ok) {
      toast.error("Erro ao excluir item.");
      return;
    }
    setCategorias((prev) =>
      prev.map((cat) => ({
        ...cat,
        itens: cat.itens.filter((i) => i.id !== item.id),
      })),
    );
    toast.success("Item excluído.");
  }

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {categorias.length === 0
            ? "Nenhuma categoria criada."
            : `${categorias.length} ${categorias.length === 1 ? "categoria" : "categorias"} · ${categorias.reduce((s, c) => s + c.itens.length, 0)} itens`}
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditandoCat(null);
            setCatDialog(true);
          }}
        >
          <FolderPlus className="h-4 w-4 mr-1.5" />
          Nova categoria
        </Button>
      </div>

      {/* Empty state */}
      {categorias.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-lg border border-dashed border-input text-muted-foreground">
          <UtensilsCrossed className="h-10 w-10 opacity-40" />
          <p className="text-sm">
            Crie categorias para organizar o seu cardápio.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditandoCat(null);
              setCatDialog(true);
            }}
          >
            <FolderPlus className="h-4 w-4 mr-1.5" />
            Criar primeira categoria
          </Button>
        </div>
      )}

      {/* Lista de categorias */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categorias.map((c) => `cat-${c.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {categorias.map((cat) => {
            const colapsada = colapsadas.has(cat.id);
            return (
              <SortableCategoriaWrapper key={cat.id} id={`cat-${cat.id}`}>
                {({ dragHandleProps }) => (
                  <div className="rounded-xl border border-input overflow-hidden">
                    {/* Header da categoria */}
                    <div
                      className={cn(
                        "flex items-center gap-2 bg-muted/40 px-3 py-2.5",
                        !colapsada && "border-b border-input",
                      )}
                    >
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
                        <span className="text-sm font-semibold truncate">
                          {cat.nome}
                        </span>
                        <span className="text-xs text-black shrink-0">
                          {cat.itens.length}{" "}
                          {cat.itens.length === 1 ? "item" : "itens"}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 text-black shrink-0 transition-transform",
                            colapsada && "-rotate-90",
                          )}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDefaultCatId(cat.id);
                          setEditandoItem(null);
                          setItemDialog(true);
                        }}
                        className="flex items-center gap-1 text-xs text-black hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Item
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditandoCat(cat);
                          setCatDialog(true);
                        }}
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
                        {removendoId === cat.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Itens */}
                    {!colapsada && cat.itens.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        Nenhum item nesta categoria.{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setDefaultCatId(cat.id);
                            setEditandoItem(null);
                            setItemDialog(true);
                          }}
                          className="text-primary hover:underline"
                        >
                          Adicionar item
                        </button>
                      </div>
                    ) : !colapsada ? (
                      <SortableContext
                        items={cat.itens.map((i) => `item-${i.id}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="divide-y divide-input">
                          {cat.itens.map((item) => (
                            <SortableItemWrapper
                              key={item.id}
                              id={`item-${item.id}`}
                            >
                              {({
                                dragHandleProps: itemDragHandleProps,
                                isDragging,
                              }) => (
                                <div
                                  className={cn(
                                    "flex gap-3 p-3 transition-opacity",
                                    !item.disponivel && "opacity-60",
                                    isDragging && "opacity-40",
                                  )}
                                >
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
                                    {item.imagem ? (
                                      <Image
                                        src={item.imagem}
                                        alt={item.titulo}
                                        fill
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center">
                                        <UtensilsCrossed className="h-5 w-5 text-muted-foreground/40" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {item.titulo}
                                    </p>
                                    {item.descricao && (
                                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                        {item.descricao}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1.5">
                                      {item.preco != null && (
                                        <span className="text-xs font-semibold text-primary">
                                          {displayPreco(item.preco)}
                                        </span>
                                      )}
                                      <span
                                        className={cn(
                                          "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                                          item.disponivel
                                            ? "bg-green-100 text-green-700"
                                            : "bg-muted text-muted-foreground",
                                        )}
                                      >
                                        {item.disponivel ? "Visível" : "Oculto"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Ações */}
                                  <div className="flex flex-col gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditandoItem(item);
                                        setItemDialog(true);
                                      }}
                                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleDisponivel(item)}
                                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    >
                                      {item.disponivel ? (
                                        <EyeOff className="h-3.5 w-3.5" />
                                      ) : (
                                        <Eye className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(item)}
                                      disabled={removendoId === item.id}
                                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                                    >
                                      {removendoId === item.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                      )}
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
            );
          })}
        </SortableContext>
      </DndContext>

      <CategoriaDialog
        open={catDialog}
        categoria={editandoCat}
        onClose={() => setCatDialog(false)}
        onSaved={handleCatSaved}
      />

      <ItemDialog
        open={itemDialog}
        item={editandoItem}
        categorias={categorias}
        defaultCategoriaId={defaultCatId}
        onClose={() => {
          setItemDialog(false);
          setDefaultCatId(undefined);
        }}
        onSaved={handleItemSaved}
      />
    </div>
  );
}
