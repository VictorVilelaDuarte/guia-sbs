"use client";

import { useState, useEffect, useRef } from "react";
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
import { Loader2, ImagePlus, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardapioItem, CardapioCategoria, ItemFormState } from "./types";
import { formatPreco, parsePreco } from "./utils";

interface ItemDialogProps {
  open: boolean;
  item: CardapioItem | null;
  categorias: CardapioCategoria[];
  defaultCategoriaId?: string;
  onClose: () => void;
  onSaved: (item: CardapioItem) => void;
}

export function ItemDialog({
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
                    className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
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
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
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
                  "w-full h-9 rounded-md px-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors border cursor-pointer",
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
