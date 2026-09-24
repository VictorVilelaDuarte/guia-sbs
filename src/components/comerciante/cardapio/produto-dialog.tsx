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
  ScanBarcode,
  Archive,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { LeitorCodigoBarras } from "@/components/comerciante/leitor-codigo-barras";
import { UNIDADES_PRODUTO } from "@/lib/unidades";
import { cn } from "@/lib/utils";
import type { Produto, CardapioCategoria, CatalogoCategoria, ProdutoFormState, TipoProduto } from "./types";
import { formatPreco, parsePreco } from "./utils";
import { useRecorteQuadrado } from "@/components/imagem/recorte-quadrado";
import { ACCEPT_IMAGENS, ehImagem } from "@/lib/imagem/heic";

const MAX_IMAGENS = 3;

// Número do banco → texto do campo ("12,50"); vazio quando não há valor.
const reais = (v: number | null | undefined) =>
  v != null ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";

// Margem sobre o preço de venda: (preço − custo) / preço.
function margem(preco: string, custo: string): number | null {
  const p = parsePreco(preco);
  const c = parsePreco(custo);
  if (!p || c == null || p <= 0) return null;
  return Math.round(((p - c) / p) * 100);
}

interface ProdutoDialogProps {
  open: boolean;
  produto: Produto | null;
  tipo?: TipoProduto;
  categorias: CardapioCategoria[];
  categoriasCatalogo?: CatalogoCategoria[];
  gruposComplemento?: { id: string; nome: string; minimo: number; maximo: number; opcoes: { nome: string }[] }[];
  defaultCategoriaId?: string;
  defaultCategoriaCatalogoId?: string;
  // Produto novo a partir de um código lido que não existe na loja.
  codigoInicial?: string;
  onClose: () => void;
  onSaved: (produto: Produto) => void;
}

export function ProdutoDialog({
  open,
  produto,
  tipo: tipoProp = "PRODUTO",
  categorias,
  categoriasCatalogo = [],
  gruposComplemento = [],
  defaultCategoriaId,
  defaultCategoriaCatalogoId,
  codigoInicial,
  onClose,
  onSaved,
}: ProdutoDialogProps) {
  const isEdicao = !!produto;
  const tipoEfetivo: TipoProduto = produto?.tipo ?? tipoProp;
  const isServico = tipoEfetivo === "SERVICO";
  const label = isServico ? "serviço" : "produto";

  const [form, setForm] = useState<ProdutoFormState>({
    tipo: tipoProp,
    titulo: "",
    descricao: "",
    preco: "",
    imagens: [],
    disponivel: true,
    destaque: false,
    precoPromo: "",
    promoFim: "",
    variacoes: [],
    complementoIds: [],
    incluirNoCardapio: false,
    categoriaCardapioId: "",
    categoriaCatalogoId: "",
    codigoBarras: "",
    codigoInterno: "",
    marca: "",
    precoCusto: "",
    unidade: "UN",
    mostrarNaVitrine: true,
    arquivado: false,
  });
  // Campo que recebe o código lido pela câmera: o do produto ou o de uma variação.
  const [lendoCodigo, setLendoCodigo] = useState<null | "produto" | number>(null);
  const [uploading, setUploading] = useState(false);
  const { recortar, cropper } = useRecorteQuadrado();
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
        tipo: produto.tipo,
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
          codigoBarras: v.codigoBarras ?? "",
          precoCusto: reais(v.precoCusto),
        })),
        complementoIds: produto.complementos?.map((c) => c.grupoId) ?? [],
        incluirNoCardapio: !!produto.categoriaCardapioId,
        categoriaCardapioId:
          produto.categoriaCardapioId ?? categorias[0]?.id ?? "",
        categoriaCatalogoId: produto.categoriaCatalogoId ?? "",
        codigoBarras: produto.codigoBarras ?? "",
        codigoInterno: produto.codigoInterno ?? "",
        marca: produto.marca ?? "",
        precoCusto: reais(produto.precoCusto),
        unidade: produto.unidade ?? "UN",
        mostrarNaVitrine: produto.mostrarNaVitrine ?? true,
        arquivado: produto.arquivado ?? false,
      });
    } else {
      const catId = defaultCategoriaId ?? categorias[0]?.id ?? "";
      setForm({
        tipo: tipoProp,
        titulo: "",
        descricao: "",
        preco: "",
        imagens: [],
        disponivel: true,
        destaque: false,
        precoPromo: "",
        promoFim: "",
        variacoes: [],
        complementoIds: [],
        incluirNoCardapio: !!defaultCategoriaId,
        categoriaCardapioId: catId,
        categoriaCatalogoId: defaultCategoriaCatalogoId ?? "",
        codigoBarras: codigoInicial ?? "",
        codigoInterno: "",
        marca: "",
        precoCusto: "",
        unidade: "UN",
        mostrarNaVitrine: true,
        arquivado: false,
      });
    }
  }, [open, produto, defaultCategoriaId, defaultCategoriaCatalogoId, categorias, codigoInicial]);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) onClose();
  }

  async function processFiles(rawFiles: File[]) {
    const slots = MAX_IMAGENS - form.imagens.length;
    if (slots <= 0) return;

    // Recorte quadrado antes do upload (também converte HEIC).
    const toProcess = await recortar(rawFiles.slice(0, slots));
    if (toProcess.length === 0) return;
    setUploading(true);

    const uploaded: string[] = [];

    for (const file of toProcess) {
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
    const files = Array.from(e.dataTransfer.files).filter(ehImagem);
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
      variacoes: [...f.variacoes, { nome: "", preco: "", codigoBarras: "", precoCusto: "" }],
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
    field: "nome" | "preco" | "codigoBarras" | "precoCusto",
    value: string,
  ) {
    setForm((f) => {
      const next = [...f.variacoes];
      next[index] = {
        ...next[index],
        [field]: field === "preco" || field === "precoCusto" ? formatPreco(value) : value,
      };
      return { ...f, variacoes: next };
    });
  }

  function ativarVariacoes() {
    // A primeira variação herda preço, custo e código do produto.
    setForm((f) => ({
      ...f,
      variacoes: [{ nome: "", preco: f.preco, codigoBarras: f.codigoBarras, precoCusto: f.precoCusto }],
      codigoBarras: "",
    }));
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
      tipo: tipoEfetivo,
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
      categoriaCardapioId:
        !isServico && form.incluirNoCardapio ? form.categoriaCardapioId : null,
      // Item no cardápio sai do catálogo, então não carrega categoria de catálogo.
      categoriaCatalogoId:
        !isServico && form.incluirNoCardapio
          ? null
          : form.categoriaCatalogoId || null,
      variacoes: form.variacoes.map((v) => ({
        nome: v.nome.trim(),
        preco: parsePreco(v.preco) ?? 0,
        codigoBarras: v.codigoBarras.trim() || null,
        precoCusto: parsePreco(v.precoCusto) ?? null,
      })),
      complementoIds: form.complementoIds,
      // Com variações, o código de barras fica em cada variação.
      codigoBarras: temVariacoes ? null : form.codigoBarras.trim() || null,
      codigoInterno: form.codigoInterno.trim() || null,
      marca: form.marca.trim() || null,
      precoCusto: temVariacoes ? null : parsePreco(form.precoCusto) ?? null,
      unidade: form.unidade,
      mostrarNaVitrine: form.mostrarNaVitrine,
      arquivado: form.arquivado,
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
      // Ex.: "O código 789… já está no produto Coca-Cola 350ml."
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Erro ao salvar produto.");
      return;
    }

    const saved: Produto = await res.json();
    toast.success(isEdicao ? "Produto atualizado." : "Produto criado.");
    onSaved(saved);
    onClose();
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdicao ? `Editar ${label}` : `Novo ${label}`}
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
              accept={ACCEPT_IMAGENS}
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
                  <div key={i} className="space-y-1.5 rounded-md border border-input/60 p-2">
                  <div className="grid grid-cols-[1fr_7rem_2rem] gap-2 items-center">
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
                  {/* Código e custo da variação: cada tamanho tem o seu. */}
                  <div className="grid grid-cols-[1fr_7rem_2rem] gap-2 items-center">
                    <div className="relative">
                      <Input
                        placeholder="Código de barras"
                        inputMode="numeric"
                        maxLength={40}
                        className="h-8 pr-9 text-xs"
                        value={v.codigoBarras}
                        onChange={(e) => updateVariacao(i, "codigoBarras", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setLendoCodigo(i)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                        aria-label={`Ler código de barras de ${v.nome || "variação"}`}
                      >
                        <ScanBarcode className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">custo</span>
                      <Input
                        inputMode="numeric"
                        placeholder="0,00"
                        className="h-8 pl-10 text-xs"
                        value={v.precoCusto}
                        onChange={(e) => updateVariacao(i, "precoCusto", e.target.value)}
                      />
                    </div>
                    <span className="text-center text-[10px] text-muted-foreground">
                      {margem(v.preco, v.precoCusto) != null ? `${margem(v.preco, v.precoCusto)}%` : ""}
                    </span>
                  </div>
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

          {/* Códigos e custo — tudo opcional. Com variações, código de barras e
              custo ficam em cada variação (acima). */}
          <div className="space-y-3 rounded-lg border border-input/70 p-3">
            <p className="text-sm font-medium">Códigos e custo <span className="font-normal text-muted-foreground">(opcional)</span></p>
            {!temVariacoes && (
              <div className="space-y-1.5">
                <Label htmlFor="codigo-barras" className="text-xs text-muted-foreground">Código de barras</Label>
                <div className="flex gap-2">
                  <Input
                    id="codigo-barras"
                    inputMode="numeric"
                    maxLength={40}
                    placeholder="Ex: 7891000100103"
                    value={form.codigoBarras}
                    onChange={(e) => setForm((f) => ({ ...f, codigoBarras: e.target.value }))}
                  />
                  <Button type="button" variant="outline" onClick={() => setLendoCodigo("produto")} className="shrink-0">
                    <ScanBarcode className="mr-1.5 h-4 w-4" /> Ler
                  </Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="codigo-interno" className="text-xs text-muted-foreground">Código interno</Label>
                <Input
                  id="codigo-interno"
                  maxLength={30}
                  placeholder="Ex: 123"
                  value={form.codigoInterno}
                  onChange={(e) => setForm((f) => ({ ...f, codigoInterno: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="marca" className="text-xs text-muted-foreground">Marca</Label>
                <Input
                  id="marca"
                  maxLength={60}
                  placeholder="Ex: Da casa"
                  value={form.marca}
                  onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
                />
              </div>
              {!temVariacoes && (
                <div className="space-y-1.5">
                  <Label htmlFor="preco-custo" className="text-xs text-muted-foreground">Preço de custo</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <Input
                      id="preco-custo"
                      inputMode="numeric"
                      placeholder="0,00"
                      className="pl-9"
                      value={form.precoCusto}
                      onChange={(e) => setForm((f) => ({ ...f, precoCusto: formatPreco(e.target.value) }))}
                    />
                  </div>
                  {margem(form.preco, form.precoCusto) != null && (
                    <p className={cn("text-xs", (margem(form.preco, form.precoCusto) ?? 0) < 0 ? "text-destructive" : "text-muted-foreground")}>
                      Margem de {margem(form.preco, form.precoCusto)}% sobre o preço
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="unidade" className="text-xs text-muted-foreground">Vendido por</Label>
                <select
                  id="unidade"
                  value={form.unidade}
                  onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {UNIDADES_PRODUTO.map((u) => (
                    <option key={u.valor} value={u.valor}>{u.rotulo}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Onde aparece */}
          <div className="space-y-2 rounded-lg border border-input/70 p-3">
            <p className="text-sm font-medium">Onde aparece</p>
            <label className="flex items-start justify-between gap-3 text-sm">
              <span>
                Mostrar na vitrine e no cardápio online
                <span className="block text-xs text-muted-foreground">
                  Desligado, o item só aparece no PDV (ex.: sacola, gelo, embalagem).
                </span>
              </span>
              <Switch
                checked={form.mostrarNaVitrine}
                onCheckedChange={(v) => setForm((f) => ({ ...f, mostrarNaVitrine: v }))}
              />
            </label>
            {isEdicao && (
              <label className="flex items-start justify-between gap-3 border-t border-input/60 pt-2 text-sm">
                <span className="flex items-start gap-2">
                  <Archive className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    Arquivado (fora de linha)
                    <span className="block text-xs text-muted-foreground">
                      Some da vitrine e do PDV. O histórico de vendas continua.
                    </span>
                  </span>
                </span>
                <Switch
                  checked={form.arquivado}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, arquivado: v }))}
                />
              </label>
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

          {/* Complementos — grupos da loja reaproveitados por vários produtos */}
          {gruposComplemento.length > 0 && !isServico && (
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium">Complementos</span>
                <p className="text-xs text-muted-foreground">
                  Grupos que o cliente escolhe junto com este item (borda, adicionais, ponto da carne).
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {gruposComplemento.map((g) => {
                  const ativo = form.complementoIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          complementoIds: ativo
                            ? f.complementoIds.filter((x) => x !== g.id)
                            : [...f.complementoIds, g.id],
                        }))
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm cursor-pointer transition-colors",
                        ativo
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input hover:border-foreground/30",
                      )}
                      title={`${g.opcoes.length} opção(ões) · escolha ${g.minimo === g.maximo ? g.minimo : `${g.minimo} a ${g.maximo}`}`}
                    >
                      {g.nome}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                  form.destaque ? "text-amber-500" : "text-muted-foreground",
                )}
              />
              <div className="text-left">
                <span className="text-sm font-medium">Destaque</span>
                <p className="text-xs text-muted-foreground">
                  Aparece em destaque na vitrine
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

          {/* Categoria do catálogo — para itens que ficam no catálogo
              (serviços sempre; produtos quando não vão para o cardápio) */}
          {(isServico || !form.incluirNoCardapio) && categoriasCatalogo.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="cat-catalogo-sel">
                Categoria{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <select
                id="cat-catalogo-sel"
                value={form.categoriaCatalogoId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, categoriaCatalogoId: e.target.value }))
                }
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <option value="">Sem categoria (Outros)</option>
                {categoriasCatalogo.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Incluir no cardápio — oculto para serviços */}
          {!isServico && categorias.length > 0 && (
            <div className="rounded-lg border border-input p-3 space-y-3">
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    incluirNoCardapio: !f.incluirNoCardapio,
                    ...(!f.incluirNoCardapio
                      ? {}
                      : { precoPromo: "", promoFim: "" }),
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
              {isEdicao ? "Salvar" : `Criar ${label}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {cropper}
    <LeitorCodigoBarras
      aberto={lendoCodigo !== null}
      onFechar={() => setLendoCodigo(null)}
      onLido={(codigo) => {
        if (lendoCodigo === "produto") setForm((f) => ({ ...f, codigoBarras: codigo }));
        else if (typeof lendoCodigo === "number") updateVariacao(lendoCodigo, "codigoBarras", codigo);
        setLendoCodigo(null);
      }}
    />
    </>
  );
}
