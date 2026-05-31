"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { HorariosEditor } from "@/components/comerciante/horarios-editor";
import {
  EnderecoInput,
  type EnderecoData,
} from "@/components/comerciante/endereco-input";

const categorias = [
  { value: "ALIMENTACAO", label: "Alimentação" },
  { value: "HOSPEDAGEM", label: "Hospedagem" },
  { value: "TURISMO", label: "Turismo" },
  { value: "SERVICO", label: "Serviço" },
  { value: "COMERCIO", label: "Comércio" },
  { value: "ENTRETENIMENTO", label: "Entretenimento" },
];

const categoriaLabels: Record<string, string> = Object.fromEntries(
  categorias.map((c) => [c.value, c.label]),
);

interface SubcategoriaBasica {
  id: string;
  nome: string;
  categoria: string;
}

interface Comercio {
  id: string;
  nome: string;
  descricao: string | null;
  categorias: string[];
  subcategorias: SubcategoriaBasica[];
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  horarios: string | null;
  lat: number | null;
  lng: number | null;
}

export function EditarComercioForm({
  comercio,
  subcategoriasDisponiveis,
  saveUrl = "/api/comerciante/comercio",
  saveMethod = "PATCH",
  adminMode = false,
}: {
  comercio: Comercio;
  subcategoriasDisponiveis: SubcategoriaBasica[];
  saveUrl?: string;
  saveMethod?: "PATCH" | "PUT";
  adminMode?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>(comercio.categorias)
  const [form, setForm] = useState({
    nome: comercio.nome,
    descricao: comercio.descricao ?? "",
    telefone: comercio.telefone ?? "",
    whatsapp: comercio.whatsapp ?? "",
    email: comercio.email ?? "",
    website: comercio.website ?? "",
    instagram: comercio.instagram ?? "",
    horarios: comercio.horarios ?? "",
  });
  const [subcategoriaIds, setSubcategoriaIds] = useState<string[]>(
    comercio.subcategorias.map((s) => s.id),
  );
  const [endereco, setEndereco] = useState<EnderecoData>({
    cep: comercio.cep ?? "",
    endereco: comercio.endereco ?? "",
    numero: comercio.numero ?? "",
    bairro: comercio.bairro ?? "",
    cidade: comercio.cidade ?? "",
    estado: comercio.estado ?? "",
    lat: comercio.lat ?? undefined,
    lng: comercio.lng ?? undefined,
  });

  function handleWhatsappChange(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) {
      value =
        value.length < 7
          ? `(${value.slice(0, 2)}) ${value.slice(2)}`
          : `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setForm({ ...form, whatsapp: value });
  }

  function handleTelefoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) {
      value =
        value.length < 7
          ? `(${value.slice(0, 2)}) ${value.slice(2)}`
          : `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setForm({ ...form, telefone: value });
  }

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [key]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch(saveUrl, {
      method: saveMethod,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ...endereco, categorias: categoriasSelecionadas, subcategoriaIds }),
    });

    setLoading(false);

    if (!res.ok) {
      toast.error("Erro ao salvar alterações.");
      return;
    }

    toast.success("Informações atualizadas com sucesso.");
  }

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="nome">Nome do comércio</Label>
          <Input
            id="nome"
            required
            value={form.nome}
            onChange={field("nome")}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="descricao">Descrição</Label>
          <textarea
            id="descricao"
            rows={4}
            className={`${inputClass} resize-none`}
            value={form.descricao}
            onChange={field("descricao")}
          />
        </div>

        {adminMode && (
          <>
            <div className="space-y-2 sm:col-span-2">
              <Label>Categorias</Label>
              <div className="flex flex-wrap gap-2">
                {categorias.map((c) => {
                  const ativo = categoriasSelecionadas.includes(c.value)
                  const isPrincipal = categoriasSelecionadas[0] === c.value
                  return (
                    <div key={c.value} className="relative group/cat">
                      <button
                        type="button"
                        onClick={() => {
                          const novas = ativo
                            ? categoriasSelecionadas.filter((v) => v !== c.value)
                            : [...categoriasSelecionadas, c.value]
                          setCategoriasSelecionadas(novas)
                          if (ativo) {
                            const idsParaRemover = new Set(
                              subcategoriasDisponiveis
                                .filter((s) => s.categoria === c.value)
                                .map((s) => s.id)
                            )
                            setSubcategoriaIds((ids) => ids.filter((id) => !idsParaRemover.has(id)))
                          }
                        }}
                        className={`pl-3 text-sm font-medium border transition-colors cursor-pointer rounded-full ${
                          ativo && isPrincipal
                            ? "pr-2 py-1 bg-primary text-primary-foreground border-primary"
                            : ativo
                            ? "pr-7 py-1 bg-primary text-primary-foreground border-primary"
                            : "px-3 py-1 bg-background text-muted-foreground border-input hover:bg-muted"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {isPrincipal && ativo && (
                            <Star className="h-3 w-3 fill-current shrink-0" />
                          )}
                          {c.label}
                        </span>
                      </button>
                      {/* Botão "tornar principal" — só aparece em categorias ativas não-principais */}
                      {ativo && !isPrincipal && (
                        <button
                          type="button"
                          title="Tornar principal"
                          onClick={() =>
                            setCategoriasSelecionadas([
                              c.value,
                              ...categoriasSelecionadas.filter((v) => v !== c.value),
                            ])
                          }
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                        >
                          <Star className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              {categoriasSelecionadas.length === 0 && (
                <p className="text-xs text-destructive">Selecione ao menos uma categoria.</p>
              )}
              {categoriasSelecionadas.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  <Star className="h-3 w-3 inline mr-1 fill-current" />
                  indica a categoria principal.
                </p>
              )}
            </div>

            {(() => {
              const chips = subcategoriasDisponiveis.filter((s) =>
                categoriasSelecionadas.includes(s.categoria),
              );
              if (chips.length === 0) return null;
              return (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Subcategorias</Label>
                  <div className="flex flex-wrap gap-2">
                    {chips.map((s) => {
                      const ativo = subcategoriaIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            setSubcategoriaIds((ids) =>
                              ativo ? ids.filter((id) => id !== s.id) : [...ids, s.id],
                            )
                          }
                          className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                            ativo
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-input hover:bg-muted"
                          }`}
                        >
                          {s.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Endereço</h3>
        <EnderecoInput value={endereco} onChange={setEndereco} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            placeholder="(00) 0000-0000"
            maxLength={15}
            value={form.telefone}
            onChange={handleTelefoneChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            placeholder="(00) 00000-0000"
            maxLength={15}
            value={form.whatsapp}
            onChange={handleWhatsappChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail público</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={field("email")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={form.website}
            onChange={field("website")}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="instagram">Instagram</Label>
          <Input
            id="instagram"
            placeholder="@usuario"
            value={form.instagram}
            onChange={field("instagram")}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Horários de funcionamento</Label>
          <HorariosEditor
            value={form.horarios}
            onChange={(v) => setForm((f) => ({ ...f, horarios: v }))}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}
