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
import { Loader2, ImagePlus, X, Eye, EyeOff, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardapioItem, CardapioCategoria, ItemFormState } from "./types";
import { formatPreco, parsePreco } from "./utils";

const MAX_IMAGENS = 3;

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
    imagens: [],
    disponivel: true,
    categoriaId: "",
    variacoes: [],
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const temVariacoes = form.variacoes.length > 0;

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
              imagens: item.imagens,
              disponivel: item.disponivel,
              categoriaId: item.categoriaId,
              variacoes: item.variacoes.map((v) => ({
                nome: v.nome,
                preco: v.preco.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                }),
              })),
            }
          : {
              titulo: "",
              descricao: "",
              preco: "",
              imagens: [],
              disponivel: true,
              categoriaId: defaultCategoriaId ?? categorias[0]?.id ?? "",
              variacoes: [],
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
    if (form.imagens.length >= MAX_IMAGENS) return;

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
    setForm((f) => ({ ...f, imagens: [...f.imagens, url] }));
    e.target.value = "";
  }

  function removeImagem(index: number) {
    setForm((f) => ({
      ...f,
      imagens: f.imagens.filter((_, i) => i !== index),
    }));
  }

  function addVariacao() {
    setForm((f) => ({ ...f, variacoes: [...f.variacoes, { nome: "", preco: "" }] }));
  }

  function removeVariacao(index: number) {
    setForm((f) => ({
      ...f,
      variacoes: f.variacoes.filter((_, i) => i !== index),
    }));
  }

  function updateVariacao(index: number, field: "nome" | "preco", value: string) {
    setForm((f) => {
      const next = [...f.variacoes];
      next[index] = {
        ...next[index],
        [field]: field === "preco" ? formatPreco(value) : value,
      };
      return { ...f, variacoes: next };
    });
  }

  function ativarVariacoes() {
    setForm((f) => ({ ...f, variacoes: [{ nome: "", preco: f.preco }] }));
  }

  function desativarVariacoes() {
    setForm((f) => ({ ...f, variacoes: [] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (temVariacoes) {
      const invalida = form.variacoes.some((v) => !v.nome.trim() || !v.preco.trim());
      if (invalida) {
        toast.error("Preencha nome e preço de todas as variações.");
        return;
      }
    }

    setSaving(true);

    const variacoes = form.variacoes.map((v) => ({
      nome: v.nome.trim(),
      preco: parsePreco(v.preco) ?? 0,
    }));

    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      preco: temVariacoes ? null : parsePreco(form.preco),
      imagens: form.imagens,
      disponivel: form.disponivel,
      categoriaId: form.categoriaId,
      variacoes,
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdicao ? "Editar item" : "Novo item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Fotos */}
          <div className="space-y-2">
            <Label>
              Fotos{" "}
              <span className="text-muted-foreground font-normal">
                (opcional, até {MAX_IMAGENS})
              </span>
            </Label>
            <div className="flex gap-2 flex-wrap">
              {form.imagens.map((url, i) => (
                <div
                  key={i}
                  className="relative h-24 w-24 shrink-0 rounded-lg overflow-hidden bg-muted"
                >
                  <Image
                    src={url}
                    alt={`Foto ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImagem(i)}
                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                    aria-label="Remover foto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {form.imagens.length < MAX_IMAGENS && (
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-input bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  )}
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

          {/* Preço / Variações */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{temVariacoes ? "Variações de preço" : "Preço"}</Label>
              {temVariacoes ? (
                <button
                  type="button"
                  onClick={desativarVariacoes}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Usar preço único
                </button>
              ) : (
                <button
                  type="button"
                  onClick={ativarVariacoes}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  + Adicionar variações
                </button>
              )}
            </div>

            {!temVariacoes ? (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
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
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_7rem_2rem] gap-2 px-1">
                  <span className="text-xs text-muted-foreground">Nome</span>
                  <span className="text-xs text-muted-foreground">Preço</span>
                  <span />
                </div>
                {form.variacoes.map((v, i) => (
                  <div key={i} className="grid grid-cols-[1fr_7rem_2rem] gap-2 items-center">
                    <Input
                      placeholder="Ex: Pequeno, Cápsula..."
                      maxLength={80}
                      value={v.nome}
                      onChange={(e) => updateVariacao(i, "nome", e.target.value)}
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        R$
                      </span>
                      <Input
                        inputMode="numeric"
                        placeholder="0,00"
                        className="pl-9"
                        value={v.preco}
                        onChange={(e) => updateVariacao(i, "preco", e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVariacao(i)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      aria-label="Remover variação"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addVariacao}
                  className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer mt-1"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar variação
                </button>
              </div>
            )}
          </div>

          {/* Disponível */}
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
