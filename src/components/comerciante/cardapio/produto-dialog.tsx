"use client";

import { useState, useEffect, useRef } from "react";
import heic2any from "heic2any";
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
  Loader2,
  ImagePlus,
  X,
  Eye,
  EyeOff,
  Plus,
  UtensilsCrossed,
  Star,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Produto, CardapioCategoria, ProdutoFormState } from "./types";
import { formatPreco, parsePreco } from "./utils";

const MAX_IMAGENS = 3;

interface ProdutoDialogProps {
  open: boolean;
  produto: Produto | null;
  categorias: CardapioCategoria[];
  defaultCategoriaId?: string;
  onClose: () => void;
  onSaved: (produto: Produto) => void;
}

export function ProdutoDialog({
  open,
  produto,
  categorias,
  defaultCategoriaId,
  onClose,
  onSaved,
}: ProdutoDialogProps) {
  const isEdicao = !!produto;
  const [form, setForm] = useState<ProdutoFormState>({
    titulo: "",
    descricao: "",
    preco: "",
    imagens: [],
    disponivel: true,
    destaque: false,
    precoPromo: "",
    promoFim: "",
    variacoes: [],
    incluirNoCardapio: false,
    categoriaCardapioId: "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const temVariacoes = form.variacoes.length > 0;
  const slotsRestantes = MAX_IMAGENS - form.imagens.length;

  useEffect(() => {
    if (!open) return;

    if (produto) {
      const promoFimStr = produto.promoFim
        ? new Date(produto.promoFim).toISOString().slice(0, 10)
        : "";
      setForm({
        titulo: produto.titulo,
        descricao: produto.descricao ?? "",
        preco:
          produto.preco != null
            ? produto.preco.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })
            : "",
        imagens: produto.imagens,
        disponivel: produto.disponivel,
        destaque: produto.destaque,
        precoPromo:
          produto.precoPromo != null
            ? produto.precoPromo.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })
            : "",
        promoFim: promoFimStr,
        variacoes: produto.variacoes.map((v) => ({
          nome: v.nome,
          preco: v.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
        })),
        incluirNoCardapio: !!produto.categoriaCardapioId,
        categoriaCardapioId:
          produto.categoriaCardapioId ?? categorias[0]?.id ?? "",
      });
    } else {
      const catId = defaultCategoriaId ?? categorias[0]?.id ?? "";
      setForm({
        titulo: "",
        descricao: "",
        preco: "",
        imagens: [],
        disponivel: true,
        destaque: false,
        precoPromo: "",
        promoFim: "",
        variacoes: [],
        incluirNoCardapio: !!defaultCategoriaId,
        categoriaCardapioId: catId,
      });
    }
  }, [open, produto, defaultCategoriaId, categorias]);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) onClose();
  }

  async function processFiles(rawFiles: File[]) {
    const slots = MAX_IMAGENS - form.imagens.length;
    if (slots <= 0) return;

    const toProcess = rawFiles.slice(0, slots);
    setUploading(true);

    const uploaded: string[] = [];

    for (const rawFile of toProcess) {
      let file = rawFile;

      const isHeic =
        file.type === "image/heic" ||
        file.type === "image/heif" ||
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif");

      if (isHeic) {
        try {
          const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
          const blob = Array.isArray(converted) ? converted[0] : converted;
          file = new File([blob], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
        } catch {
          toast.error(`Não foi possível converter "${file.name}".`);
          continue;
        }
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("tipo", "produto");

      const res = await fetch("/api/comerciante/upload", { method: "POST", body: fd });

      if (!res.ok) {
        toast.error(`Erro ao enviar "${file.name}".`);
        continue;
      }

      const { url } = await res.json();
      uploaded.push(url);
    }

    setUploading(false);

    if (uploaded.length > 0) {
      setForm((f) => ({ ...f, imagens: [...f.imagens, ...uploaded] }));
    }

    if (rawFiles.length > slots) {
      toast.warning(`Limite de ${MAX_IMAGENS} fotos atingido. ${rawFiles.length - slots} foto(s) ignorada(s).`);
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length > 0) await processFiles(files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (form.imagens.length < MAX_IMAGENS) setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || /\.hei[cf]$/i.test(f.name),
    );
    if (files.length > 0) processFiles(files);
  }

  function removeImagem(index: number) {
    setForm((f) => ({
      ...f,
      imagens: f.imagens.filter((_, i) => i !== index),
    }));
  }

  function addVariacao() {
    setForm((f) => ({
      ...f,
      variacoes: [...f.variacoes, { nome: "", preco: "" }],
    }));
  }

  function removeVariacao(index: number) {
    setForm((f) => ({
      ...f,
      variacoes: f.variacoes.filter((_, i) => i !== index),
    }));
  }

  function updateVariacao(
    index: number,
    field: "nome" | "preco",
    value: string,
  ) {
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
      const invalida = form.variacoes.some(
        (v) => !v.nome.trim() || !v.preco.trim(),
      );
      if (invalida) {
        toast.error("Preencha nome e preço de todas as variações.");
        return;
      }
    }

    if (form.incluirNoCardapio && !form.categoriaCardapioId) {
      toast.error("Selecione uma categoria do cardápio.");
      return;
    }

    setSaving(true);

    const precoPromoNum = parsePreco(form.precoPromo);
    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      preco: temVariacoes ? null : parsePreco(form.preco),
      imagens: form.imagens,
      disponivel: form.disponivel,
      destaque: form.destaque,
      precoPromo: precoPromoNum ?? null,
      promoFim:
        precoPromoNum && form.promoFim
          ? new Date(form.promoFim).toISOString()
          : null,
      categoriaCardapioId: form.incluirNoCardapio
        ? form.categoriaCardapioId
        : null,
      variacoes: form.variacoes.map((v) => ({
        nome: v.nome.trim(),
        preco: parsePreco(v.preco) ?? 0,
      })),
    };

    const res = await fetch(
      isEdicao
        ? `/api/comerciante/produtos/${produto.id}`
        : "/api/comerciante/produtos",
      {
        method: isEdicao ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    setSaving(false);

    if (!res.ok) {
      toast.error("Erro ao salvar produto.");
      return;
    }

    const saved: Produto = await res.json();
    toast.success(isEdicao ? "Produto atualizado." : "Produto criado.");
    onSaved(saved);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdicao ? "Editar produto" : "Novo produto"}
          </DialogTitle>
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
            <div
              className={cn(
                "flex gap-2 flex-wrap rounded-lg border-2 border-dashed p-1.5 transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-transparent",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
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
                  className={cn(
                    "flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
                    isDragging
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input bg-muted/30 hover:bg-muted/50 text-muted-foreground",
                  )}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-[10px] leading-tight text-center px-1">
                        {isDragging
                          ? "Soltar aqui"
                          : slotsRestantes < MAX_IMAGENS
                            ? `${slotsRestantes} restante${slotsRestantes !== 1 ? "s" : ""}`
                            : "Adicionar"}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple={slotsRestantes > 1}
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="titulo-produto">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="titulo-produto"
              required
              maxLength={120}
              placeholder="Ex: Suco de laranja, Corte de cabelo..."
              value={form.titulo}
              onChange={(e) =>
                setForm((f) => ({ ...f, titulo: e.target.value }))
              }
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao-produto">
              Descrição{" "}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <textarea
              id="descricao-produto"
              rows={3}
              maxLength={1000}
              placeholder="Ingredientes, detalhes, tamanhos..."
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
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_7rem_2rem] gap-2 items-center"
                  >
                    <Input
                      placeholder="Ex: Pequeno, Cápsula..."
                      maxLength={80}
                      value={v.nome}
                      onChange={(e) =>
                        updateVariacao(i, "nome", e.target.value)
                      }
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
                        onChange={(e) =>
                          updateVariacao(i, "preco", e.target.value)
                        }
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

          {/* Incluir no cardápio */}
          {categorias.length > 0 && (
            <div className="rounded-lg border border-input p-3 space-y-3">
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    incluirNoCardapio: !f.incluirNoCardapio,
                    ...(!f.incluirNoCardapio
                      ? {}
                      : { destaque: false, precoPromo: "", promoFim: "" }),
                  }))
                }
                className="flex w-full items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Incluir no cardápio
                  </span>
                </div>
                <div
                  className={cn(
                    "h-5 w-9 rounded-full transition-colors relative shrink-0",
                    form.incluirNoCardapio ? "bg-primary" : "bg-input",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200",
                      form.incluirNoCardapio ? "left-[18px]" : "left-0.5",
                    )}
                  />
                </div>
              </button>

              {form.incluirNoCardapio && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="cat-sel"
                      className="text-xs text-muted-foreground"
                    >
                      Categoria
                    </Label>
                    <select
                      id="cat-sel"
                      value={form.categoriaCardapioId}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          categoriaCardapioId: e.target.value,
                        }))
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

                  {/* Destaque */}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, destaque: !f.destaque }))
                    }
                    className="flex w-full items-center justify-between cursor-pointer py-1"
                  >
                    <div className="flex items-center gap-2">
                      <Star
                        className={cn(
                          "h-4 w-4",
                          form.destaque
                            ? "text-amber-500"
                            : "text-muted-foreground",
                        )}
                      />
                      <div className="text-left">
                        <span className="text-sm font-medium">Destaque</span>
                        <p className="text-xs text-muted-foreground">
                          Aparece em destaque no cardápio
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "h-5 w-9 rounded-full transition-colors relative shrink-0",
                        form.destaque ? "bg-amber-400" : "bg-input",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200",
                          form.destaque ? "left-[18px]" : "left-0.5",
                        )}
                      />
                    </div>
                  </button>

                  {/* Promoção */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          precoPromo: f.precoPromo ? "" : f.preco,
                          promoFim: "",
                        }))
                      }
                      className="flex w-full items-center justify-between cursor-pointer py-1"
                    >
                      <div className="flex items-center gap-2">
                        <Tag
                          className={cn(
                            "h-4 w-4",
                            form.precoPromo
                              ? "text-rose-500"
                              : "text-muted-foreground",
                          )}
                        />
                        <div className="text-left">
                          <span className="text-sm font-medium">Promoção</span>
                          <p className="text-xs text-muted-foreground">
                            Exibe preço promocional com o original riscado
                          </p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "h-5 w-9 rounded-full transition-colors relative shrink-0",
                          form.precoPromo ? "bg-rose-500" : "bg-input",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200",
                            form.precoPromo ? "left-[18px]" : "left-0.5",
                          )}
                        />
                      </div>
                    </button>

                    {form.precoPromo !== "" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Preço promocional
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              R$
                            </span>
                            <Input
                              inputMode="numeric"
                              placeholder="0,00"
                              className="pl-9"
                              value={form.precoPromo}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  precoPromo: formatPreco(e.target.value),
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Válido até{" "}
                            <span className="font-normal">(opcional)</span>
                          </Label>
                          <Input
                            type="date"
                            value={form.promoFim}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                promoFim: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdicao ? "Salvar" : "Criar produto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
